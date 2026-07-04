import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, FlatList, Image,
  TouchableOpacity, TextInput,
  useColorScheme, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRepository, PostRepository, ConversationRepository } from '../repositories';
import { AuthService } from '../services/AuthService';
import { User, PostWithAuthor } from '../models';

interface Props {
  postId: string | null;
  onClose: () => void;
}

export const SharePostModal = ({ postId, onClose }: Props) => {
  const dark = useColorScheme() === 'dark';
  const bg = dark ? '#000' : '#fff';
  const cardBg = dark ? '#1c1c1e' : '#f2f2f7';
  const textColor = dark ? '#fff' : '#000';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const borderColor = dark ? '#2c2c2e' : '#e5e5ea';
  const tint = '#007AFF';

  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState('');

  const currentUserId = AuthService.getCurrentUserId();

  useEffect(() => {
    if (!postId) return;
    setSelected(new Set());
    setCaption('');

    const load = async () => {
      const [postData, followData, followerData] = await Promise.all([
        new PostRepository().getPostById(postId, currentUserId ?? undefined),
        new UserRepository().getFollowing(currentUserId ?? ''),
        new UserRepository().getFollowers(currentUserId ?? ''),
      ]);
      setPost(postData);

      const seen = new Set<string>();
      const merged: User[] = [];
      for (const u of [...followData, ...followerData]) {
        if (!seen.has(u.id) && u.id !== currentUserId) {
          seen.add(u.id);
          merged.push(u);
        }
      }
      setUsers(merged);
    };

    load().catch(console.error);
  }, [postId]);

  const toggle = useCallback((userId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const handleSend = () => {
    if (selected.size === 0 || !postId || !currentUserId) return;
    onClose();
    const convRepo = new ConversationRepository();
    const recipients = Array.from(selected);
    const text = caption.trim() || undefined;
    (async () => {
      for (const recipientId of recipients) {
        const conv = await convRepo.getOrCreateConversation([currentUserId, recipientId]);
        const msg = await convRepo.sendMessage({
          conversationId: conv.id,
          senderId: currentUserId,
          text,
          sharedPostId: postId,
        });
        await convRepo.updateMessageStatus(msg.id, 'sent');
      }
    })().catch(console.error);
  };

  if (!postId) return null;

  const thumbUri = post?.media?.[0]?.remoteUri || post?.media?.[0]?.localUri;
  const canSend = selected.size > 0;

  return (
    <Modal
      visible={!!postId}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Send to</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Post preview strip */}
        {post && (
          <View style={[styles.postPreview, { backgroundColor: cardBg }]}>
            {thumbUri
              ? <Image source={{ uri: thumbUri }} style={styles.postThumb} />
              : <View style={[styles.postThumb, { backgroundColor: dark ? '#3a3a3c' : '#c7c7cc' }]} />
            }
            <View style={{ flex: 1 }}>
              <Text style={[styles.postTitle, { color: textColor }]} numberOfLines={1}>
                {post.title || post.caption || 'Recipe'}
              </Text>
              <Text style={[styles.postAuthor, { color: subtitleColor }]} numberOfLines={1}>
                @{post.author?.username}
              </Text>
            </View>
          </View>
        )}

        {/* Recipient list */}
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={subtitleColor} />
            <Text style={[styles.emptyText, { color: subtitleColor }]}>
              Follow people to share posts with them
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={u => u.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = selected.has(item.id);
              return (
                <TouchableOpacity
                  style={styles.userRow}
                  onPress={() => toggle(item.id)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.avatarUri || `https://i.pravatar.cc/80?u=${item.id}` }}
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
                      {item.displayName || item.username}
                    </Text>
                    <Text style={[styles.username, { color: subtitleColor }]} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  </View>
                  <View style={[
                    styles.checkbox,
                    { borderColor: isSelected ? tint : (dark ? '#636366' : '#c7c7cc') },
                    isSelected && { backgroundColor: tint },
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Bottom send bar */}
        <View style={[styles.bottomBar, { backgroundColor: bg, borderTopColor: borderColor }]}>
          <TextInput
            style={[styles.captionInput, { backgroundColor: cardBg, color: textColor }]}
            placeholder="Add a message…"
            placeholderTextColor={subtitleColor}
            value={caption}
            onChangeText={setCaption}
            maxLength={200}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendBtn, { backgroundColor: canSend ? tint : (dark ? '#2c2c2e' : '#e5e5ea') }]}
          >
            <Ionicons name="paper-plane" size={20} color={canSend ? '#fff' : subtitleColor} />
            <Text style={[styles.sendBtnText, { color: canSend ? '#fff' : subtitleColor }]}>
              Send{selected.size > 0 ? ` (${selected.size})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  postPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    padding: 10,
    borderRadius: 12,
    gap: 10,
  },
  postThumb: { width: 52, height: 52, borderRadius: 8 },
  postTitle: { fontSize: 14, fontWeight: '600' },
  postAuthor: { fontSize: 13, marginTop: 2 },
  listContent: { paddingBottom: 8 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  displayName: { fontSize: 15, fontWeight: '600' },
  username: { fontSize: 13, marginTop: 1 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: { fontSize: 15, textAlign: 'center' },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  captionInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    fontSize: 15,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
