import { AnalyticsEvent, AnalyticsSummary, UserAnalytics, AnalyticsEntityType } from '../models';
import DatabaseService from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export interface IAnalyticsRepository {
  trackEvent(event: Omit<AnalyticsEvent, 'id' | 'createdAt'>): Promise<void>;
  getEntitySummary(entityType: AnalyticsEntityType, entityId: string, period: '7d' | '30d' | '90d'): Promise<AnalyticsSummary>;
  getUserAnalytics(userId: string, period: '7d' | '30d' | '90d'): Promise<UserAnalytics>;
}

export class AnalyticsRepository implements IAnalyticsRepository {
  private db = DatabaseService;

  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'createdAt'>): Promise<void> {
    const database = await this.db.getDatabase();
    const id = uuidv4();
    const createdAt = new Date().toISOString();

    await database.runAsync(
      `INSERT INTO analytics_events (id, entityType, entityId, eventType, userId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, event.entityType, event.entityId, event.eventType, event.userId || null, createdAt]
    );
  }

  async getEntitySummary(
    entityType: AnalyticsEntityType, 
    entityId: string, 
    period: '7d' | '30d' | '90d'
  ): Promise<AnalyticsSummary> {
    const database = await this.db.getDatabase();
    const cutoffDate = this.getCutoffDate(period);

    const results = await database.getAllAsync<{ eventType: string; count: number }>(
      `SELECT eventType, COUNT(*) as count 
       FROM analytics_events 
       WHERE entityType = ? AND entityId = ? AND createdAt >= ?
       GROUP BY eventType`,
      [entityType, entityId, cutoffDate]
    );

    const summary: AnalyticsSummary = {
      entityType,
      entityId,
      impressions: 0,
      views: 0,
      saves: 0,
      shares: 0,
      likes: 0,
      comments: 0,
      reach: 0,
      period,
    };

    for (const result of results) {
      switch (result.eventType) {
        case 'impression':
          summary.impressions = result.count;
          break;
        case 'view':
          summary.views = result.count;
          break;
        case 'save':
          summary.saves = result.count;
          break;
        case 'share':
          summary.shares = result.count;
          break;
        case 'like':
          summary.likes = result.count;
          break;
        case 'comment':
          summary.comments = result.count;
          break;
      }
    }

    // Calculate reach (unique users)
    const reachResult = await database.getFirstAsync<{ reach: number }>(
      `SELECT COUNT(DISTINCT userId) as reach 
       FROM analytics_events 
       WHERE entityType = ? AND entityId = ? AND createdAt >= ? AND userId IS NOT NULL`,
      [entityType, entityId, cutoffDate]
    );

    summary.reach = reachResult?.reach ?? 0;

    return summary;
  }

  async getUserAnalytics(userId: string, period: '7d' | '30d' | '90d'): Promise<UserAnalytics> {
    const database = await this.db.getDatabase();
    const cutoffDate = this.getCutoffDate(period);

    // Get total posts and stories
    const postCount = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM posts WHERE authorId = ? AND isArchived = 0',
      [userId]
    );

    const storyCount = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM stories WHERE authorId = ?',
      [userId]
    );

    // Get followers/following count
    const userInfo = await database.getFirstAsync<any>(
      'SELECT followersCount, followingCount FROM users WHERE id = ?',
      [userId]
    );

    // Calculate followers growth (simplified - comparing to a week/month ago)
    const oldFollowersCount = await this.getHistoricalFollowersCount(userId, period);
    const followersGrowth = userInfo ? 
      ((userInfo.followersCount - oldFollowersCount) / Math.max(oldFollowersCount, 1)) * 100 : 0;

    // Get average likes and comments per post
    const postStats = await database.getFirstAsync<{ avgLikes: number; avgComments: number }>(
      `SELECT 
         AVG(likesCount) as avgLikes,
         AVG(commentsCount) as avgComments
       FROM posts 
       WHERE authorId = ? AND isArchived = 0 AND createdAt >= ?`,
      [userId, cutoffDate]
    );

    // Get total impressions and reach from analytics
    const impressionsResult = await database.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total 
       FROM analytics_events ae
       INNER JOIN posts p ON ae.entityId = p.id
       WHERE p.authorId = ? AND ae.eventType = 'impression' AND ae.createdAt >= ?`,
      [userId, cutoffDate]
    );

    const reachResult = await database.getFirstAsync<{ total: number }>(
      `SELECT COUNT(DISTINCT ae.userId) as total 
       FROM analytics_events ae
       INNER JOIN posts p ON ae.entityId = p.id
       WHERE p.authorId = ? AND ae.createdAt >= ? AND ae.userId IS NOT NULL`,
      [userId, cutoffDate]
    );

    return {
      userId,
      totalPosts: postCount?.count ?? 0,
      totalStories: storyCount?.count ?? 0,
      totalFollowers: userInfo?.followersCount ?? 0,
      totalFollowing: userInfo?.followingCount ?? 0,
      followersGrowth: Math.round(followersGrowth * 10) / 10,
      avgLikesPerPost: Math.round((postStats?.avgLikes ?? 0) * 10) / 10,
      avgCommentsPerPost: Math.round((postStats?.avgComments ?? 0) * 10) / 10,
      totalImpressions: impressionsResult?.total ?? 0,
      totalReach: reachResult?.total ?? 0,
      period,
    };
  }

  private getCutoffDate(period: '7d' | '30d' | '90d'): string {
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 3600000);
    return cutoff.toISOString();
  }

  private async getHistoricalFollowersCount(userId: string, period: '7d' | '30d' | '90d'): Promise<number> {
    // Simplified: assume 10% less followers in the past
    // In a real app, you'd track this in a separate table
    const database = await this.db.getDatabase();
    const user = await database.getFirstAsync<{ followersCount: number }>(
      'SELECT followersCount FROM users WHERE id = ?',
      [userId]
    );

    if (!user) return 0;

    const growthFactor = period === '7d' ? 0.02 : period === '30d' ? 0.05 : 0.10;
    return Math.floor(user.followersCount * (1 - growthFactor));
  }
}
