import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, Image,
  TouchableOpacity, ActivityIndicator, StatusBar,
  useColorScheme, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { ConversationsViewModel, ConversationItem } from '../viewmodels/ConversationsViewModel';
import { User } from '../models';

const ORANGE       = '#FF6B35';
const ORANGE_LIGHT = '#FF8C5A';
const ORANGE_DARK  = '#E5501A';

const timeAgo = (iso: string): string => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)     return 'now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─── FriendCard (unmessaged) ──────────────────────────────────────────────────
const FriendCard = ({
  user, dark, onPress,
}: { user: User; dark: boolean; onPress: () => void }) => {
  const cardBg   = dark ? '#1a1a1a' : '#ffffff';
  const textColor = dark ? '#ffffff' : '#1a1a1a';
  const subColor  = dark ? '#8e8e93' : '#6c6c70';
  const avatarUri = user.avatarUri || `https://i.pravatar.cc/80?u=${user.id}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[friendStyles.card, { backgroundColor: cardBg },
        dark
          ? { shadowOpacity: 0.4 }
          : { shadowOpacity: 0.07 }
      ]}
    >
      <View style={friendStyles.avatarWrap}>
        <Image source={{ uri: avatarUri }} style={friendStyles.avatar} />
        <LinearGradient
          colors={[ORANGE_LIGHT, ORANGE_DARK]}
          style={friendStyles.startBtn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="chatbubble" size={11} color="#fff" />
        </LinearGradient>
      </View>
      <Text style={[friendStyles.name, { color: textColor }]} numberOfLines={1}>
        {user.displayName || user.username}
      </Text>
      <Text style={[friendStyles.username, { color: subColor }]} numberOfLines={1}>
        @{user.username}
      </Text>
    </TouchableOpacity>
  );
};

const friendStyles = StyleSheet.create({
  card: {
    width: 110,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatar:     { width: 56, height: 56, borderRadius: 28 },
  startBtn: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  name:     { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  username: { fontSize: 11, textAlign: 'center' },
});

// ─── ConversationsScreen ──────────────────────────────────────────────────────
export const ConversationsScreen = observer(() => {
  const [viewModel] = useState(() => new ConversationsViewModel());
  const router = useRouter();
  const dark = useColorScheme() === 'dark';

  const bg        = dark ? '#0a0a0a' : '#f5f5f5';
  const cardBg    = dark ? '#1a1a1a' : '#ffffff';
  const textColor = dark ? '#ffffff' : '#1a1a1a';
  const subColor  = dark ? '#8e8e93' : '#6c6c70';
  const divider   = dark ? '#222'    : '#ececec';

  useEffect(() => { viewModel.initialize(); }, []);
  useFocusEffect(useCallback(() => { viewModel.refresh(); }, []));

  const handleFriendPress = async (userId: string) => {
    const convId = await viewModel.startConversation(userId);
    router.push(`/chat?conversationId=${convId}` as any);
  };

  // ── Conversation card ────────────────────────────────────────────────────────
  const renderConvItem = ({ item, index }: { item: ConversationItem; index: number }) => {
    const { otherUser, lastMessage, unreadCount, updatedAt } = item;
    const isUnread  = unreadCount > 0;
    const avatarUri = otherUser?.avatarUri || `https://i.pravatar.cc/80?u=${otherUser?.id}`;
    const isOnline  = index % 3 === 0;

    const previewText = lastMessage
      ? (lastMessage.sharedPostId
          ? (lastMessage.senderId === viewModel.currentUserId ? 'You shared a recipe 🍽️' : 'Shared a recipe 🍽️')
          : (lastMessage.senderId === viewModel.currentUserId
              ? `You: ${lastMessage.text ?? ''}`
              : lastMessage.text ?? ''))
      : 'No messages yet';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/chat?conversationId=${item.id}` as any)}
        activeOpacity={0.85}
        style={styles.cardOuter}
      >
        <View style={[styles.card, { backgroundColor: cardBg },
          dark ? { shadowOpacity: 0.4 } : { shadowOpacity: 0.07 }
        ]}>
          {/* Avatar */}
          <View style={styles.avatarCol}>
            {isUnread ? (
              <LinearGradient
                colors={[ORANGE_LIGHT, ORANGE_DARK]}
                style={styles.avatarRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image source={{ uri: avatarUri }} style={styles.avatarInner} />
              </LinearGradient>
            ) : (
              <View style={styles.avatarPlain}>
                <Image source={{ uri: avatarUri }} style={styles.avatarInner} />
              </View>
            )}
            {isOnline && <View style={styles.onlineDot} />}
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <Text
              style={[styles.name, { color: textColor }, isUnread && styles.nameUnread]}
              numberOfLines={1}
            >
              {otherUser?.displayName || otherUser?.username || 'Unknown'}
            </Text>
            <Text
              style={[
                styles.preview,
                { color: isUnread ? (dark ? '#ccc' : '#333') : subColor },
                isUnread && styles.previewUnread,
              ]}
              numberOfLines={1}
            >
              {previewText}
            </Text>
          </View>

          {/* Right */}
          <View style={styles.cardRight}>
            <Text style={[styles.time, { color: isUnread ? ORANGE : subColor }]}>
              {timeAgo(lastMessage?.createdAt || updatedAt)}
            </Text>
            {isUnread ? (
              <LinearGradient colors={[ORANGE_LIGHT, ORANGE_DARK]} style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.badgePlaceholder} />
            )}
            <LinearGradient
              colors={isUnread
                ? [ORANGE_LIGHT, ORANGE_DARK]
                : (dark ? ['#2a2a2a', '#222'] : ['#fff0eb', '#ffe4d6'])}
              style={styles.chatIconBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color={isUnread ? '#fff' : ORANGE} />
            </LinearGradient>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const hasFriends = viewModel.unmessagedFriends.length > 0;
  const hasConvs   = viewModel.items.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: bg }]}>
        <View>
          <Text style={[styles.headerTitle, { color: textColor }]}>Messages</Text>
          {hasConvs && (
            <Text style={[styles.headerSub, { color: subColor }]}>
              {viewModel.items.length} conversation{viewModel.items.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => router.push('/new-message' as any)} activeOpacity={0.8}>
          <LinearGradient
            colors={[ORANGE_LIGHT, ORANGE_DARK]}
            style={styles.composeBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {viewModel.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={viewModel.isRefreshing}
              onRefresh={() => viewModel.refresh()}
              tintColor={ORANGE}
              colors={[ORANGE]}
            />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* ── Section 1: Conversations ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: ORANGE }]} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>Chats</Text>
              {hasConvs && (
                <View style={styles.sectionCountPill}>
                  <Text style={styles.sectionCountText}>{viewModel.items.length}</Text>
                </View>
              )}
            </View>

            {hasConvs ? (
              <View style={{ paddingHorizontal: 16 }}>
                {viewModel.items.map((item, index) => (
                  <React.Fragment key={item.id}>
                    {renderConvItem({ item, index })}
                  </React.Fragment>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                <LinearGradient
                  colors={['rgba(255,107,53,0.12)', 'rgba(255,107,53,0.04)']}
                  style={styles.emptyIconWrap}
                >
                  <Ionicons name="chatbubbles-outline" size={36} color={ORANGE} />
                </LinearGradient>
                <Text style={[styles.emptyCardTitle, { color: textColor }]}>No chats yet</Text>
                <Text style={[styles.emptyCardSub, { color: subColor }]}>
                  Tap a friend below to start chatting
                </Text>
              </View>
            )}
          </View>

          {/* ── Divider ── */}
          <View style={[styles.divider, { backgroundColor: divider }]} />

          {/* ── Section 2: Friends ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, { backgroundColor: '#34C759' }]} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>Friends</Text>
              {hasFriends && (
                <View style={[styles.sectionCountPill, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                  <Text style={[styles.sectionCountText, { color: '#34C759' }]}>
                    {viewModel.unmessagedFriends.length}
                  </Text>
                </View>
              )}
              <Text style={[styles.sectionSubtitle, { color: subColor }]}>
                · not messaged yet
              </Text>
            </View>

            {hasFriends ? (
              <FlatList
                horizontal
                data={viewModel.unmessagedFriends}
                keyExtractor={u => u.id}
                renderItem={({ item }) => (
                  <FriendCard
                    user={item}
                    dark={dark}
                    onPress={() => handleFriendPress(item.id)}
                  />
                )}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                showsHorizontalScrollIndicator={false}
              />
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                <LinearGradient
                  colors={['rgba(52,199,89,0.12)', 'rgba(52,199,89,0.04)']}
                  style={styles.emptyIconWrap}
                >
                  <Ionicons name="people-outline" size={36} color="#34C759" />
                </LinearGradient>
                <Text style={[styles.emptyCardTitle, { color: textColor }]}>
                  You've messaged everyone!
                </Text>
                <Text style={[styles.emptyCardSub, { color: subColor }]}>
                  Follow more people to see them here
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, marginTop: 2 },
  composeBtnGrad: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },

  // Section
  section: { paddingTop: 6, paddingBottom: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12, gap: 8,
  },
  sectionAccent:   { width: 4, height: 18, borderRadius: 2 },
  sectionTitle:    { fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { fontSize: 13 },
  sectionCountPill: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  sectionCountText: { fontSize: 12, fontWeight: '700', color: ORANGE },

  // Divider
  divider: { height: 6, marginVertical: 4 },

  // Conversation card
  cardOuter: { marginBottom: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8, elevation: 3,
  },
  avatarCol:   { position: 'relative', marginRight: 14 },
  avatarRing: {
    width: 62, height: 62, borderRadius: 31,
    padding: 2.5, alignItems: 'center', justifyContent: 'center',
  },
  avatarPlain: { width: 62, height: 62, borderRadius: 31, padding: 2.5 },
  avatarInner: { width: 56, height: 56, borderRadius: 28 },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#34C759', borderWidth: 2, borderColor: '#fff',
  },
  cardContent: { flex: 1 },
  name:        { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  nameUnread:  { fontWeight: '700' },
  preview:     { fontSize: 14 },
  previewUnread: { fontWeight: '500' },
  cardRight:   { alignItems: 'flex-end', gap: 6, marginLeft: 8 },
  time:        { fontSize: 12, fontWeight: '500' },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  badgePlaceholder: { height: 22 },
  badgeText:   { color: '#fff', fontSize: 11, fontWeight: '800' },
  chatIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },

  // Empty section card
  emptyCard: {
    marginHorizontal: 16, borderRadius: 18,
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyCardTitle: { fontSize: 16, fontWeight: '700' },
  emptyCardSub:   { fontSize: 14, textAlign: 'center' },
});
