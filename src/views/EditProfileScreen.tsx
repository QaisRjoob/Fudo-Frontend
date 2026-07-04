import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image,
  ActivityIndicator, Alert, useColorScheme, StatusBar,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { EditProfileViewModel } from '../viewmodels/EditProfileViewModel';
import { SocialLinks } from '../models';

const ORANGE       = '#FF6B35';
const ORANGE_LIGHT = '#FF8C5A';
const ORANGE_DARK  = '#E5501A';

// ─── Social platform config ───────────────────────────────────────────────────
const PLATFORMS: {
  key: keyof SocialLinks;
  label: string;
  icon: string;
  color: string;
  placeholder: string;
}[] = [
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E1306C', placeholder: 'instagram.com/yourhandle' },
  { key: 'tiktok',    label: 'TikTok',    icon: 'musical-notes',  color: '#010101', placeholder: 'tiktok.com/@yourhandle'   },
  { key: 'twitter',   label: 'X / Twitter', icon: 'logo-twitter', color: '#1DA1F2', placeholder: 'x.com/yourhandle'        },
  { key: 'youtube',   label: 'YouTube',   icon: 'logo-youtube',   color: '#FF0000', placeholder: 'youtube.com/@yourchannel' },
  { key: 'website',   label: 'Website',   icon: 'globe-outline',  color: ORANGE,    placeholder: 'yourwebsite.com'          },
];

// ─── Field row ────────────────────────────────────────────────────────────────
const FieldRow = ({
  label, value, onChangeText, placeholder, multiline = false,
  maxLength, autoCapitalize, isLast = false,
  textColor, separatorColor, subtitleColor,
}: {
  label: string; value: string;
  onChangeText: (v: string) => void;
  placeholder: string; multiline?: boolean; maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  isLast?: boolean; textColor: string; separatorColor: string; subtitleColor: string;
}) => (
  <View style={[
    fieldStyles.row,
    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor },
  ]}>
    <Text style={[fieldStyles.label, { color: ORANGE }]}>{label}</Text>
    <TextInput
      style={[fieldStyles.input, { color: textColor }, multiline && { height: 76, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={subtitleColor}
      multiline={multiline}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize ?? 'words'}
      returnKeyType={multiline ? 'default' : 'next'}
    />
  </View>
);

const fieldStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, paddingHorizontal: 16, minHeight: 50 },
  label: { width: 88, fontSize: 14, fontWeight: '700', paddingTop: 2 },
  input: { flex: 1, fontSize: 15 },
});

// ─── Social link row ──────────────────────────────────────────────────────────
const SocialRow = ({
  platform, value, onChangeText, isLast,
  textColor, separatorColor, subtitleColor,
}: {
  platform: typeof PLATFORMS[0]; value: string;
  onChangeText: (v: string) => void; isLast?: boolean;
  textColor: string; separatorColor: string; subtitleColor: string;
}) => (
  <View style={[
    socialStyles.row,
    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor },
  ]}>
    <View style={[socialStyles.iconBadge, { backgroundColor: platform.color }]}>
      <Ionicons name={platform.icon as any} size={16} color="#fff" />
    </View>
    <View style={socialStyles.inputWrap}>
      <Text style={[socialStyles.platformLabel, { color: subtitleColor }]}>{platform.label}</Text>
      <TextInput
        style={[socialStyles.input, { color: textColor }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={platform.placeholder}
        placeholderTextColor={subtitleColor}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="next"
      />
    </View>
  </View>
);

const socialStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, minHeight: 56 },
  iconBadge: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  inputWrap: { flex: 1 },
  platformLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { fontSize: 14 },
});

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, color }: { title: string; color: string }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionAccent, { backgroundColor: ORANGE }]} />
    <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
  </View>
);

