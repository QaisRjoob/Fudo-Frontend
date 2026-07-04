import { Post, PostWithAuthor, MediaItem } from '../models';
import { User } from '../models/User';
import DatabaseService from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export interface IPostRepository {
  getFeed(userId: string, cursor?: string, limit?: number): Promise<PostWithAuthor[]>;
  getPostById(postId: string, currentUserId?: string): Promise<PostWithAuthor | null>;
  getUserPosts(userId: string, currentUserId?: string): Promise<PostWithAuthor[]>;
  createPost(post: Omit<Post, 'id' | 'createdAt' | 'likesCount' | 'commentsCount'>): Promise<PostWithAuthor>;
  updatePost(postId: string, updates: Partial<Post>): Promise<void>;
  deletePost(postId: string): Promise<void>;
  archivePost(postId: string): Promise<void>;
  unarchivePost(postId: string): Promise<void>;
  likePost(userId: string, postId: string): Promise<void>;
  unlikePost(userId: string, postId: string): Promise<void>;
  savePost(userId: string, postId: string): Promise<void>;
  unsavePost(userId: string, postId: string): Promise<void>;
  getSavedPosts(userId: string): Promise<PostWithAuthor[]>;
  isPostLiked(userId: string, postId: string): Promise<boolean>;
  isPostSaved(userId: string, postId: string): Promise<boolean>;
}

export class PostRepository implements IPostRepository {
  private db = DatabaseService;

  async getFeed(userId: string, cursor?: string, limit: number = 20): Promise<PostWithAuthor[]> {
    const database = await this.db.getDatabase();

    // Own posts OR posts by users the current user follows
    let query = `
      SELECT p.*,
        u.id as _authorId, u.username as _username, u.displayName as _displayName,
        u.bio as _bio, u.avatarUri as _avatarUri,
        u.followersCount as _followersCount, u.followingCount as _followingCount,
        u.createdAt as _authorCreatedAt
      FROM posts p
      LEFT JOIN users u ON p.authorId = u.id
      WHERE p.isArchived = 0
        AND (
          p.authorId = ?
          OR p.authorId IN (SELECT followingId FROM follows WHERE followerId = ?)
        )
    `;
    const params: any[] = [userId, userId];

    if (cursor) {
      query += ' AND p.createdAt < ?';
      params.push(cursor);
    }

    query += ' ORDER BY p.createdAt DESC LIMIT ?';
    params.push(limit);

    const results = await database.getAllAsync<any>(query, params);

    return Promise.all(results.map(row => this.mapRowToPost(row, userId)));
  }

  async getPostById(postId: string, currentUserId?: string): Promise<PostWithAuthor | null> {
    const database = await this.db.getDatabase();
    const result = await database.getFirstAsync<any>(
      `SELECT p.*,
        u.id as _authorId, u.username as _username, u.displayName as _displayName,
        u.bio as _bio, u.avatarUri as _avatarUri,
        u.followersCount as _followersCount, u.followingCount as _followingCount,
        u.createdAt as _authorCreatedAt
       FROM posts p
       LEFT JOIN users u ON p.authorId = u.id
       WHERE p.id = ?`,
      [postId]
    );

    if (!result) return null;

    return this.mapRowToPost(result, currentUserId);
  }

  async getUserPosts(userId: string, currentUserId?: string): Promise<PostWithAuthor[]> {
    const database = await this.db.getDatabase();
    const results = await database.getAllAsync<any>(
      `SELECT p.*,
        u.id as _authorId, u.username as _username, u.displayName as _displayName,
        u.bio as _bio, u.avatarUri as _avatarUri,
        u.followersCount as _followersCount, u.followingCount as _followingCount,
        u.createdAt as _authorCreatedAt
       FROM posts p
       LEFT JOIN users u ON p.authorId = u.id
       WHERE p.authorId = ? AND p.isArchived = 0
       ORDER BY p.createdAt DESC`,
      [userId]
    );

    return Promise.all(results.map(row => this.mapRowToPost(row, currentUserId ?? userId)));
  }

