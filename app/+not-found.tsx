import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function NotFoundScreen() {
  useEffect(() => {
    // 兜底：如果意外进入 not-found，自动跳回首页
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}
