import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Share,
  useColorScheme,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfileViewModel } from '../viewmodels';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Post, PostWithAuthor, User } from '../models';
import RecipeDetailScreen from './RecipeDetailScreen';
import { SharePostModal } from './SharePostModal';
import DefaultAvatar from '../components/DefaultAvatar';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = width / 3 - 1;

const ORANGE       = '#FF6B35';
const ORANGE_LIGHT = '#FF8C5A';
const ORANGE_DARK  = '#E5501A';

// Utility to format numbers (1234 -> 1.2K, 1234567 -> 1.2M)
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
};

// Post Grid Item for Grid View
const PostGridItem = React.memo(({ post, onPress }: { post: Post; onPress: () => void }) => {
  return (
    <TouchableOpacity 
      style={styles.gridItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: post.media[0]?.remoteUri || post.media[0]?.localUri || 'https://via.placeholder.com/200' }}
        style={styles.gridImage}
        resizeMode="cover"
      />
      {post.media.length > 1 && (
        <View style={styles.multipleIndicator}>
          <Ionicons name="copy-outline" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
});

// Post Card Component for Profile Feed
const PostCard = observer(({
  post,
  onLike,
  onComment,
  onShare,
  onSave,
  onPress,
  onOptions,
  currentUser
}: {
  post: PostWithAuthor;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onPress: () => void;
  onOptions: () => void;
  currentUser: User | null;
}) => {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const textColor = colorScheme === 'dark' ? '#FFF' : '#000';
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#FFF';

  const [lastTap, setLastTap] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const tapTimeoutRef = useRef<any>(null);

  const handleDoubleTap = () => {
    const now = Date.now();
    if (lastTap && now - lastTap < 300) {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      if (!post.isLiked) onLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
      setLastTap(0);
    } else {
      setLastTap(now);
      tapTimeoutRef.current = setTimeout(() => {
        onPress();
        setLastTap(0);
      }, 300);
    }
  };

  return (
    <View style={[styles.postCard, { backgroundColor }]}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          <Image
            source={{ uri: post.author?.profilePicture || post.author?.avatarUri || `https://i.pravatar.cc/150?u=${post.authorId}` }}
            style={styles.postAvatar}
          />
          <View>
            <Text style={[styles.postUsername, { color: textColor }]}>{post.author?.username || 'User'}</Text>
            <Text style={styles.recipeLabel}>shared a recipe</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onOptions}>
          <MaterialIcons name="more-vert" size={24} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* Recipe Image */}
      <TouchableOpacity onPress={handleDoubleTap} activeOpacity={0.9}>
        <Image
          source={{ uri: post.media[0]?.remoteUri || post.media[0]?.localUri || 'https://via.placeholder.com/400' }}
          style={styles.postImage}
          resizeMode="cover"
        />
        {/* Double-tap heart animation */}
        {showHeart && (
          <View style={styles.heartAnimationContainer}>
            <Ionicons name="heart" size={100} color="#FF3B47" />
          </View>
        )}
        {/* Quick Info Badges at Top */}
        {(post.cookTime || post.calories || post.servings) ? (
          <View style={styles.quickInfoOverlay}>
            {post.cookTime ? (
              <View style={styles.infoBadge}>
                <Ionicons name="time-outline" size={14} color="#FF6B35" />
                <Text style={styles.infoBadgeText}>{post.cookTime} min</Text>
              </View>
            ) : null}
            {post.calories ? (
              <View style={styles.infoBadge}>
                <Ionicons name="flame-outline" size={14} color="#FF6B35" />
                <Text style={styles.infoBadgeText}>{post.calories} cal</Text>
              </View>
            ) : null}
            {post.servings ? (
              <View style={styles.infoBadge}>
                <Ionicons name="restaurant-outline" size={14} color="#FF6B35" />
                <Text style={styles.infoBadgeText}>{post.servings} servings</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {/* Instagram-style gradient overlay with tap prompt */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.imageGradientOverlay}
        >
          <View style={styles.tapPromptContainer}>
            <Ionicons name="book-outline" size={20} color="#FF6B35" />
            <Text style={styles.tapPromptText}>Tap to view recipe</Text>
            <Ionicons name="arrow-forward" size={18} color="#FF6B35" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Engagement Row */}
      <View style={styles.engagementRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={onLike} style={styles.actionButton}>
            <Ionicons 
              name={post.isLiked ? "heart" : "heart-outline"} 
              size={28} 
              color={post.isLiked ? "#FF3B30" : textColor}
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
            name={post.isSaved ? "bookmark" : "bookmark-outline"} 
            size={28} 
            color={post.isSaved ? textColor : textColor}
          />
        </TouchableOpacity>
      </View>

      {/* Likes and Caption */}
      <View style={styles.postContent}>
        <View style={styles.engagementCounts}>
          <TouchableOpacity onPress={() => router.push(`/user-list?type=likes&postId=${post.id}&userId=${post.authorId}` as any)}>
            <Text style={[styles.likesText, { color: textColor }]}>
              {post.likesCount.toLocaleString('en-US')} likes
            </Text>
          </TouchableOpacity>
          {post.commentsCount > 0 && (
            <>
              <Text style={[styles.countSeparator, { color: textColor }]}>•</Text>
              <TouchableOpacity onPress={onComment}>
                <Text style={[styles.commentsText, { color: textColor }]}>
                  {post.commentsCount.toLocaleString('en-US')} comments
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {post.caption && (
          <Text style={[styles.captionText, { color: textColor }]} numberOfLines={2}>
            <Text style={styles.captionUsername}>{post.author?.username || 'User'}</Text> {post.caption}
          </Text>
        )}
        {post.commentsCount > 0 && (
          <TouchableOpacity onPress={onComment}>
            <Text style={styles.viewCommentsText}>
              View all {post.commentsCount} comments
            </Text>
          </TouchableOpacity>
        )}
        <Text style={styles.postTimeText}>2 hours ago</Text>
      </View>
    </View>
  );
});

export const ProfileScreen = observer(({ route }: any) => {
  const [viewModel] = useState(() => new ProfileViewModel());
  const [selectedTab, setSelectedTab] = useState<'posts' | 'analytics'>('posts');
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const [initialPostIndex, setInitialPostIndex] = useState(0);
  const feedListRef = useRef<FlatList>(null);
  const router = useRouter();
  
  const colorScheme = useColorScheme();
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#FFF';
  const textColor = colorScheme === 'dark' ? '#FFF' : '#000';
  const secondaryTextColor = colorScheme === 'dark' ? '#999' : '#666';
  const borderColor = colorScheme === 'dark' ? '#333' : '#eee';
  const cardBackgroundColor = colorScheme === 'dark' ? '#1A1A1A' : '#f5f5f5';

  useEffect(() => {
    viewModel.initialize(route?.params?.userId);
  }, [route?.params?.userId]);

  // Skip the first focus (useEffect handles it); refresh on every return navigation
  const isFirstProfileFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstProfileFocus.current) {
        isFirstProfileFocus.current = false;
        return;
      }
      viewModel.refresh();
    }, [])
  );

  const openRecipeDetail = (post: Post, index: number) => {
    // Switch to feed view and scroll to the clicked post
    setInitialPostIndex(index);
    setViewMode('feed');
    // Scroll to the post after view has switched
    setTimeout(() => {
      try {
        if (feedListRef.current && viewModel.posts.length > 0) {
          feedListRef.current.scrollToIndex({ 
            index: Math.min(index, viewModel.posts.length - 1), 
            animated: false,
            viewPosition: 0
          });
        }
      } catch (e) {
        console.error('Error scrolling to index:', e);
        // Fallback to scrollToOffset if scrollToIndex fails
        feedListRef.current?.scrollToOffset({ offset: index * 600, animated: false });
      }
    }, 100);
  };

  const openRecipeModal = (post: PostWithAuthor) => {
    setSelectedPost(post);
    setRecipeModalVisible(true);
  };

  const closeRecipeDetail = () => {
    setRecipeModalVisible(false);
    setTimeout(() => setSelectedPost(null), 300);
  };

  const handleLike = (postId?: string) => {
    const targetPostId = postId || selectedPost?.id;
    if (targetPostId) {
      viewModel.toggleLike(targetPostId);
    }
  };

  const handleSave = (postId?: string) => {
    const targetPostId = postId || selectedPost?.id;
    if (targetPostId) {
      viewModel.toggleSave(targetPostId);
    }
  };

  const handleComment = (postId?: string) => {
    const targetPostId = postId || selectedPost?.id;
    if (targetPostId) {
      router.push(`/comments/${targetPostId}` as any);
    }
  };

  const handleShare = (postId?: string) => {
    const targetPostId = postId || selectedPost?.id;
    if (!targetPostId) return;
    setSharingPostId(targetPostId);
  };

  const handlePostOptions = (postId: string) => {
    const post = viewModel.posts.find(p => p.id === postId);
    if (!post || !viewModel.isCurrentUser) return;
    Alert.alert('Post Options', undefined, [
      { text: 'Edit Recipe', onPress: () => router.push(`/create-post?editPostId=${postId}` as any) },
      { text: 'Archive', onPress: async () => {
        const { PostRepository } = await import('../repositories');
        await new PostRepository().archivePost(postId);
        viewModel.refresh();
      }},
      { text: 'Delete', style: 'destructive', onPress: () =>
        Alert.alert('Delete Post', 'This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => {
            const { PostRepository } = await import('../repositories');
            await new PostRepository().deletePost(postId);
            viewModel.refresh();
          }},
        ])
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleMessage = () => {
    if (viewModel.user) {
      router.push(`/chat?userId=${viewModel.user.id}` as any);
    }
  };

  const handleShareProfile = async () => {
    if (!viewModel.user) return;
    const { username, displayName, bio } = viewModel.user;
    const name = displayName || username;
    const bioLine = bio ? `\n"${bio}"` : '';
    try {
      await Share.share({
        title: `${name} on Fudo`,
        message: `Check out ${name}'s recipes on Fudo! 🍽️${bioLine}\n\nhttps://fudo.app/profile/${username}`,
      });
    } catch (error: any) {
      if (error.message !== 'The user did not share') {
        Alert.alert('Could not share', error.message);
      }
    }
  };

  const handleSuggestFriends = () => {
    console.log('Suggest friends');
    // TODO: Show friends suggestions
  };

  if (viewModel.isLoading) {
    return (
      <SafeAreaView style={[{ flex: 1, backgroundColor }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
          <Ionicons name="arrow-back" size={28} color={textColor} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      </SafeAreaView>
    );
  }

  if (!viewModel.user) {
    return (
      <SafeAreaView style={[{ flex: 1, backgroundColor }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
          <Ionicons name="arrow-back" size={28} color={textColor} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={{ color: textColor }}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: borderColor }]}>
        {(!viewModel.isCurrentUser) || viewMode === 'feed' ? (
          <TouchableOpacity
            onPress={() => viewMode === 'feed' ? setViewMode('grid') : router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color={textColor} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/create-post' as any)}
            activeOpacity={0.8}
            style={styles.addPostBtn}
          >
            <LinearGradient
              colors={[ORANGE_LIGHT, ORANGE_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addPostBtnGrad}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
        <Text style={[styles.usernameHeader, { color: textColor }]}>{viewModel.user.username}</Text>
        <TouchableOpacity onPress={viewModel.isCurrentUser ? () => router.push('/settings') : undefined}>
          <Ionicons
            name={viewModel.isCurrentUser ? "settings-outline" : "ellipsis-horizontal"}
            size={26}
            color={textColor}
          />
        </TouchableOpacity>
      </View>

      {viewMode === 'grid' ? (
        <ScrollView style={{ flex: 1 }}>
          {/* Profile Header */}
          <View style={styles.header}>
          <TouchableOpacity onPress={viewModel.isCurrentUser ? () => router.push('/edit-profile' as any) : undefined}>
            {viewModel.user.hasStory ? (
              <LinearGradient
                colors={['#f17107ff', '#ffae00ff', '#ff0000ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.storyGradient}
              >
                <View style={[styles.storyInnerRing, { backgroundColor }]}>
                  <DefaultAvatar
                    uri={viewModel.user.avatarUri || viewModel.user.profilePicture}
                    name={viewModel.user.displayName || viewModel.user.username}
                    size={76}
                    style={styles.profileImage}
                  />
                </View>
              </LinearGradient>
            ) : (
              <DefaultAvatar
                uri={viewModel.user.avatarUri || viewModel.user.profilePicture}
                name={viewModel.user.displayName || viewModel.user.username}
                size={86}
                style={styles.profileImage}
              />
            )}
            {viewModel.isCurrentUser && !(viewModel.user.avatarUri || viewModel.user.profilePicture) && (
              <View style={styles.changePhotoBadge}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          {viewModel.isCurrentUser && !(viewModel.user.avatarUri || viewModel.user.profilePicture) && (
            <Text style={[styles.changePhotoHint, { color: ORANGE }]}>Tap to set your photo</Text>
          )}
          
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.stat}>
              <Text style={[styles.statNumber, { color: ORANGE }]}>{formatCount(viewModel.posts.length)}</Text>
              <Text style={[styles.statLabel, { color: secondaryTextColor }]}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => router.push({ pathname: '/user-list', params: { type: 'followers', userId: viewModel.user!.id } } as any)}
            >
              <Text style={[styles.statNumber, { color: ORANGE }]}>{formatCount(viewModel.user.followersCount)}</Text>
              <Text style={[styles.statLabel, { color: secondaryTextColor }]}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => router.push({ pathname: '/user-list', params: { type: 'following', userId: viewModel.user!.id } } as any)}
            >
              <Text style={[styles.statNumber, { color: ORANGE }]}>{formatCount(viewModel.user.followingCount)}</Text>
              <Text style={[styles.statLabel, { color: secondaryTextColor }]}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <Text style={[styles.displayName, { color: textColor }]}>{viewModel.user.displayName}</Text>
          {viewModel.user.bio && <Text style={[styles.bio, { color: textColor }]}>{viewModel.user.bio}</Text>}
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          {!viewModel.isCurrentUser ? (
            <>
              {/* Follow / Following button */}
              {viewModel.isFollowing ? (
                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: ORANGE, flex: 1 }]}
                  onPress={() => viewModel.toggleFollow()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={15} color={ORANGE} />
                  <Text style={[styles.outlineBtnText, { color: ORANGE }]}>Following</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => viewModel.toggleFollow()} activeOpacity={0.85} style={{ flex: 1 }}>
                  <LinearGradient
                    colors={[ORANGE_LIGHT, ORANGE_DARK]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.gradientBtn}
                  >
                    <Text style={styles.gradientBtnText}>Follow</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {/* Message button */}
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: ORANGE, flex: 1 }]}
                onPress={handleMessage}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={15} color={ORANGE} />
                <Text style={[styles.outlineBtnText, { color: ORANGE }]}>Message</Text>
              </TouchableOpacity>
              {/* Add friend icon */}
              <TouchableOpacity
                style={[styles.iconBtn, { borderColor, backgroundColor: cardBackgroundColor }]}
                onPress={handleSuggestFriends}
              >
                <Ionicons name="person-add-outline" size={18} color={textColor} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor, backgroundColor: cardBackgroundColor, flex: 1 }]}
                onPress={handleEditProfile}
                activeOpacity={0.8}
              >
                <Text style={[styles.outlineBtnText, { color: textColor }]}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor, backgroundColor: cardBackgroundColor, flex: 1 }]}
                onPress={handleShareProfile}
                activeOpacity={0.8}
              >
                <Text style={[styles.outlineBtnText, { color: textColor }]}>Share Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { borderColor, backgroundColor: cardBackgroundColor }]}
                onPress={() => router.push('/saved-posts')}
              >
                <Ionicons name="bookmark-outline" size={18} color={textColor} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Recipe Categories */}
        <View style={[styles.highlightsSection, { borderBottomColor: borderColor }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightsContainer}>
            {viewModel.isCurrentUser && (
              <TouchableOpacity style={styles.highlightItem}>
                <View style={[styles.highlightCircle, { borderColor: borderColor, backgroundColor: cardBackgroundColor }]}>
                  <Ionicons name="add" size={32} color={secondaryTextColor} />
                </View>
                <Text style={[styles.highlightLabel, { color: textColor }]}>New</Text>
              </TouchableOpacity>
            )}
            {[
              { name: 'Breakfast', icon: 'sunny-outline' },
              { name: 'Lunch', icon: 'restaurant-outline' },
              { name: 'Dinner', icon: 'moon-outline' },
              { name: 'Dessert', icon: 'ice-cream-outline' },
              { name: 'Drinks', icon: 'cafe-outline' },
            ].map((category, index) => {
              const isCurrentUser = viewModel.isCurrentUser;
              return (
                <TouchableOpacity key={index} style={styles.highlightItem} disabled={!isCurrentUser}>
                  <View style={[styles.highlightCircle, { borderColor: 'rgba(255,107,53,0.35)', backgroundColor: 'rgba(255,107,53,0.06)' }]}>
                    <Ionicons name={category.icon as any} size={28} color={ORANGE} />
                  </View>
                  <Text style={[styles.highlightLabel, { color: textColor }]} numberOfLines={1}>{category.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderTopColor: borderColor }]}>
          <TouchableOpacity
            style={[styles.tab, (selectedTab === 'posts' && viewMode === 'grid') && [styles.activeTab, { borderBottomColor: ORANGE }]]}
            onPress={() => { setSelectedTab('posts'); setViewMode('grid'); }}
          >
            <Ionicons name="grid-outline" size={24} color={(selectedTab === 'posts' && viewMode === 'grid') ? ORANGE : secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, (selectedTab === 'posts' && (viewMode as 'grid' | 'feed') === 'feed') && [styles.activeTab, { borderBottomColor: ORANGE }]]}
            onPress={() => { setSelectedTab('posts'); setViewMode('feed'); }}
          >
            <Ionicons name="list-outline" size={24} color={(selectedTab === 'posts' && (viewMode as 'grid' | 'feed') === 'feed') ? ORANGE : secondaryTextColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'analytics' && [styles.activeTab, { borderBottomColor: ORANGE }]]}
            onPress={() => setSelectedTab('analytics')}
          >
            <Ionicons name="stats-chart-outline" size={24} color={selectedTab === 'analytics' ? ORANGE : secondaryTextColor} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {selectedTab === 'posts' ? (
          viewModel.posts.length > 0 ? (
            viewMode === 'grid' ? (
              <View style={styles.gridContainer}>
                {viewModel.posts.map((post, index) => (
                  <PostGridItem key={post.id} post={post} onPress={() => openRecipeDetail(post, index)} />
                ))}
              </View>
            ) : null
          ) : (
            <View style={styles.emptyStateContainer}>
              <View style={[styles.emptyStateIcon, { borderColor: 'rgba(255,107,53,0.3)', backgroundColor: 'rgba(255,107,53,0.06)' }]}>
                <Ionicons name="restaurant-outline" size={80} color={ORANGE} />
              </View>
              <Text style={[styles.emptyStateTitle, { color: textColor }]}>No Recipes Yet</Text>
              <Text style={[styles.emptyStateText, { color: secondaryTextColor }]}>
                {viewModel.isCurrentUser 
                  ? 'Share your first recipe to inspire others!'
                  : 'This user hasn\'t shared any recipes yet'}
              </Text>
              {viewModel.isCurrentUser && (
                <TouchableOpacity onPress={() => router.push('/create-post' as any)} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[ORANGE_LIGHT, ORANGE_DARK]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.emptyStateButton}
                  >
                    <Ionicons name="add" size={20} color="#FFF" />
                    <Text style={styles.emptyStateButtonText}>Share Recipe</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )
        ) : (
        <View style={styles.analyticsContainer}>
          {viewModel.analytics ? (
            <>
              <View style={[styles.periodSelector, { backgroundColor: cardBackgroundColor }]}>
                {(['7d', '30d', '90d'] as const).map((period) => {
                  const isActive = viewModel.selectedPeriod === period;
                  return isActive ? (
                    <TouchableOpacity key={period} activeOpacity={0.9} style={{ flex: 1 }}
                      onPress={() => viewModel.loadAnalytics(period)}>
                      <LinearGradient
                        colors={[ORANGE_LIGHT, ORANGE_DARK]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.periodButtonActive}
                      >
                        <Text style={styles.periodButtonTextActive}>
                          {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      key={period}
                      style={styles.periodButton}
                      onPress={() => viewModel.loadAnalytics(period)}
                    >
                      <Text style={[styles.periodButtonText, { color: secondaryTextColor }]}>
                        {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.analyticsGrid}>
                <View style={[styles.analyticsCard, { backgroundColor: cardBackgroundColor }]}>
                  <Text style={[styles.analyticsLabel, { color: secondaryTextColor }]}>Total Impressions</Text>
                  <Text style={[styles.analyticsValue, { color: textColor }]}>{viewModel.analytics.totalImpressions}</Text>
                </View>
                <View style={[styles.analyticsCard, { backgroundColor: cardBackgroundColor }]}>
                  <Text style={[styles.analyticsLabel, { color: secondaryTextColor }]}>Total Reach</Text>
                  <Text style={[styles.analyticsValue, { color: textColor }]}>{viewModel.analytics.totalReach}</Text>
                </View>
                <View style={[styles.analyticsCard, { backgroundColor: cardBackgroundColor }]}>
                  <Text style={[styles.analyticsLabel, { color: secondaryTextColor }]}>Avg Likes/Post</Text>
                  <Text style={[styles.analyticsValue, { color: textColor }]}>{viewModel.analytics.avgLikesPerPost}</Text>
                </View>
                <View style={[styles.analyticsCard, { backgroundColor: cardBackgroundColor }]}>
                  <Text style={[styles.analyticsLabel, { color: secondaryTextColor }]}>Follower Growth</Text>
                  <Text style={[
                    styles.analyticsValue,
                    { color: viewModel.analytics.followersGrowth >= 0 ? '#34c759' : '#ff3b30' }
                  ]}>
                    {viewModel.analytics.followersGrowth >= 0 ? '+' : ''}{viewModel.analytics.followersGrowth}%
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={ORANGE} />
            </View>
          )}
        </View>
      )}
        </ScrollView>
      ) : (
        // Feed View - FlatList at root level
        selectedTab === 'posts' && viewModel.posts.length > 0 ? (
          <FlatList
              ref={feedListRef}
              data={viewModel.posts}
              keyExtractor={(item) => item.id}
              initialScrollIndex={initialPostIndex}
              getItemLayout={(data, index) => ({
                length: 600,
                offset: 600 * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                console.warn('Scroll to index failed:', info);
                setTimeout(() => {
                  try {
                    feedListRef.current?.scrollToIndex({ 
                      index: Math.min(info.index, viewModel.posts.length - 1), 
                      animated: true 
                    });
                  } catch (e) {
                    console.error('Failed to scroll:', e);
                  }
                }, 500);
              }}
              renderItem={({ item }) => (
                <PostCard
                  post={item}
                  onLike={() => handleLike(item.id)}
                  onComment={() => handleComment(item.id)}
                  onShare={() => handleShare(item.id)}
                  onSave={() => handleSave(item.id)}
                  onPress={() => openRecipeModal(item)}
                  onOptions={() => handlePostOptions(item.id)}
                  currentUser={viewModel.user}
                />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              removeClippedSubviews={false}
              maxToRenderPerBatch={3}
              windowSize={5}
            />
        ) : (
          <View style={styles.centered}>
            <Text style={{ color: textColor }}>No posts</Text>
          </View>
        )
      )}

      {/* Recipe Detail Modal */}
      <Modal
        visible={recipeModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeRecipeDetail}
      >
        {selectedPost && (
          <RecipeDetailScreen
            post={selectedPost}
            currentUser={viewModel.user}
            onBack={closeRecipeDetail}
            onLike={handleLike}
            onSave={handleSave}
            onComment={() => {
              closeRecipeDetail();
              setTimeout(() => selectedPost && handleComment(selectedPost.id), 350);
            }}
            onShare={handleShare}
            onAuthorPress={(userId) => {
              closeRecipeDetail();
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
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backButton: {
    marginRight: 8,
  },
  addPostBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  addPostBtnGrad: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usernameHeader: {
    fontSize: 20,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyGradient: {
    width: 94,
    height: 94,
    borderRadius: 47,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyInnerRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  changePhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changePhotoHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingLeft: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  profileInfo: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  gradientBtn: {
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  gradientBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  outlineBtn: {
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 5,
  },
  outlineBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  highlightsSection: {
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  highlightsContainer: {
    paddingHorizontal: 12,
  },
  highlightItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 64,
  },
  highlightCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  highlightImage: {
    width: '100%',
    height: '100%',
  },
  highlightLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    margin: 0.5,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  multipleIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  analyticsContainer: {
    padding: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 4,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonText: {
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticsCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  analyticsLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Post Card Styles for Feed View
  postCard: {
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    color: '#999',
    marginTop: 2,
  },
  postImage: {
    width: '100%',
    height: 400,
  },
  heartAnimationContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
  },
  postContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  engagementCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  likesText: {
    fontWeight: '600',
    fontSize: 14,
  },
  countSeparator: {
    marginHorizontal: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  commentsText: {
    fontWeight: '600',
    fontSize: 14,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  captionUsername: {
    fontWeight: '600',
  },
  viewCommentsText: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  postTimeText: {
    color: '#999',
    fontSize: 12,
    marginTop: 6,
  },
  quickInfoOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 1,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  infoBadgeText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  imageGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: 'flex-end',
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  tapPromptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tapPromptText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tapPromptOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    alignItems: 'center',
  },
  tapPromptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
});
