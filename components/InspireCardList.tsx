import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getPreset } from '../shared/inspirePresets';
import type { InspirationCard } from '../shared/parseCards';

interface Props {
  cards: InspirationCard[];
  generating: boolean;
  hasConfig: boolean;
  error: string | null;
  onCardPress: (card: InspirationCard) => void;
}

export default function InspireCardList({ cards, generating, hasConfig, error, onCardPress }: Props) {
  const renderCard = useCallback(({ item }: { item: InspirationCard }) => {
    const preset = getPreset(item.type);
    return (
      <TouchableOpacity
        style={styles.inspirationCard}
        activeOpacity={0.88}
        onPress={() => onCardPress(item)}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTag}>{preset.tagLabel}</Text>
          <Text style={[styles.captureState, item.captured && styles.captureStateDone]}>
            {item.captured ? '已捕捉' : '可捕捉'}
          </Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardContent} numberOfLines={4}>{item.content}</Text>
      </TouchableOpacity>
    );
  }, [onCardPress]);

  return (
    <View style={styles.resultsArea}>
      <View style={styles.header}>
        <Text style={styles.pageSubtitle}>生成多张灵感卡片，点开后可捕捉到灵感夹。</Text>
        {generating && <ActivityIndicator color="#007AFF" />}
      </View>

      {!hasConfig && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>⚙️ 尚未配置 API。点击生成时会使用本地备用灵感，正式生成请到设置页配置 API。</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {cards.length === 0 ? (
        <View style={styles.emptyResult}>
          <Text style={styles.emptyResultIcon}>✨</Text>
          <Text style={styles.emptyResultTitle}>还没有生成灵感</Text>
          <Text style={styles.emptyResultHint}>在底部选择类型，补充一点方向，然后点击生成。</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={styles.cardRow}
          contentContainerStyle={styles.cardList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  resultsArea: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pageSubtitle: {
    maxWidth: 320,
    fontSize: 14,
    color: '#6D6D72',
    lineHeight: 20,
  },
  warningCard: {
    backgroundColor: '#FFF9E8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 13,
    color: '#8A5A00',
    lineHeight: 19,
  },
  errorCard: {
    backgroundColor: '#FFF3F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    lineHeight: 19,
  },
  emptyResult: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  emptyResultIcon: {
    fontSize: 46,
    marginBottom: 12,
  },
  emptyResultTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  emptyResultHint: {
    fontSize: 14,
    color: '#6D6D72',
    textAlign: 'center',
  },
  cardList: {
    paddingBottom: 10,
  },
  cardRow: {
    gap: 10,
    marginBottom: 10,
  },
  inspirationCard: {
    flex: 1,
    minHeight: 152,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 13,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTag: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#E8F0FE',
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  captureState: {
    fontSize: 11,
    color: '#8E8E93',
  },
  captureStateDone: {
    color: '#34C759',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    lineHeight: 21,
    marginBottom: 7,
  },
  cardContent: {
    fontSize: 13,
    color: '#3A3A3C',
    lineHeight: 20,
  },
});
