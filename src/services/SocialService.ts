/**
 * SocialService
 * Manages all social interactions: follows, likes, comments, notifications
 * Uses in-memory static data for now (will be replaced with API calls later)
 */

import { 
  STATIC_USERS, 
  STATIC_POSTS, 
  STATIC_FOLLOW_RELATIONS, 
  STATIC_NOTIFICATIONS,
  STATIC_COMMENTS,
  STATIC_POST_LIKES,
  STATIC_POST_SAVES,
} from '../data/staticData';
import { User, UserWithRelation } from '../models/User';
import { Post, PostWithAuthor } from '../models/Post';
import { FollowRelation, FollowStatus } from '../models/FollowRelation';
import { Notification, NotificationFactory } from '../models/Notification';
import { Comment, CommentWithAuthor } from '../models/Comment';

/**
 * In-memory data store (simulates database)
 */
class DataStore {
  users: User[] = [...STATIC_USERS];
  posts: Post[] = [...STATIC_POSTS];
  followRelations: FollowRelation[] = [...STATIC_FOLLOW_RELATIONS];
  notifications: Notification[] = [...STATIC_NOTIFICATIONS];
  comments: Comment[] = [...STATIC_COMMENTS];
  postLikes: { userId: string; postId: string; createdAt: string }[] = [...STATIC_POST_LIKES];
  postSaves: { userId: string; postId: string; createdAt: string }[] = [...STATIC_POST_SAVES];

  // Reset to initial state (useful for testing)
  reset() {
    this.users = [...STATIC_USERS];
    this.posts = [...STATIC_POSTS];
    this.followRelations = [...STATIC_FOLLOW_RELATIONS];
    this.notifications = [...STATIC_NOTIFICATIONS];
    this.comments = [...STATIC_COMMENTS];
    this.postLikes = [...STATIC_POST_LIKES];
    this.postSaves = [...STATIC_POST_SAVES];
  }
}

export class SocialService {
  private static instance: SocialService;
  private store: DataStore;

  private constructor() {
    this.store = new DataStore();
  }

  static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  /**
   * Reset all data to initial state
   */
  resetData() {
    this.store.reset();
  }

  // ============================================
  // USER OPERATIONS
  // ============================================

  /**
   * Get user by ID
   */
  getUserById(userId: string): User | null {
    return this.store.users.find(u => u.id === userId) || null;
  }