// ─── EditProfileScreen ────────────────────────────────────────────────────────
export const EditProfileScreen = observer(() => {
  const [viewModel] = useState(() => new EditProfileViewModel());
  const router = useRouter();
  const dark = useColorScheme() === 'dark';

  const bg             = dark ? '#0a0a0a' : '#f5f5f5';
  const cardBg         = dark ? '#1c1c1e' : '#ffffff';
  const textColor      = dark ? '#ffffff' : '#1a1a1a';
  const subtitleColor  = dark ? '#8e8e93' : '#6c6c70';
  const separatorColor = dark ? '#38383a' : '#e5e5ea';

  useEffect(() => { viewModel.initialize(); }, []);

  const handleSave = async () => {
    const ok = await viewModel.save();
    if (ok) {
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ok = await viewModel.deleteAccount();
            if (ok) router.replace('/login');
          },
        },
      ]
    );
  };

  if (viewModel.isLoading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={ORANGE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: separatorColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={ORANGE} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Edit Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* ── Avatar ── */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={() => viewModel.pickAvatar()} style={styles.avatarOuter} activeOpacity={0.85}>
              <LinearGradient
                colors={[ORANGE_LIGHT, ORANGE_DARK]}
                style={styles.avatarRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.avatarInnerRing, { backgroundColor: bg }]}>
                  {viewModel.avatarUri ? (
                    <Image source={{ uri: viewModel.avatarUri }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: cardBg }]}>
                      <Ionicons name="person" size={52} color={subtitleColor} />
                    </View>
                  )}
                </View>
              </LinearGradient>
              {/* Camera badge */}
              <LinearGradient
                colors={[ORANGE_LIGHT, ORANGE_DARK]}
                style={styles.cameraBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="camera" size={15} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => viewModel.pickAvatar()} activeOpacity={0.7}>
              <Text style={[styles.changePhotoText, { color: ORANGE }]}>Change Profile Photo</Text>
            </TouchableOpacity>
          </View>

          {/* ── Basic info ── */}
          <SectionHeader title="BASIC INFO" color={subtitleColor} />
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <FieldRow
              label="Name"
              value={viewModel.displayName}
              onChangeText={v => viewModel.setDisplayName(v)}
              placeholder="Full name"
              textColor={textColor}
              separatorColor={separatorColor}
              subtitleColor={subtitleColor}
            />
            <FieldRow
              label="Username"
              value={viewModel.username}
              onChangeText={v => viewModel.setUsername(v)}
              placeholder="username"
              autoCapitalize="none"
              textColor={textColor}
              separatorColor={separatorColor}
              subtitleColor={subtitleColor}
            />
            <FieldRow
              label="Bio"
              value={viewModel.bio}
              onChangeText={v => viewModel.setBio(v)}
              placeholder="Write something about yourself…"
              multiline
              maxLength={150}
              isLast
              textColor={textColor}
              separatorColor={separatorColor}
              subtitleColor={subtitleColor}
            />
          </View>
          <Text style={[styles.charCount, { color: subtitleColor }]}>
            {viewModel.bio.length} / 150
          </Text>

          {/* ── Social links ── */}
          <SectionHeader title="LINKS & SOCIALS" color={subtitleColor} />
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            {PLATFORMS.map((platform, i) => (
              <SocialRow
                key={platform.key}
                platform={platform}
                value={viewModel.socialLinks[platform.key] ?? ''}
                onChangeText={v => viewModel.setSocialLink(platform.key, v)}
                isLast={i === PLATFORMS.length - 1}
                textColor={textColor}
                separatorColor={separatorColor}
                subtitleColor={subtitleColor}
              />
            ))}
          </View>

          {viewModel.error && (
            <Text style={styles.errorText}>{viewModel.error}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom action bar (pinned) ── */}
      <View style={[styles.bottomBar, { backgroundColor: cardBg, borderTopColor: separatorColor }]}>
        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={viewModel.isSaving}
          activeOpacity={0.85}
          style={styles.saveOuter}
        >
          <LinearGradient
            colors={[ORANGE_LIGHT, ORANGE_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtn}
          >
            {viewModel.isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Delete account button */}
        <TouchableOpacity
          onPress={handleDeleteAccount}
          disabled={viewModel.isDeleting}
          activeOpacity={0.8}
          style={styles.deleteBtn}
        >
          {viewModel.isDeleting ? (
            <ActivityIndicator size="small" color="#ff3b30" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color="#ff3b30" />
              <Text style={styles.deleteBtnText}>Delete Account</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 12, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack:  { width: 44, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: 28, gap: 12 },
  avatarOuter:   { position: 'relative' },
  avatarRing:    { width: 108, height: 108, borderRadius: 54, padding: 3, alignItems: 'center', justifyContent: 'center' },
  avatarInnerRing: { width: 102, height: 102, borderRadius: 51, padding: 2 },
  avatar:          { width: 98,  height: 98,  borderRadius: 49 },
  avatarPlaceholder: {
    width: 98, height: 98, borderRadius: 49,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  changePhotoText: { fontSize: 15, fontWeight: '600' },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 24, marginBottom: 10, gap: 8,
  },
  sectionAccent: { width: 4, height: 16, borderRadius: 2 },
  sectionTitle:  { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },

  // Card
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  charCount: { textAlign: 'right', fontSize: 12, marginTop: 6, marginRight: 20 },
  errorText: { color: '#ff3b30', textAlign: 'center', marginTop: 14, fontSize: 14, paddingHorizontal: 20 },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  saveOuter: { borderRadius: 16, overflow: 'hidden' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 16,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11,
  },
  deleteBtnText: { color: '#ff3b30', fontSize: 14, fontWeight: '600' },
});
