import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, StatusBar, useColorScheme,
  Dimensions, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { makeAutoObservable, runInAction } from 'mobx';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PostRepository } from '../repositories';
import { StoryRepository } from '../repositories/StoryRepository';
import { PostWithAuthor, Story } from '../models';
import { AuthService } from '../services/AuthService';
import RecipeDetailScreen from './RecipeDetailScreen';

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 3 - 1;

const ORANGE = '#FF6B35';
const ORANGE_LIGHT = '#FF8C5A';
const ORANGE_DARK = '#E5501A';

class ArchiveViewModel {
  posts: PostWithAuthor[] = [];
  stories: Story[] = [];
  isLoadingPosts = false;
  isLoadingStories = false;
  private postRepo = new PostRepository();
  private storyRepo = new StoryRepository();

  constructor() { makeAutoObservable(this); }

  async loadPosts(): Promise<void> {
    const userId = AuthService.getCurrentUserId();
    if (!userId) return;
    runInAction(() => { this.isLoadingPosts = true; });
    try {
      const posts = await this.postRepo.getArchivedPosts(userId);
      runInAction(() => { this.posts = posts; });
    } catch (e) {
      console.error('Archive posts load error:', e);
    } finally {
      runInAction(() => { this.isLoadingPosts = false; });
    }
  }

  async loadStories(): Promise<void> {
    const userId = AuthService.getCurrentUserId();
    if (!userId) return;
    runInAction(() => { this.isLoadingStories = true; });
    try {
      const stories = await this.storyRepo.getExpiredStories(userId);
      runInAction(() => { this.stories = stories; });
    } catch (e) {
      console.error('Archive stories load error:', e);
    } finally {
      runInAction(() => { this.isLoadingStories = false; });
    }
  }

  async unarchive(postId: string): Promise<void> {
    await this.postRepo.unarchivePost(postId);
    runInAction(() => { this.posts = this.posts.filter(p => p.id !== postId); });
  }

  async deletePost(postId: string): Promise<void> {
    await this.postRepo.deletePost(postId);
    runInAction(() => { this.posts = this.posts.filter(p => p.id !== postId); });
  }

  async deleteStory(storyId: string): Promise<void> {
    await this.storyRepo.deleteStory(storyId);
    runInAction(() => { this.stories = this.stories.filter(s => s.id !== storyId); });
  }
}

type Tab = 'posts' | 'stories';

