import { User } from '../models';
import DatabaseService from '../db/database';
import { AuthService } from '../services/AuthService';

export interface IUserRepository {
  getCurrentUser(): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  searchUsers(query: string): Promise<User[]>;
  followUser(userId: string, targetUserId: string): Promise<void>;
  unfollowUser(userId: string, targetUserId: string): Promise<void>;
  isFollowing(userId: string, targetUserId: string): Promise<boolean>;
  updateUser(user: Partial<User> & { id: string }): Promise<void>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
  getSuggestedUsers(userId: string, limit?: number): Promise<User[]>;
}

export class UserRepository implements IUserRepository {
  private db = DatabaseService;

  async getCurrentUser(): Promise<User | null> {
    let userId = AuthService.getCurrentUserId();

    if (!userId) {
      // In-memory cleared (app reload) — try the persisted auth session key
      const restoredId = await AuthService.restorePersistedSession();
      userId = restoredId ?? null;
    }

    if (userId) {
      return this.getUserById(userId);
    }

    // No authenticated session — demo/anonymous mode
    return this.getUserById('current-user');
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const database = await this.db.getDatabase();
      const result = await database.getFirstAsync<any>(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      if (!result) return null;

      return this.mapToUser(result);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const database = await this.db.getDatabase();
      const result = await database.getFirstAsync<any>(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (!result) return null;

      return this.mapToUser(result);
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    try {
      const database = await this.db.getDatabase();
      const results = await database.getAllAsync<any>(
        `SELECT * FROM users
         WHERE username LIKE ? OR displayName LIKE ?
         LIMIT 20`,
        [`%${query}%`, `%${query}%`]
      );

      return results.map(row => this.mapToUser(row));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async followUser(userId: string, targetUserId: string): Promise<void> {
    const database = await this.db.getDatabase();

    await database.runAsync(
      `INSERT OR IGNORE INTO follows (followerId, followingId, createdAt)
       VALUES (?, ?, ?)`,
      [userId, targetUserId, new Date().toISOString()]
    );

    await database.runAsync(
      'UPDATE users SET followingCount = followingCount + 1 WHERE id = ?',
      [userId]
    );
    await database.runAsync(
      'UPDATE users SET followersCount = followersCount + 1 WHERE id = ?',
      [targetUserId]
    );
  }

  async unfollowUser(userId: string, targetUserId: string): Promise<void> {
    const database = await this.db.getDatabase();

    await database.runAsync(
      'DELETE FROM follows WHERE followerId = ? AND followingId = ?',
      [userId, targetUserId]
    );

    await database.runAsync(
      'UPDATE users SET followingCount = followingCount - 1 WHERE id = ? AND followingCount > 0',
      [userId]
    );
    await database.runAsync(
      'UPDATE users SET followersCount = followersCount - 1 WHERE id = ? AND followersCount > 0',
      [targetUserId]
    );
  }

  async isFollowing(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const database = await this.db.getDatabase();
      const result = await database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM follows WHERE followerId = ? AND followingId = ?',
        [userId, targetUserId]
      );

      return (result?.count ?? 0) > 0;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  async updateUser(user: Partial<User> & { id: string }): Promise<void> {
    const database = await this.db.getDatabase();

    const fields: string[] = [];
    const values: any[] = [];

    if (user.username !== undefined) { fields.push('username = ?'); values.push(user.username); }
    if (user.displayName !== undefined) { fields.push('displayName = ?'); values.push(user.displayName); }
    if (user.bio !== undefined) { fields.push('bio = ?'); values.push(user.bio); }
    if (user.avatarUri !== undefined) { fields.push('avatarUri = ?'); values.push(user.avatarUri); }
    if (user.socialLinks !== undefined) { fields.push('socialLinks = ?'); values.push(JSON.stringify(user.socialLinks)); }

    if (fields.length === 0) return;

    values.push(user.id);

    await database.runAsync(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  async getFollowers(userId: string): Promise<User[]> {
    try {
      const database = await this.db.getDatabase();
      const results = await database.getAllAsync<any>(
        `SELECT DISTINCT u.* FROM users u
         INNER JOIN follows f ON u.id = f.followerId
         WHERE f.followingId = ?
         ORDER BY f.createdAt DESC`,
        [userId]
      );

      return results.map(row => this.mapToUser(row));
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  }

  async getFollowing(userId: string): Promise<User[]> {
    try {
      const database = await this.db.getDatabase();
      const results = await database.getAllAsync<any>(
        `SELECT DISTINCT u.* FROM users u
         INNER JOIN follows f ON u.id = f.followingId
         WHERE f.followerId = ?
         ORDER BY f.createdAt DESC`,
        [userId]
      );

      return results.map(row => this.mapToUser(row));
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  }

  // Returns users the given user is NOT already following (excluding themselves)
  async getSuggestedUsers(userId: string, limit: number = 10, offset: number = 0): Promise<User[]> {
    try {
      const database = await this.db.getDatabase();
      const results = await database.getAllAsync<any>(
        `SELECT u.* FROM users u
         WHERE u.id != ?
           AND u.id NOT IN (
             SELECT followingId FROM follows WHERE followerId = ?
           )
         ORDER BY u.followersCount DESC
         LIMIT ? OFFSET ?`,
        [userId, userId, limit, offset]
      );

      return results.map(row => ({ ...this.mapToUser(row), isFollowing: false }));
    } catch (error) {
      console.error('Error getting suggested users:', error);
      return [];
    }
  }

  mapToUser(row: any): User {
    let socialLinks;
    try { socialLinks = row.socialLinks ? JSON.parse(row.socialLinks) : undefined; } catch (_) {}
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.displayName,
      bio: row.bio || '',
      avatarUri: row.avatarUri,
      profilePicture: row.avatarUri,
      socialLinks,
      followersCount: row.followersCount ?? 0,
      followingCount: row.followingCount ?? 0,
      isFollowing: row.isFollowing === 1 || row.isFollowing === true || false,
      isPrivate: false,
      isBlocked: false,
      hasStory: false,
      createdAt: row.createdAt,
    };
  }
}
