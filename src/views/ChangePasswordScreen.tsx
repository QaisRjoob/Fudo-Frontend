import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar,
  useColorScheme, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DatabaseService from '../db/database';
import { AuthService } from '../services/AuthService';

export const ChangePasswordScreen = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  const bg = dark ? '#000' : '#f2f2f7';
  const cardBg = dark ? '#1c1c1e' : '#fff';
  const textColor = dark ? '#fff' : '#000';
  const subtitleColor = dark ? '#8e8e93' : '#6c6c70';
  const separatorColor = dark ? '#38383a' : '#e5e5ea';
  const tintColor = '#007AFF';

  const handleSave = async () => {
    if (!current || !next || !confirm) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    if (next.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters'); return;
    }
    if (next !== confirm) {
      Alert.alert('Error', 'New passwords do not match'); return;
    }

    const userId = AuthService.getCurrentUserId();
    if (!userId) { Alert.alert('Error', 'Not logged in'); return; }

    setIsSaving(true);
    try {
      const db = await DatabaseService.getDatabase();
      const user = await db.getFirstAsync<any>(
        'SELECT password FROM users WHERE id = ?', [userId]
      );
      if (!user || user.password !== current) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }
      await db.runAsync('UPDATE users SET password = ? WHERE id = ?', [next, userId]);
      Alert.alert('Success', 'Password changed successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: separatorColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={26} color={tintColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Change Password</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <PasswordField
              label="Current Password"
              value={current}
              onChangeText={setCurrent}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
              textColor={textColor}
              subtitleColor={subtitleColor}
              separatorColor={separatorColor}
            />
            <PasswordField
              label="New Password"
              value={next}
              onChangeText={setNext}
              show={showNext}
              onToggle={() => setShowNext(v => !v)}
              textColor={textColor}
              subtitleColor={subtitleColor}
              separatorColor={separatorColor}
            />
            <PasswordField
              label="Confirm New Password"
              value={confirm}
              onChangeText={setConfirm}
              show={showNext}
              onToggle={() => setShowNext(v => !v)}
              textColor={textColor}
              subtitleColor={subtitleColor}
              separatorColor={separatorColor}
              isLast
            />
          </View>

          <Text style={[styles.hint, { color: subtitleColor }]}>
            Password must be at least 6 characters.
          </Text>

          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const PasswordField = ({
  label, value, onChangeText, show, onToggle, textColor, subtitleColor, separatorColor, isLast = false,
}: any) => (
  <View style={[styles.fieldRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: separatorColor }]}>
    <Text style={[styles.fieldLabel, { color: subtitleColor }]}>{label}</Text>
    <TextInput
      style={[styles.fieldInput, { color: textColor }]}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!show}
      autoCapitalize="none"
      placeholder="••••••"
      placeholderTextColor={subtitleColor}
    />
    <TouchableOpacity onPress={onToggle}>
      <Ionicons name={show ? 'eye-outline' : 'eye-off-outline'} size={20} color={subtitleColor} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: { width: 44 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  card: { marginHorizontal: 16, marginTop: 28, borderRadius: 12, overflow: 'hidden' },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, minHeight: 50,
  },
  fieldLabel: { width: 130, fontSize: 14, fontWeight: '500' },
  fieldInput: { flex: 1, fontSize: 15 },
  hint: { fontSize: 13, marginHorizontal: 20, marginTop: 10, lineHeight: 18 },
  saveBtn: {
    backgroundColor: '#007AFF', marginHorizontal: 16, marginTop: 24,
    paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
