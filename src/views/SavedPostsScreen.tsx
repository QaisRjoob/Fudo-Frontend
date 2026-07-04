import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { makeAutoObservable, runInAction } from 'mobx';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PostRepository } from '../repositories';
import { PostWithAuthor } from '../models';
import { AuthService } from '../services/AuthService';
import RecipeDetailScreen from './RecipeDetailScreen';

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 3 - 1;

class SavedPostsViewModel {
  posts: PostWithAuthor[] = [];
  isLoading = false;
  error: string | null = null;

  private postRepo = new PostRepository();

  constructor() {
    makeAutoObservable(this);
  }

  async load(): Promise<void> {
    const userId = AuthService.getCurrentUserId();
    if (!userId) return;

    runInAction(() => { this.isLoading = true; this.error = null; });
    try {
      const posts = await this.postRepo.getSavedPosts(userId);
      runInAction(() => { this.posts = posts; });
    } catch (e: any) {
      runInAction(() => { this.error = e.message || 'Failed to load saved posts'; });
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async toggleLike(postId: string): Promise<void> {
    const userId = AuthService.getCurrentUserId();
    if (!userId) return;
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    const wasLiked = post.isLiked;
    runInAction(() => {
      post.isLiked = !wasLiked;
      post.likesCount += wasLiked ? -1 : 1;
    });
    try {
      if (wasLiked) await this.postRepo.unlikePost(userId, postId);
      else await this.postRepo.likePost(userId, postId);
    } catch {
      runInAction(() => {
        post.isLiked = wasLiked;
        post.likesCount += wasLiked ? 1 : -1;
      });
    }
  }

  async toggleSave(postId: string): Promise<void> {
    const userId = AuthService.getCurrentUserId();
    if (!userId) return;
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    runInAction(() => {
      this.posts = this.posts.filter(p => p.id !== postId);
    });
    try {
      await this.postRepo.unsavePost(userId, postId);
    } catch {
      runInAction(() => { this.posts = [...this.posts, post]; });
    }
  }
}

export const SavedPostsScreen = observer(() => {
  const [viewModel] = useState(() => new SavedPostsViewModel());
  const [selectedPost, setSelectedPost] = useState<PostWithAuthor | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const bg = dark ? '#000' : '#fff';
  const textColor = dark ? '#fff' : '#000';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const separatorColor = dark ? '#38383a' : '#e5e5ea';
  const tintColor = '#007AFF';

  useEffect(() => {
    viewModel.load();
  }, []);

  if (viewModel.isLoading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={tintColor} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { borderBottomColor: separatorColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={26} color={tintColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Saved</Text>
        <View style={{ width: 44 }} />
      </View>

      {viewModel.posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bookmark-outline" size={64} color={subtitleColor} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>No Saved Posts</Text>
          <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>
            Save recipes you want to cook later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={viewModel.posts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => setSelectedPost(item)}
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri:
                    item.media[0]?.remoteUri ||
                    item.media[0]?.localUri ||
                    `https://via.placeholder.com/${GRID_SIZE}`,
                }}
                style={styles.gridImage}
                resizeMode="cover"
              />
              {item.media.length > 1 && (
                <View style={styles.multiIndicator}>
                  <Ionicons name="copy-outline" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1 }} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

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
            onLike={(postId) => {
              if (postId) viewModel.toggleLike(postId);
            }}
            onSave={(postId) => {
              if (postId) viewModel.toggleSave(postId);
              setSelectedPost(null);
            }}
            onComment={() => {}}
            onShare={() => {}}
          />
        )}
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: {
    width: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    margin: 0.5,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  multiIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
