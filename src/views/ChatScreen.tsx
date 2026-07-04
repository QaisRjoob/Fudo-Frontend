import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar, useColorScheme, Alert, Pressable, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChatViewModel } from '../viewmodels/ChatViewModel';
import { Message, PostWithAuthor } from '../models';
import { AuthService } from '../services/AuthService';
import { PostRepository } from '../repositories';

const ORANGE       = '#FF6B35';
const ORANGE_LIGHT = '#FF8C5A';
const ORANGE_DARK  = '#E5501A';

// ─── helpers ────────────────────────────────────────────────────────────────

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

const formatDateLabel = (iso: string): string => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const needsDateSeparator = (msg: Message, prev?: Message): boolean => {
  if (!prev) return true;
  return new Date(msg.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
};

const isGroupEnd = (msgs: Message[], index: number): boolean => {
  const next = msgs[index + 1];
  return !next || next.senderId !== msgs[index].senderId;
};

// ─── StatusIcon ──────────────────────────────────────────────────────────────

const StatusIcon = ({ status }: { status: Message['status'] }) => {
  if (status === 'sending')   return <Ionicons name="time-outline"           size={11} color="rgba(255,255,255,0.6)" />;
  if (status === 'sent')      return <Ionicons name="checkmark-outline"      size={11} color="rgba(255,255,255,0.85)" />;
  if (status === 'delivered') return <Ionicons name="checkmark-done-outline" size={11} color="rgba(255,255,255,0.85)" />;
  if (status === 'read')      return <Ionicons name="checkmark-done-outline" size={11} color="#fff" />;
  return null;
};

// ─── SharedPostCard ──────────────────────────────────────────────────────────

const SharedPostCard = ({
  postId, isOwn, dark, onLongPress, message,
}: {
  postId: string;
  isOwn: boolean;
  dark: boolean;
  onLongPress: () => void;
  message: Message;
}) => {
  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const router = useRouter();

  useEffect(() => {
    new PostRepository().getPostById(postId).then(setPost).catch(() => {});
  }, [postId]);

  const cardBg    = dark ? '#1c1c1e' : '#fff';
  const textColor = dark ? '#fff'    : '#1c1c1e';
  const subColor  = dark ? '#8e8e93' : '#6c6c70';
  const borderCol = dark ? '#3a3a3c' : '#e5e5ea';
  const thumbUri  = post?.media?.[0]?.remoteUri || post?.media?.[0]?.localUri;

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[cardStyles.wrapper, isOwn ? cardStyles.wrapperOwn : cardStyles.wrapperOther]}
    >
      <TouchableOpacity
        onPress={() => router.push(`/post/${postId}` as any)}
        activeOpacity={0.9}
        style={[cardStyles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
      >
        {/* Thumbnail */}
        {thumbUri ? (
          <Image source={{ uri: thumbUri }} style={cardStyles.thumb} resizeMode="cover" />
        ) : (
          <View style={[cardStyles.thumb, { backgroundColor: dark ? '#3a3a3c' : '#f0ede9' }]} />
        )}

        {/* Orange recipe label */}
        <LinearGradient
          colors={['rgba(255,107,53,0.15)', 'rgba(255,107,53,0.05)']}
          style={cardStyles.recipeBadge}
        >
          <Ionicons name="restaurant" size={13} color={ORANGE} />
          <Text style={cardStyles.recipeBadgeText}>RECIPE</Text>
        </LinearGradient>

        {/* Info */}
        <View style={cardStyles.info}>
          <Text style={[cardStyles.title, { color: textColor }]} numberOfLines={2}>
            {post?.title || post?.caption || '…'}
          </Text>
          <Text style={[cardStyles.author, { color: subColor }]} numberOfLines={1}>
            @{post?.author?.username ?? '…'}
          </Text>
        </View>

        {/* CTA */}
        <LinearGradient
          colors={[ORANGE_LIGHT, ORANGE_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cardStyles.cta}
        >
          <Text style={cardStyles.ctaText}>View Recipe</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Optional caption */}
      {message.text ? (
        isOwn ? (
          <LinearGradient
            colors={[ORANGE_LIGHT, ORANGE_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[cardStyles.captionBubble, cardStyles.captionOwn]}
          >
            <Text style={{ color: '#fff', fontSize: 14 }}>{message.text}</Text>
          </LinearGradient>
        ) : (
          <View style={[cardStyles.captionBubble, cardStyles.captionOther,
            { backgroundColor: dark ? '#2c2c2e' : '#f0ede9' }]}>
            <Text style={{ color: textColor, fontSize: 14 }}>{message.text}</Text>
          </View>
        )
      ) : null}

      {/* Timestamp */}
      <View style={[cardStyles.timeRow, isOwn ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
        <Text style={[cardStyles.time, { color: subColor }]}>
          {formatTime(message.createdAt)}
        </Text>
        {isOwn && <StatusIcon status={message.status} />}
      </View>
    </Pressable>
  );
};

const cardStyles = StyleSheet.create({
  wrapper:      { marginVertical: 4, maxWidth: '80%' },
  wrapperOwn:   { alignSelf: 'flex-end', marginRight: 8 },
  wrapperOther: { alignSelf: 'flex-start', marginLeft: 44 },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  thumb: { width: '100%', height: 180 },
  recipeBadge: {
    position: 'absolute',
    top: 12, left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  recipeBadgeText: { fontSize: 11, fontWeight: '800', color: ORANGE, letterSpacing: 0.8 },
  info: { padding: 12, gap: 3 },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  author: { fontSize: 13 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 6,
  },
  ctaText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  captionBubble: { marginTop: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  captionOwn:   { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  captionOther: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  time: { fontSize: 11 },
});

// ─── MessageBubble ───────────────────────────────────────────────────────────

const MessageBubble = React.memo(({
  message, isOwn, showAvatar, avatarUri, textColor, dark, onLongPress,
}: {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  avatarUri: string;
  textColor: string;
  dark: boolean;
  onLongPress: () => void;
}) => {
  if (message.sharedPostId) {
    return (
      <SharedPostCard
        postId={message.sharedPostId}
        isOwn={isOwn}
        dark={dark}
        onLongPress={onLongPress}
        message={message}
      />
    );
  }

  const otherBg       = dark ? '#2c2c2e' : '#f0ede9';
  const msgTextColor  = isOwn ? '#fff' : textColor;
  const metaColor     = isOwn ? 'rgba(255,255,255,0.7)' : (dark ? '#636366' : '#8e8e93');

  return (
    <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
      {!isOwn && (
        <View style={styles.avatarSlot}>
          {showAvatar
            ? <Image source={{ uri: avatarUri }} style={styles.msgAvatar} />
            : <View style={styles.msgAvatarPlaceholder} />}
        </View>
      )}

      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        style={[
          styles.bubbleOuter,
          isOwn ? styles.bubbleOuterOwn : styles.bubbleOuterOther,
        ]}
      >
        {isOwn ? (
          <LinearGradient
            colors={[ORANGE_LIGHT, ORANGE_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleOwn]}
          >
            {message.text ? (
              <Text style={[styles.bubbleText, { color: '#fff' }]}>{message.text}</Text>
            ) : null}
            <View style={styles.bubbleMeta}>
              {message.editedAt && (
                <Text style={[styles.editedLabel, { color: 'rgba(255,255,255,0.6)' }]}>edited</Text>
              )}
              <Text style={[styles.bubbleTime, { color: metaColor }]}>
                {formatTime(message.createdAt)}
              </Text>
              <StatusIcon status={message.status} />
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleOther, { backgroundColor: otherBg }]}>
            {message.text ? (
              <Text style={[styles.bubbleText, { color: msgTextColor }]}>{message.text}</Text>
            ) : null}
            <View style={styles.bubbleMeta}>
              {message.editedAt && (
                <Text style={[styles.editedLabel, { color: metaColor }]}>edited</Text>
              )}
              <Text style={[styles.bubbleTime, { color: metaColor }]}>
                {formatTime(message.createdAt)}
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
});

// ─── DateSeparator ───────────────────────────────────────────────────────────

const DateSeparator = ({ label, color }: { label: string; color: string }) => (
  <View style={styles.dateSeparator}>
    <View style={[styles.dateLine, { backgroundColor: color + '40' }]} />
    <Text style={[styles.dateSeparatorText, { color }]}>{label}</Text>
    <View style={[styles.dateLine, { backgroundColor: color + '40' }]} />
  </View>
);

// ─── ChatScreen ──────────────────────────────────────────────────────────────

export const ChatScreen = observer(() => {
  const { conversationId, userId } = useLocalSearchParams<{
    conversationId?: string;
    userId?: string;
  }>();

  const [viewModel] = useState(() => new ChatViewModel());
  const [inputText, setInputText]         = useState('');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyTo, setReplyTo]             = useState<Message | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const inputRef    = useRef<TextInput>(null);
  const router      = useRouter();
  const dark        = useColorScheme() === 'dark';
  const currentUserId = AuthService.getCurrentUserId();

  const bg            = dark ? '#0a0a0a' : '#fafafa';
  const textColor     = dark ? '#ffffff' : '#1a1a1a';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const separatorColor = dark ? '#1c1c1e' : '#f0f0f0';
  const inputBg       = dark ? '#1c1c1e' : '#f0ede9';
  const headerBg      = dark ? '#0a0a0a' : '#ffffff';

  useEffect(() => {
    viewModel.initialize(conversationId, userId);
  }, [conversationId, userId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (flatListRef.current && viewModel.messages.length > 0) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  }, [viewModel.messages.length]);

  useEffect(() => { scrollToBottom(); }, [viewModel.messages.length]);

  // ── send / edit ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    if (editingMessage) {
      await viewModel.editMessage(editingMessage.id, text);
      setEditingMessage(null);
    } else if (replyTo) {
      await viewModel.sendMessageWithReply(text, replyTo.id);
      setReplyTo(null);
    } else {
      await viewModel.sendMessage(text);
    }
    setInputText('');
    scrollToBottom();
  };

  const cancelAction = () => {
    setEditingMessage(null);
    setReplyTo(null);
    setInputText('');
  };

  // ── long press context menu ──────────────────────────────────────────────────
  const handleLongPress = (message: Message) => {
    const isOwn = message.senderId === currentUserId;
    const options: any[] = [
      {
        text: 'Reply',
        onPress: () => {
          setReplyTo(message);
          setEditingMessage(null);
          inputRef.current?.focus();
        },
      },
    ];
    if (message.text) {
      options.push({ text: 'Copy', onPress: () => Clipboard.setString(message.text!) });
    }
    if (isOwn) {
      if (message.text) {
        options.push({
          text: 'Edit',
          onPress: () => {
            setEditingMessage(message);
            setReplyTo(null);
            setInputText(message.text!);
            inputRef.current?.focus();
          },
        });
      }
      options.push({
        text: 'Unsend',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Unsend message?', 'This will remove the message for everyone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Unsend', style: 'destructive', onPress: () => viewModel.unsendMessage(message.id) },
          ]),
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message', undefined, options);
  };

  // ── render each list item ────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isOwn      = item.senderId === currentUserId;
    const prev       = viewModel.messages[index - 1];
    const showDate   = needsDateSeparator(item, prev);
    const showAvatar = !isOwn && isGroupEnd(viewModel.messages, index);
    const avatarUri  = viewModel.otherUser?.avatarUri
      || `https://i.pravatar.cc/80?u=${viewModel.otherUser?.id}`;

    return (
      <>
        {showDate && (
          <DateSeparator label={formatDateLabel(item.createdAt)} color={subtitleColor} />
        )}
        <MessageBubble
          message={item}
          isOwn={isOwn}
          showAvatar={showAvatar}
          avatarUri={avatarUri}
          textColor={textColor}
          dark={dark}
          onLongPress={() => handleLongPress(item)}
        />
      </>
    );
  };

  // ── action banner (reply/edit) ───────────────────────────────────────────────
  const renderActionBanner = () => {
    if (!editingMessage && !replyTo) return null;
    const label   = editingMessage ? 'Editing message' : `Replying to ${viewModel.otherUser?.username ?? 'message'}`;
    const preview = editingMessage ? editingMessage.text : replyTo?.text;
    return (
      <View style={[styles.actionBanner, { backgroundColor: inputBg, borderTopColor: separatorColor }]}>
        <View style={styles.actionBannerAccent} />
        <Ionicons
          name={editingMessage ? 'pencil-outline' : 'return-down-back-outline'}
          size={18}
          color={ORANGE}
          style={{ marginRight: 8 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.actionBannerLabel, { color: ORANGE }]}>{label}</Text>
          {preview ? (
            <Text style={[styles.actionBannerPreview, { color: subtitleColor }]} numberOfLines={1}>
              {preview}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={cancelAction} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="close-circle" size={22} color={subtitleColor} />
        </TouchableOpacity>
      </View>
    );
  };

  // ── loading state ────────────────────────────────────────────────────────────
  if (viewModel.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      </SafeAreaView>
    );
  }

  const otherUser = viewModel.otherUser;
  const hasText   = inputText.trim().length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: separatorColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={ORANGE} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => otherUser && router.push(`/profile/${otherUser.id}` as any)}
          activeOpacity={0.8}
        >
          <View style={styles.headerAvatarWrap}>
            <Image
              source={{ uri: otherUser?.avatarUri || `https://i.pravatar.cc/80?u=${otherUser?.id}` }}
              style={styles.headerAvatar}
            />
            <View style={styles.headerOnlineDot} />
          </View>
          <View>
            <Text style={[styles.headerName, { color: textColor }]} numberOfLines={1}>
              {otherUser?.displayName || otherUser?.username || '…'}
            </Text>
            <Text style={[styles.headerUsername, { color: ORANGE }]} numberOfLines={1}>
              @{otherUser?.username || '…'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerAction} activeOpacity={0.7}>
          <Ionicons name="ellipsis-horizontal" size={22} color={subtitleColor} />
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={viewModel.messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyAvatarRing}>
                <LinearGradient
                  colors={[ORANGE_LIGHT, ORANGE_DARK]}
                  style={styles.emptyAvatarGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image
                    source={{ uri: otherUser?.avatarUri || `https://i.pravatar.cc/150?u=${otherUser?.id}` }}
                    style={styles.emptyAvatar}
                  />
                </LinearGradient>
              </View>
              <Text style={[styles.emptyName, { color: textColor }]}>
                {otherUser?.displayName || otherUser?.username}
              </Text>
              <Text style={[styles.emptyHint, { color: subtitleColor }]}>
                Say hi to start the conversation!
              </Text>
              <LinearGradient
                colors={['rgba(255,107,53,0.12)', 'rgba(255,107,53,0.04)']}
                style={styles.emptyChip}
              >
                <Ionicons name="restaurant-outline" size={14} color={ORANGE} />
                <Text style={[styles.emptyChipText, { color: ORANGE }]}>Share a recipe</Text>
              </LinearGradient>
            </View>
          }
        />

        {/* ── Reply / Edit banner ── */}
        {renderActionBanner()}

        {/* ── Input row ── */}
        <View style={[styles.inputRow, { backgroundColor: headerBg, borderTopColor: separatorColor }]}>
          <View style={[styles.inputWrap, { backgroundColor: inputBg }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: textColor }]}
              placeholder={editingMessage ? 'Edit message…' : 'Message…'}
              placeholderTextColor={subtitleColor}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />
          </View>
          {hasText ? (
            <TouchableOpacity
              style={styles.sendBtnWrap}
              onPress={handleSend}
              disabled={viewModel.isSending}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[ORANGE_LIGHT, ORANGE_DARK]}
                style={styles.sendBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {viewModel.isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name={editingMessage ? 'checkmark' : 'arrow-up'} size={20} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={[styles.sendBtnWrap, styles.sendBtnInactive]}>
              <Ionicons name="arrow-up" size={20} color={subtitleColor} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const AVATAR_SIZE = 30;

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack:   { width: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerOnlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2, borderColor: '#fff',
  },
  headerName:     { fontSize: 15, fontWeight: '700' },
  headerUsername: { fontSize: 12, marginTop: 1, fontWeight: '500' },
  headerAction:   { width: 44, alignItems: 'center', justifyContent: 'center' },

  // Message list
  listContent: { paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 4 },

  // Date separator
  dateSeparator: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 14, paddingHorizontal: 16, gap: 8,
  },
  dateLine: { flex: 1, height: 1 },
  dateSeparatorText: { fontSize: 12, fontWeight: '500' },

  // Message row
  messageRow:      { flexDirection: 'row', marginVertical: 1, alignItems: 'flex-end' },
  messageRowOwn:   { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  avatarSlot:          { width: AVATAR_SIZE + 6, alignItems: 'center' },
  msgAvatar:           { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  msgAvatarPlaceholder:{ width: AVATAR_SIZE, height: AVATAR_SIZE },

  // Bubble outer (pressable target)
  bubbleOuter:      { maxWidth: '75%' },
  bubbleOuterOwn:   { alignSelf: 'flex-end' },
  bubbleOuterOther: { alignSelf: 'flex-start' },

  // Bubble inner
  bubble: {
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: 20,
  },
  bubbleOwn:   { borderBottomRightRadius: 5 },
  bubbleOther: { borderBottomLeftRadius: 5 },
  bubbleText:  { fontSize: 15, lineHeight: 21 },
  bubbleMeta: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', gap: 4, marginTop: 2,
  },
  bubbleTime:  { fontSize: 10 },
  editedLabel: { fontSize: 10, fontStyle: 'italic' },

  // Action banner (reply/edit)
  actionBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBannerAccent: {
    width: 3, height: '100%', borderRadius: 2,
    backgroundColor: ORANGE, marginRight: 10,
  },
  actionBannerLabel:   { fontSize: 13, fontWeight: '700' },
  actionBannerPreview: { fontSize: 13, marginTop: 1 },

  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1, borderRadius: 24,
    paddingHorizontal: 2,
  },
  input: {
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, maxHeight: 120, minHeight: 40,
  },
  sendBtnWrap: {
    width: 40, height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnInactive: {
    backgroundColor: 'transparent',
  },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyAvatarRing: { padding: 3, borderRadius: 46 },
  emptyAvatarGradient: { padding: 3, borderRadius: 44 },
  emptyAvatar: { width: 80, height: 80, borderRadius: 40 },
  emptyName:   { fontSize: 18, fontWeight: '700' },
  emptyHint:   { fontSize: 14 },
  emptyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    marginTop: 4,
  },
  emptyChipText: { fontSize: 14, fontWeight: '600' },
});
