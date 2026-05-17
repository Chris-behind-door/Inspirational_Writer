import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { InspirationItem } from '../shared/types';
import { ALL_FOLDERS } from '../shared/constants';

interface Props {
  visible: boolean;
  folders: string[];
  activeFolder: string;
  items: InspirationItem[];
  onSelect: (folder: string) => void;
  onDeleteFolder: (folder: string) => void;
  onClose: () => void;
}

export default function FolderSelectorModal({
  visible,
  folders,
  activeFolder,
  items,
  onSelect,
  onDeleteFolder,
  onClose,
}: Props) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalMask}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={styles.folderPanel}>
          <Text style={styles.modalTitle}>选择灵感夹</Text>

          <TouchableOpacity style={styles.folderOption} onPress={() => onSelect(ALL_FOLDERS)}>
            <Text style={styles.folderOptionText}>全部灵感夹</Text>
            {activeFolder === ALL_FOLDERS && <Text style={styles.checkMark}>✓</Text>}
          </TouchableOpacity>

          {folders.map(folder => {
            const folderCount = items.filter(item => item.folderName === folder).length;
            return (
              <View key={folder} style={styles.folderManageRow}>
                <TouchableOpacity style={styles.folderSelectArea} onPress={() => onSelect(folder)}>
                  <Text style={styles.folderOptionText} numberOfLines={1}>{folder}</Text>
                  <Text style={styles.folderCountText}>{folderCount}</Text>
                  {activeFolder === folder && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.folderDeleteButton} onPress={() => onDeleteFolder(folder)}>
                  <Text style={styles.folderDeleteText}>删除</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={styles.folderHint}>右上角"+"可以新建空灵感夹；删除灵感夹会同时删除其中的灵感。</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80,
    paddingRight: 16,
  },
  folderPanel: {
    width: 292,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
  },
  modalTitle: {
    fontSize: 13,
    color: '#6D6D72',
    marginBottom: 4,
    marginLeft: 6,
  },
  folderOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  folderManageRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  folderSelectArea: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  folderOptionText: {
    flex: 1,
    color: '#000',
    fontSize: 16,
  },
  folderCountText: {
    color: '#8E8E93',
    fontSize: 13,
    marginHorizontal: 8,
  },
  checkMark: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  folderDeleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  folderDeleteText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  folderHint: {
    color: '#8E8E93',
    fontSize: 12,
    lineHeight: 17,
    margin: 8,
  },
});
