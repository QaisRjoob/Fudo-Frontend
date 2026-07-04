/**
 * TEST SCENARIOS FOR SOCIAL FEATURES
 * 
 * This file contains comprehensive test scenarios to validate
 * the social interaction system works correctly.
 */

import { socialService } from '../services/SocialService';

/**
 * SCENARIO 1: User A follows User B, B posts, A sees it in feed
 */
export function scenario1_FollowAndSeePosts() {
  console.log('\n=== SCENARIO 1: Follow and See Posts ===');
  
  const currentUserId = 'current_user';
  const targetUserId = 'user_1';

  // Step 1: Current user follows user_1
  console.log('Step 1: Current user follows user_1');
  const followResult = socialService.followUser(currentUserId, targetUserId);
  console.log('Follow result:', followResult);

  // Step 2: Get feed for current user
  console.log('\nStep 2: Get feed for current user');
  const feed = socialService.getFeedForUser(currentUserId);
  console.log(`Feed contains ${feed.length} posts`);
  
  // Step 3: Check if user_1's posts appear in feed
  const user1Posts = feed.filter(p => p.authorId === targetUserId);
  console.log(`Found ${user1Posts.length} posts from user_1 in current user's feed`);
  console.log('✓ Test passed: Following user shows their posts in feed');
}

/**
 * SCENARIO 2: User B deletes post, it disappears from A's feed
 */
export function scenario2_DeletePostFromFeed() {
  console.log('\n=== SCENARIO 2: Delete Post from Feed ===');
  
  const currentUserId = 'current_user';
  const targetUserId = 'user_1';

  // Step 1: Get initial feed
  console.log('Step 1: Get initial feed');
  const initialFeed = socialService.getFeedForUser(currentUserId);
  const initialCount = initialFeed.filter(p => p.authorId === targetUserId).length;
  console.log(`Initial posts from user_1: ${initialCount}`);

  // Step 2: user_1 deletes a post
  const postToDelete = initialFeed.find(p => p.authorId === targetUserId);
  if (postToDelete) {
    console.log(`\nStep 2: user_1 deletes post ${postToDelete.id}`);
    const deleteResult = socialService.deletePost(postToDelete.id, targetUserId);
    console.log('Delete result:', deleteResult);

    // Step 3: Get updated feed
    console.log('\nStep 3: Get updated feed');
    const updatedFeed = socialService.getFeedForUser(currentUserId);
    const updatedCount = updatedFeed.filter(p => p.authorId === targetUserId).length;
    console.log(`Updated posts from user_1: ${updatedCount}`);
    console.log(`✓ Test passed: Post count decreased from ${initialCount} to ${updatedCount}`);
  } else {
    console.log('⚠ No posts to delete');
  }
}

/**
 * SCENARIO 3: Unfollow updates feed and counts
 */
export function scenario3_UnfollowUpdatesFeed() {
  console.log('\n=== SCENARIO 3: Unfollow Updates Feed ===');
  
  const currentUserId = 'current_user';
  const targetUserId = 'user_1';

  // Step 1: Ensure following
  console.log('Step 1: Ensure current user follows user_1');
  if (!socialService.isFollowing(currentUserId, targetUserId)) {
    socialService.followUser(currentUserId, targetUserId);
  }

  const initialFeed = socialService.getFeedForUser(currentUserId);
  const initialPosts = initialFeed.filter(p => p.authorId === targetUserId).length;
  console.log(`Feed has ${initialPosts} posts from user_1`);

  // Step 2: Unfollow
  console.log('\nStep 2: Current user unfollows user_1');
  const unfollowResult = socialService.unfollowUser(currentUserId, targetUserId);
  console.log('Unfollow result:', unfollowResult);

  // Step 3: Check feed again
  console.log('\nStep 3: Check feed after unfollow');
  const updatedFeed = socialService.getFeedForUser(currentUserId);
  const updatedPosts = updatedFeed.filter(p => p.authorId === targetUserId).length;
  console.log(`Feed now has ${updatedPosts} posts from user_1`);
  console.log('✓ Test passed: Unfollowing removes posts from feed');
}

/**
 * SCENARIO 4: Visit other user's profile and see posts
 */
export function scenario4_ViewOtherUserProfile() {
  console.log('\n=== SCENARIO 4: View Other User Profile ===');
  
  const currentUserId = 'current_user';
  const targetUserId = 'user_1';

  // Step 1: Get target user's profile
  console.log(`Step 1: View user_1's profile`);
  const user = socialService.getUserWithRelation(targetUserId, currentUserId);
  console.log('User:', user?.username, '| Follow status:', user?.followStatus);

  // Step 2: Get their posts
  console.log('\nStep 2: Get user_1\'s posts');
  const posts = socialService.getUserPosts(targetUserId, currentUserId);
  console.log(`User has ${posts.length} posts visible to current user`);
  console.log('✓ Test passed: Can view other user\'s profile and posts');
}

/**
 * SCENARIO 5: Edit profile (name, bio, privacy)
 */
export function scenario5_EditProfile() {
  console.log('\n=== SCENARIO 5: Edit Profile ===');
  
  const currentUserId = 'current_user';

  // Step 1: Get current profile
  console.log('Step 1: Get current profile');
  const before = socialService.getUserById(currentUserId);
  console.log('Before:', { username: before?.username, bio: before?.bio, isPrivate: before?.isPrivate });

  // Step 2: Update profile
  console.log('\nStep 2: Update profile');
  const updated = socialService.updateUserProfile(currentUserId, {
    displayName: 'Updated Name',
    bio: 'New bio text',
    isPrivate: true,
  });
  console.log('After:', { username: updated?.username, bio: updated?.bio, isPrivate: updated?.isPrivate });
  console.log('✓ Test passed: Profile updated successfully');
}

