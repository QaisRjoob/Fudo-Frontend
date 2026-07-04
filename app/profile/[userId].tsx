import { useLocalSearchParams } from 'expo-router';
import { ProfileScreen } from '../../src/views';

export default function UserProfile() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return <ProfileScreen route={{ params: { userId: Array.isArray(userId) ? userId[0] : userId } }} />;
}
