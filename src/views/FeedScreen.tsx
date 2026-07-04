import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
  useColorScheme,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { FeedViewModel } from '../viewmodels/FeedViewModel';
import RecipeDetailScreen from './RecipeDetailScreen';
import { SharePostModal } from './SharePostModal';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { AuthService } from '../services/AuthService';
import { PostWithAuthor, User, StoryGroup } from '../models';
import StoryViewerScreen from './StoryViewerScreen';
import StoryCreatorScreen from './StoryCreatorScreen';
import DefaultAvatar from '../components/DefaultAvatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_SIZE = 90; // Increased from 70 to 85

// Story Item Component
interface StoryItemProps {
  user: User;
  isCurrentUser: boolean;
  hasStories: boolean;
  hasUnseen: boolean;
  onPress: () => void;
}

const StoryItem = ({ user, isCurrentUser, hasStories, hasUnseen, onPress }: StoryItemProps) => {
  const colorScheme = useColorScheme();
  const textColor = colorScheme === 'dark' ? '#FFF' : '#000';
  const avatarUri = user.profilePicture || user.avatarUri || null;
  const avatarSize = STORY_SIZE - 14;

  return (
    <TouchableOpacity style={styles.storyItem} onPress={onPress}>
      {!isCurrentUser && hasUnseen ? (
        <LinearGradient
          colors={['#f17107ff', '#ffae00ff', '#ff0000ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.storyGradient}
        >
          <View style={styles.storyInnerRing}>
            <DefaultAvatar uri={avatarUri} name={user.displayName || user.username} size={avatarSize} style={styles.storyImage} />
          </View>
        </LinearGradient>
      ) : isCurrentUser && hasStories ? (
        /* Own story with stories → orange ring */
        <LinearGradient
          colors={['#f17107ff', '#ffae00ff', '#ff0000ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.storyGradient}
        >
          <View style={styles.storyInnerRing}>
            <DefaultAvatar uri={avatarUri} name={user.displayName || user.username} size={avatarSize} style={styles.storyImage} />
          </View>
        </LinearGradient>
      ) : (
        /* Own story with no stories OR seen stories → grey ring with + */
        <View style={styles.addStoryRing}>
          <DefaultAvatar uri={avatarUri} name={user.displayName || user.username} size={avatarSize} style={styles.storyImage} />
          {isCurrentUser && (
            <View style={styles.addButton}>
              <Ionicons name="add" size={16} color="#FFF" />
            </View>
          )}
        </View>
      )}
      <Text style={[styles.storyUsername, { color: textColor }]} numberOfLines={1}>
        {isCurrentUser ? 'Your Story' : user.username}
      </Text>
    </TouchableOpacity>
  );
};

// Post Card Component - Creative Recipe Teaser
const PostCard = observer(({ 
  post, 
  onLike, 
  onComment,
  onShare,
  onSave,
  onPress,
  onProfilePress,
  onOptions,
  currentUser
}: {
  post: PostWithAuthor;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onPress: () => void;
  onProfilePress: () => void;
  onOptions: () => void;
  currentUser: User | null;
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lastTap, setLastTap] = useState<number>(0);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const tapTimeoutRef = useRef<any>(null);
  const colorScheme = useColorScheme();
  const router = useRouter();
  
  const isLiked = post.isLiked ?? false;
  const isSaved = post.isSaved ?? false;
  
  const textColor = colorScheme === 'dark' ? '#FFF' : '#000';
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#FFF';
  const cardBg = colorScheme === 'dark' ? '#1A1A1A' : '#F8F8F8';
  const accentColor = '#FF6B35';

  // Handle double tap to like
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // milliseconds

    if (lastTap && now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected - only like, don't open recipe
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      
      if (!isLiked) {
        onLike();
      }
      // Show heart animation
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
      setLastTap(0); // Reset
    } else {
      // First tap - schedule opening recipe if no second tap
      setLastTap(now);
      tapTimeoutRef.current = setTimeout(() => {
        onPress();
        setLastTap(0);
      }, DOUBLE_TAP_DELAY);
    }
  };

  return (
    <View style={[styles.postCard, { backgroundColor }]}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.postHeaderLeft} onPress={onProfilePress}>
          <Image 
            source={{ uri: post.author?.profilePicture }} 
            style={styles.postAvatar}
          />
          <View>
            <Text style={[styles.postUsername, { color: textColor }]}>{post.author?.username}</Text>
            <Text style={styles.recipeLabel}>shared a recipe</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onOptions}>
          <MaterialIcons name="more-vert" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Clickable Recipe Teaser Card */}
      <TouchableOpacity
        style={[styles.recipeTeaser, { backgroundColor: cardBg }]}
        onPress={handleDoubleTap}
        activeOpacity={0.9}
      >
        {/* Media Preview with Gradient Overlay */}
        <View style={styles.mediaTeaserContainer}>
          {post.media && post.media.length > 0 && (
            <>
              {post.media.length > 1 ? (
                <FlatList
                  data={post.media}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(_, i) => String(i)}
                  onMomentumScrollEnd={e => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setCurrentImageIndex(idx);
                  }}
                  renderItem={({ item }) => (
                    <Image
                      source={{ uri: item.remoteUri || item.localUri }}
                      style={[styles.teaserImage, { width: SCREEN_WIDTH - 24 }]}
                      resizeMode="cover"
                    />
                  )}
                  style={{ width: SCREEN_WIDTH - 24 }}
                />
              ) : (
                <Image
                  source={{ uri: post.media[0]?.remoteUri || post.media[0]?.localUri }}
                  style={styles.teaserImage}
                  resizeMode="cover"
                />
              )}

              {/* Double Tap Heart Animation */}
              {showHeartAnimation && (
                <View style={styles.likeAnimationContainer}>
                  <Ionicons name="heart" size={100} color="#FF3B47" style={styles.likeAnimationHeart} />
                </View>
              )}

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.teaserGradient}
              >
                {/* Dots indicator for multi-image */}
                {post.media.length > 1 && (
                  <View style={styles.dotsRow}>
                    {post.media.map((_, i) => (
                      <View
                        key={i}
                        style={[styles.dot, i === currentImageIndex && styles.activeDot]}
                      />
                    ))}
                  </View>
                )}
                {/* Media Counter Badge */}
                {post.media.length > 1 && (
                  <View style={styles.mediaBadge}>
                    <Ionicons name="images" size={16} color="#FFF" />
                    <Text style={styles.mediaBadgeText}>{post.media.length}</Text>
                  </View>
                )}
                
                {/* Recipe Title */}
                <Text style={styles.recipeTitleLarge} numberOfLines={2}>
                  {post.caption || 'Delicious Recipe'}
                </Text>
              </LinearGradient>
            </>
          )}
        </View>

        {/* Recipe Quick Info */}
        {(post.cookTime || post.calories || post.servings) ? (
          <View style={styles.recipeQuickInfo}>
            {post.cookTime ? (
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={18} color={accentColor} />
                <Text style={[styles.infoText, { color: textColor }]}>{post.cookTime} min</Text>
              </View>
            ) : null}
            {post.calories ? (
              <View style={styles.infoItem}>
                <Ionicons name="flame-outline" size={18} color={accentColor} />
                <Text style={[styles.infoText, { color: textColor }]}>{post.calories} cal</Text>
              </View>
            ) : null}
            {post.servings ? (
              <View style={styles.infoItem}>
                <Ionicons name="restaurant-outline" size={18} color={accentColor} />
                <Text style={[styles.infoText, { color: textColor }]}>{post.servings} servings</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Tap to View Prompt */}
        <View style={[styles.tapPrompt, { borderTopColor: colorScheme === 'dark' ? '#333' : '#E0E0E0' }]}>
          <Text style={[styles.tapPromptText, { color: accentColor }]}>
            Tap to view full recipe
          </Text>
          <Ionicons name="chevron-forward" size={20} color={accentColor} />
        </View>
      </TouchableOpacity>

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={onLike} style={styles.actionButton}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={28} 
              color={isLiked ? "#FF3B47" : textColor} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onComment} style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={26} color={textColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={styles.actionButton}>
            <Ionicons name="paper-plane-outline" size={26} color={textColor} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onSave}>
          <Ionicons 
            name={isSaved ? "bookmark" : "bookmark-outline"} 
            size={26} 
            color={textColor} 
          />
        </TouchableOpacity>
      </View>

      {/* Likes and Comments Count */}
      <View style={styles.engagementRow}>
        {post.likesCount > 0 && (
          <TouchableOpacity onPress={() => router.push(`/user-list?type=likes&postId=${post.id}&userId=${post.authorId}` as any)}>
            <Text style={[styles.likesText, { color: textColor }]}>
              <Text style={styles.boldText}>{post.likesCount.toLocaleString('en-US')}</Text> likes
            </Text>
          </TouchableOpacity>
        )}
        {post.commentsCount > 0 && (
          <TouchableOpacity onPress={onComment}>
            <Text style={[styles.commentsText, { color: textColor }]}>
              <Text style={styles.boldText}>{post.commentsCount}</Text> comments
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Time */}
      <Text style={styles.timeText}>2 hours ago</Text>
    </View>
  );
});

