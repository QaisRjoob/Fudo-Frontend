import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, StatusBar, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { makeAutoObservable, runInAction } from 'mobx';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UserRepository } from '../repositories';
import { PostRepository } from '../repositories/PostRepository';
import { User } from '../models';
import { AuthService } from '../services/AuthService';

class UserListViewModel {
  users: User[] = [];
  isLoading = false;
  private userRepo = new UserRepository();
  private postRepo = new PostRepository();

  constructor() { makeAutoObservable(this); }

  async load(type: 'followers' | 'following' | 'likes', userId: string, postId?: string): Promise<void> {
    runInAction(() => { this.isLoading = true; });
    try {
      const currentUserId = AuthService.getCurrentUserId() ?? userId;
      let result: User[];

      if (type === 'likes' && postId) {
        result = await this.postRepo.getPostLikers(postId, currentUserId);
      } else {
        result = type === 'followers'
          ? await this.userRepo.getFollowers(userId)
          : await this.userRepo.getFollowing(userId);
        const followedSet = new Set(
          (await this.userRepo.getFollowing(currentUserId)).map(u => u.id)
        );
        result = result.map(u => ({ ...u, isFollowing: followedSet.has(u.id) }));
      }

      const seen = new Set<string>();
      const deduped = result.filter(u => seen.has(u.id) ? false : (seen.add(u.id), true));
      runInAction(() => { this.users = deduped; });
    } catch (e) {
      console.error('UserListViewModel load error:', e);
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async toggleFollow(targetUserId: string): Promise<void> {
    const currentUserId = AuthService.getCurrentUserId();
    if (!currentUserId) return;
    const user = this.users.find(u => u.id === targetUserId);
    if (!user) return;
    const wasFollowing = user.isFollowing;
    runInAction(() => { user.isFollowing = !wasFollowing; });
    try {
      if (wasFollowing) await this.userRepo.unfollowUser(currentUserId, targetUserId);
      else await this.userRepo.followUser(currentUserId, targetUserId);
    } catch {
      runInAction(() => { user.isFollowing = wasFollowing; });
    }
  }
}

export const UserListScreen = observer(() => {
  const { type, userId, postId } = useLocalSearchParams<{ type: string; userId: string; postId?: string }>();
  const [viewModel] = useState(() => new UserListViewModel());
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const bg = dark ? '#000' : '#fff';
  const textColor = dark ? '#fff' : '#000';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const separatorColor = dark ? '#2c2c2e' : '#f2f2f7';
  const tintColor = '#007AFF';
  const currentUserId = AuthService.getCurrentUserId();

  useEffect(() => {
    if (type && userId) {
      viewModel.load(type as 'followers' | 'following' | 'likes', userId, postId);
    }
  }, [type, userId, postId]);

  const title = type === 'followers' ? 'Followers' : type === 'likes' ? 'Likes' : 'Following';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { borderBottomColor: separatorColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={26} color={tintColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>{title}</Text>
        <View style={{ width: 44 }} />
      </View>

      {viewModel.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      ) : (
        <FlatList
          data={viewModel.users}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: separatorColor }]} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => router.push(`/profile/${item.id}` as any)}
            >
              <Image
                source={{ uri: item.avatarUri || `https://i.pravatar.cc/80?u=${item.id}` }}
                style={styles.avatar}
              />
              <View style={styles.userInfo}>
                <Text style={[styles.username, { color: textColor }]}>{item.username}</Text>
                {item.displayName ? (
                  <Text style={[styles.displayName, { color: subtitleColor }]}>{item.displayName}</Text>
                ) : null}
              </View>
              {item.id !== currentUserId && (
                <TouchableOpacity
                  style={[
                    styles.followBtn,
                    item.isFollowing && styles.followingBtn,
                  ]}
                  onPress={() => viewModel.toggleFollow(item.id)}
                >
                  <Text style={[
                    styles.followBtnText,
                    item.isFollowing && { color: textColor },
                  ]}>
                    {item.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={subtitleColor} />
              <Text style={[styles.emptyText, { color: subtitleColor }]}>
                {type === 'followers' ? 'No followers yet' : type === 'likes' ? 'No likes yet' : 'Not following anyone yet'}
              </Text>
            </View>
          }
        />
      )}
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
  separator: { height: StyleSheet.hairlineWidth },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  userInfo: { flex: 1 },
  username: { fontSize: 15, fontWeight: '600' },
  displayName: { fontSize: 13, marginTop: 2 },
  followBtn: {
    backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 8,
  },
  followingBtn: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: '#c7c7cc',
  },
  followBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
