export type AnalyticsEntityType = 'post' | 'story' | 'profile';

export interface AnalyticsEvent {
  id: string;
  entityType: AnalyticsEntityType;
  entityId: string;
  eventType: 'view' | 'impression' | 'save' | 'share' | 'like' | 'comment';
  userId?: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  entityType: AnalyticsEntityType;
  entityId: string;
  impressions: number;
  views: number;
  saves: number;
  shares: number;
  likes: number;
  comments: number;
  reach: number;
  period: '7d' | '30d' | '90d';
}

export interface UserAnalytics {
  userId: string;
  totalPosts: number;
  totalStories: number;
  totalFollowers: number;
  totalFollowing: number;
  followersGrowth: number; // percentage
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  totalImpressions: number;
  totalReach: number;
  period: '7d' | '30d' | '90d';
}
