import React from 'react';
import { Keyboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { InspirationCard } from '../shared/parseCards';

interface Props {
  card: InspirationCard | null;
  folders: string[];
  captureFolder: string;
  newFolderName: string;
  onChangeNewFolderName: (text: string) => void;
  onSelectFolder: (folder: string) => void;
  onCapture: () => void;
  onClose: () => void;
}

export default function CaptureModal({
  card,
  folders,
  captureFolder,
  newFolderName,
  onChangeNewFolderName,
  onSelectFolder,
  onCapture,
  onClose,
}: Props) {
  return (
    <Modal
      visible={!!card}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.captureModal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.captureTitle}>选择灵感夹</Text>
            <TouchableOpacity onPress={onCapture}>
              <Text style={styles.modalCapture}>添加</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.folderList} keyboardShouldPersistTaps="handled">
            {folders.map(folder => (
              <TouchableOpacity
                key={folder}
                style={styles.folderRow}
                onPress={() => onSelectFolder(folder)}
              >
                <Text style={styles.folderName}>{folder}</Text>
                <Text style={styles.folderCheck}>
                  {captureFolder === folder && !newFolderName.trim() ? '✓' : ''}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.newFolderBox}>
              <Text style={styles.newFolderLabel}>新建灵感夹并添加</Text>
              <TextInput
                style={styles.newFolderInput}
                value={newFolderName}
                onChangeText={onChangeNewFolderName}
                placeholder="例如：三生三世"
                placeholderTextColor="#C7C7CC"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                blurOnSubmit={true}
              />
            </View>
          </ScrollView>
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
  captureModal: {
    width: '100%',
    maxHeight: '76%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
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
  captureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  modalCapture: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
  },
  folderList: {
    maxHeight: 420,
  },
  folderRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  folderName: {
    fontSize: 16,
    color: '#000000',
  },
  folderCheck: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '700',
  },
  newFolderBox: {
    marginTop: 14,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
  },
  newFolderLabel: {
    fontSize: 13,
    color: '#6D6D72',
    marginBottom: 8,
  },
  newFolderInput: {
    minHeight: 40,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
});
