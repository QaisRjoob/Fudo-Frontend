import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  useColorScheme,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AuthService } from '../services/AuthService';

const ORANGE       = '#FF6B35';
const ORANGE_LIGHT = '#FF8C5A';
const ORANGE_DARK  = '#E5501A';

// ─── Section wrapper ─────────────────────────────────────────────────────────
const Section = ({
  title, children, cardBg, titleColor,
}: {
  title?: string;
  children: React.ReactNode;
  cardBg: string;
  titleColor: string;
}) => (
  <View style={styles.section}>
    {title && <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>}
    <View style={[styles.card, { backgroundColor: cardBg }]}>{children}</View>
  </View>
);

// ─── Row ─────────────────────────────────────────────────────────────────────
const Row = ({
  icon,
  iconBg,
  label,
  value,
  onPress,
  showChevron = true,
  destructive = false,
  rightElement,
  isLast = false,
  separatorColor,
  textColor,
}: {
  icon: string;
  iconBg?: string[];       // gradient colors for the icon square
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  rightElement?: React.ReactNode;
  isLast?: boolean;
  separatorColor: string;
  textColor: string;
}) => (
  <TouchableOpacity
    style={[
      styles.row,
      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor },
    ]}
    onPress={onPress}
    disabled={!onPress && !rightElement}
    activeOpacity={onPress ? 0.6 : 1}
  >
    <View style={styles.rowLeft}>
      {/* Icon badge */}
      {destructive ? (
        <View style={[styles.iconBadge, { backgroundColor: '#ff3b30' }]}>
          <Ionicons name={icon as any} size={17} color="#fff" />
        </View>
      ) : iconBg ? (
        <LinearGradient
          colors={iconBg as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBadge}
        >
          <Ionicons name={icon as any} size={17} color="#fff" />
        </LinearGradient>
      ) : (
        <View style={[styles.iconBadge, { backgroundColor: ORANGE }]}>
          <Ionicons name={icon as any} size={17} color="#fff" />
        </View>
      )}
      <Text style={[styles.rowLabel, { color: destructive ? '#ff3b30' : textColor }]}>
        {label}
      </Text>
    </View>
    <View style={styles.rowRight}>
      {value && <Text style={[styles.rowValue, { color: '#8e8e93' }]}>{value}</Text>}
      {rightElement}
      {showChevron && !rightElement && (
        <Ionicons name="chevron-forward" size={16} color="#c7c7cc" />
      )}
    </View>
  </TouchableOpacity>
);

