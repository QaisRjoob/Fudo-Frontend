/**
 * STATIC DATA FOR TESTING
 * This file contains sample data for testing the social features
 * In production, this data would come from an API/Database
 */

import { User } from '../models/User';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { FollowRelation } from '../models/FollowRelation';
import { Notification } from '../models/Notification';

/**
 * USERS
 * Includes public and private accounts
 */
export const STATIC_USERS: User[] = [
  {
    id: 'user_1',
    username: 'foodie_john',
    displayName: 'John Smith',
    bio: '🍕 Pizza lover | Home chef | Sharing my culinary adventures',
    avatarUri: 'https://i.pravatar.cc/150?u=user_1',
    profilePicture: 'https://i.pravatar.cc/150?u=user_1',
    followersCount: 1245,
    followingCount: 532,
    isPrivate: false,
    hasStory: true, // Has unseen story
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'user_2',
    username: 'chef_sarah',
    displayName: 'Sarah Johnson',
    bio: '👩‍🍳 Professional Chef | Recipe Developer | Private Account',
    avatarUri: 'https://i.pravatar.cc/150?u=user_2',
    profilePicture: 'https://i.pravatar.cc/150?u=user_2',
    followersCount: 3421,
    followingCount: 125,
    isPrivate: true, // PRIVATE ACCOUNT
    hasStory: false,
    createdAt: '2024-02-10T12:00:00Z',
  },
  {
    id: 'user_3',
    username: 'baker_mike',
    displayName: 'Mike Anderson',
    bio: '🍰 Pastry Chef | Baking tutorials every weekend',
    avatarUri: 'https://i.pravatar.cc/150?u=user_3',
    profilePicture: 'https://i.pravatar.cc/150?u=user_3',
    followersCount: 892,
    followingCount: 234,
    isPrivate: false,
    hasStory: true, // Has unseen story
    createdAt: '2024-03-05T08:00:00Z',
  },
  {
    id: 'user_4',
    username: 'healthy_emma',
    displayName: 'Emma Wilson',
    bio: '🥗 Healthy eating advocate | Nutrition tips',
    avatarUri: 'https://i.pravatar.cc/150?u=user_4',
    profilePicture: 'https://i.pravatar.cc/150?u=user_4',
    followersCount: 2156,
    followingCount: 678,
    isPrivate: false,
    hasStory: false,
    createdAt: '2024-04-20T14:00:00Z',
  },
  {
    id: 'current_user',
    username: 'my_recipes',
    displayName: 'Current User',
    bio: '🍳 Exploring the world of flavors',
    avatarUri: 'https://i.pravatar.cc/150?u=current_user',
    profilePicture: 'https://i.pravatar.cc/150?u=current_user',
    followersCount: 456,
    followingCount: 123,
    isPrivate: false,
    hasStory: false,
    createdAt: '2024-05-01T09:00:00Z',
  },
];

/**
 * FOLLOW RELATIONS
 * Defines who follows whom and the status
 */
export const STATIC_FOLLOW_RELATIONS: FollowRelation[] = [
  // current_user follows user_1 (approved)
  {
    id: 'follow_1',
    followerId: 'current_user',
    followingId: 'user_1',
    status: 'approved',
    createdAt: '2024-06-01T10:00:00Z',
  },
  // current_user has pending request to user_2 (private account)
  {
    id: 'follow_2',
    followerId: 'current_user',
    followingId: 'user_2',
    status: 'pending',
    createdAt: '2024-06-15T11:00:00Z',
  },
  // current_user follows user_3 (approved)
  {
    id: 'follow_3',
    followerId: 'current_user',
    followingId: 'user_3',
    status: 'approved',
    createdAt: '2024-06-20T12:00:00Z',
  },
  // user_1 follows current_user
  {
    id: 'follow_4',
    followerId: 'user_1',
    followingId: 'current_user',
    status: 'approved',
    createdAt: '2024-07-01T09:00:00Z',
  },
  // user_4 follows current_user
  {
    id: 'follow_5',
    followerId: 'user_4',
    followingId: 'current_user',
    status: 'approved',
    createdAt: '2024-07-10T10:00:00Z',
  },
  // user_3 follows user_1
  {
    id: 'follow_6',
    followerId: 'user_3',
    followingId: 'user_1',
    status: 'approved',
    createdAt: '2024-07-15T11:00:00Z',
  },
  // user_4 has pending request to user_2 (private account)
  {
    id: 'follow_7',
    followerId: 'user_4',
    followingId: 'user_2',
    status: 'pending',
    createdAt: '2024-07-20T12:00:00Z',
  },
];

/**
 * POSTS
 * Sample posts from different users
 */
