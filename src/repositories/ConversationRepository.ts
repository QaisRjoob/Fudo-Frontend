import { Conversation, Message, MediaItem } from '../models';
import DatabaseService from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export interface IConversationRepository {
  getConversations(userId: string): Promise<Conversation[]>;
  getConversationById(conversationId: string): Promise<Conversation | null>;
  getOrCreateConversation(participantIds: string[]): Promise<Conversation>;
  getMessages(conversationId: string, limit?: number, cursor?: string): Promise<Message[]>;
  sendMessage(message: Omit<Message, 'id' | 'createdAt' | 'status'>): Promise<Message>;
  editMessage(messageId: string, text: string): Promise<void>;
  unsendMessage(messageId: string): Promise<void>;
  updateMessageStatus(messageId: string, status: Message['status']): Promise<void>;
  markConversationAsRead(conversationId: string): Promise<void>;
}

export class ConversationRepository implements IConversationRepository {
  private db = DatabaseService;

  async getConversations(userId: string): Promise<Conversation[]> {
    const database = await this.db.getDatabase();
    const results = await database.getAllAsync<any>(
      `SELECT * FROM conversations 
       WHERE participantIds LIKE ? 
       ORDER BY updatedAt DESC`,
      [`%${userId}%`]
    );

    return Promise.all(results.map(async (row) => await this.mapToConversation(row)));
  }

  async getConversationById(conversationId: string): Promise<Conversation | null> {
    const database = await this.db.getDatabase();
    const result = await database.getFirstAsync<any>(
      'SELECT * FROM conversations WHERE id = ?',
      [conversationId]
    );

    if (!result) return null;

    return this.mapToConversation(result);
  }

  async getOrCreateConversation(participantIds: string[]): Promise<Conversation> {
    const database = await this.db.getDatabase();
    const sortedIds = participantIds.sort().join(',');
    
    // Try to find existing conversation
    const existing = await database.getFirstAsync<any>(
      'SELECT * FROM conversations WHERE participantIds = ?',
      [sortedIds]
    );

    if (existing) {
      return this.mapToConversation(existing);
    }

    // Create new conversation
    const id = uuidv4();
    const now = new Date().toISOString();

    await database.runAsync(
      `INSERT INTO conversations (id, participantIds, unreadCount, updatedAt, createdAt)
       VALUES (?, ?, 0, ?, ?)`,
      [id, sortedIds, now, now]
    );

    const conversation = await this.getConversationById(id);
    return conversation!;
  }

  async getMessages(conversationId: string, limit: number = 50, cursor?: string): Promise<Message[]> {
    const database = await this.db.getDatabase();
    
    let query = 'SELECT * FROM messages WHERE conversationId = ? AND status != "unsent"';
    const params: any[] = [conversationId];

    if (cursor) {
      query += ' AND createdAt < ?';
      params.push(cursor);
    }

    query += ' ORDER BY createdAt DESC LIMIT ?';
    params.push(limit);

    const results = await database.getAllAsync<any>(query, params);
    
    const messages = await Promise.all(
      results.map(async (row) => await this.mapToMessage(row))
    );

    return messages.reverse(); // Return in chronological order
  }

  async sendMessage(message: Omit<Message, 'id' | 'createdAt' | 'status'>): Promise<Message> {
    const database = await this.db.getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await database.runAsync(
      `INSERT INTO messages (id, conversationId, senderId, text, status, createdAt, replyToMessageId, sharedPostId)
       VALUES (?, ?, ?, ?, 'sending', ?, ?, ?)`,
      [id, message.conversationId, message.senderId, message.text || null, createdAt,
       message.replyToMessageId || null, message.sharedPostId || null]
    );

    // Insert media if any
    if (message.media && message.media.length > 0) {
      for (let i = 0; i < message.media.length; i++) {
        const media = message.media[i];
        await database.runAsync(
          `INSERT INTO media (id, postId, storyId, messageId, type, remoteUri, localUri, thumbnailUri, \`order\`)
           VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?)`,
          [media.id || uuidv4(), id, media.type, media.remoteUri || null, media.localUri || null,
           media.thumbnailUri || null, i]
        );
      }
    }

    // Update conversation
    await database.runAsync(
      'UPDATE conversations SET updatedAt = ? WHERE id = ?',
      [createdAt, message.conversationId]
    );

    const sentMessage = await this.getMessageById(id);
    return sentMessage!;
  }

  async editMessage(messageId: string, text: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      'UPDATE messages SET text = ?, editedAt = ? WHERE id = ?',
      [text, new Date().toISOString(), messageId]
    );
  }

  async unsendMessage(messageId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      'UPDATE messages SET status = "unsent", text = NULL WHERE id = ?',
      [messageId]
    );

    // Delete associated media
    await database.runAsync('DELETE FROM media WHERE messageId = ?', [messageId]);
  }

  async updateMessageStatus(messageId: string, status: Message['status']): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      'UPDATE messages SET status = ? WHERE id = ?',
      [status, messageId]
    );
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      'UPDATE conversations SET unreadCount = 0 WHERE id = ?',
      [conversationId]
    );
  }

  private async getMessageById(messageId: string): Promise<Message | null> {
    const database = await this.db.getDatabase();
    const result = await database.getFirstAsync<any>(
      'SELECT * FROM messages WHERE id = ?',
      [messageId]
    );

    if (!result) return null;

    return this.mapToMessage(result);
  }

  private async mapToConversation(row: any): Promise<Conversation> {
    const database = await this.db.getDatabase();
    
    // Get last message
    const lastMessageRow = await database.getFirstAsync<any>(
      'SELECT * FROM messages WHERE conversationId = ? AND status != "unsent" ORDER BY createdAt DESC LIMIT 1',
      [row.id]
    );

    let lastMessage: Message | undefined;
    if (lastMessageRow) {
      lastMessage = await this.mapToMessage(lastMessageRow);
    }

    return {
      id: row.id,
      participantIds: row.participantIds.split(','),
      lastMessage,
      unreadCount: row.unreadCount ?? 0,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    };
  }

  private async mapToMessage(row: any): Promise<Message> {
    const database = await this.db.getDatabase();
    
    // Get media items
    const mediaResults = await database.getAllAsync<any>(
      'SELECT * FROM media WHERE messageId = ? ORDER BY `order` ASC',
      [row.id]
    );

    let media: MediaItem[] | undefined;
    if (mediaResults.length > 0) {
      media = mediaResults.map(m => ({
        id: m.id,
        type: m.type,
        remoteUri: m.remoteUri,
        localUri: m.localUri,
        thumbnailUri: m.thumbnailUri,
        order: m.order,
      }));
    }

    return {
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      text: row.text,
      media,
      status: row.status,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      replyToMessageId: row.replyToMessageId,
      sharedPostId: row.sharedPostId ?? undefined,
    };
  }
}
