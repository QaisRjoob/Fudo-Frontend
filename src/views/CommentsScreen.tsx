import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar, useColorScheme, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CommentsViewModel } from '../viewmodels/CommentsViewModel';
import { CommentWithAuthor } from '../models';
import { AuthService } from '../services/AuthService';

const timeAgo = (iso: string): string => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

const CommentItem = observer(({
  comment, onLike, onReply, onDelete, isOwn,
  textColor, subtitleColor, separatorColor, tintColor,
}: {
  comment: CommentWithAuthor;
  onLike: () => void;
  onReply: () => void;
  onDelete: () => void;
  isOwn: boolean;
  textColor: string; subtitleColor: string; separatorColor: string; tintColor: string;
}) => (
  <View style={[styles.commentRow, { borderBottomColor: separatorColor }]}>
    <Image
      source={{ uri: comment.author?.avatarUri || `https://i.pravatar.cc/80?u=${comment.authorId}` }}
      style={styles.avatar}
    />
    <View style={styles.commentBody}>
      <View style={styles.commentMeta}>
        <Text style={[styles.commentUsername, { color: textColor }]}>
          {comment.author?.username ?? 'User'}
        </Text>
        <Text style={[styles.commentTime, { color: subtitleColor }]}>{timeAgo(comment.createdAt)}</Text>
      </View>
      <Text style={[styles.commentText, { color: textColor }]}>{comment.text}</Text>
      <View style={styles.commentActions}>
        <TouchableOpacity onPress={onReply} style={styles.commentAction}>
          <Text style={[styles.commentActionText, { color: subtitleColor }]}>Reply</Text>
        </TouchableOpacity>
        {isOwn && (
          <TouchableOpacity onPress={onDelete} style={styles.commentAction}>
            <Text style={[styles.commentActionText, { color: '#ff3b30' }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    <TouchableOpacity onPress={onLike} style={styles.likeBtn}>
      <Ionicons
        name={comment.isLiked ? 'heart' : 'heart-outline'}
        size={16}
        color={comment.isLiked ? '#ff3b30' : subtitleColor}
      />
      {comment.likesCount > 0 && (
        <Text style={[styles.likeCount, { color: subtitleColor }]}>{comment.likesCount}</Text>
      )}
    </TouchableOpacity>
  </View>
));

export const CommentsScreen = observer(() => {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [viewModel] = useState(() => new CommentsViewModel());
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const bg = dark ? '#000' : '#fff';
  const textColor = dark ? '#fff' : '#000';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const separatorColor = dark ? '#2c2c2e' : '#f2f2f7';
  const inputBg = dark ? '#1c1c1e' : '#f2f2f7';
  const tintColor = '#007AFF';

  useEffect(() => {
    if (postId) viewModel.initialize(postId);
  }, [postId]);

  const handleDelete = (comment: CommentWithAuthor) => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => viewModel.deleteComment(comment.id) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { borderBottomColor: separatorColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={26} color={tintColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Comments</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {viewModel.isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={tintColor} />
          </View>
        ) : (
          <FlatList
            data={viewModel.comments}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <CommentItem
                comment={item}
                onLike={() => viewModel.toggleLike(item.id)}
                onReply={() => {
                  viewModel.setReplyTo(item);
                  inputRef.current?.focus();
                }}
                onDelete={() => handleDelete(item)}
                isOwn={item.authorId === viewModel.currentUserId}
                textColor={textColor}
                subtitleColor={subtitleColor}
                separatorColor={separatorColor}
                tintColor={tintColor}
              />
            )}
            contentContainerStyle={{ paddingVertical: 8, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-outline" size={48} color={subtitleColor} />
                <Text style={[styles.emptyText, { color: subtitleColor }]}>No comments yet. Be the first!</Text>
              </View>
            }
          />
        )}

        {/* Reply banner */}
        {viewModel.replyTo && (
          <View style={[styles.replyBanner, { backgroundColor: inputBg }]}>
            <Text style={[styles.replyBannerText, { color: subtitleColor }]}>
              Replying to <Text style={{ fontWeight: '600', color: textColor }}>@{viewModel.replyTo.author?.username}</Text>
            </Text>
            <TouchableOpacity onPress={() => viewModel.setReplyTo(null)}>
              <Ionicons name="close" size={18} color={subtitleColor} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input row */}
        <View style={[styles.inputRow, { backgroundColor: bg, borderTopColor: separatorColor }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
            placeholder="Add a comment…"
            placeholderTextColor={subtitleColor}
            value={viewModel.inputText}
            onChangeText={text => viewModel.setInputText(text)}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={() => viewModel.sendComment()}
            disabled={viewModel.isSending || !viewModel.inputText.trim()}
            style={styles.sendBtn}
          >
            {viewModel.isSending ? (
              <ActivityIndicator size="small" color={tintColor} />
            ) : (
              <Ionicons
                name="send"
                size={22}
                color={viewModel.inputText.trim() ? tintColor : subtitleColor}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  commentRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentUsername: { fontWeight: '600', fontSize: 13 },
  commentTime: { fontSize: 12 },
  commentText: { fontSize: 14, lineHeight: 20 },
  commentActions: { flexDirection: 'row', marginTop: 6, gap: 16 },
  commentAction: {},
  commentActionText: { fontSize: 12, fontWeight: '500' },
  likeBtn: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2, minWidth: 32 },
  likeCount: { fontSize: 11, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  replyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  replyBannerText: { fontSize: 13 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  input: {
    flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, maxHeight: 100,
  },
  sendBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
});
