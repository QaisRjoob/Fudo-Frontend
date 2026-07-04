# 🚀 Quick Start Guide - Social System

## ✅ What's Ready

Your complete Instagram-like social system is now ready to use with static data. Everything works out of the box!

## 📁 File Structure

```
Fudo/
├── src/
│   ├── models/
│   │   ├── User.ts               ✅ Enhanced with privacy
│   │   ├── Post.ts               ✅ Complete
│   │   ├── Comment.ts            ✅ Enhanced
│   │   ├── FollowRelation.ts     ✅ NEW
│   │   └── Notification.ts       ✅ NEW
│   ├── data/
│   │   └── staticData.ts         ✅ 5 users, 5 posts, relationships
│   ├── services/
│   │   └── SocialService.ts      ✅ 30+ methods ready
│   └── tests/
│       └── socialScenarios.ts    ✅ 8 test scenarios
├── docs/
│   ├── DELIVERABLES.md           📖 Summary
│   ├── SOCIAL_SYSTEM.md          📖 Full documentation
│   └── INTEGRATION_GUIDE.ts      📖 Code examples
```

## 🎯 Test It Now (5 minutes)

### Step 1: Open a test file or console

Create a new file `src/test.ts` or use an existing one:

```typescript
import { socialService } from './services/SocialService';
import { runAllScenariosClean } from './tests/socialScenarios';

// Test 1: Get current user
console.log('Current User:', socialService.getCurrentUser());

// Test 2: Get feed
const feed = socialService.getFeedForUser('current_user');
console.log(`Feed has ${feed.length} posts`);

// Test 3: Like a post
if (feed.length > 0) {
  const result = socialService.toggleLike('current_user', feed[0].id);
  console.log('Like result:', result);
}

// Test 4: Follow a user
const followResult = socialService.followUser('current_user', 'user_1');
console.log('Follow result:', followResult);

// Test 5: Try to follow private account (will be pending)
const privateFollow = socialService.followUser('current_user', 'user_2');
console.log('Private follow result:', privateFollow);

// Run all test scenarios
console.log('\n🧪 Running all test scenarios...\n');
runAllScenariosClean();
```

### Step 2: Run the tests

```bash
# If using TypeScript directly
npx ts-node src/test.ts

# Or add to your app and check console
```

## 🔧 Integrate Into Your App (10 minutes)

### Option A: Update Existing ViewModels

Your `FeedViewModel` already has `toggleLike()` and `toggleSave()`. Just ensure they use the social service.

**In `src/viewmodels/FeedViewModel.ts`:**

```typescript
import { socialService } from '../services/SocialService';

// In your initialize method:
async loadFeed() {
  const currentUser = socialService.getCurrentUser();
  if (!currentUser) return;

  const posts = socialService.getFeedForUser(currentUser.id);
  
  runInAction(() => {
    this.posts = posts;
    this.currentUser = currentUser;
  });
}

// Your toggleLike can use social service:
async toggleLike(postId: string) {
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
```

### Option B: Use Example ViewModels

Copy the enhanced ViewModels from `docs/INTEGRATION_GUIDE.ts`:

- `EnhancedFeedViewModel` - Complete feed with social features
- `EnhancedProfileViewModel` - Profile with follow/unfollow
- `NotificationsViewModel` - Notifications management

## 🎨 Update Your UI (15 minutes)

### ProfileScreen: Add Follow Request Handling

```typescript
// In ProfileScreen.tsx, add support for pending status

const followButtonText = 
  user.followStatus === 'following' ? 'Following' :
  user.followStatus === 'pending' ? 'Requested' :
  'Follow';

const followButtonStyle = 
  user.followStatus === 'following' ? styles.followingButton :
  user.followStatus === 'pending' ? styles.pendingButton :
  styles.followButton;
```

### Show Pending Requests (for own profile)

```typescript
// If viewing own profile, show pending requests
{viewModel.pendingRequests.length > 0 && (
  <View style={styles.requestsSection}>
    <Text style={styles.requestsTitle}>Follow Requests</Text>
    {viewModel.pendingRequests.map(user => (
      <View key={user.id} style={styles.requestItem}>
        <Image source={{ uri: user.avatarUri }} style={styles.avatar} />
        <Text style={styles.username}>{user.username}</Text>
        <Button 
          title="Approve" 
          onPress={() => viewModel.approveFollowRequest(user.id)}
        />
        <Button 
          title="Reject" 
          onPress={() => viewModel.rejectFollowRequest(user.id)}
        />
      </View>
    ))}
  </View>
)}
```

