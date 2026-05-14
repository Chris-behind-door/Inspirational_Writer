import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';

const INSPIRATION_STORAGE_KEY = '@inhunt/inspirations';

interface InspirationItem {
  id: string;
  type: string;
  prompt: string;
  result: string;
  createdAt: number;
}

export default function CollectionScreen() {
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(INSPIRATION_STORAGE_KEY).then(raw => {
        setItems(raw ? JSON.parse(raw) : []);
      });
    }, [])
  );

  const handleDelete = useCallback((id: string) => {
    Alert.alert('删除确认', '确定要删除这条灵感记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const updated = items.filter(i => i.id !== id);
          setItems(updated);
          await AsyncStorage.setItem(INSPIRATION_STORAGE_KEY, JSON.stringify(updated));
        },
      },
    ]);
  }, [items]);

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📌</Text>
        <Text style={styles.emptyTitle}>暂无灵感记录</Text>
        <Text style={styles.emptyHint}>去「灵感捕捉」页面，让 AI 为你生成创意灵感吧 ✨</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>共 {items.length} 条灵感</Text>
      {items.map(item => {
        const isExpanded = expandedId === item.id;
        return (
          <View key={item.id} style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setExpandedId(isExpanded ? null : item.id)}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.badgeRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.type}</Text>
                  </View>
                </View>
                <Text style={styles.promptLabel} numberOfLines={1}>
                  {item.prompt}
                </Text>
              </View>
              <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.cardBody}>
                <Markdown style={markdownStyles(width)}>{item.result}</Markdown>
                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>
                    {new Date(item.createdAt).toLocaleString('zh-CN')}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Text style={styles.deleteText}>删除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}
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
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 15,
    color: '#6D6D72',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: '#E8F0FE',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  promptLabel: {
    fontSize: 15,
    color: '#6D6D72',
    marginTop: 4,
  },
  expandIcon: {
    fontSize: 14,
    color: '#C7C7CC',
    marginLeft: 8,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  dateText: {
    fontSize: 13,
    color: '#C7C7CC',
  },
  deleteText: {
    fontSize: 15,
    color: '#FF3B30',
  },
});

function markdownStyles(containerWidth: number) {
  return {
    body: { color: '#000', fontSize: 16, lineHeight: 26 },
    heading1: { fontSize: 22, fontWeight: '700' as const, color: '#000', marginVertical: 8 },
    heading2: { fontSize: 20, fontWeight: '700' as const, color: '#000', marginVertical: 6 },
    heading3: { fontSize: 18, fontWeight: '600' as const, color: '#000', marginVertical: 6 },
    heading4: { fontSize: 16, fontWeight: '600' as const, color: '#333', marginVertical: 4 },
    strong: { fontWeight: '700' as const },
    em: { fontStyle: 'italic' as const },
    blockquote: {
      backgroundColor: '#F0F6FF',
      borderLeftWidth: 4,
      borderLeftColor: '#007AFF',
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginVertical: 8,
    },
    code_inline: {
      backgroundColor: '#F2F2F7',
      color: '#FF3B30',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
    },
    fence: {
      backgroundColor: '#F2F2F7',
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    hr: { backgroundColor: '#E0E0E0', height: 1, marginVertical: 12 },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { marginVertical: 2 },
  };
}
