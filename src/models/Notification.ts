/**
 * Notification Model
 * Represents various types of notifications in the app
 */

export type NotificationType = 
  | 'follow' 
  | 'follow_request' 
  | 'follow_approved'
  | 'unfollow' 
  | 'like' 
  | 'comment' 
  | 'mention'
  | 'post_deleted';

export interface Notification {
  id: string;
  recipientId: string;        // User receiving the notification
  actorId: string;            // User who triggered the notification
  type: NotificationType;
  postId?: string;            // Associated post (for likes, comments)
  commentId?: string;         // Associated comment
  message: string;            // Human-readable notification text
  isRead: boolean;
  createdAt: string;          // ISO timestamp
}

/**
 * Notification factory helpers
 */
export class NotificationFactory {
  static createFollowNotification(followerId: string, followingId: string): Notification {
    return {
      id: `notif_${Date.now()}_${Math.random()}`,
      recipientId: followingId,
      actorId: followerId,
      type: 'follow',
      message: 'started following you',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
  }

  static createFollowRequestNotification(followerId: string, followingId: string): Notification {
    return {
      id: `notif_${Date.now()}_${Math.random()}`,
      recipientId: followingId,
      actorId: followerId,
      type: 'follow_request',
      message: 'requested to follow you',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
  }

  static createFollowApprovedNotification(approverId: string, requesterId: string): Notification {
    return {
      id: `notif_${Date.now()}_${Math.random()}`,
      recipientId: requesterId,
      actorId: approverId,
      type: 'follow_approved',
      message: 'accepted your follow request',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
  }

  static createLikeNotification(likerId: string, postOwnerId: string, postId: string): Notification {
    return {
      id: `notif_${Date.now()}_${Math.random()}`,
      recipientId: postOwnerId,
      actorId: likerId,
      type: 'like',
      postId,
      message: 'liked your post',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
  }

  static createCommentNotification(commenterId: string, postOwnerId: string, postId: string, commentId: string): Notification {
    return {
      id: `notif_${Date.now()}_${Math.random()}`,
      recipientId: postOwnerId,
      actorId: commenterId,
      type: 'comment',
      postId,
      commentId,
      message: 'commented on your post',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
  }
}
