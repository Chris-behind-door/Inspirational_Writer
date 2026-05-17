import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  visible: boolean;
  newFolderName: string;
  onChangeName: (text: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export default function FolderCreatorModal({ visible, newFolderName, onChangeName, onCreate, onClose }: Props) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.centerModalMask}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={styles.createFolderPanel}>
          <Text style={styles.createFolderTitle}>新建灵感夹</Text>
          <TextInput
            style={styles.input}
            value={newFolderName}
            onChangeText={onChangeName}
            placeholder="例如：三生三世"
            placeholderTextColor="#C7C7CC"
            autoFocus
          />
          <View style={styles.createFolderActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={onCreate}>
              <Text style={styles.primaryButtonText}>创建</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centerModalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  createFolderPanel: {
    width: '100%',
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 16,
  },
  createFolderTitle: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  createFolderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: '#6D6D72',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