  async createPost(post: Omit<Post, 'id' | 'createdAt' | 'likesCount' | 'commentsCount'>): Promise<PostWithAuthor> {
    const database = await this.db.getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const p = post as any;
    await database.runAsync(
      `INSERT INTO posts (id, authorId, caption, title, cookTime, prepTime, servings, difficulty, calories, protein, carbs, fat, ingredients, steps, tags, location, likesCount, commentsCount, createdAt, isArchived, uploadStatus)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, ?)`,
      [
        id, post.authorId, post.caption || null,
        p.title || null,
        p.cookTime || null,
        p.prepTime || null,
        p.servings || null,
        p.difficulty || null,
        p.calories || null,
        p.protein || null,
        p.carbs || null,
        p.fat || null,
        p.ingredients ? JSON.stringify(p.ingredients) : null,
        p.steps ? JSON.stringify(p.steps) : null,
        p.tags ? JSON.stringify(p.tags) : null,
        p.location || null,
        createdAt, post.uploadStatus || 'pending',
      ]
    );

    for (let i = 0; i < post.media.length; i++) {
      const media = post.media[i];
      await database.runAsync(
        `INSERT INTO media (id, postId, type, remoteUri, localUri, thumbnailUri, \`order\`, width, height)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [media.id || uuidv4(), id, media.type, media.remoteUri || null, media.localUri || null,
         media.thumbnailUri || null, i, media.width || null, media.height || null]
      );
    }

    const createdPost = await this.getPostById(id, post.authorId);
    return createdPost!;
  }

  async updatePost(postId: string, updates: Partial<Post>): Promise<void> {
    const database = await this.db.getDatabase();

    const fields: string[] = [];
    const values: any[] = [];

    const u = updates as any;
    if (updates.caption !== undefined) { fields.push('caption = ?'); values.push(updates.caption); }
    if (updates.uploadStatus !== undefined) { fields.push('uploadStatus = ?'); values.push(updates.uploadStatus); }
    if (updates.isArchived !== undefined) { fields.push('isArchived = ?'); values.push(updates.isArchived ? 1 : 0); }
    if (u.title !== undefined) { fields.push('title = ?'); values.push(u.title); }
    if (u.cookTime !== undefined) { fields.push('cookTime = ?'); values.push(u.cookTime); }
    if (u.prepTime !== undefined) { fields.push('prepTime = ?'); values.push(u.prepTime); }
    if (u.servings !== undefined) { fields.push('servings = ?'); values.push(u.servings); }
    if (u.difficulty !== undefined) { fields.push('difficulty = ?'); values.push(u.difficulty); }
    if (u.calories !== undefined) { fields.push('calories = ?'); values.push(u.calories); }
    if (u.protein !== undefined) { fields.push('protein = ?'); values.push(u.protein); }
    if (u.carbs !== undefined) { fields.push('carbs = ?'); values.push(u.carbs); }
    if (u.fat !== undefined) { fields.push('fat = ?'); values.push(u.fat); }
    if (u.ingredients !== undefined) { fields.push('ingredients = ?'); values.push(JSON.stringify(u.ingredients)); }
    if (u.steps !== undefined) { fields.push('steps = ?'); values.push(JSON.stringify(u.steps)); }
    if (u.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(u.tags)); }
    if (u.location !== undefined) { fields.push('location = ?'); values.push(u.location); }

    if (fields.length === 0) return;

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(postId);

    await database.runAsync(
      `UPDATE posts SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deletePost(postId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync('DELETE FROM media WHERE postId = ?', [postId]);
    await database.runAsync('DELETE FROM comments WHERE postId = ?', [postId]);
    await database.runAsync('DELETE FROM likes WHERE postId = ?', [postId]);
    await database.runAsync('DELETE FROM saved_posts WHERE postId = ?', [postId]);
    await database.runAsync('DELETE FROM posts WHERE id = ?', [postId]);
  }

  async archivePost(postId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync('UPDATE posts SET isArchived = 1 WHERE id = ?', [postId]);
  }

  async unarchivePost(postId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync('UPDATE posts SET isArchived = 0 WHERE id = ?', [postId]);
  }

  async likePost(userId: string, postId: string): Promise<void> {
    const database = await this.db.getDatabase();

    await database.runAsync(
      `INSERT OR IGNORE INTO likes (userId, postId, commentId, createdAt) VALUES (?, ?, '', ?)`,
      [userId, postId, new Date().toISOString()]
    );

    await database.runAsync(
      'UPDATE posts SET likesCount = likesCount + 1 WHERE id = ?',
      [postId]
    );
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    const database = await this.db.getDatabase();

    await database.runAsync(
      `DELETE FROM likes WHERE userId = ? AND postId = ? AND (commentId IS NULL OR commentId = '')`,
      [userId, postId]
    );

    await database.runAsync(
      'UPDATE posts SET likesCount = likesCount - 1 WHERE id = ? AND likesCount > 0',
      [postId]
    );
  }

  async savePost(userId: string, postId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      `INSERT OR IGNORE INTO saved_posts (userId, postId, createdAt) VALUES (?, ?, ?)`,
      [userId, postId, new Date().toISOString()]
    );
  }

  async unsavePost(userId: string, postId: string): Promise<void> {
    const database = await this.db.getDatabase();
    await database.runAsync(
      'DELETE FROM saved_posts WHERE userId = ? AND postId = ?',
      [userId, postId]
    );
  }

  async getSavedPosts(userId: string): Promise<PostWithAuthor[]> {
    const database = await this.db.getDatabase();
    const results = await database.getAllAsync<any>(
      `SELECT p.*,
        u.id as _authorId, u.username as _username, u.displayName as _displayName,
        u.bio as _bio, u.avatarUri as _avatarUri,
        u.followersCount as _followersCount, u.followingCount as _followingCount,
        u.createdAt as _authorCreatedAt
       FROM posts p
       LEFT JOIN users u ON p.authorId = u.id
       INNER JOIN saved_posts sp ON p.id = sp.postId
       WHERE sp.userId = ?
       ORDER BY sp.createdAt DESC`,
      [userId]
    );

    return Promise.all(results.map(row => this.mapRowToPost(row, userId)));
  }

  async getExplorePosts(userId: string, tag?: string, limit = 30, offset = 0): Promise<PostWithAuthor[]> {
    const database = await this.db.getDatabase();
    const base = `
      SELECT p.*,
        u.id as _authorId, u.username as _username, u.displayName as _displayName,
        u.bio as _bio, u.avatarUri as _avatarUri,
        u.followersCount as _followersCount, u.followingCount as _followingCount,
        u.createdAt as _authorCreatedAt
      FROM posts p
      LEFT JOIN users u ON p.authorId = u.id
      WHERE p.isArchived = 0
    `;
    let query: string;
    let params: any[];
    if (tag && tag !== 'All') {
      query = base + ` AND (p.tags LIKE ? OR p.title LIKE ? OR p.caption LIKE ?) ORDER BY p.likesCount DESC, p.createdAt DESC LIMIT ? OFFSET ?`;
      const like = `%${tag}%`;
      params = [like, like, like, limit, offset];
    } else {
      query = base + ` ORDER BY p.likesCount DESC, p.createdAt DESC LIMIT ? OFFSET ?`;
      params = [limit, offset];
    }
    const results = await database.getAllAsync<any>(query, params);
    return Promise.all(results.map(row => this.mapRowToPost(row, userId)));
  }

  async searchPosts(query: string, userId?: string): Promise<PostWithAuthor[]> {
    const database = await this.db.getDatabase();
    const like = `%${query}%`;
    const results = await database.getAllAsync<any>(
      `SELECT p.*,
         u.id as _authorId, u.username as _username, u.displayName as _displayName,
         u.bio as _bio, u.avatarUri as _avatarUri,
         u.followersCount as _followersCount, u.followingCount as _followingCount,
         u.createdAt as _authorCreatedAt
       FROM posts p
       LEFT JOIN users u ON p.authorId = u.id
       WHERE p.isArchived = 0
         AND (p.title LIKE ? OR p.caption LIKE ? OR p.tags LIKE ?)
       ORDER BY p.likesCount DESC, p.createdAt DESC
       LIMIT 40`,
      [like, like, like]
    );
    return Promise.all(results.map(row => this.mapRowToPost(row, userId)));
  }

  async getReels(userId: string, limit = 10, offset = 0): Promise<PostWithAuthor[]> {
    const database = await this.db.getDatabase();
    const results = await database.getAllAsync<any>(
      `SELECT DISTINCT p.*,
         u.id as _authorId, u.username as _username, u.displayName as _displayName,
         u.bio as _bio, u.avatarUri as _avatarUri,
         u.followersCount as _followersCount, u.followingCount as _followingCount,
         u.createdAt as _authorCreatedAt
       FROM posts p
       LEFT JOIN users u ON p.authorId = u.id
       INNER JOIN media m ON m.postId = p.id AND m.type = 'video'
       WHERE p.isArchived = 0
       ORDER BY p.createdAt DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return Promise.all(results.map(row => this.mapRowToPost(row, userId)));
  }

  async getArchivedPosts(userId: string): Promise<PostWithAuthor[]> {
    const database = await this.db.getDatabase();
    const results = await database.getAllAsync<any>(
      `SELECT p.*,
        u.id as _authorId, u.username as _username, u.displayName as _displayName,
        u.bio as _bio, u.avatarUri as _avatarUri,
        u.followersCount as _followersCount, u.followingCount as _followingCount,
        u.createdAt as _authorCreatedAt
       FROM posts p
       LEFT JOIN users u ON p.authorId = u.id
       WHERE p.authorId = ? AND p.isArchived = 1
       ORDER BY p.createdAt DESC`,
      [userId]
    );
    return Promise.all(results.map(row => this.mapRowToPost(row, userId)));
  }

  async isPostLiked(userId: string, postId: string): Promise<boolean> {
    const database = await this.db.getDatabase();
    const result = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM likes WHERE userId = ? AND postId = ? AND (commentId IS NULL OR commentId = '')`,
      [userId, postId]
    );
    return (result?.count ?? 0) > 0;
  }

  async isPostSaved(userId: string, postId: string): Promise<boolean> {
    const database = await this.db.getDatabase();
    const result = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM saved_posts WHERE userId = ? AND postId = ?',
      [userId, postId]
    );
    return (result?.count ?? 0) > 0;
  }

  // Single method that builds a PostWithAuthor from a JOIN row (avoids N+1)
  private async mapRowToPost(row: any, userId?: string): Promise<PostWithAuthor> {
    const database = await this.db.getDatabase();

    // Fetch media for this post
    const mediaResults = await database.getAllAsync<any>(
      'SELECT * FROM media WHERE postId = ? ORDER BY `order` ASC',
      [row.id]
    );

    const media: MediaItem[] = mediaResults.map(m => ({
      id: m.id,
      type: m.type,
      remoteUri: m.remoteUri,
      localUri: m.localUri,
      thumbnailUri: m.thumbnailUri,
      order: m.order,
      width: m.width,
      height: m.height,
    }));

    // Build author from JOIN columns (prefixed with _)
    const author: User | undefined = row._authorId ? {
      id: row._authorId,
      username: row._username,
      displayName: row._displayName,
      bio: row._bio || '',
      avatarUri: row._avatarUri,
      profilePicture: row._avatarUri,
      followersCount: row._followersCount ?? 0,
      followingCount: row._followingCount ?? 0,
      isFollowing: false,
      isPrivate: false,
      isBlocked: false,
      hasStory: false,
      createdAt: row._authorCreatedAt,
    } : undefined;

    const parseJson = (val: any): string[] | undefined => {
      if (!val) return undefined;
      try { return JSON.parse(val); } catch { return undefined; }
    };

    const post: PostWithAuthor = {
      id: row.id,
      authorId: row.authorId,
      caption: row.caption,
      title: row.title,
      cookTime: row.cookTime ?? undefined,
      prepTime: row.prepTime ?? undefined,
      servings: row.servings ?? undefined,
      difficulty: row.difficulty ?? undefined,
      calories: row.calories ?? undefined,
      protein: row.protein ?? undefined,
      carbs: row.carbs ?? undefined,
      fat: row.fat ?? undefined,
      ingredients: parseJson(row.ingredients),
      steps: parseJson(row.steps),
      tags: parseJson(row.tags),
      location: row.location,
      media,
      likesCount: row.likesCount ?? 0,
      commentsCount: row.commentsCount ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isArchived: row.isArchived === 1,
      uploadStatus: row.uploadStatus,
      author,
    };

    if (userId) {
      post.isLiked = await this.isPostLiked(userId, row.id);
      post.isSaved = await this.isPostSaved(userId, row.id);
    }

    return post;
  }

  async getPostLikers(postId: string, currentUserId: string): Promise<User[]> {
    const database = await this.db.getDatabase();
    const rows = await database.getAllAsync<any>(
      `SELECT u.*,
              MAX(CASE WHEN f.followingId IS NOT NULL THEN 1 ELSE 0 END) AS isFollowing
       FROM users u
       INNER JOIN likes l ON u.id = l.userId
       LEFT JOIN follows f ON f.followerId = ? AND f.followingId = u.id
       WHERE l.postId = ? AND (l.commentId IS NULL OR l.commentId = '')
       GROUP BY u.id
       ORDER BY MAX(l.createdAt) DESC`,
      [currentUserId, postId]
    );
    return rows.map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      email: row.email,
      bio: row.bio || '',
      avatarUri: row.avatarUri,
      profilePicture: row.avatarUri,
      followersCount: row.followersCount ?? 0,
      followingCount: row.followingCount ?? 0,
      isFollowing: Boolean(row.isFollowing),
      isPrivate: false,
      isBlocked: false,
      hasStory: false,
      createdAt: row.createdAt,
    }));
  }
}
