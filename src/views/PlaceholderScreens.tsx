import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const ExploreScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Explore</Text>
    <Text style={styles.subtitle}>Discover new recipes and creators</Text>
    <Text style={styles.hint}>Coming soon: Grid layout, search, categories</Text>
  </View>
);

export const MessagesScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Messages</Text>
    <Text style={styles.subtitle}>Your conversations</Text>
    <Text style={styles.hint}>Coming soon: Chat list and messaging</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  hint: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
