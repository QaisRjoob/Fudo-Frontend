import { Story, StoryHighlight, MediaItem } from '../models';
import DatabaseService from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export interface IStoryRepository {
  getActiveStories(userId: string): Promise<Story[]>;
  getActiveStoriesGrouped(currentUserId: string): Promise<{ authorId: string; stories: Story[] }[]>;
  getUserStories(userId: string): Promise<Story[]>;
  getStoryById(storyId: string): Promise<Story | null>;
  createStory(story: Omit<Story, 'id' | 'createdAt' | 'views' | 'repliesCount'>): Promise<Story>;
  deleteStory(storyId: string): Promise<void>;
  incrementViews(storyId: string): Promise<void>;
  addReply(storyId: string, authorId: string, text: string): Promise<void>;
  highlightStory(storyId: string, highlightId: string): Promise<void>;
  unhighlightStory(storyId: string): Promise<void>;
  getHighlights(userId: string): Promise<StoryHighlight[]>;
  createHighlight(highlight: Omit<StoryHighlight, 'id' | 'createdAt'>): Promise<StoryHighlight>;
  deleteHighlight(highlightId: string): Promise<void>;
}

export class StoryRepository implements IStoryRepository {
  private db = DatabaseService;

  async getActiveStories(userId: string): Promise<Story[]> {
    const database = await this.db.getDatabase();
    const now = new Date().toISOString();
    
    // Get stories from users the current user follows that haven't expired
    const results = await database.getAllAsync<any>(
      `SELECT DISTINCT s.* FROM stories s
       INNER JOIN follows f ON s.authorId = f.followingId
       WHERE f.followerId = ? AND (s.expiresAt IS NULL OR s.expiresAt > ?)
       ORDER BY s.createdAt DESC`,
      [userId, now]
    );

    return Promise.all(results.map(async (row) => await this.mapToStory(row)));
  }

  async getUserStories(userId: string): Promise<Story[]> {
    const database = await this.db.getDatabase();
    const results = await database.getAllAsync<any>(
      'SELECT * FROM stories WHERE authorId = ? ORDER BY createdAt DESC',
      [userId]
    );

    return Promise.all(results.map(async (row) => await this.mapToStory(row)));
  }

  async getExpiredStories(userId: string): Promise<Story[]> {
    const database = await this.db.getDatabase();
    const now = new Date().toISOString();
    const results = await database.getAllAsync<any>(
      'SELECT * FROM stories WHERE authorId = ? AND expiresAt IS NOT NULL AND expiresAt <= ? ORDER BY createdAt DESC',
      [userId, now]
    );
    return Promise.all(results.map(async (row) => await this.mapToStory(row)));
  }

  async getStoryById(storyId: string): Promise<Story | null> {
    const database = await this.db.getDatabase();
    const result = await database.getFirstAsync<any>(
      'SELECT * FROM stories WHERE id = ?',
      [storyId]
    );

    if (!result) return null;

    return this.mapToStory(result);
  }

