import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const INSPIRATION_STORAGE_KEY = '@inhunt/inspirations';
const FOLDER_STORAGE_KEY = '@inhunt/inspirationFolders';
const DEFAULT_FOLDER = '默认灵感夹';
const ALL_FOLDERS = '__all_folders__';
const ALL_TAGS = '__all_tags__';

type InspirationTag = 'role' | 'plot' | 'world' | 'dialogue';

interface InspirationItem {
  id: string;
  type: string;
  prompt: string;
  result: string;
  createdAt: number;
  title: string;
  content: string;
  folderName: string;
  tags: InspirationTag[];
  updatedAt?: number;
}

const TAG_OPTIONS: { key: InspirationTag; label: string; icon: string }[] = [
  { key: 'role', label: '角色', icon: '👤' },
  { key: 'plot', label: '情节', icon: '🧩' },
  { key: 'world', label: '世界观', icon: '🌍' },
  { key: 'dialogue', label: '对话', icon: '💬' },
];

function buildSampleFolders(): string[] {
  // “空白新坑”用于测试：允许空灵感夹存在。
  return ['三生三世', '长安夜行', '星海遗民', '空白新坑'];
}

// 开发测试数据：Tab1 暂时不能收藏时，Tab2 可以先用这些数据验证筛选、编辑、删除等功能。
// 后续正式接入 Tab1 后，可以删掉 buildSampleItems、buildSampleFolders 和“导入测试数据”的按钮。
function buildSampleItems(): InspirationItem[] {
  const now = Date.now();
  return [
    {
      id: 'sample-sansheng-fox',
      type: 'AI 生成灵感',
      prompt: '狐狸相关灵感',
      result: '一只修炼千年的白狐被封存在青丘旧梦之中，只有在月圆之夜才会想起自己曾经守护过一座天宫。',
      createdAt: now - 1000 * 60 * 12,
      title: '白狐与青丘旧梦',
      content: '一只修炼千年的白狐被封存在青丘旧梦之中，只有在月圆之夜才会想起自己曾经守护过一座天宫。她表面玩世不恭，实际上一直在寻找三生石上被抹去的名字。',
      folderName: '三生三世',
      tags: ['role', 'world'],
    },
    {
      id: 'sample-sansheng-peach-forest',
      type: 'AI 生成灵感',
      prompt: '前世线索灵感',
      result: '十里桃林深处有一口不会倒映人影的古井，传说能照出前世欠下的情债。',
      createdAt: now - 1000 * 60 * 28,
      title: '不会倒映人影的古井',
      content: '十里桃林深处有一口不会倒映人影的古井，传说能照出前世欠下的情债。女主每次靠近古井，都会听见一个陌生人叫她的旧名；这条线索最终会牵出三百年前的一场替嫁。',
      folderName: '三生三世',
      tags: ['world', 'plot'],
    },
    {
      id: 'sample-sansheng-dialogue',
      type: 'AI 生成灵感',
      prompt: '诀别对白灵感',
      result: '“你不是忘了我，你只是终于学会了不再等我。”',
      createdAt: now - 1000 * 60 * 36,
      title: '月下诀别的半句对白',
      content: '“你不是忘了我，你只是终于学会了不再等我。”这句话可以安排在男女主第三世重逢时出现：说话的人看似决绝，其实是在试探对方是否还记得第一世的约定。',
      folderName: '三生三世',
      tags: ['dialogue', 'plot'],
    },
    {
      id: 'sample-changan-night-market',
      type: 'AI 生成灵感',
      prompt: '长安夜市',
      result: '长安宵禁后仍有一条只对亡魂开放的夜市，卖的不是货物，而是生前没有说出口的话。',
      createdAt: now - 1000 * 60 * 45,
      title: '只对亡魂开放的夜市',
      content: '长安宵禁后仍有一条只对亡魂开放的夜市，卖的不是货物，而是生前没有说出口的话。男主作为巡夜人，发现自己母亲的遗言正在夜市中被反复转卖。',
      folderName: '长安夜行',
      tags: ['world', 'plot'],
    },
    {
      id: 'sample-changan-assassin',
      type: 'AI 生成灵感',
      prompt: '刺客角色',
      result: '一名刺客每次杀人前都会认真为目标写一篇悼词，因为他相信文字比刀更接近真相。',
      createdAt: now - 1000 * 60 * 73,
      title: '写悼词的刺客',
      content: '一名刺客每次杀人前都会认真为目标写一篇悼词，因为他相信文字比刀更接近真相。后来他接到新任务，要刺杀一位从未在史书中留下姓名的公主。',
      folderName: '长安夜行',
      tags: ['role', 'plot'],
    },
    {
      id: 'sample-starsea-archive',
      type: 'AI 生成灵感',
      prompt: '星际世界观',
      result: '人类文明把所有记忆上传到星海档案馆，却发现档案馆深处早已存在另一套关于人类灭亡的记录。',
      createdAt: now - 1000 * 60 * 96,
      title: '星海档案馆',
      content: '人类文明把所有记忆上传到星海档案馆，却发现档案馆深处早已存在另一套关于人类灭亡的记录。主角的职业是“记忆修复师”，专门修补被战争损坏的人格备份。',
      folderName: '星海遗民',
      tags: ['world', 'plot'],
    },
  ];
}

