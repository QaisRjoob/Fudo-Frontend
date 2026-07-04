/**
 * INTEGRATION GUIDE
 * How to integrate the SocialService into your ViewModels and UI
 * 
 * NOTE: This is a documentation/example file showing usage patterns.
 * The examples below demonstrate how to integrate SocialService into your app.
 */

// Example imports - adjust paths based on your project structure
import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { makeAutoObservable, runInAction } from 'mobx';

// These imports would need to match your actual project structure
// import { socialService } from '../src/services/SocialService';
// import { PostWithAuthor, User, Notification } from '../src/models';

// For documentation purposes, we'll use type assertions
const socialService = {} as any;
type PostWithAuthor = any;
type User = any;
type Notification = any;
type PostCard = any;

/**
 * EXAMPLE 1: Enhanced FeedViewModel with Social Service
 */
export class EnhancedFeedViewModel {
  posts: PostWithAuthor[] = [];
  currentUser: User | null = null;
  isLoading: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  async initialize() {
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      // Get current user
      const user = socialService.getCurrentUser();
      
      // Get feed (posts from followed users)
      const feed = socialService.getFeedForUser(user?.id || 'current_user');

      runInAction(() => {
        this.currentUser = user;
        this.posts = feed;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Toggle like with social service
  toggleLike(postId: string) {
    if (!this.currentUser) return;

    const result = socialService.toggleLike(this.currentUser.id, postId);
    
    // Update local state
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      runInAction(() => {
        post.isLiked = result.liked;
        post.likesCount = result.likesCount;
      });
    }
  }

  // Toggle save with social service
  toggleSave(postId: string) {
    if (!this.currentUser) return;

    const isSaved = socialService.toggleSave(this.currentUser.id, postId);
    
    // Update local state
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      runInAction(() => {
        post.isSaved = isSaved;
      });
    }
  }

  // Create new post
  createPost(caption: string, mediaUrls: string[]) {
    if (!this.currentUser) return;

    const newPost = socialService.createPost(this.currentUser.id, caption, mediaUrls);
    
    // Add to local feed
    runInAction(() => {
      this.posts.unshift({
        ...newPost,
        author: this.currentUser!,
        isLiked: false,
        isSaved: false,
      });
    });
  }

  // Delete post
  deletePost(postId: string) {
    if (!this.currentUser) return;

    const success = socialService.deletePost(postId, this.currentUser.id);
    
    if (success) {
      runInAction(() => {
        this.posts = this.posts.filter(p => p.id !== postId);
      });
    }
  }

  // Refresh feed
  async refresh() {
    await this.initialize();
  }
}

/**
 * EXAMPLE 2: Enhanced ProfileViewModel with Social Service
 */
export class EnhancedProfileViewModel {
  user: User | null = null;
  posts: PostWithAuthor[] = [];
  followStatus: 'not_following' | 'following' | 'pending' | 'blocked' = 'not_following';
  isLoading: boolean = false;
  pendingRequests: User[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  async loadProfile(userId: string) {
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      const currentUser = socialService.getCurrentUser();
      if (!currentUser) return;

      // Get user with relationship info
      const userWithRelation = socialService.getUserWithRelation(userId, currentUser.id);
      
      // Get user's posts (respects privacy)
      const posts = socialService.getUserPosts(userId, currentUser.id);

      // If this is current user's profile, get pending requests
      const pendingRequests = userId === currentUser.id
        ? socialService.getPendingFollowRequests(userId)
        : [];

      runInAction(() => {
        this.user = userWithRelation;
        this.posts = posts;
        this.followStatus = userWithRelation?.followStatus || 'not_following';
        this.pendingRequests = pendingRequests;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  // Toggle follow/unfollow
  toggleFollow() {
    if (!this.user) return;
    
    const currentUser = socialService.getCurrentUser();
    if (!currentUser) return;

    if (this.followStatus === 'following') {
      // Unfollow
      const success = socialService.unfollowUser(currentUser.id, this.user.id);
      if (success) {
        runInAction(() => {
          this.followStatus = 'not_following';
          if (this.user) {
            this.user.followersCount -= 1;
          }
        });
      }
    } else {
      // Follow or send request
      const result = socialService.followUser(currentUser.id, this.user.id);
      if (result.success) {
        runInAction(() => {
          this.followStatus = result.status === 'pending' ? 'pending' : 'following';
          if (this.user && result.status === 'approved') {
            this.user.followersCount += 1;
          }
        });
      }
    }
  }

  // Approve follow request (for own profile)
  approveFollowRequest(requesterId: string) {
    if (!this.user) return;

    const success = socialService.approveFollowRequest(requesterId, this.user.id);
    if (success) {
      runInAction(() => {
        this.pendingRequests = this.pendingRequests.filter(u => u.id !== requesterId);
        if (this.user) {
          this.user.followersCount += 1;
        }
      });
    }
  }

  // Reject follow request
  rejectFollowRequest(requesterId: string) {
    if (!this.user) return;

    const success = socialService.rejectFollowRequest(requesterId, this.user.id);
    if (success) {
      runInAction(() => {
        this.pendingRequests = this.pendingRequests.filter(u => u.id !== requesterId);
      });
    }
  }

  // Update profile
  updateProfile(updates: Partial<User>) {
    if (!this.user) return;

    const updated = socialService.updateUserProfile(this.user.id, updates);
    if (updated) {
      runInAction(() => {
        this.user = updated;
      });
    }
  }
}

/**
 * EXAMPLE 3: NotificationsViewModel
 */
export class NotificationsViewModel {
  notifications: Notification[] = [];
  isLoading: boolean = false;
  unreadCount: number = 0;

  constructor() {
    makeAutoObservable(this);
  }

  async loadNotifications() {
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      const currentUser = socialService.getCurrentUser();
      if (!currentUser) return;

      const notifications = socialService.getNotifications(currentUser.id);
      const unread = notifications.filter(n => !n.isRead).length;

      runInAction(() => {
        this.notifications = notifications;
        this.unreadCount = unread;
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  markAsRead(notificationId: string) {
    const success = socialService.markNotificationAsRead(notificationId);
    if (success) {
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification && !notification.isRead) {
        runInAction(() => {
          notification.isRead = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        });
      }
    }
  }

  markAllAsRead() {
    const currentUser = socialService.getCurrentUser();
    if (!currentUser) return;

    socialService.markAllNotificationsAsRead(currentUser.id);
    runInAction(() => {
      this.notifications.forEach(n => n.isRead = true);
      this.unreadCount = 0;
    });
  }
}

/**
 * EXAMPLE 4: UI Component Integration
 */

// React component example
export function FeedScreenExample() {
  const [viewModel] = useState(() => new EnhancedFeedViewModel());

  useEffect(() => {
    viewModel.initialize();
  }, []);

  const handleLike = (postId: string) => {
    viewModel.toggleLike(postId);
  };

  const handleCreatePost = () => {
    viewModel.createPost(
      'Check out my new recipe!',
      ['https://example.com/image.jpg']
    );
  };

  return (
    <View>
      {viewModel.posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onLike={() => handleLike(post.id)}
          onSave={() => viewModel.toggleSave(post.id)}
        />
      ))}
      <Button onPress={handleCreatePost}>Create Post</Button>
    </View>
  );
}

/**
 * EXAMPLE 5: Testing Your Integration
 */

export async function testIntegration() {
  console.log('🧪 Testing Social Service Integration\n');

  // Create view model
  const feedVM = new EnhancedFeedViewModel();
  
  // Initialize
  await feedVM.initialize();
  console.log(`✓ Loaded ${feedVM.posts.length} posts`);

  // Like a post
  const firstPost = feedVM.posts[0];
  if (firstPost) {
    feedVM.toggleLike(firstPost.id);
    console.log(`✓ Liked post: ${firstPost.id}`);
  }

  // Create a post
  feedVM.createPost('Test post', ['https://example.com/test.jpg']);
  console.log(`✓ Created new post, feed now has ${feedVM.posts.length} posts`);

  // Load profile
  const profileVM = new EnhancedProfileViewModel();
  await profileVM.loadProfile('user_1');
  console.log(`✓ Loaded profile for ${profileVM.user?.username}`);
  console.log(`  - Follow status: ${profileVM.followStatus}`);
  console.log(`  - Posts: ${profileVM.posts.length}`);

  console.log('\n✅ Integration test complete!');
}

/**
 * MIGRATION CHECKLIST
 * 
 * To integrate this system into your existing app:
 * 
 * 1. ✓ Import SocialService in your ViewModels
 *    import { socialService } from '../services/SocialService';
 * 
 * 2. ✓ Replace repository calls with social service calls
 *    - postRepo.getFeed() → socialService.getFeedForUser()
 *    - postRepo.likePost() → socialService.toggleLike()
 *    - userRepo.followUser() → socialService.followUser()
 * 
 * 3. ✓ Update UI components to handle new states
 *    - followStatus: 'pending' for private accounts
 *    - Empty states for private profile posts
 *    - Follow request approvals
 * 
 * 4. ✓ Test with static data first
 *    - Run test scenarios: import { runAllScenariosClean } from '../tests/socialScenarios'
 *    - Verify all flows work correctly
 * 
 * 5. ✓ Later: Replace SocialService internals with API calls
 *    - Keep the same interface
 *    - Just change implementation from static data to fetch()
 */
