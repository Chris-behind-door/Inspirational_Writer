import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Markdown from 'react-native-markdown-package';

const INSPIRATION_STORAGE_KEY = '@inhunt/inspirations';

interface InspirationItem {
  id: string;
  type: string;
  prompt: string;
  result: string;
  createdAt: number;
}

export default function CollectionScreen() {
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
                <Markdown styles={markdownStyles}>{item.result}</Markdown>
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

const markdownStyles = {
  text: { color: '#000', fontSize: 16, lineHeight: 26 },
  heading1: { fontSize: 22, fontWeight: '700', color: '#000' },
  heading2: { fontSize: 20, fontWeight: '700', color: '#000' },
  heading3: { fontSize: 18, fontWeight: '600', color: '#000' },
  heading4: { fontSize: 16, fontWeight: '600', color: '#333' },
  heading: { fontWeight: '600' },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  paragraph: { marginTop: 6, marginBottom: 6 },
  blockQuoteSection: { marginVertical: 8 },
  blockQuoteSectionBar: { width: 4, backgroundColor: '#007AFF', marginRight: 12 },
  blockQuoteText: { color: '#333' },
  inlineCode: { backgroundColor: '#F2F2F7', color: '#FF3B30', borderRadius: 4 },
  codeBlock: { backgroundColor: '#F2F2F7', borderRadius: 8 },
  hr: { backgroundColor: '#E0E0E0', height: 1, marginVertical: 12 },
  list: { marginVertical: 4 },
  listItem: { marginVertical: 2 },
};