function inferTags(type?: string): InspirationTag[] {
  if (!type) return [];
  if (type.includes('角色')) return ['role'];
  if (type.includes('对话') || type.includes('对白') || type.includes('台词')) return ['dialogue'];
  if (type.includes('情节') || type.includes('剧情')) return ['plot'];
  if (type.includes('世界观') || type.includes('设定') || type.includes('场景')) return ['world'];
  return [];
}

function normalizeTagValue(tag: string): InspirationTag | null {
  if (tag === 'role' || tag === 'plot' || tag === 'world' || tag === 'dialogue') {
    return tag;
  }
  // 兼容旧版测试数据：旧 tag 中的 scene 不再显示为“场景”，统一迁移为“世界观”。
  if (tag === 'scene') return 'world';
  if (tag === 'line' || tag === 'conversation') return 'dialogue';
  return null;
}

function normalizeFolderName(folderName?: string) {
  const name = String(folderName || '').trim();
  return name || DEFAULT_FOLDER;
}

function mergeFolderNames(folderNames: string[], items: InspirationItem[]) {
  const merged: string[] = [];

  const addFolder = (name?: string) => {
    const normalized = normalizeFolderName(name);
    if (!merged.includes(normalized)) {
      merged.push(normalized);
    }
  };

  folderNames.forEach(addFolder);
  items.forEach(item => addFolder(item.folderName));

  if (merged.length === 0) {
    merged.push(DEFAULT_FOLDER);
  }

  return merged;
}

function normalizeItem(raw: any): InspirationItem {
  const rawTags = Array.isArray(raw?.tags) ? raw.tags : inferTags(raw?.type);
  const tags = Array.from(new Set(
    rawTags
      .map((tag: string) => normalizeTagValue(String(tag)))
      .filter(Boolean)
  )) as InspirationTag[];

  const title = String(raw?.title || raw?.prompt || raw?.type || '未命名灵感');
  const content = String(raw?.content || raw?.result || '');

  return {
    id: String(raw?.id || `${Date.now()}-${Math.random()}`),
    type: String(raw?.type || '手动灵感'),
    prompt: String(raw?.prompt || title),
    result: String(raw?.result || content),
    createdAt: Number(raw?.createdAt || Date.now()),
    title,
    content,
    folderName: normalizeFolderName(raw?.folderName),
    tags,
    updatedAt: raw?.updatedAt ? Number(raw.updatedAt) : undefined,
  };
}

function getTagLabel(tag: InspirationTag) {
  return TAG_OPTIONS.find(option => option.key === tag)?.label || tag;
}

