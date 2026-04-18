import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function InspireScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>✨ 灵感捕捉</Text>
      <Text style={styles.subtitle}>AI 生成灵感卡片</Text>
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
