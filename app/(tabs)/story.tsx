import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📝 故事管理</Text>
      <Text style={styles.subtitle}>从灵感到故事的创作空间</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
});