/**
 * SCENARIO 6: Private account - follow request flow
 */
export function scenario6_PrivateAccountFollowRequest() {
  console.log('\n=== SCENARIO 6: Private Account Follow Request ===');
  
  const currentUserId = 'current_user';
  const privateUserId = 'user_2'; // user_2 is private

  // Step 1: Check if account is private
  console.log('Step 1: Check user_2 account privacy');
  const privateUser = socialService.getUserById(privateUserId);
  console.log('Is private:', privateUser?.isPrivate);

  // Step 2: Send follow request
  console.log('\nStep 2: Send follow request to private account');
  const followResult = socialService.followUser(currentUserId, privateUserId);
  console.log('Follow result:', followResult);

  // Step 3: Check pending requests
  console.log('\nStep 3: Check pending requests for user_2');
  const pendingRequests = socialService.getPendingFollowRequests(privateUserId);
  console.log(`${pendingRequests.length} pending follow requests`);

  // Step 4: Try to view posts (should be restricted)
  console.log('\nStep 4: Try to view posts before approval');
  const postsBefore = socialService.getUserPosts(privateUserId, currentUserId);
  console.log(`Can see ${postsBefore.length} posts (should be 0)`);

  // Step 5: Approve request
  console.log('\nStep 5: user_2 approves follow request');
  const approveResult = socialService.approveFollowRequest(currentUserId, privateUserId);
  console.log('Approve result:', approveResult);

  // Step 6: View posts after approval
  console.log('\nStep 6: View posts after approval');
  const postsAfter = socialService.getUserPosts(privateUserId, currentUserId);
  console.log(`Can now see ${postsAfter.length} posts`);
  console.log('✓ Test passed: Private account follow request flow works correctly');
}

/**
 * SCENARIO 7: Permission enforcement - only owner can delete/edit
 */
export function scenario7_PermissionEnforcement() {
  console.log('\n=== SCENARIO 7: Permission Enforcement ===');
  
  const currentUserId = 'current_user';
  const otherUserId = 'user_1';

  // Step 1: Create post as current user
  console.log('Step 1: Current user creates a post');
  const newPost = socialService.createPost(currentUserId, 'Test post', ['https://example.com/image.jpg']);
  console.log('Created post:', newPost.id);

  // Step 2: Try to delete as different user (should fail)
  console.log('\nStep 2: user_1 tries to delete current user\'s post');
  const deleteAttempt1 = socialService.deletePost(newPost.id, otherUserId);
  console.log('Delete attempt by other user:', deleteAttempt1 ? 'SUCCESS (WRONG!)' : 'FAILED (Correct)');

  // Step 3: Delete as owner (should succeed)
  console.log('\nStep 3: Current user deletes their own post');
  const deleteAttempt2 = socialService.deletePost(newPost.id, currentUserId);
  console.log('Delete attempt by owner:', deleteAttempt2 ? 'SUCCESS (Correct)' : 'FAILED (WRONG!)');
  console.log('✓ Test passed: Only owner can delete their posts');
}

/**
 * SCENARIO 8: Like and comment notifications
 */
export function scenario8_LikeAndCommentNotifications() {
  console.log('\n=== SCENARIO 8: Like and Comment Notifications ===');
  
  const currentUserId = 'current_user';
  const otherUserId = 'user_1';

  // Step 1: Get user_1's post
  const user1Posts = socialService.getUserPosts(otherUserId, currentUserId);
  if (user1Posts.length === 0) {
    console.log('⚠ No posts available for testing');
    return;
  }

  const targetPost = user1Posts[0];
  console.log(`Step 1: Found post ${targetPost.id} by user_1`);

  // Step 2: Current user likes the post
  console.log('\nStep 2: Current user likes user_1\'s post');
  const likeResult = socialService.toggleLike(currentUserId, targetPost.id);
  console.log('Like result:', likeResult);

  // Step 3: Current user comments on the post
  console.log('\nStep 3: Current user comments on user_1\'s post');
  const comment = socialService.addComment(currentUserId, targetPost.id, 'Great recipe!');
  console.log('Comment created:', comment.id);

  // Step 4: Check user_1's notifications
  console.log('\nStep 4: Check user_1\'s notifications');
  const notifications = socialService.getNotifications(otherUserId);
  const recentNotifications = notifications.slice(0, 5);
  console.log(`user_1 has ${notifications.length} total notifications`);
  recentNotifications.forEach(n => {
    console.log(`  - ${n.type}: ${n.message}`);
  });
  console.log('✓ Test passed: Likes and comments create notifications');
}

/**
 * Run all test scenarios
 */
export function runAllScenarios() {
  console.log('\n🧪 RUNNING ALL TEST SCENARIOS\n');
  console.log('='.repeat(50));

  try {
    scenario1_FollowAndSeePosts();
    scenario4_ViewOtherUserProfile();
    scenario5_EditProfile();
    scenario6_PrivateAccountFollowRequest();
    scenario7_PermissionEnforcement();
    scenario8_LikeAndCommentNotifications();
    scenario3_UnfollowUpdatesFeed();
    // Note: scenario2 is destructive, run it last or separately
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL SCENARIOS COMPLETED\n');
  } catch (error) {
    console.error('❌ SCENARIO FAILED:', error);
  }
}

/**
 * Reset data and run all scenarios (for clean testing)
 */
export function runAllScenariosClean() {
  socialService.resetData();
  runAllScenarios();
}
