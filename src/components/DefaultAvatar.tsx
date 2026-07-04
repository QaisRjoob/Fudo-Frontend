import React from 'react';
import { View, Text, StyleSheet, Image, ImageStyle, StyleProp } from 'react-native';

const ORANGE = '#FF6B35';

interface Props {
  uri?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
}

const DefaultAvatar: React.FC<Props> = ({ uri, name, size = 50, style }) => {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      />
    );
  }

  const initial = (name || '?')[0].toUpperCase();

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        style as any,
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    backgroundColor: ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: '#FFF',
    fontWeight: '700',
  },
});

export default DefaultAvatar;
