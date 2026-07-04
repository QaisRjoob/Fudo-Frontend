import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { AuthService } from '../src/services/AuthService';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Database setup and seeding already happened in AppInitializer (app/_layout.tsx)
    // before this screen mounts. Re-seeding here regenerated random media ids on every
    // launch, which could orphan a story's mediaId and break the stories row.
    console.log('[Index] Checking auth...');

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
