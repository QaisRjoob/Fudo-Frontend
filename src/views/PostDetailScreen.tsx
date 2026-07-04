import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PostRepository } from '../repositories/PostRepository';
import { UserRepository } from '../repositories/UserRepository';
import { PostWithAuthor, User } from '../models';
import RecipeDetailScreen from './RecipeDetailScreen';

export const PostDetailScreen = () => {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';

  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (!postId) return;
    const postRepo = new PostRepository();
    const userRepo = new UserRepository();
    Promise.all([
      postRepo.getPostById(postId),
      userRepo.getCurrentUser(),
    ]).then(([p, u]) => {
      setPost(p);
      setCurrentUser(u);
    }).catch(console.error);
  }, [postId]);

  if (!post) {
    return (
      <View style={[styles.centered, { backgroundColor: dark ? '#000' : '#fff' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <RecipeDetailScreen
      post={post}
      currentUser={currentUser}
      onBack={() => router.back()}
      onLike={() => {}}
      onSave={() => {}}
      onComment={() => router.push(`/comments/${postId}` as any)}
      onShare={() => {}}
    />
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