  /**
   * Get current user (hardcoded for now)
   */
  getCurrentUser(): User | null {
    return this.getUserById('current_user');
  }

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, updates: Partial<User>): User | null {
    const userIndex = this.store.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;

    this.store.users[userIndex] = {
      ...this.store.users[userIndex],
      ...updates,
      id: userId, // Prevent ID change
    };

    return this.store.users[userIndex];
  }

  /**
   * Get user with relationship status relative to current user
   */
  getUserWithRelation(userId: string, currentUserId: string): UserWithRelation | null {
    const user = this.getUserById(userId);
    if (!user) return null;

    const relation = this.getFollowRelation(currentUserId, userId);
    const followStatus = relation 
      ? (relation.status === 'approved' ? 'following' : relation.status)
      : 'not_following';

    return {
      ...user,
      followStatus: followStatus as any,
      isCurrentUser: userId === currentUserId,
    };
  }

  // ============================================
  // FOLLOW OPERATIONS
  // ============================================

  /**
   * Get follow relation between two users
   */
  getFollowRelation(followerId: string, followingId: string): FollowRelation | null {
    return this.store.followRelations.find(
      r => r.followerId === followerId && r.followingId === followingId && r.status !== 'blocked'
    ) || null;
  }

  /**
   * Check if user A follows user B
   */
  isFollowing(followerId: string, followingId: string): boolean {
    const relation = this.getFollowRelation(followerId, followingId);
    return relation?.status === 'approved';
  }

  /**
   * Check if follow request is pending
   */
  isPending(followerId: string, followingId: string): boolean {
    const relation = this.getFollowRelation(followerId, followingId);
    return relation?.status === 'pending';
  }

  /**
   * Follow a user (or send follow request if private)
   */
  followUser(followerId: string, followingId: string): { success: boolean; status: FollowStatus; message: string } {
    // Can't follow yourself
    if (followerId === followingId) {
      return { success: false, status: 'approved', message: "You can't follow yourself" };
    }

    const targetUser = this.getUserById(followingId);
    if (!targetUser) {
      return { success: false, status: 'approved', message: 'User not found' };
    }

    // Check if already following
    const existingRelation = this.getFollowRelation(followerId, followingId);
    if (existingRelation) {
      return { success: false, status: existingRelation.status, message: 'Already following or request pending' };
    }

    // Determine status based on account privacy
    const status: FollowStatus = targetUser.isPrivate ? 'pending' : 'approved';

    // Create follow relation
    const newRelation: FollowRelation = {
      id: `follow_${Date.now()}_${Math.random()}`,
      followerId,
      followingId,
      status,
      createdAt: new Date().toISOString(),
    };

    this.store.followRelations.push(newRelation);

    // Update follower counts if approved
    if (status === 'approved') {
      this.updateFollowerCounts(followerId, followingId, 1);
    }

    // Create notification
    const notification = status === 'pending'
      ? NotificationFactory.createFollowRequestNotification(followerId, followingId)
      : NotificationFactory.createFollowNotification(followerId, followingId);
    
    this.store.notifications.unshift(notification);

    return { 
      success: true, 
      status, 
      message: status === 'pending' ? 'Follow request sent' : 'Now following' 
    };
  }

  /**
   * Unfollow a user
   */
  unfollowUser(followerId: string, followingId: string): boolean {
    const relationIndex = this.store.followRelations.findIndex(
      r => r.followerId === followerId && r.followingId === followingId
    );

    if (relationIndex === -1) return false;

    const relation = this.store.followRelations[relationIndex];
    const wasApproved = relation.status === 'approved';

    // Remove relation
    this.store.followRelations.splice(relationIndex, 1);

    // Update follower counts if was approved
    if (wasApproved) {
      this.updateFollowerCounts(followerId, followingId, -1);
    }

    return true;
  }

  /**
   * Approve follow request (for private accounts)
   */
  approveFollowRequest(followerId: string, followingId: string): boolean {
    const relation = this.getFollowRelation(followerId, followingId);
    if (!relation || relation.status !== 'pending') return false;

    // Update status
    relation.status = 'approved';
    relation.updatedAt = new Date().toISOString();

    // Update follower counts
    this.updateFollowerCounts(followerId, followingId, 1);

    // Create notification
    const notification = NotificationFactory.createFollowApprovedNotification(followingId, followerId);
    this.store.notifications.unshift(notification);

    return true;
  }

  /**
   * Reject follow request
   */
  rejectFollowRequest(followerId: string, followingId: string): boolean {
    const relationIndex = this.store.followRelations.findIndex(
      r => r.followerId === followerId && r.followingId === followingId && r.status === 'pending'
    );

    if (relationIndex === -1) return false;

    this.store.followRelations.splice(relationIndex, 1);
    return true;
  }

  /**
   * Get pending follow requests for a user
   */
  getPendingFollowRequests(userId: string): UserWithRelation[] {
    const pendingRelations = this.store.followRelations.filter(
      r => r.followingId === userId && r.status === 'pending'
    );

    return pendingRelations
      .map(r => this.getUserWithRelation(r.followerId, userId))
      .filter(u => u !== null) as UserWithRelation[];
  }

  /**
   * Get followers of a user
   */
  getFollowers(userId: string): User[] {
    const followerIds = this.store.followRelations
      .filter(r => r.followingId === userId && r.status === 'approved')
      .map(r => r.followerId);

    return followerIds
      .map(id => this.getUserById(id))
      .filter(u => u !== null) as User[];
  }

  /**
   * Get users that a user is following
   */
  getFollowing(userId: string): User[] {
    const followingIds = this.store.followRelations
      .filter(r => r.followerId === userId && r.status === 'approved')
      .map(r => r.followingId);

    return followingIds
      .map(id => this.getUserById(id))
      .filter(u => u !== null) as User[];
  }

  /**
   * Update follower/following counts
   */
  private updateFollowerCounts(followerId: string, followingId: string, delta: number) {
    const follower = this.store.users.find(u => u.id === followerId);
    const following = this.store.users.find(u => u.id === followingId);

    if (follower) follower.followingCount += delta;
    if (following) following.followersCount += delta;
  }

  // ============================================
  // POST OPERATIONS
  // ============================================

  /**
   * Create a new post
   */
  createPost(authorId: string, caption: string, mediaUrls: string[]): Post {
    const newPost: Post = {
      id: `post_${Date.now()}_${Math.random()}`,
      authorId,
      caption,
      media: mediaUrls.map((url, index) => ({
        id: `media_${Date.now()}_${index}`,
        postId: `post_${Date.now()}_${Math.random()}`,
        url,
        type: 'image',
        order: index,
      })),
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      isArchived: false,
    };

    this.store.posts.unshift(newPost); // Add to beginning
    return newPost;
  }

  /**
   * Delete a post (only owner can delete)
   */
  deletePost(postId: string, userId: string): boolean {
    const postIndex = this.store.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return false;

    const post = this.store.posts[postIndex];
    
    // Check ownership
    if (post.authorId !== userId) return false;

    // Remove post
    this.store.posts.splice(postIndex, 1);

    // Remove associated comments
    this.store.comments = this.store.comments.filter(c => c.postId !== postId);

    // Remove associated likes
    this.store.postLikes = this.store.postLikes.filter(l => l.postId !== postId);

    // Remove associated saves
    this.store.postSaves = this.store.postSaves.filter(s => s.postId !== postId);

    return true;
  }

  /**
   * Get posts by user (respects privacy)
   */
  getUserPosts(userId: string, viewerId: string): PostWithAuthor[] {
    const user = this.getUserById(userId);
    if (!user) return [];

    // If private account and viewer is not following, return empty
    if (user.isPrivate && userId !== viewerId && !this.isFollowing(viewerId, userId)) {
      return [];
    }

    const userPosts = this.store.posts.filter(p => p.authorId === userId && !p.isArchived);
    return this.enrichPostsWithAuthor(userPosts, viewerId);
  }

  /**
   * Get feed for a user (posts from users they follow)
   */
  getFeedForUser(userId: string): PostWithAuthor[] {
    const followingIds = this.store.followRelations
      .filter(r => r.followerId === userId && r.status === 'approved')
      .map(r => r.followingId);

    // Include own posts in feed
    followingIds.push(userId);

    const feedPosts = this.store.posts.filter(p => 
      followingIds.includes(p.authorId) && !p.isArchived
    );

    // Sort by creation date (newest first)
    feedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return this.enrichPostsWithAuthor(feedPosts, userId);
  }

  /**
   * Enrich posts with author info and like/save status
   */
  private enrichPostsWithAuthor(posts: Post[], viewerId: string): PostWithAuthor[] {
    return posts.map(post => {
      const author = this.getUserById(post.authorId);
      const isLiked = this.store.postLikes.some(l => l.userId === viewerId && l.postId === post.id);
      const isSaved = this.store.postSaves.some(s => s.userId === viewerId && s.postId === post.id);

      return {
        ...post,
        author: author || undefined,
        isLiked,
        isSaved,
        isLikedByCurrentUser: isLiked,
        isSavedByCurrentUser: isSaved,
      };
    });
  }

  // ============================================
  // LIKE OPERATIONS
  // ============================================

  /**
   * Toggle like on a post
   */
  toggleLike(userId: string, postId: string): { liked: boolean; likesCount: number } {
    const post = this.store.posts.find(p => p.id === postId);
    if (!post) return { liked: false, likesCount: 0 };

    const likeIndex = this.store.postLikes.findIndex(
      l => l.userId === userId && l.postId === postId
    );

    if (likeIndex >= 0) {
      // Unlike
      this.store.postLikes.splice(likeIndex, 1);
      post.likesCount = Math.max(0, post.likesCount - 1);
      return { liked: false, likesCount: post.likesCount };
    } else {
      // Like
      this.store.postLikes.push({
        userId,
        postId,
        createdAt: new Date().toISOString(),
      });
      post.likesCount += 1;

      // Create notification (don't notify yourself)
      if (post.authorId !== userId) {
        const notification = NotificationFactory.createLikeNotification(userId, post.authorId, postId);
        this.store.notifications.unshift(notification);
      }

      return { liked: true, likesCount: post.likesCount };
    }
  }

  /**
   * Check if user liked a post
   */
  hasLiked(userId: string, postId: string): boolean {
    return this.store.postLikes.some(l => l.userId === userId && l.postId === postId);
  }

  // ============================================
  // SAVE OPERATIONS
  // ============================================

  /**
   * Toggle save on a post
   */
  toggleSave(userId: string, postId: string): boolean {
    const saveIndex = this.store.postSaves.findIndex(
      s => s.userId === userId && s.postId === postId
    );

    if (saveIndex >= 0) {
      // Unsave
      this.store.postSaves.splice(saveIndex, 1);
      return false;
    } else {
      // Save
      this.store.postSaves.push({
        userId,
        postId,
        createdAt: new Date().toISOString(),
      });
      return true;
    }
  }

  /**
   * Get saved posts for a user
   */
  getSavedPosts(userId: string): PostWithAuthor[] {
    const savedPostIds = this.store.postSaves
      .filter(s => s.userId === userId)
      .map(s => s.postId);

    const savedPosts = this.store.posts.filter(p => savedPostIds.includes(p.id));
    return this.enrichPostsWithAuthor(savedPosts, userId);
  }

  // ============================================
  // COMMENT OPERATIONS
  // ============================================

  /**
   * Add comment to a post
   */
  addComment(userId: string, postId: string, text: string): Comment {
    const post = this.store.posts.find(p => p.id === postId);
    if (post) {
      post.commentsCount += 1;
    }

    const newComment: Comment = {
      id: `comment_${Date.now()}_${Math.random()}`,
      postId,
      authorId: userId,
      text,
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };

    this.store.comments.push(newComment);

    // Create notification (don't notify yourself)
    if (post && post.authorId !== userId) {
      const notification = NotificationFactory.createCommentNotification(
        userId,
        post.authorId,
        postId,
        newComment.id
      );
      this.store.notifications.unshift(notification);
    }

    return newComment;
  }

  /**
   * Get comments for a post
   */
  getPostComments(postId: string): CommentWithAuthor[] {
    const comments = this.store.comments.filter(c => c.postId === postId && !c.isDeleted);
    
    return comments.map(comment => {
      const author = this.getUserById(comment.authorId);
      return {
        ...comment,
        author: author ? {
          id: author.id,
          username: author.username,
          displayName: author.displayName || author.username,
          avatarUri: author.avatarUri,
          profilePicture: author.profilePicture,
        } : undefined,
      };
    });
  }

  /**
   * Delete comment (only owner can delete)
   */
  deleteComment(commentId: string, userId: string): boolean {
    const comment = this.store.comments.find(c => c.id === commentId);
    if (!comment || comment.authorId !== userId) return false;

    comment.isDeleted = true;

    // Decrease post comment count
    const post = this.store.posts.find(p => p.id === comment.postId);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
    }

    return true;
  }

  // ============================================
  // NOTIFICATION OPERATIONS
  // ============================================

  /**
   * Get notifications for a user
   */
  getNotifications(userId: string): Notification[] {
    return this.store.notifications
      .filter(n => n.recipientId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): boolean {
    const notification = this.store.notifications.find(n => n.id === notificationId);
    if (!notification) return false;

    notification.isRead = true;
    return true;
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllNotificationsAsRead(userId: string): number {
    const userNotifications = this.store.notifications.filter(
      n => n.recipientId === userId && !n.isRead
    );

    userNotifications.forEach(n => n.isRead = true);
    return userNotifications.length;
  }
}

// Export singleton instance
export const socialService = SocialService.getInstance();