export const ArchiveScreen = observer(() => {
  const [viewModel] = useState(() => new ArchiveViewModel());
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const bg = dark ? '#000' : '#fff';
  const textColor = dark ? '#fff' : '#000';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const separatorColor = dark ? '#2c2c2e' : '#f2f2f7';
  const cardBg = dark ? '#1c1c1e' : '#f2f2f7';

  useEffect(() => {
    viewModel.loadPosts();
    viewModel.loadStories();
  }, []);

  const handlePostLongPress = (post: PostWithAuthor) => {
    Alert.alert(post.title || post.caption || 'Post', 'What would you like to do?', [
      { text: 'Unarchive (show on profile)', onPress: () => viewModel.unarchive(post.id) },
      {
        text: 'Delete permanently', style: 'destructive',
        onPress: () => Alert.alert('Delete', 'This cannot be undone.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => viewModel.deletePost(post.id) },
        ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleStoryLongPress = (story: Story) => {
    Alert.alert('Story', 'Delete this story permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => viewModel.deleteStory(story.id) },
    ]);
  };

  const isLoading = activeTab === 'posts' ? viewModel.isLoadingPosts : viewModel.isLoadingStories;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: separatorColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={26} color={ORANGE} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Archive</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Toggle */}
      <View style={[styles.toggleContainer, { backgroundColor: cardBg }]}>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setActiveTab('posts')}
          activeOpacity={0.8}
        >
          {activeTab === 'posts' ? (
            <LinearGradient
              colors={[ORANGE_LIGHT, ORANGE_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.toggleBtnActive}
            >
              <Ionicons name="grid-outline" size={16} color="#fff" />
              <Text style={styles.toggleBtnTextActive}>Posts</Text>
            </LinearGradient>
          ) : (
            <View style={styles.toggleBtnInactive}>
              <Ionicons name="grid-outline" size={16} color={subtitleColor} />
              <Text style={[styles.toggleBtnTextInactive, { color: subtitleColor }]}>Posts</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setActiveTab('stories')}
          activeOpacity={0.8}
        >
          {activeTab === 'stories' ? (
            <LinearGradient
              colors={[ORANGE_LIGHT, ORANGE_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.toggleBtnActive}
            >
              <Ionicons name="play-circle-outline" size={16} color="#fff" />
              <Text style={styles.toggleBtnTextActive}>Stories</Text>
            </LinearGradient>
          ) : (
            <View style={styles.toggleBtnInactive}>
              <Ionicons name="play-circle-outline" size={16} color={subtitleColor} />
              <Text style={[styles.toggleBtnTextInactive, { color: subtitleColor }]}>Stories</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <Text style={[styles.hint, { color: subtitleColor }]}>
        {activeTab === 'posts'
          ? 'Long-press a post to unarchive or delete it.'
          : 'Expired stories · long-press to delete.'}
      </Text>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      ) : activeTab === 'posts' ? (
        <FlatList
          data={viewModel.posts}
          keyExtractor={item => item.id}
          numColumns={3}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => setSelectedPost(item)}
              onLongPress={() => handlePostLongPress(item)}
              activeOpacity={0.8}
              delayLongPress={400}
            >
              <Image
                source={{ uri: item.media[0]?.remoteUri || item.media[0]?.localUri || `https://via.placeholder.com/${GRID_SIZE}` }}
                style={styles.gridImage}
                resizeMode="cover"
              />
              <View style={styles.gridBadge}>
                <Ionicons name="archive" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="archive-outline" size={64} color={subtitleColor} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No Archived Posts</Text>
              <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>
                Posts you archive will appear here.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={viewModel.stories}
          keyExtractor={item => item.id}
          numColumns={3}
          renderItem={({ item }) => {
            const uri = item.media?.localUri || item.media?.remoteUri || item.media?.thumbnailUri;
            const isVideo = item.media?.type === 'video';
            return (
              <TouchableOpacity
                style={styles.gridItem}
                onLongPress={() => handleStoryLongPress(item)}
                activeOpacity={0.8}
                delayLongPress={400}
              >
                <Image
                  source={{ uri: uri || `https://via.placeholder.com/${GRID_SIZE}` }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
                {isVideo && (
                  <View style={styles.gridBadge}>
                    <Ionicons name="play" size={12} color="#fff" />
                  </View>
                )}
                <View style={[styles.storyExpiredBadge]}>
                  <Ionicons name="time-outline" size={10} color="#fff" />
                </View>
              </TouchableOpacity>
            );
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="play-circle-outline" size={64} color={subtitleColor} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No Archived Stories</Text>
              <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>
                Expired stories will appear here.
              </Text>
            </View>
          }
        />
      )}

      {/* Post detail modal */}
      <Modal
        visible={selectedPost !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedPost(null)}
      >
        {selectedPost && (
          <RecipeDetailScreen
            post={selectedPost}
            currentUser={null}
            onBack={() => setSelectedPost(null)}
            onLike={() => {}}
            onSave={() => {}}
            onComment={() => {}}
            onShare={() => {}}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: { width: 44 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  toggleBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  toggleBtnActive: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  toggleBtnInactive: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  toggleBtnTextActive: { color: '#fff', fontSize: 14, fontWeight: '700' },
  toggleBtnTextInactive: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, textAlign: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  gridItem: { width: GRID_SIZE, height: GRID_SIZE, margin: 0.5, position: 'relative' },
  gridImage: { width: '100%', height: '100%' },
  gridBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 3,
  },
  storyExpiredBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: 3,
  },
  emptyState: { alignItems: 'center', paddingTop: 100, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