export const STATIC_POSTS: Post[] = [
  {
    id: 'post_1',
    authorId: 'user_1',
    caption: 'Classic Margherita Pizza 🍕 Made from scratch!',
    media: [
      {
        id: 'media_1',
        url: 'https://picsum.photos/seed/pizza1/800/800',
        remoteUri: 'https://picsum.photos/seed/pizza1/800/800',
        type: 'image',
        order: 0,
      },
    ],
    likesCount: 234,
    commentsCount: 45,
    createdAt: '2024-11-15T14:30:00Z',
    isArchived: false,
  },
  {
    id: 'post_2',
    authorId: 'user_2',
    caption: 'French Pastry Workshop Results! 🥐',
    media: [
      {
        id: 'media_2',
        url: 'https://picsum.photos/seed/pastry1/800/800',
        remoteUri: 'https://picsum.photos/seed/pastry1/800/800',
        type: 'image',
        order: 0,
      },
    ],
    likesCount: 567,
    commentsCount: 89,
    createdAt: '2024-11-16T10:15:00Z',
    isArchived: false,
  },
  {
    id: 'post_3',
    authorId: 'user_3',
    caption: 'Chocolate Cake Tutorial 🍰 Recipe in comments!',
    media: [
      {
        id: 'media_3',
        url: 'https://picsum.photos/seed/cake1/800/800',
        remoteUri: 'https://picsum.photos/seed/cake1/800/800',
        type: 'image',
        order: 0,
      },
    ],
    likesCount: 423,
    commentsCount: 67,
    createdAt: '2024-11-17T16:00:00Z',
    isArchived: false,
  },
  {
    id: 'post_4',
    authorId: 'user_1',
    caption: 'Homemade Pasta Night 🍝',
    media: [
      {
        id: 'media_4',
        url: 'https://picsum.photos/seed/pasta1/800/800',
        remoteUri: 'https://picsum.photos/seed/pasta1/800/800',
        type: 'image',
        order: 0,
      },
    ],
    likesCount: 189,
    commentsCount: 23,
    createdAt: '2024-11-17T19:30:00Z',
    isArchived: false,
  },
  {
    id: 'post_5',
    authorId: 'user_4',
    caption: 'Healthy Buddha Bowl 🥗 Full of nutrients!',
    media: [
      {
        id: 'media_5',
        url: 'https://picsum.photos/seed/bowl1/800/800',
        remoteUri: 'https://picsum.photos/seed/bowl1/800/800',
        type: 'image',
        order: 0,
      },
    ],
    likesCount: 345,
    commentsCount: 56,
    createdAt: '2024-11-18T12:00:00Z',
    isArchived: false,
  },
];

/**
 * COMMENTS
 * Sample comments on posts
 */
export const STATIC_COMMENTS: Comment[] = [
  {
    id: 'comment_1',
    postId: 'post_1',
    authorId: 'current_user',
    text: 'Looks amazing! What type of flour did you use?',
    likesCount: 12,
    createdAt: '2024-11-15T15:00:00Z',
  },
  {
    id: 'comment_2',
    postId: 'post_1',
    authorId: 'user_3',
    text: 'That crust looks perfect! 😍',
    likesCount: 8,
    createdAt: '2024-11-15T15:30:00Z',
  },
  {
    id: 'comment_3',
    postId: 'post_3',
    authorId: 'current_user',
    text: 'Can\'t wait to try this recipe!',
    likesCount: 5,
    createdAt: '2024-11-17T16:30:00Z',
  },
  {
    id: 'comment_4',
    postId: 'post_5',
    authorId: 'user_1',
    text: 'This looks so healthy and delicious!',
    likesCount: 3,
    createdAt: '2024-11-18T12:30:00Z',
  },
];

/**
 * NOTIFICATIONS
 * Sample notifications for users
 */
export const STATIC_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_1',
    recipientId: 'current_user',
    actorId: 'user_1',
    type: 'follow',
    message: 'started following you',
    isRead: false,
    createdAt: '2024-11-17T10:00:00Z',
  },
  {
    id: 'notif_2',
    recipientId: 'current_user',
    actorId: 'user_1',
    type: 'like',
    postId: 'post_1',
    message: 'liked your post',
    isRead: false,
    createdAt: '2024-11-17T14:30:00Z',
  },
  {
    id: 'notif_3',
    recipientId: 'user_2',
    actorId: 'current_user',
    type: 'follow_request',
    message: 'requested to follow you',
    isRead: false,
    createdAt: '2024-11-15T11:00:00Z',
  },
  {
    id: 'notif_4',
    recipientId: 'current_user',
    actorId: 'user_3',
    type: 'comment',
    postId: 'post_1',
    commentId: 'comment_2',
    message: 'commented on your post',
    isRead: true,
    createdAt: '2024-11-15T15:30:00Z',
  },
];

/**
 * POST LIKES
 * Track which users liked which posts
 */
export const STATIC_POST_LIKES: { userId: string; postId: string; createdAt: string }[] = [
  { userId: 'current_user', postId: 'post_1', createdAt: '2024-11-15T14:35:00Z' },
  { userId: 'current_user', postId: 'post_3', createdAt: '2024-11-17T16:05:00Z' },
  { userId: 'user_1', postId: 'post_3', createdAt: '2024-11-17T16:10:00Z' },
  { userId: 'user_1', postId: 'post_5', createdAt: '2024-11-18T12:05:00Z' },
  { userId: 'user_3', postId: 'post_1', createdAt: '2024-11-15T15:00:00Z' },
  { userId: 'user_4', postId: 'post_1', createdAt: '2024-11-15T15:30:00Z' },
];

/**
 * POST SAVES
 * Track which users saved which posts
 */
export const STATIC_POST_SAVES: { userId: string; postId: string; createdAt: string }[] = [
  { userId: 'current_user', postId: 'post_1', createdAt: '2024-11-15T14:40:00Z' },
  { userId: 'current_user', postId: 'post_3', createdAt: '2024-11-17T16:10:00Z' },
];
