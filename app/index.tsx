import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function Index() {
  useEffect(() => {
    router.replace('/(tabs)');
  }, []);

  return <View />;
}
