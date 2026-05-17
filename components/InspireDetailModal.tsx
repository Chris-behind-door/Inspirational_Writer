import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getPreset } from '../shared/inspirePresets';
import type { InspirationCard } from '../shared/parseCards';

interface Props {
  card: InspirationCard | null;
  onClose: () => void;
  onCapture: (card: InspirationCard) => void;
}

export default function InspireDetailModal({ card, onClose, onCapture }: Props) {
  return (
    <Modal
      visible={!!card}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.detailModal}>
          {card && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.modalCancel}>关闭</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onCapture(card)}>
                  <Text style={styles.modalCapture}>{card.captured ? '再次捕捉' : '捕捉'}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.detailTag}>{getPreset(card.type).tagLabel}</Text>
                <Text style={styles.detailTitle}>{card.title}</Text>
                <Text style={styles.detailContent}>{card.content}</Text>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  detailModal: {
    width: '100%',
    maxHeight: '78%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  modalHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalCancel: {
    color: '#6D6D72',
    fontSize: 16,
  },
  modalCapture: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
  },
  detailTag: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#E8F0FE',
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 31,
    marginBottom: 14,
  },
  detailContent: {
    fontSize: 17,
    color: '#1C1C1E',
    lineHeight: 28,
  },
});
