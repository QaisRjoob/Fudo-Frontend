import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, StatusBar, useColorScheme, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeAutoObservable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DatabaseService from '../db/database';
import { AuthService } from '../services/AuthService';

interface BlockedUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUri?: string;
}

class BlockedAccountsViewModel {
  users: BlockedUser[] = [];
  isLoading = false;

  constructor() { makeAutoObservable(this); }

  async load(): Promise<void> {
    const userId = AuthService.getCurrentUserId();
    if (!userId) return;
    runInAction(() => { this.isLoading = true; });
    try {
      const db = await DatabaseService.getDatabase();
      const results = await db.getAllAsync<any>(
        `SELECT u.id, u.username, u.displayName, u.avatarUri
         FROM blocked_users b JOIN users u ON b.blockedId = u.id
         WHERE b.userId = ? ORDER BY b.createdAt DESC`,
        [userId]
      );
      runInAction(() => { this.users = results; });
    } catch (e) {
      console.error('BlockedAccounts load error:', e);
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  }

  async unblock(blockedId: string): Promise<void> {
    const userId = AuthService.getCurrentUserId();
    if (!userId) return;
    try {
      const db = await DatabaseService.getDatabase();
      await db.runAsync('DELETE FROM blocked_users WHERE userId = ? AND blockedId = ?', [userId, blockedId]);
      runInAction(() => { this.users = this.users.filter(u => u.id !== blockedId); });
    } catch (e) {
      console.error('Unblock error:', e);
    }
  }
}

export const BlockedAccountsScreen = observer(() => {
  const [viewModel] = useState(() => new BlockedAccountsViewModel());
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const bg = dark ? '#000' : '#fff';
  const textColor = dark ? '#fff' : '#000';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const separatorColor = dark ? '#2c2c2e' : '#f2f2f7';
  const tintColor = '#007AFF';

  useEffect(() => { viewModel.load(); }, []);

  const handleUnblock = (user: BlockedUser) => {
    Alert.alert(`Unblock @${user.username}?`, 'They will be able to see your posts and follow you.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unblock', onPress: () => viewModel.unblock(user.id) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { borderBottomColor: separatorColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={26} color={tintColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Blocked Accounts</Text>
        <View style={{ width: 44 }} />
      </View>

      {viewModel.isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={tintColor} /></View>
      ) : (
        <FlatList
          data={viewModel.users}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: separatorColor }} />}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <Image
                source={{ uri: item.avatarUri || `https://i.pravatar.cc/80?u=${item.id}` }}
                style={styles.avatar}
              />
              <View style={styles.userInfo}>
                <Text style={[styles.username, { color: textColor }]}>{item.username}</Text>
                {item.displayName ? <Text style={[styles.displayName, { color: subtitleColor }]}>{item.displayName}</Text> : null}
              </View>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(item)}>
                <Text style={styles.unblockBtnText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={64} color={subtitleColor} />
              <Text style={[styles.emptyTitle, { color: textColor }]}>No Blocked Accounts</Text>
              <Text style={[styles.emptySubtitle, { color: subtitleColor }]}>
                When you block someone they appear here.
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
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  userInfo: { flex: 1 },
  username: { fontSize: 15, fontWeight: '600' },
  displayName: { fontSize: 13, marginTop: 2 },
  unblockBtn: {
    borderWidth: 1, borderColor: '#007AFF',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
  },
  unblockBtnText: { color: '#007AFF', fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 100, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
