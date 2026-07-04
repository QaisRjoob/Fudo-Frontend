import { Comment, CommentWithAuthor } from '../models';
import DatabaseService from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export interface ICommentRepository {
  getPostComments(postId: string, currentUserId?: string): Promise<CommentWithAuthor[]>;
  getStoryComments(storyId: string): Promise<Comment[]>;
  createComment(comment: Omit<Comment, 'id' | 'createdAt' | 'likesCount'>): Promise<CommentWithAuthor>;
  updateComment(commentId: string, text: string): Promise<void>;
  deleteComment(commentId: string): Promise<void>;
  likeComment(userId: string, commentId: string): Promise<void>;
  unlikeComment(userId: string, commentId: string): Promise<void>;
}

export class CommentRepository implements ICommentRepository {
  private db = DatabaseService;

  async getPostComments(postId: string, currentUserId?: string): Promise<CommentWithAuthor[]> {
    const database = await this.db.getDatabase();
    const results = await database.getAllAsync<any>(
      `SELECT c.*,
        u.id as _authorId, u.username as _username, u.avatarUri as _avatarUri,
        EXISTS(
          SELECT 1 FROM likes l WHERE l.userId = ? AND l.commentId = c.id
        ) as _isLiked
       FROM comments c
       LEFT JOIN users u ON c.authorId = u.id
       WHERE c.postId = ? AND c.replyToCommentId IS NULL
       ORDER BY c.createdAt ASC`,
      [currentUserId || '', postId]
    );
    return results.map(row => this.mapRow(row));
  }

  async getReplies(commentId: string, currentUserId?: string): Promise<CommentWithAuthor[]> {
    const database = await this.db.getDatabase();
    const results = await database.getAllAsync<any>(
      `SELECT c.*,
        u.id as _authorId, u.username as _username, u.avatarUri as _avatarUri,
        EXISTS(
          SELECT 1 FROM likes l WHERE l.userId = ? AND l.commentId = c.id
        ) as _isLiked
       FROM comments c
       LEFT JOIN users u ON c.authorId = u.id
       WHERE c.replyToCommentId = ?
       ORDER BY c.createdAt ASC`,
      [currentUserId || '', commentId]
    );
    return results.map(row => this.mapRow(row));
  }

  async getStoryComments(storyId: string): Promise<Comment[]> {
    const database = await this.db.getDatabase();
    const results = await database.getAllAsync<any>(
      'SELECT * FROM comments WHERE storyId = ? ORDER BY createdAt ASC',
      [storyId]
    );
    return results.map(this.mapRow);
  }

  async createComment(comment: Omit<Comment, 'id' | 'createdAt' | 'likesCount'>): Promise<CommentWithAuthor> {
    const database = await this.db.getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await database.runAsync(
      `INSERT INTO comments (id, postId, storyId, authorId, text, likesCount, createdAt, replyToCommentId)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, comment.postId || null, comment.storyId || null, comment.authorId,
       comment.text, createdAt, comment.replyToCommentId || null]
    );

    if (comment.postId) {
      await database.runAsync(
        'UPDATE posts SET commentsCount = commentsCount + 1 WHERE id = ?',
        [comment.postId]
      );
    }

    const result = await database.getFirstAsync<any>(
      `SELECT c.*, u.id as _authorId, u.username as _username, u.avatarUri as _avatarUri, 0 as _isLiked
       FROM comments c LEFT JOIN users u ON c.authorId = u.id WHERE c.id = ?`,
      [id]
    );
    return this.mapRow(result);
  }

  async updateComment(commentId: string, text: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      'UPDATE comments SET text = ?, updatedAt = ? WHERE id = ?',
      [text, new Date().toISOString(), commentId]
    );
  }

  async deleteComment(commentId: string): Promise<void> {
    const database = await this.db.getDatabase();
    const comment = await database.getFirstAsync<any>(
      'SELECT * FROM comments WHERE id = ?', [commentId]
    );
    if (comment?.postId) {
      await database.runAsync(
        'UPDATE posts SET commentsCount = commentsCount - 1 WHERE id = ? AND commentsCount > 0',
        [comment.postId]
      );
    }
    await database.runAsync('DELETE FROM likes WHERE commentId = ?', [commentId]);
    await database.runAsync('DELETE FROM comments WHERE replyToCommentId = ?', [commentId]);
    await database.runAsync('DELETE FROM comments WHERE id = ?', [commentId]);
  }

  async likeComment(userId: string, commentId: string): Promise<void> {
    const database = await this.db.getDatabase();
    const existing = await database.getFirstAsync<any>(
      'SELECT 1 FROM likes WHERE userId = ? AND commentId = ?', [userId, commentId]
    );
    if (existing) return;
    await database.runAsync(
      `INSERT INTO likes (userId, postId, commentId, createdAt) VALUES (?, NULL, ?, ?)`,
      [userId, commentId, new Date().toISOString()]
    );
    await database.runAsync(
      'UPDATE comments SET likesCount = likesCount + 1 WHERE id = ?', [commentId]
    );
  }

  async unlikeComment(userId: string, commentId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      'DELETE FROM likes WHERE userId = ? AND commentId = ?', [userId, commentId]
    );
    await database.runAsync(
      'UPDATE comments SET likesCount = likesCount - 1 WHERE id = ? AND likesCount > 0',
      [commentId]
    );
  }

  private mapRow(row: any): CommentWithAuthor {
    return {
      id: row.id,
      postId: row.postId || undefined,
      storyId: row.storyId || undefined,
      authorId: row.authorId,
      text: row.text,
      likesCount: row.likesCount ?? 0,
      isLiked: row._isLiked === 1 || row._isLiked === true,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt || undefined,
      replyToCommentId: row.replyToCommentId || undefined,
      author: row._authorId ? {
        id: row._authorId,
        username: row._username,
        avatarUri: row._avatarUri || undefined,
      } : undefined,
    };
  }
}
