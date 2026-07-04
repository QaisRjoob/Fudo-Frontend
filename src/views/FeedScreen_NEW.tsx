import React, { useEffect, useState } from 'react';
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
  
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { FeedViewModel } from '../viewmodels/FeedViewModel';
import { PostWithAuthor, User } from '../models';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_SIZE = 70;

// Story Item Component
const StoryItem = ({ user, isFirst }: { user: User; isFirst: boolean }) => (
  <TouchableOpacity style={styles.storyItem}>
    <View style={[styles.storyRing, isFirst && styles.addStoryRing]}>
      <Image 
        source={{ uri: user.profilePicture }} 
        style={styles.storyImage}
      />
      {isFirst && (
        <View style={styles.addButton}>
          <Ionicons name="add" size={16} color="#FFF" />
        </View>
      )}
    </View>
    <Text style={styles.storyUsername} numberOfLines={1}>
      {isFirst ? 'Your Story' : user.username}
    </Text>
  </TouchableOpacity>
);

// Post Card Component
const PostCard = observer(({ 
  post, 
  onLike, 
  onComment,
  onShare,
  onSave, 
  currentUser 
}: { 
  post: PostWithAuthor; 
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  currentUser: User | null;
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const isLiked = post.isLikedByCurrentUser || false;
  const isSaved = post.isSavedByCurrentUser || false;

  return (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          <Image 
            source={{ uri: post.author?.profilePicture }} 
            style={styles.postAvatar}
          />
          <Text style={styles.postUsername}>{post.author?.username}</Text>
        </View>
        <TouchableOpacity>
          <MaterialIcons name="more-vert" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Post Image/Media */}
      <View style={styles.postImageContainer}>
        {post.media && post.media.length > 0 && (
          <>
            <Image 
              source={{ uri: post.media[currentImageIndex]?.url }} 
              style={styles.postImage}
              resizeMode="cover"
            />
            {post.media.length > 1 && (
              <View style={styles.dotsContainer}>
                {post.media.map((_: any, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === currentImageIndex && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={onLike} style={styles.actionButton}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={28} 
              color={isLiked ? "#FF3B47" : "#FFF"} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onComment} style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={26} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={styles.actionButton}>
            <Ionicons name="paper-plane-outline" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onSave}>
          <Ionicons 
            name={isSaved ? "bookmark" : "bookmark-outline"} 
            size={26} 
            color="#FFF" 
          />
        </TouchableOpacity>
      </View>

      {/* Likes Count */}
      {post.likesCount > 0 && (
        <Text style={styles.likesText}>
          <Text style={styles.boldText}>{post.likesCount.toLocaleString('en-US')}</Text> likes
        </Text>
      )}

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.captionText}>
          <Text style={styles.boldText}>{post.author?.username} </Text>
          {post.caption}
        </Text>
      </View>

      {/* View Comments */}
      {post.commentsCount > 0 && (
        <TouchableOpacity onPress={onComment}>
          <Text style={styles.viewCommentsText}>
            View all {post.commentsCount} comments
          </Text>
        </TouchableOpacity>
      )}

      {/* Time */}
      <Text style={styles.timeText}>2 hours ago</Text>
    </View>
  );
});

// Main Feed Screen
const FeedScreen = observer(() => {
  const [viewModel] = useState(() => new FeedViewModel());

  useEffect(() => {
    viewModel.initialize();
  }, []);

  const handleLike = (postId: string) => {
    viewModel.toggleLike(postId);
  };

  const handleSave = (postId: string) => {
    viewModel.toggleSave(postId);
  };

  const handleComment = (postId: string) => {
    console.log('Comment on post:', postId);
  };

  const handleShare = (postId: string) => {
    console.log('Share post:', postId);
  };

  const renderStories = () => {
    if (!viewModel.currentUser) return null;

    const storyUsers = [
      viewModel.currentUser, 
      ...viewModel.posts.slice(0, 7).map(p => p.author!).filter(Boolean)
    ];

    return (
      <View style={styles.storiesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesContent}
        >
          {storyUsers.map((user, index) => (
            <StoryItem key={user.id} user={user} isFirst={index === 0} />
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderPost = ({ item }: { item: PostWithAuthor }) => (
    <PostCard 
      post={item} 
      onLike={() => handleLike(item.id)}
      onComment={() => handleComment(item.id)}
      onShare={() => handleShare(item.id)}
      onSave={() => handleSave(item.id)}
      currentUser={viewModel.currentUser}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <Text style={styles.logoText}>Fudo</Text>
        <View style={styles.topBarIcons}>
          <TouchableOpacity style={styles.topBarIcon}>
            <Ionicons name="heart-outline" size={28} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topBarIcon}>
            <Ionicons name="paper-plane-outline" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories + Feed */}
      <FlatList
        data={viewModel.posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderStories()}
        refreshControl={
          <RefreshControl
            refreshing={viewModel.isRefreshing}
            onRefresh={() => viewModel.refresh()}
            tintColor="#FFF"
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
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !viewModel.isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubtext}>Follow people to see their posts here</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  topBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarIcon: {
    marginLeft: 20,
  },
  storiesContainer: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
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
  storyRing: {
    width: STORY_SIZE,
    height: STORY_SIZE,
    borderRadius: STORY_SIZE / 2,
    padding: 3,
    borderWidth: 2,
    borderColor: '#DD2A7B',
  },
  addStoryRing: {
    borderColor: '#262626',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: STORY_SIZE / 2,
    borderWidth: 3,
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
    color: '#FFF',
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
    color: '#FFF',
    fontWeight: '600',
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
    color: '#FFF',
    paddingHorizontal: 12,
    paddingTop: 8,
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
    color: '#FFF',
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
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#A0A0A0',
    fontSize: 14,
  },
});

export default FeedScreen;