// Main Feed Screen
const REPORT_REASONS = [
  { id: 'spam', label: 'Spam', icon: 'ban-outline' },
  { id: 'inappropriate', label: 'Inappropriate content', icon: 'warning-outline' },
  { id: 'harassment', label: 'Harassment or bullying', icon: 'person-remove-outline' },
  { id: 'false_info', label: 'False information', icon: 'information-circle-outline' },
  { id: 'hate_speech', label: 'Hate speech', icon: 'alert-circle-outline' },
  { id: 'violence', label: 'Violence', icon: 'flash-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
] as const;

const FeedScreen = observer(() => {
  const [viewModel] = useState(() => new FeedViewModel());
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);
  const [isRecipeDetailVisible, setIsRecipeDetailVisible] = useState(false);
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [storyViewerGroupIndex, setStoryViewerGroupIndex] = useState(0);
  const [storyCreatorVisible, setStoryCreatorVisible] = useState(false);
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    viewModel.initialize();
  }, []);

  // Skip the first focus (useEffect handles it); refresh on every return navigation
  const isFirstFeedFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      const userId = AuthService.getCurrentUserId();
      if (userId) {
        new NotificationRepository().getUnreadCount(userId).then(setUnreadNotifs).catch(() => {});
      }
      if (isFirstFeedFocus.current) {
        isFirstFeedFocus.current = false;
        return;
      }
      viewModel.refresh();
    }, [])
  );

  const backgroundColor = colorScheme === 'dark' ? '#000' : '#FFF';
  const textColor = colorScheme === 'dark' ? '#FFF' : '#000';
  const borderColor = colorScheme === 'dark' ? '#262626' : '#DBDBDB';
  const statusBarStyle = colorScheme === 'dark' ? 'light-content' : 'dark-content';

  const handleLike = (postId: string) => {
    viewModel.toggleLike(postId);
  };

  const handleSave = (postId: string) => {
    viewModel.toggleSave(postId);
  };

  const handleComment = (postId: string) => {
    router.push(`/comments/${postId}` as any);
  };

  const handleShare = (postId: string) => {
    setSharingPostId(postId);
  };

  const handleOptions = (postId: string) => {
    const post = viewModel.posts.find(p => p.id === postId);
    if (!post) return;
    const isOwn = post.authorId === viewModel.currentUser?.id;
    if (isOwn) {
      Alert.alert('Post Options', undefined, [
        { text: 'Edit Recipe', onPress: () => router.push(`/create-post?editPostId=${postId}` as any) },
        { text: 'Archive', onPress: async () => {
            await new (await import('../repositories')).PostRepository().archivePost(postId);
            viewModel.refresh();
          }
        },
        { text: 'Delete', style: 'destructive', onPress: () =>
            Alert.alert('Delete Post', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: async () => {
                  await new (await import('../repositories')).PostRepository().deletePost(postId);
                  viewModel.refresh();
                }
              },
            ])
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Post Options', undefined, [
        { text: 'Report', onPress: () => { setReportSubmitted(false); setReportingPostId(postId); } },
        { text: 'Not Interested', onPress: () => viewModel.hidePost(postId) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handlePostPress = (postId: string) => {
    const post = viewModel.posts.find(p => p.id === postId);
    if (post) {
      setSelectedPost(post);
      setIsRecipeDetailVisible(true);
    }
  };

  const handleCloseRecipeDetail = () => {
    setIsRecipeDetailVisible(false);
    setTimeout(() => setSelectedPost(null), 300);
  };

  const handleProfilePress = (userId: string) => {
    if (!userId) return;
    router.push(`/profile/${userId}` as any);
  };

  const handleFollowUser = async (userId: string) => {
    await viewModel.followUser(userId);
  };

  const openStoryViewer = (groupIndex: number) => {
    const group = viewModel.storyGroups[groupIndex];
    if (group) viewModel.markGroupViewed(group.authorId);
    setStoryViewerGroupIndex(groupIndex);
    setStoryViewerVisible(true);
  };

  const renderStories = () => {
    if (!viewModel.currentUser) return null;

    const currentUserId = viewModel.currentUser.id;
    const storyGroups = viewModel.storyGroups;

    // Find own group index in storyGroups
    const ownGroupIndex = storyGroups.findIndex(g => g.authorId === currentUserId);
    const hasOwnStories = ownGroupIndex >= 0;

    const handleOwnStoryPress = () => {
      if (hasOwnStories) {
        openStoryViewer(ownGroupIndex);
      } else {
        setStoryCreatorVisible(true);
      }
    };

    return (
      <View style={[styles.storiesContainer, { borderBottomColor: borderColor }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesContent}
        >
          {/* Current user's story bubble — always first */}
          <StoryItem
            key={`own-${currentUserId}`}
            user={viewModel.currentUser}
            isCurrentUser
            hasStories={hasOwnStories && !viewModel.viewedGroupAuthorIds.includes(currentUserId)}
            hasUnseen={false}
            onPress={handleOwnStoryPress}
          />

          {/* Other users' story groups */}
          {storyGroups
            .filter(g => g.authorId !== currentUserId)
            .map((group, idx) => {
              const groupIndexInAll = storyGroups.findIndex(g => g.authorId === group.authorId);
              return (
                <StoryItem
                  key={group.authorId}
                  user={group.author}
                  isCurrentUser={false}
                  hasStories
                  hasUnseen={group.hasUnseen}
                  onPress={() => openStoryViewer(groupIndexInAll)}
                />
              );
            })}
        </ScrollView>
      </View>
    );
  };

  const renderSuggestedUsers = () => {
    if (!viewModel.suggestedUsers || viewModel.suggestedUsers.length === 0) return null;

    return (
      <View style={[styles.suggestedContainer, { borderColor }]}>
        <Text style={[styles.suggestedTitle, { color: textColor }]}>Suggested for you</Text>
        <FlatList
          data={viewModel.suggestedUsers}
          keyExtractor={u => u.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestedList}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          onEndReachedThreshold={0.5}
          onEndReached={() => viewModel.loadMoreSuggested()}
          ListFooterComponent={
            viewModel.suggestedLoading ? (
              <View style={styles.suggestedLoadingCard}>
                <ActivityIndicator size="small" color={textColor} />
              </View>
            ) : null
          }
          renderItem={({ item: user }) => (
            <View style={[styles.suggestedCard, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#F8F8F8', borderColor }]}>
              <TouchableOpacity onPress={() => handleProfilePress(user.id)} activeOpacity={0.85}>
                <Image
                  source={{ uri: user.profilePicture || user.avatarUri || `https://i.pravatar.cc/150?u=${user.id}` }}
                  style={styles.suggestedCardAvatar}
                />
                <Text style={[styles.suggestedCardName, { color: textColor }]} numberOfLines={1}>
                  {user.displayName || user.username}
                </Text>
                <Text style={styles.suggestedCardBio} numberOfLines={2}>
                  {user.bio || 'New on Fudo'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.suggestedCardBtn, user.isFollowing && styles.suggestedCardBtnFollowing]}
                onPress={() => handleFollowUser(user.id)}
                disabled={user.isFollowing}
              >
                <Text style={[styles.suggestedCardBtnText, user.isFollowing && styles.suggestedCardBtnTextFollowing]}>
                  {user.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    );
  };

  // Build feed items: inject a suggestions placeholder after the 1st post
  type FeedItem = PostWithAuthor | { __type: 'suggestions' };
  const feedItems: FeedItem[] = (() => {
    const posts = viewModel.posts as FeedItem[];
    if (posts.length === 0) return posts;
    return [posts[0], { __type: 'suggestions' as const }, ...posts.slice(1)];
  })();

  const renderPost = ({ item }: { item: FeedItem }) => {
    if ('__type' in item && item.__type === 'suggestions') {
      return renderSuggestedUsers() ?? null;
    }
    const post = item as PostWithAuthor;
    return (
      <PostCard
        post={post}
        onLike={() => handleLike(post.id)}
        onComment={() => handleComment(post.id)}
        onShare={() => handleShare(post.id)}
        onSave={() => handleSave(post.id)}
        onPress={() => handlePostPress(post.id)}
        onProfilePress={() => handleProfilePress(post.authorId)}
        onOptions={() => handleOptions(post.id)}
        currentUser={viewModel.currentUser}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      
      {/* Top Navigation Bar */}
      <View style={[styles.topBar, { borderBottomColor: borderColor }]}>
        <Text style={[styles.logoText, { color: textColor }]}>Fudo</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity style={styles.topBarIcon} onPress={() => router.push('/notifications' as any)}>
            <Ionicons name="heart-outline" size={28} color={textColor} />
            {unreadNotifs > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBarIcon} onPress={() => router.push('/(tabs)/messages' as any)}>
            <Ionicons name="paper-plane-outline" size={28} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories + Feed */}
      <FlatList
        data={feedItems}
        renderItem={renderPost}
        keyExtractor={(item) => ('__type' in item ? '__suggestions__' : item.id)}
        ListHeaderComponent={renderStories()}
        refreshControl={
          <RefreshControl
            refreshing={viewModel.isRefreshing}
            onRefresh={() => viewModel.refresh()}
            tintColor={textColor}
          />
        }
        onEndReached={() => {
          if (viewModel.hasMore && !viewModel.isLoading) {
            viewModel.loadMore();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          viewModel.isLoading ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={textColor} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !viewModel.isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#A0A0A0" style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyText, { color: textColor }]}>Welcome to Fudo!</Text>
              <Text style={styles.emptySubtext}>Follow people to see their delicious posts</Text>
              <Text style={[styles.emptySubtext, { marginTop: 4, fontStyle: 'italic' }]}>
                (Search coming in future updates)
              </Text>
              
              {/* Suggested users in empty state */}
              {renderSuggestedUsers()}
            </View>
          ) : null
        }
      />

      {/* Recipe Detail Modal */}
      <Modal
        visible={isRecipeDetailVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseRecipeDetail}
      >
        {selectedPost && (
          <RecipeDetailScreen
            post={viewModel.posts.find(p => p.id === selectedPost.id) || selectedPost}
            currentUser={viewModel.currentUser}
            onBack={handleCloseRecipeDetail}
            onLike={() => handleLike(selectedPost.id)}
            onSave={() => handleSave(selectedPost.id)}
            onComment={() => {
              handleCloseRecipeDetail();
              setTimeout(() => handleComment(selectedPost.id), 350);
            }}
            onShare={() => handleShare(selectedPost.id)}
            onAuthorPress={(userId) => {
              handleCloseRecipeDetail();
              setTimeout(() => router.push(`/profile/${userId}` as any), 350);
            }}
          />
        )}
      </Modal>

      {/* Share post modal */}
      <SharePostModal
        postId={sharingPostId}
        onClose={() => setSharingPostId(null)}
      />

      {/* Story Viewer Modal */}
      <Modal
        visible={storyViewerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setStoryViewerVisible(false)}
      >
        {storyViewerVisible && viewModel.storyGroups.length > 0 && (
          <StoryViewerScreen
            groups={viewModel.storyGroups}
            initialGroupIndex={storyViewerGroupIndex}
            currentUserId={viewModel.currentUser?.id ?? null}
            onClose={() => setStoryViewerVisible(false)}
            onAddStory={() => {
              setStoryViewerVisible(false);
              setStoryCreatorVisible(true);
            }}
          />
        )}
      </Modal>

      {/* Story Creator Modal */}
      {viewModel.currentUser && (
        <StoryCreatorScreen
          visible={storyCreatorVisible}
          onClose={() => setStoryCreatorVisible(false)}
          onStoryCreated={() => {
            setStoryCreatorVisible(false);
            viewModel.refreshStories();
          }}
          currentUserId={viewModel.currentUser.id}
          currentUser={viewModel.currentUser}
          recentPosts={viewModel.posts}
        />
      )}

      {/* Report modal */}
      <Modal
        visible={reportingPostId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setReportingPostId(null)}
      >
        <TouchableOpacity
          style={reportStyles.backdrop}
          activeOpacity={1}
          onPress={() => setReportingPostId(null)}
        />
        <View style={[reportStyles.sheet, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fff' }]}>
          {reportSubmitted ? (
            <View style={reportStyles.submittedContainer}>
              <View style={reportStyles.submittedIconRing}>
                <Ionicons name="checkmark-circle" size={52} color="#34c759" />
              </View>
              <Text style={[reportStyles.submittedTitle, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                Report Submitted
              </Text>
              <Text style={[reportStyles.submittedSubtitle, { color: colorScheme === 'dark' ? '#8e8e93' : '#6c6c70' }]}>
                Thank you for helping keep Fudo safe. We'll review this post and take action if it violates our community guidelines.
              </Text>
              <TouchableOpacity
                style={reportStyles.doneBtn}
                onPress={() => setReportingPostId(null)}
              >
                <Text style={reportStyles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={reportStyles.handle} />
              <Text style={[reportStyles.sheetTitle, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                Report Post
              </Text>
              <Text style={[reportStyles.sheetSubtitle, { color: colorScheme === 'dark' ? '#8e8e93' : '#6c6c70' }]}>
                Why are you reporting this post?
              </Text>
              {REPORT_REASONS.map((reason, index) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    reportStyles.reasonRow,
                    index < REPORT_REASONS.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5ea',
                    },
                  ]}
                  onPress={() => setReportSubmitted(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={reason.icon as any}
                    size={22}
                    color={colorScheme === 'dark' ? '#8e8e93' : '#6c6c70'}
                    style={{ marginRight: 14 }}
                  />
                  <Text style={[reportStyles.reasonText, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                    {reason.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#c7c7cc" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={reportStyles.cancelBtn}
                onPress={() => setReportingPostId(null)}
              >
                <Text style={reportStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarIcon: {
    marginLeft: 20,
    overflow: 'visible',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B47',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  storiesContainer: {
    borderBottomWidth: 0.5,
    paddingVertical: 12,
  },
  storiesContent: {
    paddingHorizontal: 12,
  },
  storyItem: {
    alignItems: 'center',
    marginHorizontal: 6,
    width: STORY_SIZE,
  },
  storyGradient: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyInnerRing: {
    width: STORY_SIZE - 8,
    height: STORY_SIZE - 7,
    borderRadius: (STORY_SIZE - 6) / 2,
    backgroundColor: '#000',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyRing: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    padding: 1.5,
    borderWidth: 3,
    borderColor: '#FF5E3A',
  },
  addStoryRing: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    borderColor: '#A0A0A0',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: STORY_SIZE / 2,
    borderWidth: 2, // Reduced inner border
    borderColor: '#000',
  },
  addButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0095F6',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  storyUsername: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: STORY_SIZE,
  },
  postCard: {
    marginBottom: 20,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  postUsername: {
    fontWeight: '600',
    fontSize: 14,
  },
  recipeLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 2,
  },
  recipeTeaser: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mediaTeaserContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  teaserImage: {
    width: '100%',
    height: '100%',
  },
  likeAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  likeAnimationHeart: {
    opacity: 0.9,
  },
  teaserGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  mediaBadge: {
    position: 'absolute',
    top: -100,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mediaBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  recipeTitleLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  recipeQuickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  tapPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 6,
  },
  tapPromptText: {
    fontSize: 15,
    fontWeight: '600',
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 16,
  },
  commentsText: {
    fontSize: 14,
  },
  postImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#1A1A1A',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#FFF',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
  },
  likesText: {
    fontSize: 14,
  },
  boldText: {
    fontWeight: '600',
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 18,
  },
  viewCommentsText: {
    color: '#A0A0A0',
    paddingHorizontal: 12,
    paddingTop: 6,
    fontSize: 14,
  },
  timeText: {
    color: '#A0A0A0',
    paddingHorizontal: 12,
    paddingTop: 6,
    fontSize: 11,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#A0A0A0',
    fontSize: 14,
    marginBottom: 32,
  },
  suggestedContainer: {
    paddingTop: 14,
    paddingBottom: 6,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    marginBottom: 8,
  },
  suggestedTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  suggestedList: {
    paddingHorizontal: 12,
    gap: 10,
  },
  suggestedCard: {
    width: 140,
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 12,
    alignItems: 'center',
  },
  suggestedCardAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 8,
    alignSelf: 'center',
  },
  suggestedCardName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 3,
  },
  suggestedCardBio: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 10,
    minHeight: 30,
  },
  suggestedCardBtn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  suggestedCardBtnFollowing: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#CCC',
  },
  suggestedCardBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  suggestedCardBtnTextFollowing: {
    color: '#999',
  },
  suggestedLoadingCard: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const reportStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#c7c7cc',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  cancelBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff3b30',
  },
  submittedContainer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    gap: 12,
  },
  submittedIconRing: {
    marginBottom: 4,
  },
  submittedTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  submittedSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  doneBtn: {
    marginTop: 8,
    paddingHorizontal: 40,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default FeedScreen;
