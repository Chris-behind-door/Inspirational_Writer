import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { InspirationItem } from '../../shared/types';
import { INSPIRATION_STORAGE_KEY } from '../../shared/constants';
import { createId } from '../../shared/utils';
import type { Story } from '../../shared/storyData';
import { STORY_STORAGE_KEY, buildSampleStories } from '../../shared/storyData';
import StoryCard from '../../components/StoryCard';
import StoryEditor from '../../components/StoryEditor';

export default function StoryScreen() {
  const [stories, setStories] = useState<Story[]>([]);
  const [inspirations, setInspirations] = useState<InspirationItem[]>([]);
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  // ── Load data ───────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        AsyncStorage.getItem(STORY_STORAGE_KEY),
        AsyncStorage.getItem(INSPIRATION_STORAGE_KEY),
      ]).then(([rawStories, rawInspirations]) => {
        if (cancelled) return;

        let loadedStories: Story[] = [];
        if (!rawStories) {
          loadedStories = buildSampleStories();
          AsyncStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(loadedStories)).catch(() => {});
        } else {
          try {
            loadedStories = JSON.parse(rawStories);
          } catch {
            loadedStories = [];
          }
        }

        let loadedInspirations: InspirationItem[] = [];
        if (rawInspirations) {
          try {
            loadedInspirations = JSON.parse(rawInspirations);
          } catch {
            loadedInspirations = [];
          }
        }

        setStories(loadedStories);
        setInspirations(loadedInspirations);
      });

      return () => { cancelled = true; };
    }, []),
  );

  // ── Persist ─────────────────────────────────────────────
  const persistStories = useCallback(async (updated: Story[]) => {
    setStories(updated);
    await AsyncStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  // ── CRUD ────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    const now = Date.now();
    const newStory: Story = {
      id: createId('story'),
      title: '',
      content: '',
      outline: [],
      pinnedInspirationIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await persistStories([newStory, ...stories]);
    setEditingStory(newStory);
  }, [stories, persistStories]);

  const handleOpen = useCallback((story: Story) => {
    setEditingStory(story);
  }, []);

  const handleSave = useCallback(
    async (updated: Story) => {
      const list = stories.map(s => (s.id === updated.id ? updated : s));
      await persistStories(list);
      setEditingStory(updated);
    },
    [stories, persistStories],
  );

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('删除故事', '确定要删除这个故事吗？内容无法恢复。', [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            const list = stories.filter(s => s.id !== id);
            await persistStories(list);
          },
        },
      ]);
    },
    [stories, persistStories],
  );

  const handleCloseEditor = useCallback(() => {
    setEditingStory(null);
  }, []);

  // ── Editor mode ─────────────────────────────────────────
  if (editingStory) {
    return (
      <StoryEditor
        story={editingStory}
        inspirations={inspirations}
        onClose={handleCloseEditor}
        onSave={handleSave}
      />
    );
  }

  // ── List mode ───────────────────────────────────────────
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📝 故事管理</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Text style={styles.createBtnText}>＋ 新建故事</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>从灵感到故事的创作空间</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {stories.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyTitle}>还没有故事</Text>
            <Text style={styles.emptyHint}>点击右上角「新建故事」开始创作</Text>
          </View>
        ) : (
          stories.map(story => (
            <StoryCard
              key={story.id}
              story={story}
              onPress={handleOpen}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1C1C1E' },
  createBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 14, color: '#8E8E93', paddingHorizontal: 16, paddingBottom: 12 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginBottom: 6 },
  emptyHint: { fontSize: 14, color: '#8E8E93' },
});