  async createStory(story: Omit<Story, 'id' | 'createdAt' | 'views' | 'repliesCount'>): Promise<Story> {
    const database = await this.db.getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const expiresAt = story.expiresAt || new Date(Date.now() + 24 * 3600000).toISOString();
    const mediaId = story.media.id || uuidv4();

    // Insert media first
    await database.runAsync(
      `INSERT INTO media (id, postId, storyId, type, remoteUri, localUri, thumbnailUri, \`order\`, width, height)
       VALUES (?, NULL, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [mediaId, id, story.media.type, story.media.remoteUri || null, story.media.localUri || null,
       story.media.thumbnailUri || null, story.media.width || null, story.media.height || null]
    );

    // Insert story
    await database.runAsync(
      `INSERT INTO stories (id, authorId, mediaId, createdAt, expiresAt, views, repliesCount, isHighlighted, uploadStatus)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?)`,
      [id, story.authorId, mediaId, createdAt, expiresAt, story.uploadStatus || 'pending']
    );

    const createdStory = await this.getStoryById(id);
    return createdStory!;
  }

  async deleteStory(storyId: string): Promise<void> {
    const database = await this.db.getDatabase();
    
    // Delete associated media
    await database.runAsync('DELETE FROM media WHERE storyId = ?', [storyId]);
    
    // Delete associated comments
    await database.runAsync('DELETE FROM comments WHERE storyId = ?', [storyId]);
    
    // Delete the story
    await database.runAsync('DELETE FROM stories WHERE id = ?', [storyId]);
  }

  async incrementViews(storyId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      'UPDATE stories SET views = views + 1 WHERE id = ?',
      [storyId]
    );
  }

  async addReply(storyId: string, authorId: string, text: string): Promise<void> {
    const database = await this.db.getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await database.runAsync(
      `INSERT INTO comments (id, postId, storyId, authorId, text, likesCount, createdAt, replyToCommentId)
       VALUES (?, NULL, ?, ?, ?, 0, ?, NULL)`,
      [id, storyId, authorId, text, createdAt]
    );

    await database.runAsync(
      'UPDATE stories SET repliesCount = repliesCount + 1 WHERE id = ?',
      [storyId]
    );
  }

  async getActiveStoriesGrouped(
    currentUserId: string
  ): Promise<{ authorId: string; stories: Story[] }[]> {
    const database = await this.db.getDatabase();
    const now = new Date().toISOString();

    // Own active stories UNION followed users' active stories
    const rows = await database.getAllAsync<any>(
      `SELECT s.*
       FROM stories s
       WHERE s.authorId = ? AND (s.expiresAt IS NULL OR s.expiresAt > ?)
       UNION
       SELECT s.*
       FROM stories s
       INNER JOIN follows f ON s.authorId = f.followingId
       WHERE f.followerId = ? AND (s.expiresAt IS NULL OR s.expiresAt > ?)
       ORDER BY createdAt DESC`,
      [currentUserId, now, currentUserId, now]
    );

    const storiesResolved: Story[] = await Promise.all(
      rows.map((row: any) => this.mapToStory(row))
    );

    // Group by authorId, current user first
    const groupMap = new Map<string, Story[]>();
    for (const story of storiesResolved) {
      if (!groupMap.has(story.authorId)) {
        groupMap.set(story.authorId, []);
      }
      groupMap.get(story.authorId)!.push(story);
    }

    const groups: { authorId: string; stories: Story[] }[] = [];

    // Current user's group first
    if (groupMap.has(currentUserId)) {
      groups.push({ authorId: currentUserId, stories: groupMap.get(currentUserId)! });
    }

    for (const [authorId, stories] of groupMap.entries()) {
      if (authorId !== currentUserId) {
        groups.push({ authorId, stories });
      }
    }

    return groups;
  }

  async highlightStory(storyId: string, highlightId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      'UPDATE stories SET isHighlighted = 1, highlightId = ? WHERE id = ?',
      [highlightId, storyId]
    );
  }

  async unhighlightStory(storyId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      'UPDATE stories SET isHighlighted = 0, highlightId = NULL WHERE id = ?',
      [storyId]
    );
  }

  async getHighlights(userId: string): Promise<StoryHighlight[]> {
    const database = await this.db.getDatabase();
    const results = await database.getAllAsync<any>(
      'SELECT * FROM story_highlights WHERE userId = ? ORDER BY createdAt DESC',
      [userId]
    );

    return Promise.all(results.map(async (row) => {
      const storyIds = await database.getAllAsync<{ id: string }>(
        'SELECT id FROM stories WHERE highlightId = ? ORDER BY createdAt ASC',
        [row.id]
      );

      return {
        id: row.id,
        userId: row.userId,
        title: row.title,
        coverUri: row.coverUri,
        storyIds: storyIds.map(s => s.id),
        createdAt: row.createdAt,
      };
    }));
  }

  async createHighlight(highlight: Omit<StoryHighlight, 'id' | 'createdAt'>): Promise<StoryHighlight> {
    const database = await this.db.getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await database.runAsync(
      `INSERT INTO story_highlights (id, userId, title, coverUri, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [id, highlight.userId, highlight.title, highlight.coverUri || null, createdAt]
    );

    // Update stories with this highlight ID
    for (const storyId of highlight.storyIds) {
      await this.highlightStory(storyId, id);
    }

    return {
      id,
      ...highlight,
      createdAt,
    };
  }

  async deleteHighlight(highlightId: string): Promise<void> {
    const database = await this.db.getDatabase();
    
    // Unhighlight all stories in this highlight
    await database.runAsync(
      'UPDATE stories SET isHighlighted = 0, highlightId = NULL WHERE highlightId = ?',
      [highlightId]
    );
    
    // Delete the highlight
    await database.runAsync('DELETE FROM story_highlights WHERE id = ?', [highlightId]);
  }

  private async mapToStory(row: any): Promise<Story> {
    const database = await this.db.getDatabase();
    
    // Get media item
    const mediaResult = await database.getFirstAsync<any>(
      'SELECT * FROM media WHERE id = ?',
      [row.mediaId]
    );

    const media: MediaItem = {
      id: mediaResult!.id,
      type: mediaResult!.type,
      remoteUri: mediaResult!.remoteUri,
      localUri: mediaResult!.localUri,
      thumbnailUri: mediaResult!.thumbnailUri,
      order: 0,
      width: mediaResult!.width,
      height: mediaResult!.height,
    };

    return {
      id: row.id,
      authorId: row.authorId,
      media,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      views: row.views ?? 0,
      repliesCount: row.repliesCount ?? 0,
      isHighlighted: row.isHighlighted === 1,
      highlightId: row.highlightId,
      uploadStatus: row.uploadStatus,
    };
  }
}