// ─── SettingsScreen ───────────────────────────────────────────────────────────
export const SettingsScreen = () => {
  const router = useRouter();
  const dark = useColorScheme() === 'dark';

  const bg             = dark ? '#0a0a0a' : '#f5f5f5';
  const cardBg         = dark ? '#1c1c1e' : '#fff';
  const textColor      = dark ? '#fff'    : '#000';
  const subtitleColor  = dark ? '#8e8e93' : '#6c6c70';
  const separatorColor = dark ? '#38383a' : '#e5e5ea';

  const [notifications,  setNotifications]  = useState(true);
  const [likesNotif,     setLikesNotif]     = useState(true);
  const [commentsNotif,  setCommentsNotif]  = useState(true);
  const [followersNotif, setFollowersNotif] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await AuthService.logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const rowProps = { separatorColor, textColor };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: separatorColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={26} color={ORANGE} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── ACCOUNT ── */}
        <Section title="ACCOUNT" cardBg={cardBg} titleColor={subtitleColor}>
          <Row {...rowProps}
            icon="person-outline"
            iconBg={[ORANGE_LIGHT, ORANGE_DARK]}
            label="Edit Profile"
            onPress={() => router.push('/edit-profile')}
          />
          <Row {...rowProps}
            icon="lock-closed-outline"
            iconBg={['#636e72', '#2d3436']}
            label="Change Password"
            onPress={() => router.push('/change-password')}
          />
          <Row {...rowProps}
            icon="bookmark-outline"
            iconBg={['#fd79a8', '#e84393']}
            label="Saved Posts"
            onPress={() => router.push('/saved-posts')}
          />
          <Row {...rowProps}
            icon="archive-outline"
            iconBg={['#a29bfe', '#6c5ce7']}
            label="Archive"
            onPress={() => router.push('/archive')}
            isLast
          />
        </Section>

        {/* ── PRIVACY ── */}
        <Section title="PRIVACY" cardBg={cardBg} titleColor={subtitleColor}>
          <Row
            {...rowProps}
            icon="eye-off-outline"
            iconBg={['#74b9ff', '#0984e3']}
            label="Private Account"
            showChevron={false}
            rightElement={
              <Switch
                value={privateAccount}
                onValueChange={setPrivateAccount}
                trackColor={{ false: '#e5e5ea', true: ORANGE }}
                thumbColor="#fff"
                ios_backgroundColor="#e5e5ea"
              />
            }
          />
          <Row {...rowProps}
            icon="shield-checkmark-outline"
            iconBg={['#55efc4', '#00b894']}
            label="Blocked Accounts"
            onPress={() => router.push('/blocked-accounts')}
            isLast
          />
        </Section>

        {/* ── NOTIFICATIONS ── */}
        <Section title="NOTIFICATIONS" cardBg={cardBg} titleColor={subtitleColor}>
          <Row
            {...rowProps}
            icon="notifications-outline"
            iconBg={[ORANGE_LIGHT, ORANGE_DARK]}
            label="Push Notifications"
            showChevron={false}
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#e5e5ea', true: ORANGE }}
                thumbColor="#fff"
                ios_backgroundColor="#e5e5ea"
              />
            }
          />
          <Row
            {...rowProps}
            icon="heart-outline"
            iconBg={['#ff7675', '#d63031']}
            label="Likes"
            showChevron={false}
            rightElement={
              <Switch
                value={likesNotif}
                onValueChange={setLikesNotif}
                trackColor={{ false: '#e5e5ea', true: ORANGE }}
                thumbColor="#fff"
                ios_backgroundColor="#e5e5ea"
              />
            }
          />
          <Row
            {...rowProps}
            icon="chatbubble-outline"
            iconBg={['#81ecec', '#00cec9']}
            label="Comments"
            showChevron={false}
            rightElement={
              <Switch
                value={commentsNotif}
                onValueChange={setCommentsNotif}
                trackColor={{ false: '#e5e5ea', true: ORANGE }}
                thumbColor="#fff"
                ios_backgroundColor="#e5e5ea"
              />
            }
          />
          <Row
            {...rowProps}
            icon="person-add-outline"
            iconBg={['#fdcb6e', '#e17055']}
            label="New Followers"
            showChevron={false}
            isLast
            rightElement={
              <Switch
                value={followersNotif}
                onValueChange={setFollowersNotif}
                trackColor={{ false: '#e5e5ea', true: ORANGE }}
                thumbColor="#fff"
                ios_backgroundColor="#e5e5ea"
              />
            }
          />
        </Section>

        {/* ── SUPPORT ── */}
        <Section title="SUPPORT" cardBg={cardBg} titleColor={subtitleColor}>
          <Row {...rowProps}
            icon="help-circle-outline"
            iconBg={['#74b9ff', '#0984e3']}
            label="Help Center"
            onPress={() => router.push({ pathname: '/info', params: { type: 'help' } } as any)}
          />
          <Row {...rowProps}
            icon="bug-outline"
            iconBg={['#ff7675', '#d63031']}
            label="Report a Problem"
            onPress={() => router.push({ pathname: '/info', params: { type: 'report' } } as any)}
          />
          <Row {...rowProps}
            icon="document-text-outline"
            iconBg={['#a29bfe', '#6c5ce7']}
            label="Privacy Policy"
            onPress={() => router.push({ pathname: '/info', params: { type: 'privacy' } } as any)}
          />
          <Row {...rowProps}
            icon="newspaper-outline"
            iconBg={['#55efc4', '#00b894']}
            label="Terms of Service"
            onPress={() => router.push({ pathname: '/info', params: { type: 'terms' } } as any)}
          />
          <Row {...rowProps}
            icon="information-circle-outline"
            iconBg={[ORANGE_LIGHT, ORANGE_DARK]}
            label="About Fudo"
            value="v1.0.0"
            showChevron={false}
            isLast
          />
        </Section>

        {/* ── LOG OUT ── */}
        <Section cardBg={cardBg} titleColor={subtitleColor}>
          <Row
            {...rowProps}
            icon="log-out-outline"
            label="Log Out"
            onPress={handleLogout}
            destructive
            showChevron={false}
            isLast
          />
        </Section>

        <Text style={[styles.footer, { color: subtitleColor }]}>Fudo App • v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack:  { width: 44, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '600' },

  // Section
  section:      { marginTop: 28, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },

  // Card
  card: { borderRadius: 14, overflow: 'hidden' },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Icon badge (colored rounded square)
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 15 },

  footer: { textAlign: 'center', fontSize: 13, marginVertical: 32 },
});
