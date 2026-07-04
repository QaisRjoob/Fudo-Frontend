import 'react-native-get-random-values'; // Must be first import
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from '@/hooks/use-color-scheme';
import AppInitializer from '../src/utils/AppInitializer';
import { AuthProvider } from '../src/contexts/AuthContext';

// Keep splash screen visible while we initialize
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize the app
        await AppInitializer.initialize();
      } catch (e) {
        console.warn('Error during app initialization:', e);
      } finally {
        setIsReady(true);
        SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="profile/[userId]" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="saved-posts" />
            <Stack.Screen name="archive" />
            <Stack.Screen name="change-password" />
            <Stack.Screen name="blocked-accounts" />
            <Stack.Screen name="user-list" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="info" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="comments/[postId]" />
            <Stack.Screen name="post/[postId]" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="create-post" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

