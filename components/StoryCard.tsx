import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Story } from '../shared/storyData';
import { countChars, parseChapters, timeAgo } from '../shared/storyData';

interface Props {
  story: Story;
  onPress: (story: Story) => void;
  onRead: (story: Story) => void;
  onDelete: (id: string) => void;
}

export default function StoryCard({ story, onPress, onRead, onDelete }: Props) {
  const charCount = countChars(story.content);
  const pinCount = story.pinnedInspirationIds.length;
  const chapters = parseChapters(story.content).filter(c => c.title);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(story)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{story.title || '未命名故事'}</Text>
        <TouchableOpacity onPress={() => onRead(story)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.cardArrow}>📖</Text>
        </TouchableOpacity>
      </View>

      {story.content ? (
        <Text style={styles.cardContent} numberOfLines={2}>{story.content}</Text>
      ) : (
        <Text style={styles.cardPlaceholder}>还没有内容，点击开始创作</Text>
      )}

      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <Text style={styles.metaText}>{charCount} 字</Text>
          {pinCount > 0 && <Text style={styles.metaText}>📌 {pinCount}</Text>}
          {chapters.length > 0 && <Text style={styles.metaText}>📋 {chapters.length} 章</Text>}
        </View>
        <Text style={styles.timeText}>{timeAgo(story.updatedAt)}</Text>
      </View>

      <View style={styles.cardFooter}>
        {chapters.length > 0 ? (
          <Text style={styles.outlineHint} numberOfLines={1}>
            📋 {chapters[0].title}
          </Text>
        ) : (
          <Text style={styles.noOutline}>暂无章节</Text>
        )}
        <TouchableOpacity onPress={() => onDelete(story.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.deleteText}>删除</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  cardArrow: {
    color: '#C7C7CC',
    fontSize: 24,
    marginLeft: 8,
  },
  cardContent: {
    marginTop: 8,
    fontSize: 15,
    color: '#3A3A3C',
    lineHeight: 22,
  },
  cardPlaceholder: {
    marginTop: 8,
    fontSize: 14,
    color: '#C7C7CC',
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  metaLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  metaText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  timeText: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  outlineHint: {
    flex: 1,
    fontSize: 13,
    color: '#6D6D72',
    marginRight: 8,
  },
  noOutline: {
    fontSize: 13,
    color: '#C7C7CC',
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
});
