import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, ActivityIndicator, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { NotificationRepository, NotificationWithActor } from '../repositories/NotificationRepository';
import { AuthService } from '../services/AuthService';

// ─── helpers ────────────────────────────────────────────────────────────────

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const sectionLabel = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = diff / 3600000;
  if (h < 24) return 'Today';
  if (h < 168) return 'This Week';
  return 'Earlier';
};

const typeIcon = (type: string): { name: any; color: string } => {
  switch (type) {
    case 'like':    return { name: 'heart',            color: '#FF3B47' };
    case 'comment': return { name: 'chatbubble',       color: '#007AFF' };
    case 'follow':  return { name: 'person-add',       color: '#34C759' };
    default:        return { name: 'notifications',    color: '#FF9500' };
  }
};

// ─── NotificationRow ─────────────────────────────────────────────────────────

const NotificationRow = ({
  item, dark, textColor, subtitleColor,
  onPress,
}: {
  item: NotificationWithActor;
  dark: boolean;
  textColor: string;
  subtitleColor: string;
  onPress: () => void;
}) => {
  const icon = typeIcon(item.type);
  const rowBg = !item.isRead
    ? (dark ? 'rgba(0,122,255,0.08)' : 'rgba(0,122,255,0.05)')
    : 'transparent';

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: rowBg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar + icon badge */}
      <View style={styles.avatarWrap}>
        <Image
          source={{ uri: item.actor?.avatarUri || `https://i.pravatar.cc/80?u=${item.actorId}` }}
          style={styles.avatar}
        />
        <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name} size={10} color="#fff" />
        </View>
      </View>

      {/* Text */}
      <View style={styles.textCol}>
        <Text style={[styles.body, { color: textColor }]} numberOfLines={2}>
          <Text style={styles.bold}>
            {item.actor?.displayName || item.actor?.username || 'Someone'}
          </Text>
          {' '}{item.message}
        </Text>
        <Text style={[styles.time, { color: subtitleColor }]}>
          {timeAgo(item.createdAt)}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

// ─── NotificationsScreen ─────────────────────────────────────────────────────

export const NotificationsScreen = () => {
  const dark = useColorScheme() === 'dark';
  const bg = dark ? '#000' : '#fff';
  const textColor = dark ? '#fff' : '#000';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const borderColor = dark ? '#2c2c2e' : '#e5e5ea';
  const tint = '#007AFF';

  const router = useRouter();
  const currentUserId = AuthService.getCurrentUserId() ?? '';
  const repo = new NotificationRepository();

  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await repo.getNotifications(currentUserId);
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { load(); }, []);

  // Refresh when screen comes into focus
  useFocusEffect(useCallback(() => { load(); }, []));

  const handleMarkAllRead = async () => {
    await repo.markAllAsRead(currentUserId);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handlePress = async (item: NotificationWithActor) => {
    await repo.markAsRead(item.id);
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));

    if ((item.type === 'like' || item.type === 'comment') && item.postId) {
      router.push(`/post/${item.postId}` as any);
    } else if (item.type === 'follow' || item.type === 'follow_request') {
      router.push(`/profile/${item.actorId}` as any);
    }
  };

  // Group into sections
  const sections: { label: string; data: NotificationWithActor[] }[] = [];
  const sectionMap = new Map<string, NotificationWithActor[]>();
  for (const n of notifications) {
    const label = sectionLabel(n.createdAt);
    if (!sectionMap.has(label)) sectionMap.set(label, []);
    sectionMap.get(label)!.push(n);
  }
  for (const [label, data] of sectionMap) {
    sections.push({ label, data });
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={26} color={tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Activity</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={{ color: tint, fontSize: 14, fontWeight: '600' }}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tint} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="heart-outline" size={56} color={subtitleColor} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>No activity yet</Text>
          <Text style={[styles.emptyBody, { color: subtitleColor }]}>
            When people like or comment on your posts, you'll see it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={s => s.label}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: section }) => (
            <View>
              <Text style={[styles.sectionHeader, { color: subtitleColor }]}>
                {section.label}
              </Text>
              {section.data.map(n => (
                <NotificationRow
                  key={n.id}
                  item={n}
                  dark={dark}
                  textColor={textColor}
                  subtitleColor={subtitleColor}
                  onPress={() => handlePress(n)}
                />
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  textCol: { flex: 1 },
  body: { fontSize: 14, lineHeight: 19 },
  bold: { fontWeight: '700' },
  time: { fontSize: 12, marginTop: 2 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#007AFF',
  },
});
