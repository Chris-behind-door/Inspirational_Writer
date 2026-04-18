import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { getActivePreset, loadPresets } from '../../configStore';

export default function SettingsScreen() {
  const router = useRouter();

  const handleShowConfig = useCallback(async () => {
    await loadPresets();
    const active = getActivePreset();
    if (!active) {
      Alert.alert('当前配置', '暂无已应用的预设。');
      return;
    }
    const maskedKey = active.apiKey.length > 4 ? active.apiKey.slice(0, 4) + '***' : '***';
    Alert.alert('当前配置', `📋 ${active.name}\n  URL: ${active.baseUrl}\n  模型: ${active.modelName}\n  Key: ${maskedKey}`);
  }, []);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {/* AI 配置分组 */}
      <Text style={styles.sectionTitle}>AI 配置</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/api-config' as any)}>
          <Text style={styles.navLabel}>API 配置</Text>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/model-settings' as any)}>
          <Text style={styles.navLabel}>模型参数</Text>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.separator} />
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/preferences' as any)}>
          <Text style={styles.navLabel}>偏好设置</Text>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 调试分组 */}
      <Text style={styles.sectionTitle}>调试</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.navItem} onPress={handleShowConfig}>
          <Text style={styles.navLabel}>查看当前配置</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navLabel: {
    fontSize: 17,
    color: '#000000',
  },
  navArrow: {
    fontSize: 20,
    color: '#C7C7CC',
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginLeft: 16,
  },
});
