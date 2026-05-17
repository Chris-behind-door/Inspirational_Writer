import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { InspirationTag, InspirationItem } from '../../shared/types';
import {
  INSPIRATION_STORAGE_KEY,
  FOLDER_STORAGE_KEY,
  DEFAULT_FOLDER,
  ALL_FOLDERS,
  ALL_TAGS,
  TAG_OPTIONS,
} from '../../shared/constants';
import { normalizeFolderName, uniqueFolderNames, createId } from '../../shared/utils';
import { buildSampleFolders, buildSampleItems, normalizeItem } from '../../shared/collectionData';
import CollectionCard from '../../components/CollectionCard';
import FolderSelectorModal from '../../components/FolderSelectorModal';
import FolderCreatorModal from '../../components/FolderCreatorModal';
import InspirationEditor from '../../components/InspirationEditor';

export default function CollectionScreen() {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [folders, setFolders] = useState<string[]>([DEFAULT_FOLDER]);
  const [activeFolder, setActiveFolder] = useState<string>(ALL_FOLDERS);
  const [latestFolder, setLatestFolder] = useState<string>(DEFAULT_FOLDER);
  const [activeTag, setActiveTag] = useState<string>(ALL_TAGS);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [folderCreatorVisible, setFolderCreatorVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editorFolderDropdownOpen, setEditorFolderDropdownOpen] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFolder, setFormFolder] = useState(DEFAULT_FOLDER);
  const [formTags, setFormTags] = useState<InspirationTag[]>([]);

  const persistItems = useCallback(async (updated: InspirationItem[]) => {
    setItems(updated);
    await AsyncStorage.setItem(INSPIRATION_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const persistFolders = useCallback(async (updated: string[]) => {
    const normalized = uniqueFolderNames(updated);
    setFolders(normalized);
    await AsyncStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      Promise.all([
        AsyncStorage.getItem(INSPIRATION_STORAGE_KEY),
        AsyncStorage.getItem(FOLDER_STORAGE_KEY),
      ])
        .then(([rawItems, rawFolders]) => {
          if (cancelled) return;

          let loadedItems: InspirationItem[] = [];
          let shouldWriteItems = false;

          if (!rawItems) {
            loadedItems = buildSampleItems();
            shouldWriteItems = true;
          } else {
            const parsed = JSON.parse(rawItems);
            loadedItems = Array.isArray(parsed) ? parsed.map(normalizeItem) : [];
            shouldWriteItems = JSON.stringify(parsed) !== JSON.stringify(loadedItems);
          }

          let storedFolders: string[] = [];
          if (!rawFolders && !rawItems) {
            storedFolders = buildSampleFolders();
          } else if (rawFolders) {
            const parsedFolders = JSON.parse(rawFolders);
            storedFolders = Array.isArray(parsedFolders)
              ? parsedFolders.map((folder: string) => normalizeFolderName(folder))
              : [];
          }

          const mergedFolders = uniqueFolderNames(storedFolders, loadedItems);

          setItems(loadedItems);
          setFolders(mergedFolders);
          setLatestFolder(prev => (mergedFolders.includes(prev) ? prev : mergedFolders[0]));

          if (shouldWriteItems) {
            AsyncStorage.setItem(INSPIRATION_STORAGE_KEY, JSON.stringify(loadedItems)).catch(() => {});
          }
          if (!rawFolders || JSON.stringify(storedFolders) !== JSON.stringify(mergedFolders)) {
            AsyncStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(mergedFolders)).catch(() => {});
          }
        })
        .catch(() => {
          setItems([]);
          setFolders([DEFAULT_FOLDER]);
        });

      return () => { cancelled = true; };
    }, []),
  );

  useEffect(() => {
    if (activeFolder !== ALL_FOLDERS && !folders.includes(activeFolder)) {
      setActiveFolder(ALL_FOLDERS);
    }
    if (!folders.includes(latestFolder)) {
      setLatestFolder(folders[0] || DEFAULT_FOLDER);
    }
  }, [activeFolder, folders, latestFolder]);

  const filteredItems = items.filter(item => {
    const folderMatched = activeFolder === ALL_FOLDERS || item.folderName === activeFolder;
    const tagMatched = activeTag === ALL_TAGS || item.tags.includes(activeTag as InspirationTag);
    return folderMatched && tagMatched;
  });

  const currentFolderLabel = activeFolder === ALL_FOLDERS ? '全部灵感夹' : activeFolder;

  const getDefaultFormFolder = useCallback(() => {
    if (activeFolder !== ALL_FOLDERS && folders.includes(activeFolder)) return activeFolder;
    if (folders.includes(latestFolder)) return latestFolder;
    return folders[0] || DEFAULT_FOLDER;
  }, [activeFolder, folders, latestFolder]);

  const openCreateEditor = useCallback(() => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormFolder(getDefaultFormFolder());
    setFormTags([]);
    setEditorFolderDropdownOpen(false);
    setEditorVisible(true);
  }, [getDefaultFormFolder]);

  const openEditEditor = useCallback((item: InspirationItem) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormFolder(item.folderName || DEFAULT_FOLDER);
    setFormTags(item.tags || []);
    setEditorFolderDropdownOpen(false);
    setEditorVisible(true);
  }, []);

  const handleCreateFolder = useCallback(async () => {
    const folderName = normalizeFolderName(newFolderName);

    if (!newFolderName.trim()) {
      Alert.alert('请填写灵感夹名称', '例如"三生三世"或"长安夜行"。');
      return;
    }
    if (folders.includes(folderName)) {
      setActiveFolder(folderName);
      setLatestFolder(folderName);
      setNewFolderName('');
      setFolderCreatorVisible(false);
      Alert.alert('灵感夹已存在', `已切换到"${folderName}"。`);
      return;
    }

    const updatedFolders = [...folders, folderName];
    await persistFolders(updatedFolders);
    setActiveFolder(folderName);
    setLatestFolder(folderName);
    setNewFolderName('');
    setFolderCreatorVisible(false);
  }, [folders, newFolderName, persistFolders]);

  const handleDeleteFolder = useCallback((folderName: string) => {
    const count = items.filter(item => item.folderName === folderName).length;
    const message = count > 0
      ? `确定要删除"${folderName}"吗？其中 ${count} 条灵感也会一起删除。`
      : `确定要删除空灵感夹"${folderName}"吗？`;

    Alert.alert('删除灵感夹', message, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const updatedItems = items.filter(item => item.folderName !== folderName);
          const remainingFolders = folders.filter(folder => folder !== folderName);
          const normalizedFolders = remainingFolders.length > 0 ? remainingFolders : [DEFAULT_FOLDER];
          const nextLatestFolder = normalizedFolders[0] || DEFAULT_FOLDER;

          await persistItems(updatedItems);
          await persistFolders(normalizedFolders);

          if (activeFolder === folderName) setActiveFolder(ALL_FOLDERS);
          if (latestFolder === folderName) setLatestFolder(nextLatestFolder);
          if (formFolder === folderName) setFormFolder(nextLatestFolder);
          setEditorFolderDropdownOpen(false);
        },
      },
    ]);
  }, [activeFolder, folders, formFolder, items, latestFolder, persistFolders, persistItems]);

  const handleSave = useCallback(async () => {
    const title = formTitle.trim();
    const content = formContent.trim();
    const folderName = normalizeFolderName(formFolder);

    if (!title) { Alert.alert('请填写标题', '标题可以是灵感的关键词，例如"雨夜狐妖"。'); return; }
    if (!content) { Alert.alert('请填写内容', '正文可以记录具体设定、片段或灵感来源。'); return; }
    if (!folders.includes(folderName)) { Alert.alert('请选择灵感夹', '请先在右上角 + 按钮中新建灵感夹，再为灵感选择所属灵感夹。'); return; }

    if (editingId) {
      const updated = items.map(item => {
        if (item.id !== editingId) return item;
        return { ...item, title, content, folderName, tags: formTags, prompt: title, result: content, updatedAt: Date.now() };
      });
      await persistItems(updated);
    } else {
      const createdAt = Date.now();
      const newItem: InspirationItem = {
        id: createId(), type: '手动灵感', prompt: title, result: content,
        createdAt, title, content, folderName, tags: formTags,
      };
      await persistItems([newItem, ...items]);
      setActiveFolder(folderName);
    }

    setLatestFolder(folderName);
    setEditorFolderDropdownOpen(false);
    setEditorVisible(false);
  }, [editingId, folders, formTitle, formContent, formFolder, formTags, items, persistItems]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('删除确认', '确定要删除这条灵感记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const updated = items.filter(item => item.id !== id);
          await persistItems(updated);
          if (editingId === id) {
            setEditorFolderDropdownOpen(false);
            setEditorVisible(false);
            setEditingId(null);
          }
        },
      },
    ]);
  }, [editingId, items, persistItems]);

  const handleImportSamples = useCallback(async () => {
    const samples = buildSampleItems();
    const sampleIds = new Set(samples.map(item => item.id));
    const nonSampleItems = items.filter(item => !sampleIds.has(item.id));
    const mergedFolders = uniqueFolderNames([...buildSampleFolders(), ...folders], [...samples, ...nonSampleItems]);

    await persistItems([...samples, ...nonSampleItems]);
    await persistFolders(mergedFolders);
    setActiveFolder(ALL_FOLDERS);
    setActiveTag(ALL_TAGS);
    setLatestFolder(buildSampleFolders()[0]);
    Alert.alert('导入成功', `已导入/刷新 ${samples.length} 条测试灵感，并保留空灵感夹"空白新坑"。`);
  }, [folders, items, persistFolders, persistItems]);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.subtitle}>共 {filteredItems.length} 条 / 总计 {items.length} 条</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.folderButton} onPress={() => setFolderModalVisible(true)}>
            <Text style={styles.folderButtonText} numberOfLines={1}>{currentFolderLabel}</Text>
            <Text style={styles.folderArrow}>⌵</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addFolderButton} onPress={() => setFolderCreatorVisible(true)}>
            <Text style={styles.addFolderButtonText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll} contentContainerStyle={styles.tagBarContent}>
        <TouchableOpacity
          style={[styles.tagChip, activeTag === ALL_TAGS && styles.tagChipActive]}
          onPress={() => setActiveTag(ALL_TAGS)}
        >
          <Text style={[styles.tagChipText, activeTag === ALL_TAGS && styles.tagChipTextActive]}>全部</Text>
        </TouchableOpacity>
        {TAG_OPTIONS.map(tag => {
          const selected = activeTag === tag.key;
          return (
            <TouchableOpacity
              key={tag.key}
              style={[styles.tagChip, selected && styles.tagChipActive]}
              onPress={() => setActiveTag(tag.key)}
            >
              <Text style={[styles.tagChipText, selected && styles.tagChipTextActive]}>
                {tag.icon} {tag.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.createButton} onPress={openCreateEditor}>
            <Text style={styles.createButtonText}>＋ 新建灵感</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sampleButton} onPress={handleImportSamples}>
            <Text style={styles.sampleButtonText}>导入测试数据</Text>
          </TouchableOpacity>
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📌</Text>
            <Text style={styles.emptyTitle}>暂无符合条件的灵感</Text>
            <Text style={styles.emptyHint}>可以切换灵感夹或 tag，也可以手动新建一条记录。</Text>
          </View>
        ) : (
          filteredItems.map(item => (
            <CollectionCard
              key={item.id}
              item={item}
              onPress={openEditEditor}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>

      <FolderSelectorModal
        visible={folderModalVisible}
        folders={folders}
        activeFolder={activeFolder}
        items={items}
        onSelect={folder => { setActiveFolder(folder); if (folder !== ALL_FOLDERS) setLatestFolder(folder); setFolderModalVisible(false); }}
        onDeleteFolder={handleDeleteFolder}
        onClose={() => setFolderModalVisible(false)}
      />

      <FolderCreatorModal
        visible={folderCreatorVisible}
        newFolderName={newFolderName}
        onChangeName={setNewFolderName}
        onCreate={handleCreateFolder}
        onClose={() => setFolderCreatorVisible(false)}
      />

      <InspirationEditor
        visible={editorVisible}
        editingId={editingId}
        formTitle={formTitle}
        formContent={formContent}
        formFolder={formFolder}
        formTags={formTags}
        folders={folders}
        folderDropdownOpen={editorFolderDropdownOpen}
        onChangeTitle={setFormTitle}
        onChangeContent={setFormContent}
        onSelectFolder={folder => { setFormFolder(folder); setLatestFolder(folder); setEditorFolderDropdownOpen(false); }}
        onToggleFolderDropdown={() => setEditorFolderDropdownOpen(prev => !prev)}
        onToggleTag={tag => setFormTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => { setEditorFolderDropdownOpen(false); setEditorVisible(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    paddingTop: 8, paddingHorizontal: 16, paddingBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10,
  },
  headerTitleBlock: { flex: 1 },
  subtitle: { marginTop: 0, fontSize: 13, color: '#6D6D72' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  folderButton: {
    maxWidth: 148, backgroundColor: '#FFFFFF', borderRadius: 18,
    paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center',
  },
  folderButtonText: { flexShrink: 1, color: '#007AFF', fontSize: 14, fontWeight: '600' },
  folderArrow: { color: '#007AFF', fontSize: 15, lineHeight: 16, marginLeft: 4, marginTop: -1 },
  addFolderButton: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center',
  },
  addFolderButtonText: { color: '#FFFFFF', fontSize: 22, fontWeight: '600', lineHeight: 26 },
  tagScroll: { flexGrow: 0 },
  tagBarContent: { paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: 'center' },
  tagChip: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 9, paddingVertical: 7 },
  tagChipActive: { backgroundColor: '#007AFF' },
  tagChipText: { color: '#007AFF', fontSize: 13, fontWeight: '600' },
  tagChipTextActive: { color: '#FFFFFF' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  createButton: { flex: 1, backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  sampleButton: {
    backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center',
  },
  sampleButtonText: { color: '#007AFF', fontSize: 14, fontWeight: '700' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 28, alignItems: 'center' },
  emptyIcon: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#6D6D72', textAlign: 'center', lineHeight: 20 },
});