### Add Empty State for Private Profiles

```typescript
// When viewing private profile without approval
{viewModel.posts.length === 0 && user.isPrivate && !user.isCurrentUser && (
  <View style={styles.privateState}>
    <Ionicons name="lock-closed" size={60} />
    <Text>This Account is Private</Text>
    <Text>Follow to see their recipes</Text>
  </View>
)}
```

## 🎭 Test Scenarios You Can Try

### Scenario 1: Public Account Flow
1. View `user_1` profile
2. Click Follow → Instant follow
3. See their posts in your feed
4. Unlike → Posts disappear from feed

### Scenario 2: Private Account Flow
1. View `user_2` profile (private account)
2. Click Follow → Status shows "Requested"
3. Try to view posts → Empty (no permission)
4. Switch to `user_2` view
5. Approve request
6. Switch back to current user
7. Now can see `user_2` posts

### Scenario 3: Create & Delete Posts
1. Create a new post
2. Post appears in your feed
3. Followers see it in their feed
4. Delete the post
5. Post disappears from everyone's feed

### Scenario 4: Interactions
1. Like someone's post → Notification created
2. Comment on post → Notification created
3. Save post → Added to saved collection
4. View saved posts

## 📊 Static Data Available

### Users to Test With
- **current_user** - Your account (public)
- **user_1** (foodie_john) - Public, follow to see posts
- **user_2** (chef_sarah) - **PRIVATE**, need approval
- **user_3** (baker_mike) - Public
- **user_4** (healthy_emma) - Public

### Existing Relationships
- current_user already follows user_1 ✅
- current_user has pending request to user_2 ⏳
- current_user already follows user_3 ✅

## 🐛 Troubleshooting

### "No posts in feed"
- Check if current user is following anyone
- Run: `socialService.getFollowing('current_user')`
- Follow someone: `socialService.followUser('current_user', 'user_1')`

### "Can't see private user's posts"
- Check follow status: `socialService.isFollowing('current_user', 'user_2')`
- Approve request: `socialService.approveFollowRequest('current_user', 'user_2')`

### "Counts not updating"
- The service automatically updates follower/following counts
- Check: `socialService.getUserById('current_user')`

### Reset Everything
```typescript
// Reset to initial state
socialService.resetData();
```

## 📱 Next Steps

### Immediate (Today)
1. ✅ Run test scenarios to verify everything works
2. ✅ Update your FeedScreen to use `socialService.getFeedForUser()`
3. ✅ Update ProfileScreen follow button logic

### Short Term (This Week)
1. Add NotificationsScreen using `socialService.getNotifications()`
2. Add pending requests UI to ProfileScreen
3. Add empty states for private profiles
4. Test all user flows

### Long Term (Later)
1. Replace SocialService internals with API calls
2. Add real-time updates (WebSocket/polling)
3. Add more notification types
4. Add blocking/reporting features

## 💡 Pro Tips

### Tip 1: Test with Different Users
```typescript
// Temporarily change current user for testing
const originalUser = socialService.getCurrentUser();
// Manually switch in static data, test, then switch back
```

### Tip 2: Create Custom Test Data
Add more users/posts to `src/data/staticData.ts`:
```typescript
export const STATIC_USERS = [
  ...existing_users,
  {
    id: 'test_user_6',
    username: 'test_chef',
    // ... more fields
  }
];
```

### Tip 3: Log Everything
```typescript
// Add logging to track what's happening
socialService.followUser('user_a', 'user_b');
console.log('New followers:', socialService.getFollowers('user_b'));
```

## 🎉 You're Ready!

Everything is set up and working. The system is production-ready with static data. When you're ready for a real backend, just update the SocialService methods to call your API instead of manipulating the in-memory store.

**Key Files to Start With:**
1. `docs/DELIVERABLES.md` - Complete feature list
2. `src/tests/socialScenarios.ts` - Run this first
3. `docs/INTEGRATION_GUIDE.ts` - Code examples
4. `src/services/SocialService.ts` - The main service

**Need Help?**
- Check `docs/SOCIAL_SYSTEM.md` for complete API reference
- All methods have comments explaining parameters
- Test scenarios show real-world usage examples

**Happy coding! 🚀**
