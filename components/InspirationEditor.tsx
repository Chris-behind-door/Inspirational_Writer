import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { InspirationTag } from '../shared/types';
import { TAG_OPTIONS } from '../shared/constants';

interface Props {
  visible: boolean;
  editingId: string | null;
  formTitle: string;
  formContent: string;
  formFolder: string;
  formTags: InspirationTag[];
  folders: string[];
  folderDropdownOpen: boolean;
  onChangeTitle: (text: string) => void;
  onChangeContent: (text: string) => void;
  onSelectFolder: (folder: string) => void;
  onToggleFolderDropdown: () => void;
  onToggleTag: (tag: InspirationTag) => void;
  onSave: () => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function InspirationEditor({
  visible,
  editingId,
  formTitle,
  formContent,
  formFolder,
  formTags,
  folders,
  folderDropdownOpen,
  onChangeTitle,
  onChangeContent,
  onSelectFolder,
  onToggleFolderDropdown,
  onToggleTag,
  onSave,
  onDelete,
  onClose,
}: Props) {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.editorMask}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.editorPanel}>
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.editorTitle}>{editingId ? '编辑灵感' : '新建灵感'}</Text>
            <TouchableOpacity onPress={onSave}>
              <Text style={styles.saveText}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.inputLabel}>所属灵感夹</Text>
            <TouchableOpacity
              style={[styles.selectInput, folderDropdownOpen && styles.selectInputActive]}
              onPress={onToggleFolderDropdown}
            >
              <Text style={styles.selectInputText} numberOfLines={1}>{formFolder}</Text>
              <Text style={styles.selectInputArrow}>{folderDropdownOpen ? '⌃' : '⌵'}</Text>
            </TouchableOpacity>
            {folderDropdownOpen && (
              <View style={styles.inlineFolderPicker}>
                {folders.map(folder => (
                  <TouchableOpacity
                    key={folder}
                    style={styles.inlineFolderOption}
                    onPress={() => onSelectFolder(folder)}
                  >
                    <Text style={styles.inlineFolderOptionText} numberOfLines={1}>{folder}</Text>
                    {formFolder === folder && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                ))}
                <Text style={styles.inlineFolderHint}>如需新的灵感夹，请先退出编辑弹窗，通过页面右上角"+"创建。</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>标题</Text>
            <TextInput
              style={styles.input}
              value={formTitle}
              onChangeText={onChangeTitle}
              placeholder="例如：雨夜狐妖"
              placeholderTextColor="#C7C7CC"
            />

            <Text style={styles.inputLabel}>Tag</Text>
            <View style={styles.editorTagRow}>
              {TAG_OPTIONS.map(tag => {
                const selected = formTags.includes(tag.key);
                return (
                  <TouchableOpacity
                    key={tag.key}
                    style={[styles.editorTag, selected && styles.editorTagActive]}
                    onPress={() => onToggleTag(tag.key)}
                  >
                    <Text style={[styles.editorTagText, selected && styles.editorTagTextActive]}>
                      {selected ? '✓ ' : ''}{tag.icon} {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>正文</Text>
            <TextInput
              style={[styles.input, styles.contentInput]}
              value={formContent}
              onChangeText={onChangeContent}
              placeholder="记录角色、情节转折、世界观设定或对话片段……"
              placeholderTextColor="#C7C7CC"
              multiline
              textAlignVertical="top"
            />

            {editingId && onDelete && (
              <TouchableOpacity style={styles.modalDeleteButton} onPress={() => onDelete(editingId)}>
                <Text style={styles.modalDeleteText}>删除这条灵感</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  editorMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },
  editorPanel: {
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  editorHeader: {
    height: 52,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  cancelText: {
    color: '#6D6D72',
    fontSize: 16,
  },
  editorTitle: {
    color: '#000',
    fontSize: 17,
    fontWeight: '700',
  },
  saveText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
  },
  editorContent: {
    padding: 16,
    paddingBottom: 36,
  },
  inputLabel: {
    fontSize: 13,
    color: '#6D6D72',
    marginLeft: 4,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  selectInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    flex: 1,
    color: '#000',
    fontSize: 16,
  },
  selectInputArrow: {
    color: '#8E8E93',
    fontSize: 15,
    lineHeight: 16,
    marginLeft: 8,
    marginTop: -1,
  },
  selectInputActive: {
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  inlineFolderPicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  inlineFolderOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  inlineFolderOptionText: {
    flex: 1,
    color: '#000',
    fontSize: 16,
  },
  checkMark: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  inlineFolderHint: {
    color: '#8E8E93',
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contentInput: {
    minHeight: 180,
    lineHeight: 22,
  },
  editorTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editorTag: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  editorTagActive: {
    backgroundColor: '#E8F0FE',
    borderColor: '#007AFF',
  },
  editorTagText: {
    color: '#3A3A3C',
    fontSize: 14,
    fontWeight: '600',
  },
  editorTagTextActive: {
    color: '#007AFF',
  },
  modalDeleteButton: {
    marginTop: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDeleteText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});
