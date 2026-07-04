# Social System Documentation

## Overview

This document describes the complete social interaction system for the Fudo recipe app. The system supports Instagram-like features including following, posts, likes, comments, and notifications with support for public and private accounts.

## Architecture

### Data Layer
- **Static Data** (`src/data/staticData.ts`): In-memory data store with sample users, posts, follows, notifications
- **Models** (`src/models/`): TypeScript interfaces for User, Post, Comment, FollowRelation, Notification
- **Service** (`src/services/SocialService.ts`): Singleton service managing all social operations

### Models

#### User
```typescript
interface User {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUri?: string;
  followersCount: number;
  followingCount: number;
  isPrivate?: boolean;      // Privacy setting
  isBlocked?: boolean;
  createdAt: string;
}
```

#### Post
```typescript
interface Post {
  id: string;
  authorId: string;
  caption?: string;
  media: MediaItem[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isArchived?: boolean;
}
```

#### FollowRelation
```typescript
interface FollowRelation {
  id: string;
  followerId: string;
  followingId: string;
  status: 'approved' | 'pending' | 'blocked';
  createdAt: string;
}
```

#### Notification
```typescript
interface Notification {
  id: string;
  recipientId: string;
  actorId: string;
  type: 'follow' | 'follow_request' | 'like' | 'comment' | ...;
  postId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
```

## Core Features

### 1. Follow System

#### Public Accounts
- Instant follow: User A follows User B → relationship created immediately
- No approval needed
- Posts appear in follower's feed instantly

#### Private Accounts
- Follow request: User A requests to follow User B → status is 'pending'
- User B must approve/reject the request
- Posts only visible after approval

**API Methods:**
```typescript
// Follow a user (instant for public, pending for private)
socialService.followUser(followerId, followingId)

// Unfollow a user
socialService.unfollowUser(followerId, followingId)

// Approve follow request (private accounts)
socialService.approveFollowRequest(followerId, followingId)

// Reject follow request
socialService.rejectFollowRequest(followerId, followingId)

// Check follow status
socialService.isFollowing(followerId, followingId)
socialService.isPending(followerId, followingId)

// Get followers/following
socialService.getFollowers(userId)
socialService.getFollowing(userId)
socialService.getPendingFollowRequests(userId)
```

### 2. Post System

**Creating Posts:**
```typescript
socialService.createPost(authorId, caption, mediaUrls)
```
- Posts appear immediately in followers' feeds
- Author's own feed includes their posts

**Deleting Posts:**
```typescript
socialService.deletePost(postId, userId)
```
- Only post owner can delete
- Removed from all followers' feeds immediately
- Associated comments, likes, saves are removed

**Viewing Posts:**
```typescript
// Get user's posts (respects privacy)
socialService.getUserPosts(userId, viewerId)

// Get feed for user (posts from followed users)
socialService.getFeedForUser(userId)
```

**Privacy Rules:**
- Public posts: visible to everyone
- Private posts: only visible to approved followers
- Own posts: always visible to owner

### 3. Interactions

#### Likes
```typescript
// Toggle like on a post
socialService.toggleLike(userId, postId)

// Check if user liked a post
socialService.hasLiked(userId, postId)
```
- Creates notification for post owner (if different user)
- Updates post like count

#### Comments
```typescript
// Add comment
socialService.addComment(userId, postId, text)

// Get comments for post
socialService.getPostComments(postId)

// Delete comment (owner only)
socialService.deleteComment(commentId, userId)
```
- Creates notification for post owner
- Updates post comment count

#### Saves
```typescript
// Toggle save on post
socialService.toggleSave(userId, postId)

// Get saved posts
socialService.getSavedPosts(userId)
```
- Private collection (no notifications)
- Bookmarks for later viewing

### 4. Notifications

**Types:**
- `follow`: Someone followed you
- `follow_request`: Someone requested to follow you (private account)
- `follow_approved`: Your follow request was approved
- `like`: Someone liked your post
- `comment`: Someone commented on your post

**API Methods:**
```typescript
// Get user's notifications
socialService.getNotifications(userId)

// Mark as read
socialService.markNotificationAsRead(notificationId)
socialService.markAllNotificationsAsRead(userId)
```

### 5. Profile Management

```typescript
// Get user profile
socialService.getUserById(userId)

// Get user with relationship status
socialService.getUserWithRelation(userId, viewerId)

// Update profile
socialService.updateUserProfile(userId, {
  displayName: 'New Name',
  bio: 'New bio',
  isPrivate: true,
  avatarUri: 'new-avatar-url'
})
```

## Permission System

### Post Permissions
- **Create**: Any authenticated user
- **Delete**: Only post owner
- **View**: 
  - Public posts: Everyone
  - Private posts: Owner + approved followers

### Comment Permissions
- **Create**: Any user who can view the post
- **Delete**: Only comment owner

### Profile Permissions
- **View**: 
  - Public profile: Everyone can see posts
  - Private profile: Only approved followers see posts
- **Edit**: Only profile owner

## Data Flow Examples

### Example 1: User A follows User B, B posts, A sees it

