import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, StatusBar, useColorScheme, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { makeAutoObservable, runInAction } from 'mobx';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UserRepository } from '../repositories';
import { User } from '../models';
import { AuthService } from '../services/AuthService';
import { CUISINE_TAGS } from '../viewmodels/CreatePostViewModel';

const INTEREST_ICONS: Record<string, string> = {
  'Italian': 'pizza-outline',
  'Asian': 'fish-outline',
  'Mexican': 'flame-outline',
  'American': 'restaurant-outline',
  'Mediterranean': 'leaf-outline',
  'Indian': 'color-palette-outline',
  'Vegan': 'nutrition-outline',
  'Vegetarian': 'flower-outline',
  'BBQ': 'bonfire-outline',
  'Seafood': 'water-outline',
  'Desserts': 'ice-cream-outline',
  'Breakfast': 'sunny-outline',
  'Healthy': 'heart-outline',
  'Quick & Easy': 'timer-outline',
  'Gluten-Free': 'shield-outline',
};

class OnboardingViewModel {
  selectedInterests: string[] = [];
  suggestedUsers: User[] = [];
  followedIds: Set<string> = new Set();
  isLoadingSuggestions = false;
  isFinishing = false;

  private userRepo = new UserRepository();

  constructor() { makeAutoObservable(this); }

  toggleInterest(tag: string): void {
    if (this.selectedInterests.includes(tag)) {
      this.selectedInterests = this.selectedInterests.filter(t => t !== tag);
    } else {
      this.selectedInterests = [...this.selectedInterests, tag];
    }
  }

  async loadSuggestions(): Promise<void> {
    const userId = AuthService.getCurrentUserId();
    if (!userId) return;
    runInAction(() => { this.isLoadingSuggestions = true; });
    try {
      const users = await this.userRepo.getSuggestedUsers(userId, 8);
      runInAction(() => { this.suggestedUsers = users; });
    } catch (e) {
      console.error('Onboarding suggestions error:', e);
    } finally {
      runInAction(() => { this.isLoadingSuggestions = false; });
    }
  }

  async toggleFollow(targetId: string): Promise<void> {
    const userId = AuthService.getCurrentUserId();
    if (!userId) return;
    if (this.followedIds.has(targetId)) {
      await this.userRepo.unfollowUser(userId, targetId);
      runInAction(() => { this.followedIds.delete(targetId); });
    } else {
      await this.userRepo.followUser(userId, targetId);
      runInAction(() => { this.followedIds.add(targetId); });
    }
  }
}

export const OnboardingScreen = observer(() => {
  const [step, setStep] = useState<'interests' | 'people'>('interests');
  const [viewModel] = useState(() => new OnboardingViewModel());
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const bg = dark ? '#000' : '#fff';
  const textColor = dark ? '#fff' : '#000';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const borderColor = dark ? '#333' : '#e5e5ea';
  const accentColor = '#FF6B35';
  const tintColor = '#007AFF';

  const goToStep2 = async () => {
    await viewModel.loadSuggestions();
    setStep('people');
  };

  const finish = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      {/* Progress dots */}
      <View style={styles.progress}>
        <View style={[styles.dot, { backgroundColor: accentColor }]} />
        <View style={[styles.dot, step === 'people' ? { backgroundColor: accentColor } : { backgroundColor: borderColor }]} />
      </View>

      {step === 'interests' ? (
        <>
          <View style={styles.topSection}>
            <Text style={[styles.title, { color: textColor }]}>What do you love to cook?</Text>
            <Text style={[styles.subtitle, { color: subtitleColor }]}>
              Pick your interests so we can personalize your feed.
            </Text>
          </View>
          <ScrollView contentContainerStyle={styles.tagsWrap} showsVerticalScrollIndicator={false}>
            {CUISINE_TAGS.map(tag => {
              const selected = viewModel.selectedInterests.includes(tag);
              const icon = INTEREST_ICONS[tag] ?? 'restaurant-outline';
              return (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.interestTag,
                    { borderColor: selected ? accentColor : borderColor },
                    selected && { backgroundColor: accentColor },
                  ]}
                  onPress={() => viewModel.toggleInterest(tag)}
                >
                  <Ionicons name={icon as any} size={18} color={selected ? '#fff' : subtitleColor} />
                  <Text style={[styles.interestTagText, { color: selected ? '#fff' : textColor }]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.skipBtn} onPress={finish}>
              <Text style={[styles.skipBtnText, { color: subtitleColor }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: accentColor }]}
              onPress={goToStep2}
            >
              <Text style={styles.nextBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.topSection}>
            <Text style={[styles.title, { color: textColor }]}>Follow Some Chefs</Text>
            <Text style={[styles.subtitle, { color: subtitleColor }]}>
              Get started by following a few people.
            </Text>
          </View>
          {viewModel.isLoadingSuggestions ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={accentColor} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
              {viewModel.suggestedUsers.map(user => {
                const isFollowing = viewModel.followedIds.has(user.id);
                return (
                  <View key={user.id} style={[styles.userRow, { borderBottomColor: borderColor }]}>
                    <Image
                      source={{ uri: user.avatarUri || `https://i.pravatar.cc/80?u=${user.id}` }}
                      style={styles.userAvatar}
                    />
                    <View style={styles.userInfo}>
                      <Text style={[styles.username, { color: textColor }]}>{user.username}</Text>
                      <Text style={[styles.userBio, { color: subtitleColor }]} numberOfLines={1}>
                        {user.bio || 'Food enthusiast'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.followBtn, isFollowing && styles.followingBtn]}
                      onPress={() => viewModel.toggleFollow(user.id)}
                    >
                      <Text style={[styles.followBtnText, isFollowing && { color: textColor }]}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: accentColor, flex: 1 }]} onPress={finish}>
              <Text style={styles.nextBtnText}>Start Cooking!</Text>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  topSection: { paddingHorizontal: 24, paddingVertical: 24 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  tagsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 20, paddingBottom: 20,
  },
  interestTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 24,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  interestTagText: { fontSize: 14, fontWeight: '500' },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, gap: 12,
  },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  skipBtnText: { fontSize: 15 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 12,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  userInfo: { flex: 1 },
  username: { fontSize: 15, fontWeight: '600' },
  userBio: { fontSize: 13, marginTop: 2 },
  followBtn: {
    backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8,
  },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#c7c7cc' },
  followBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
