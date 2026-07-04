import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { AuthService } from '../src/services/AuthService';
import DatabaseService from '../src/db/database';
import SeedData from '../src/db/seedData';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('[Index] Starting app initialization...');
    
    // Initialize database
    console.log('[Index] Initializing database...');
    await DatabaseService.initializeDatabase();
    
    // Initialize sample data on first launch
    console.log('[Index] Initializing sample users...');
    await AuthService.initializeSampleData();
    
    // Seed database with posts, stories, etc.
    console.log('[Index] Seeding database with posts and stories...');
    await SeedData.seed();
    console.log('[Index] Database seeded successfully!');

    const isAuthenticated = await AuthService.isAuthenticated();
    console.log('[Index] User authenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
      <ActivityIndicator size="large" color="#FF6B35" />
      <Text style={{ marginTop: 16, color: '#666' }}>Loading Fudo...</Text>
    </View>
  );
}