```typescript
// 1. User A follows User B
socialService.followUser('userA', 'userB');
// Result: FollowRelation created with status 'approved' (if public)

// 2. User B creates a post
socialService.createPost('userB', 'New recipe!', ['image.jpg']);

// 3. User A checks their feed
const feed = socialService.getFeedForUser('userA');
// Result: Feed includes User B's new post
```

### Example 2: Private account follow flow

```typescript
// 1. User A requests to follow private User B
const result = socialService.followUser('userA', 'userB');
// Result: { status: 'pending', message: 'Follow request sent' }

// 2. User A tries to view User B's posts (blocked)
const posts = socialService.getUserPosts('userB', 'userA');
// Result: [] (empty array - no permission)

// 3. User B approves request
socialService.approveFollowRequest('userA', 'userB');

// 4. User A can now view posts
const postsAfter = socialService.getUserPosts('userB', 'userA');
// Result: [Post1, Post2, ...] (all posts visible)
```

### Example 3: Post deletion removes from feeds

```typescript
// 1. User A's initial feed
const feedBefore = socialService.getFeedForUser('userA');
// Contains Post123 from User B

// 2. User B deletes Post123
socialService.deletePost('post123', 'userB');

// 3. User A's updated feed
const feedAfter = socialService.getFeedForUser('userA');
// Post123 no longer appears
```

## Testing

### Running Test Scenarios

```typescript
import { runAllScenariosClean } from './tests/socialScenarios';

// Run all test scenarios
runAllScenariosClean();
```

### Available Test Scenarios

1. **Follow and See Posts**: Verify following a user shows their posts
2. **Delete Post from Feed**: Verify deleting a post removes it from followers' feeds
3. **Unfollow Updates Feed**: Verify unfollowing removes posts from feed
4. **View Other User Profile**: Verify viewing another user's profile and posts
5. **Edit Profile**: Verify profile updates work correctly
6. **Private Account Flow**: Verify follow request/approval for private accounts
7. **Permission Enforcement**: Verify only owners can delete their content
8. **Notifications**: Verify likes and comments create notifications

### Test Data

Sample users in static data:
- `current_user`: Your account (public)
- `user_1` (foodie_john): Public account with posts
- `user_2` (chef_sarah): **Private account** with posts
- `user_3` (baker_mike): Public account with posts
- `user_4` (healthy_emma): Public account with posts

## Integration with ViewModels

### FeedViewModel Integration

```typescript
import { socialService } from '../services/SocialService';

class FeedViewModel {
  async loadFeed() {
    const currentUser = socialService.getCurrentUser();
    if (!currentUser) return;

    const posts = socialService.getFeedForUser(currentUser.id);
    runInAction(() => {
      this.posts = posts;
    });
  }

  toggleLike(postId: string) {
    const currentUser = socialService.getCurrentUser();
    if (!currentUser) return;

    const result = socialService.toggleLike(currentUser.id, postId);
    // Update local state
  }
}
```

### ProfileViewModel Integration

```typescript
class ProfileViewModel {
  async loadProfile(userId: string) {
    const currentUser = socialService.getCurrentUser();
    if (!currentUser) return;

    const user = socialService.getUserWithRelation(userId, currentUser.id);
    const posts = socialService.getUserPosts(userId, currentUser.id);

    runInAction(() => {
      this.user = user;
      this.posts = posts;
    });
  }

  async toggleFollow() {
    const currentUser = socialService.getCurrentUser();
    if (!currentUser || !this.user) return;

    if (this.user.followStatus === 'following') {
      socialService.unfollowUser(currentUser.id, this.user.id);
    } else {
      socialService.followUser(currentUser.id, this.user.id);
    }
  }
}
```

## Future API Integration

When connecting to a real backend API, replace the SocialService methods with API calls:

```typescript
// Current (static data)
socialService.followUser(followerId, followingId);

// Future (API)
await api.post('/users/follow', { followerId, followingId });
```

The service layer abstraction makes this transition seamless - just update the SocialService implementation without changing ViewModels or UI components.

## Acceptance Criteria

✅ Users can follow/unfollow other users
✅ Public accounts: instant follow
✅ Private accounts: follow request with approval required
✅ Creating posts adds them to followers' feeds
✅ Deleting posts removes them from all feeds
✅ Only post owner can delete posts
✅ Private account posts only visible to approved followers
✅ Likes create notifications (except self-likes)
✅ Comments create notifications (except self-comments)
✅ Profile editing works (name, bio, avatar, privacy)
✅ Follower/following counts update correctly
✅ Saved posts are private to the user
✅ Unfollowing removes posts from feed immediately

## Edge Cases Handled

1. **Self-following prevention**: Can't follow yourself
2. **Permission checks**: Delete/edit operations verify ownership
3. **Privacy enforcement**: Private posts respect approval status
4. **Notification filtering**: No self-notifications
5. **Count integrity**: Follower counts updated on follow/unfollow
6. **Cascading deletes**: Deleting post removes comments, likes, saves
7. **Duplicate prevention**: Can't follow someone already followed
8. **Status transitions**: Pending → Approved → Following flow
