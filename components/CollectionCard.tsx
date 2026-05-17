import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { InspirationItem } from '../shared/types';
import { formatTime } from '../shared/utils';
import { getTagLabel } from '../shared/collectionData';

interface Props {
  item: InspirationItem;
  onPress: (item: InspirationItem) => void;
  onDelete: (id: string) => void;
}

export default function CollectionCard({ item, onPress, onDelete }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardArrow}>›</Text>
      </View>

      <Text style={styles.cardContent} numberOfLines={3}>{item.content}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.folderLabel} numberOfLines={1}>📁 {item.folderName}</Text>
        <Text style={styles.timeText}>{formatTime(item.updatedAt || item.createdAt)}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.cardTags}>
          {item.tags.length > 0 ? item.tags.map(tag => (
            <View key={tag} style={styles.smallTag}>
              <Text style={styles.smallTagText}>{getTagLabel(tag)}</Text>
            </View>
          )) : (
            <Text style={styles.noTagText}>未标记</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => onDelete(item.id)}>
          <Text style={styles.deleteText}>删除</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  folderLabel: {
    flex: 1,
    fontSize: 13,
    color: '#6D6D72',
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cardTags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smallTag: {
    backgroundColor: '#E8F0FE',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  smallTagText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noTagText: {
    color: '#C7C7CC',
    fontSize: 12,
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
});
