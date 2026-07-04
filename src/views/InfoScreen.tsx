import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  StatusBar, useColorScheme, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const CONTENT: Record<string, { title: string; body: string }> = {
  help: {
    title: 'Help Center',
    body: `Welcome to Fudo Help Center!

Getting Started
• Sign up with your email and a unique username.
• Browse the feed to discover recipes from people you follow.
• Tap any recipe card to view the full recipe, ingredients, and steps.

Posting Recipes
• Tap the + tab to create a new recipe post.
• Add photos, a title, cook time, servings, ingredients, and step-by-step instructions.
• Choose up to 5 tags to help others discover your recipe.

Interacting
• Double-tap a recipe card to like it.
• Tap the comment icon to leave a comment.
• Tap the bookmark icon to save a recipe for later.
• Tap the paper-plane icon to share a recipe.

Your Profile
• Tap your profile picture to view your own profile.
• Use "Edit Profile" to update your name, bio, and photo.
• The archive tab in Settings stores posts you've hidden from your profile.

Need more help? Email us at support@fudo.app`,
  },
  report: {
    title: 'Report a Problem',
    body: `How to Report a Problem

We're sorry you're experiencing an issue. Here's how to get help:

1. Email us: support@fudo.app
2. Include:
   • Your username
   • A description of the problem
   • Steps to reproduce it
   • Screenshots if possible

We aim to respond within 48 hours.

For urgent safety issues or content that violates our Community Guidelines, please use the report option on the specific post or user profile.

Thank you for helping make Fudo better for everyone.`,
  },
  privacy: {
    title: 'Privacy Policy',
    body: `Fudo Privacy Policy
Last updated: January 2025

1. Data We Collect
We collect information you provide when creating an account (username, email) and content you post (recipes, photos, comments).

2. How We Use It
• To operate and improve the app
• To personalize your experience
• To send you notifications (with your consent)

3. Data Sharing
We do not sell your personal data. We may share data with service providers who help operate the app, under strict confidentiality agreements.

4. Your Rights
You can edit or delete your account at any time from Settings. Request data deletion by emailing privacy@fudo.app.

5. Security
We use industry-standard encryption to protect your data. All passwords are hashed before storage.

6. Changes
We'll notify you of material changes to this policy via the app.

Contact: privacy@fudo.app`,
  },
  terms: {
    title: 'Terms of Service',
    body: `Fudo Terms of Service
Last updated: January 2025

By using Fudo, you agree to these terms.

1. Account
You must be 13+ to use Fudo. You're responsible for keeping your account secure.

2. Content
• You own the recipes and photos you post.
• By posting, you grant Fudo a license to display your content in the app.
• Do not post content that is illegal, harmful, or violates others' rights.

3. Prohibited Conduct
• Spam, harassment, or hate speech
• Posting others' private information
• Automated scraping or data collection

4. Termination
We may suspend accounts that violate these terms.

5. Disclaimer
Fudo is provided "as is." We are not responsible for the accuracy of recipes or nutritional information.

6. Changes
We may update these terms. Continued use means you accept the changes.

Contact: legal@fudo.app`,
  },
};

export const InfoScreen = () => {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const bg = dark ? '#000' : '#f2f2f7';
  const cardBg = dark ? '#1c1c1e' : '#fff';
  const textColor = dark ? '#fff' : '#000';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const separatorColor = dark ? '#38383a' : '#e5e5ea';
  const tintColor = '#007AFF';

  const content = CONTENT[type ?? ''] ?? { title: 'Info', body: 'No content available.' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: separatorColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={26} color={tintColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>{content.title}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.body, { color: textColor }]}>{content.body}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: { width: 44 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  card: { margin: 16, borderRadius: 12, padding: 20 },
  body: { fontSize: 15, lineHeight: 24 },
});