function formatTime(timestamp: number) {
  try {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

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
    const normalized = mergeFolderNames(updated, []);
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

          // 如果 Tab1 暂时还没有写入任何灵感，首次进入 Tab2 时自动放入一组测试数据。
          // 注意：只有 key 不存在时才自动导入；如果用户手动删除到空列表，不会反复自动生成。
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

          const mergedFolders = mergeFolderNames(storedFolders, loadedItems);

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

      return () => {
        cancelled = true;
      };
    }, [])
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

  const selectActiveFolder = useCallback((folder: string) => {
    setActiveFolder(folder);
    if (folder !== ALL_FOLDERS) {
      setLatestFolder(folder);
    }
    setFolderModalVisible(false);
  }, []);

  const getDefaultFormFolder = useCallback(() => {
    if (activeFolder !== ALL_FOLDERS && folders.includes(activeFolder)) {
      return activeFolder;
    }
    if (folders.includes(latestFolder)) {
      return latestFolder;
    }
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

  const toggleFormTag = useCallback((tag: InspirationTag) => {
    setFormTags(prev => (
      prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]
    ));
  }, []);

  const handleCreateFolder = useCallback(async () => {
    const folderName = normalizeFolderName(newFolderName);

    if (!newFolderName.trim()) {
      Alert.alert('请填写灵感夹名称', '例如“三生三世”或“长安夜行”。');
      return;
    }
    if (folders.includes(folderName)) {
      setActiveFolder(folderName);
      setLatestFolder(folderName);
      setNewFolderName('');
      setFolderCreatorVisible(false);
      Alert.alert('灵感夹已存在', `已切换到“${folderName}”。`);
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
      ? `确定要删除“${folderName}”吗？其中 ${count} 条灵感也会一起删除。`
      : `确定要删除空灵感夹“${folderName}”吗？`;

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

          if (activeFolder === folderName) {
            setActiveFolder(ALL_FOLDERS);
          }
          if (latestFolder === folderName) {
            setLatestFolder(nextLatestFolder);
          }
          if (formFolder === folderName) {
            setFormFolder(nextLatestFolder);
          }
          setEditorFolderDropdownOpen(false);
        },
      },
    ]);
  }, [activeFolder, folders, formFolder, items, latestFolder, persistFolders, persistItems]);

  const handleSave = useCallback(async () => {
    const title = formTitle.trim();
    const content = formContent.trim();
    const folderName = normalizeFolderName(formFolder);

    if (!title) {
      Alert.alert('请填写标题', '标题可以是灵感的关键词，例如“雨夜狐妖”。');
      return;
    }
    if (!content) {
      Alert.alert('请填写内容', '正文可以记录具体设定、片段或灵感来源。');
      return;
    }
    if (!folders.includes(folderName)) {
      Alert.alert('请选择灵感夹', '请先在右上角 + 按钮中新建灵感夹，再为灵感选择所属灵感夹。');
      return;
    }

    if (editingId) {
      const updated = items.map(item => {
        if (item.id !== editingId) return item;
        return {
          ...item,
          title,
          content,
          folderName,
          tags: formTags,
          prompt: title,
          result: content,
          updatedAt: Date.now(),
        };
      });
      await persistItems(updated);
    } else {
      const createdAt = Date.now();
      const newItem: InspirationItem = {
        id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
        type: '手动灵感',
        prompt: title,
        result: content,
        createdAt,
        title,
        content,
        folderName,
        tags: formTags,
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
    const mergedFolders = mergeFolderNames([...buildSampleFolders(), ...folders], [...samples, ...nonSampleItems]);

    // 每次点击都刷新默认测试数据，避免旧版“场景/剧情”测试数据残留。
    await persistItems([...samples, ...nonSampleItems]);
    await persistFolders(mergedFolders);
    setActiveFolder(ALL_FOLDERS);
    setActiveTag(ALL_TAGS);
    setLatestFolder(buildSampleFolders()[0]);
    Alert.alert('导入成功', `已导入/刷新 ${samples.length} 条测试灵感，并保留空灵感夹“空白新坑”。`);
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagScroll}
        contentContainerStyle={styles.tagBarContent}
      >
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
            <TouchableOpacity key={item.id} style={styles.card} onPress={() => openEditEditor(item)} activeOpacity={0.8}>
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
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>删除</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal
        visible={folderModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <View style={styles.modalMask}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setFolderModalVisible(false)} />
          <View style={styles.folderPanel}>
            <Text style={styles.modalTitle}>选择灵感夹</Text>
            <TouchableOpacity style={styles.folderOption} onPress={() => selectActiveFolder(ALL_FOLDERS)}>
              <Text style={styles.folderOptionText}>全部灵感夹</Text>
              {activeFolder === ALL_FOLDERS && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
            {folders.map(folder => {
              const folderCount = items.filter(item => item.folderName === folder).length;
              return (
                <View key={folder} style={styles.folderManageRow}>
                  <TouchableOpacity style={styles.folderSelectArea} onPress={() => selectActiveFolder(folder)}>
                    <Text style={styles.folderOptionText} numberOfLines={1}>{folder}</Text>
                    <Text style={styles.folderCountText}>{folderCount}</Text>
                    {activeFolder === folder && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.folderDeleteButton} onPress={() => handleDeleteFolder(folder)}>
                    <Text style={styles.folderDeleteText}>删除</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            <Text style={styles.folderHint}>右上角“＋”可以新建空灵感夹；删除灵感夹会同时删除其中的灵感。</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={folderCreatorVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setFolderCreatorVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.centerModalMask}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setFolderCreatorVisible(false)} />
          <View style={styles.createFolderPanel}>
            <Text style={styles.createFolderTitle}>新建灵感夹</Text>
            <TextInput
              style={styles.input}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="例如：三生三世"
              placeholderTextColor="#C7C7CC"
              autoFocus
            />
            <View style={styles.createFolderActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setFolderCreatorVisible(false)}>
                <Text style={styles.secondaryButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleCreateFolder}>
                <Text style={styles.primaryButtonText}>创建</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={editorVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setEditorFolderDropdownOpen(false); setEditorVisible(false); }}
      >
        <KeyboardAvoidingView
          style={styles.editorMask}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editorPanel}>
            <View style={styles.editorHeader}>
              <TouchableOpacity onPress={() => { setEditorFolderDropdownOpen(false); setEditorVisible(false); }}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <Text style={styles.editorTitle}>{editingId ? '编辑灵感' : '新建灵感'}</Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveText}>保存</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>所属灵感夹</Text>
              <TouchableOpacity
                style={[styles.selectInput, editorFolderDropdownOpen && styles.selectInputActive]}
                onPress={() => setEditorFolderDropdownOpen(prev => !prev)}
              >
                <Text style={styles.selectInputText} numberOfLines={1}>{formFolder}</Text>
                <Text style={styles.selectInputArrow}>{editorFolderDropdownOpen ? '⌃' : '⌵'}</Text>
              </TouchableOpacity>
              {editorFolderDropdownOpen && (
                <View style={styles.inlineFolderPicker}>
                  {folders.map(folder => (
                    <TouchableOpacity
                      key={folder}
                      style={styles.inlineFolderOption}
                      onPress={() => {
                        setFormFolder(folder);
                        setLatestFolder(folder);
                        setEditorFolderDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.inlineFolderOptionText} numberOfLines={1}>{folder}</Text>
                      {formFolder === folder && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.inlineFolderHint}>如需新的灵感夹，请先退出编辑弹窗，通过页面右上角“＋”创建。</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>标题</Text>
              <TextInput
                style={styles.input}
                value={formTitle}
                onChangeText={setFormTitle}
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
                      onPress={() => toggleFormTag(tag.key)}
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
                onChangeText={setFormContent}
                placeholder="记录角色、情节转折、世界观设定或对话片段……"
                placeholderTextColor="#C7C7CC"
                multiline
                textAlignVertical="top"
              />

              {editingId && (
                <TouchableOpacity style={styles.modalDeleteButton} onPress={() => handleDelete(editingId)}>
                  <Text style={styles.modalDeleteText}>删除这条灵感</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  headerTitleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  subtitle: {
    marginTop: 0,
    fontSize: 13,
    color: '#6D6D72',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  folderButton: {
    maxWidth: 148,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderButtonText: {
    flexShrink: 1,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  folderArrow: {
    color: '#007AFF',
    fontSize: 15,
    lineHeight: 16,
    marginLeft: 4,
    marginTop: -1,
  },
  addFolderButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFolderButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 26,
  },
  tagScroll: {
    flexGrow: 0,
  },
  tagBarContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    alignItems: 'center',
  },
  tagChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  tagChipActive: {
    backgroundColor: '#007AFF',
  },
  tagChipText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  tagChipTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sampleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 28,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#6D6D72',
    textAlign: 'center',
    lineHeight: 20,
  },
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
  pickerPanel: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
  },
  pickerOption: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  pickerOptionText: {
    flex: 1,
    color: '#000',
    fontSize: 16,
  },
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
