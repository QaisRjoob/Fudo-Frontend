import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, StatusBar, ActivityIndicator, Image, Modal,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReelsViewModel } from '../viewmodels/ReelsViewModel';
import { PostWithAuthor } from '../models';
import RecipeDetailScreen from './RecipeDetailScreen';

const { width: W, height: H } = Dimensions.get('window');
const ORANGE = '#FF6B35';
const ORANGE_LIGHT = '#FF8C5A';
const ORANGE_DARK  = '#E5501A';

// ─── Individual reel item ────────────────────────────────────────────────────

const TAB_BAR_HEIGHT = 49;

interface ReelItemProps {
  item: PostWithAuthor;
  isActive: boolean;
  isMuted: boolean;
  currentUserId: string | null | undefined;
  bottomInset: number;
  onToggleMute: () => void;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onFollow: (userId: string) => void;
  onAuthorPress: (userId: string) => void;
  onCommentPress: (postId: string) => void;
  onRecipePress: (post: PostWithAuthor) => void;
}

const ReelItem = observer(({
  item, isActive, isMuted,
  currentUserId, bottomInset, onToggleMute,
  onLike, onSave, onFollow, onAuthorPress, onCommentPress, onRecipePress,
}: ReelItemProps) => {
  const videoRef = useRef<Video>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoMedia = item.media.find(m => m.type === 'video');
  const videoUri   = videoMedia?.localUri || videoMedia?.remoteUri || '';
  const thumbUri   = item.media.find(m => m.type === 'image')?.localUri
                  || item.media.find(m => m.type === 'image')?.remoteUri
                  || videoMedia?.thumbnailUri || '';

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && !isPaused) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isActive, isPaused]);

  const handleTap = () => {
    setIsPaused(prev => !prev);
    setShowPauseIcon(true);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => setShowPauseIcon(false), 800);
  };

  const isOwnPost = currentUserId === item.author?.id;

  return (
    <View style={styles.reelContainer}>
      {/* Video */}
      {videoUri ? (
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted={isMuted}
          shouldPlay={isActive && !isPaused}
        />
      ) : (
        <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}

      {/* Tap to pause overlay */}
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleTap} activeOpacity={1}>
        {showPauseIcon && (
          <View style={styles.pauseOverlay}>
            <View style={styles.pauseCircle}>
              <Ionicons name={isPaused ? 'play' : 'pause'} size={40} color="#fff" />
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Bottom gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Right action buttons */}
      <View style={[styles.rightActions, { bottom: bottomInset + 80 }]}>
        {/* Author avatar */}
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={() => item.author?.id && onAuthorPress(item.author.id)}
        >
          <Image
            source={{ uri: item.author?.avatarUri || item.author?.profilePicture || `https://i.pravatar.cc/100?u=${item.author?.id}` }}
            style={styles.avatarImg}
          />
          {!isOwnPost && !item.author?.isFollowing && (
            <View style={styles.followBadge}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(item.id)}>
          <Ionicons
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={32}
            color={item.isLiked ? '#ff3b47' : '#fff'}
          />
          <Text style={styles.actionCount}>{item.likesCount}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => onCommentPress(item.id)}>
          <Ionicons name="chatbubble-outline" size={30} color="#fff" />
          <Text style={styles.actionCount}>{item.commentsCount}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => onSave(item.id)}>
          <Ionicons
            name={item.isSaved ? 'bookmark' : 'bookmark-outline'}
            size={30}
            color={item.isSaved ? ORANGE : '#fff'}
          />
        </TouchableOpacity>

        {/* Mute */}
        <TouchableOpacity style={styles.actionBtn} onPress={onToggleMute}>
          <Ionicons name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={[styles.bottomInfo, { bottom: bottomInset + 16 }]}>
        {/* Author row */}
        <TouchableOpacity
          style={styles.authorRow}
          onPress={() => item.author?.id && onAuthorPress(item.author.id)}
        >
          <Text style={styles.authorUsername}>@{item.author?.username || 'unknown'}</Text>
          {!isOwnPost && (
            <TouchableOpacity
              style={[styles.followPill, item.author?.isFollowing && styles.followingPill]}
              onPress={() => item.author?.id && onFollow(item.author.id)}
            >
              <Text style={[styles.followPillText, item.author?.isFollowing && styles.followingPillText]}>
                {item.author?.isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Title */}
        {(item.title || item.caption) ? (
          <Text style={styles.reelTitle} numberOfLines={2}>
            {item.title || item.caption}
          </Text>
        ) : null}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <Text style={styles.reelTags} numberOfLines={1}>
            {item.tags.map(t => `#${t}`).join(' ')}
          </Text>
        )}

        {/* Cook info */}
        {item.cookTime ? (
          <View style={styles.cookRow}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.cookText}>{item.cookTime} min</Text>
            {item.servings ? (
              <>
                <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.8)" style={{ marginLeft: 10 }} />
                <Text style={styles.cookText}>{item.servings} servings</Text>
              </>
            ) : null}
          </View>
        ) : null}

        {/* View Recipe button */}
        <TouchableOpacity style={styles.viewRecipeBtn} onPress={() => onRecipePress(item)} activeOpacity={0.85}>
          <LinearGradient
            colors={[ORANGE_LIGHT, ORANGE_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.viewRecipeBtnGrad}
          >
            <Ionicons name="book-outline" size={16} color="#fff" />
            <Text style={styles.viewRecipeBtnText}>View Full Recipe</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── ReelsScreen ─────────────────────────────────────────────────────────────

export const ReelsScreen = observer(() => {
  const [viewModel] = useState(() => new ReelsViewModel());
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);
  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  useEffect(() => { viewModel.initialize(); }, []);

  useFocusEffect(
    useCallback(() => {
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      }).catch(() => {});
      return () => {
        // Reset audio mode when leaving the Reels screen
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        }).catch(() => {});
      };
    }, [])
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const keyExtractor = useCallback((item: PostWithAuthor) => item.id, []);

  const bottomInset = insets.bottom + TAB_BAR_HEIGHT;

  const openRecipeModal = useCallback((post: PostWithAuthor) => {
    setSelectedPost(post);
    setRecipeModalVisible(true);
  }, []);

  const closeRecipeModal = useCallback(() => {
    setRecipeModalVisible(false);
    setTimeout(() => setSelectedPost(null), 300);
  }, []);

  const renderItem = useCallback(({ item, index }: { item: PostWithAuthor; index: number }) => (
    <ReelItem
      item={item}
      isActive={index === activeIndex && isFocused && !recipeModalVisible}
      isMuted={isMuted}
      currentUserId={viewModel.currentUserId}
      bottomInset={bottomInset}
      onToggleMute={() => setIsMuted(m => !m)}
      onLike={id => viewModel.toggleLike(id)}
      onSave={id => viewModel.toggleSave(id)}
      onFollow={id => viewModel.followUser(id)}
      onAuthorPress={id => router.push(`/profile/${id}` as any)}
      onCommentPress={id => router.push(`/comments/${id}` as any)}
      onRecipePress={openRecipeModal}
    />
  ), [activeIndex, isMuted, viewModel, bottomInset, openRecipeModal, isFocused, recipeModalVisible]);

  if (viewModel.isLoading && viewModel.posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={styles.loadingText}>Loading Reels…</Text>
      </View>
    );
  }

  if (!viewModel.isLoading && viewModel.posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <LinearGradient colors={[ORANGE_LIGHT, ORANGE_DARK]} style={styles.emptyIconRing}>
          <Ionicons name="videocam-outline" size={44} color="#fff" />
        </LinearGradient>
        <Text style={styles.emptyTitle}>No Reels Yet</Text>
        <Text style={styles.emptySubtitle}>
          Create a recipe post and add a video to appear here.
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => router.push('/create' as any)}
        >
          <LinearGradient colors={[ORANGE_LIGHT, ORANGE_DARK]} style={styles.emptyBtnGrad}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyBtnText}>Create Recipe Video</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.topBarTitle}>Reels</Text>
        <TouchableOpacity onPress={() => router.push('/create' as any)} style={styles.topBarBtn}>
          <LinearGradient colors={[ORANGE_LIGHT, ORANGE_DARK]} style={styles.topBarBtnGrad}>
            <Ionicons name="add" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={viewModel.posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={H}
        snapToAlignment="start"
        decelerationRate="fast"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onEndReached={() => viewModel.loadMore()}
        onEndReachedThreshold={0.5}
        getItemLayout={(_, index) => ({ length: H, offset: H * index, index })}
        ListFooterComponent={
          viewModel.isLoadingMore ? (
            <View style={styles.loadMoreIndicator}>
              <ActivityIndicator color={ORANGE} />
            </View>
          ) : null
        }
      />

      {/* Recipe Detail Modal */}
      <Modal
        visible={recipeModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeRecipeModal}
      >
        {selectedPost && (
          <RecipeDetailScreen
            post={selectedPost}
            currentUser={null}
            onBack={closeRecipeModal}
            onLike={() => viewModel.toggleLike(selectedPost.id)}
            onSave={() => viewModel.toggleSave(selectedPost.id)}
            onComment={() => {
              closeRecipeModal();
              setTimeout(() => router.push(`/comments/${selectedPost.id}` as any), 350);
            }}
            onShare={() => {}}
            onAuthorPress={(userId) => {
              closeRecipeModal();
              setTimeout(() => router.push(`/profile/${userId}` as any), 350);
            }}
          />
        )}
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Loading / empty
  loadingContainer: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  loadingText: { color: '#fff', fontSize: 16 },
  emptyContainer: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  emptyIconRing: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
  emptySubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 15, textAlign: 'center' },
  emptyBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  emptyBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14,
  },
  emptyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 10,
  },
  topBarTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  topBarBtn: { borderRadius: 18, overflow: 'hidden' },
  topBarBtnGrad: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },

  // Reel item
  reelContainer: { width: W, height: H, backgroundColor: '#111' },

  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  pauseCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },

  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: H * 0.55,
  },

  // Right actions
  rightActions: {
    position: 'absolute', right: 14,
    alignItems: 'center', gap: 18,
  },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatarImg: {
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 2, borderColor: '#fff',
  },
  followBadge: {
    position: 'absolute', bottom: -6, left: '50%',
    transform: [{ translateX: -10 }],
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: ORANGE,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#000',
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCount: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Bottom info
  bottomInfo: {
    position: 'absolute', left: 16, right: 80,
    gap: 6,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorUsername: { color: '#fff', fontSize: 16, fontWeight: '700' },
  followPill: {
    borderWidth: 1.5, borderColor: '#fff',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  followingPill: { borderColor: ORANGE },
  followPillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  followingPillText: { color: ORANGE },
  reelTitle: {
    color: '#fff', fontSize: 15, fontWeight: '600',
    lineHeight: 21,
  },
  reelTags: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  cookRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cookText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  viewRecipeBtn: { alignSelf: 'flex-start', borderRadius: 22, overflow: 'hidden', marginTop: 4 },
  viewRecipeBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  viewRecipeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Load more
  loadMoreIndicator: {
    height: H, justifyContent: 'center', alignItems: 'center',
  },
});
