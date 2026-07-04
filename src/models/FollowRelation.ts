/**
 * FollowRelation Model
 * Represents the relationship between two users (follower and following)
 */

export type FollowStatus = 'approved' | 'pending' | 'blocked';

export interface FollowRelation {
  id: string;
  followerId: string;      // User who is following
  followingId: string;     // User being followed
  status: FollowStatus;    // approved, pending (for private accounts), blocked
  createdAt: string;       // ISO timestamp
  updatedAt?: string;      // ISO timestamp
}

/**
 * Helper type for follow statistics
 */
export interface FollowStats {
  followersCount: number;
  followingCount: number;
  pendingRequestsCount: number;
}
