import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  getActivePreset,
  getPreferences,
  getSettings,
  loadPreferences,
  loadPresets,
  loadSettings,
} from '../../configStore';
import type { InspirationTag } from '../../shared/types';
import { INSPIRATION_STORAGE_KEY, FOLDER_STORAGE_KEY, DEFAULT_FOLDER } from '../../shared/constants';
import { normalizeFolderName, uniqueFolderNames, createId } from '../../shared/utils';
import type { PresetType, InspirationCard } from '../../shared/parseCards';
import { parseGeneratedCards } from '../../shared/parseCards';
import { getPreset, buildFallbackCards, buildPrompt } from '../../shared/inspirePresets';
import InspireCardList from '../../components/InspireCardList';
import InspireControlPanel from '../../components/InspireControlPanel';
import InspireDetailModal from '../../components/InspireDetailModal';
import CaptureModal from '../../components/CaptureModal';

type StoredInspirationItem = {
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
};

export default function InspireScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [ready, setReady] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [selectedType, setSelectedType] = useState<PresetType>('character');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [cards, setCards] = useState<InspirationCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<string[]>([DEFAULT_FOLDER]);
  const [latestFolder, setLatestFolder] = useState(DEFAULT_FOLDER);
  const [detailCard, setDetailCard] = useState<InspirationCard | null>(null);
  const [captureCard, setCaptureCard] = useState<InspirationCard | null>(null);
  const [captureFolder, setCaptureFolder] = useState(DEFAULT_FOLDER);
  const [newFolderName, setNewFolderName] = useState('');
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', e => {
      setAndroidKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      const rawFolders = await AsyncStorage.getItem(FOLDER_STORAGE_KEY);
      const rawItems = await AsyncStorage.getItem(INSPIRATION_STORAGE_KEY);
      const folderNames: string[] = [];

      if (rawFolders) {
        const parsedFolders = JSON.parse(rawFolders);
        if (Array.isArray(parsedFolders)) {
          parsedFolders.forEach((folder: string) => folderNames.push(normalizeFolderName(folder)));
        }
      }

      if (rawItems) {
        const parsedItems = JSON.parse(rawItems);
        if (Array.isArray(parsedItems)) {
          parsedItems.forEach((item: any) => {
            if (item?.folderName) {
              folderNames.push(normalizeFolderName(item.folderName));
            }
          });
        }
      }

      const normalized = uniqueFolderNames(folderNames);
      setFolders(normalized);
      setLatestFolder(prev => (normalized.includes(prev) ? prev : normalized[0]));
      await AsyncStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      setFolders([DEFAULT_FOLDER]);
      setLatestFolder(DEFAULT_FOLDER);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadPresets(), loadSettings(), loadPreferences()]).then(() => {
      const active = getActivePreset();
      if (active?.baseUrl && active?.apiKey && active?.modelName) {
        setHasConfig(true);
      }
      setReady(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFolders();
    }, [loadFolders]),
  );

  const handleGenerate = useCallback(async () => {
    const active = getActivePreset();
    const preset = getPreset(selectedType);

    if (!active) {
      setCards(buildFallbackCards(selectedType, customPrompt));
      setError('尚未配置 API，已显示本地备用灵感，方便先测试页面和捕捉流程。');
      return;
    }

    setError(null);
    setGenerating(true);
    setCards([]);
    setDetailCard(null);

    const concurrency = getSettings().concurrency || 1;
    const total = 8;
    const base = Math.floor(total / concurrency);
    const remainder = total % concurrency;

    const requestCounts: number[] = [];
    for (let i = 0; i < concurrency; i++) {
      requestCounts.push(base + (i < remainder ? 1 : 0));
    }

    try {
      const settings = getSettings();
      const prefs = getPreferences();

      const baseUrl = active.baseUrl.replace(/\/+$/, '');
      const url = `${baseUrl}/chat/completions`;

      const systemParts: string[] = [];
      if (prefs.writingStyle) {
        systemParts.push(`【文风偏好】${prefs.writingStyle}`);
      }
      systemParts.push(preset.systemPrompt);
      if (prefs.extraInstructions) {
        systemParts.push(`【补充要求】${prefs.extraInstructions}`);
      }
      systemParts.push('输出必须简短、适合移动端灵感卡片展示。');
      const systemContent = systemParts.join('\n\n');

      const allCards: InspirationCard[] = [];
      let failedCount = 0;

      const results = await Promise.allSettled(
        requestCounts.map(count =>
          fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${active.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: active.modelName,
              messages: [
                { role: 'system', content: systemContent },
                { role: 'user', content: buildPrompt(preset, customPrompt, count) },
              ],
              temperature: Math.max(settings.temperature, 0.9),
              top_p: settings.topP,
              frequency_penalty: settings.frequencyPenalty,
              presence_penalty: settings.presencePenalty,
            }),
          }).then(async res => {
            if (!res.ok) {
              const errText = await res.text().catch(() => '');
              throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
            }
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) throw new Error('模型未返回内容');
            return parseGeneratedCards(content, selectedType);
          }),
        ),
      );

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          allCards.push(...result.value);
        } else {
          failedCount++;
        }
      });

      if (allCards.length === 0) {
        throw new Error(failedCount > 0
          ? `${failedCount} 路请求全部失败，请检查 API 配置或网络。`
          : '模型返回格式无法解析：没有识别到可展示的灵感卡片。请重新生成一次');
      }

      setCards(allCards.slice(0, total));
      if (allCards.length < total) {
        setError(`期望 ${total} 条，成功解析 ${allCards.length} 条。${failedCount > 0 ? `${failedCount} 路请求失败。` : ''}建议重新生成一次。`);
      }
    } catch (e: any) {
      setCards([]);
      setError(e?.message || '生成失败，请检查模型返回格式或重新生成一次。');
    } finally {
      setGenerating(false);
    }
  }, [selectedType, customPrompt]);

  const openCaptureModal = useCallback((card: InspirationCard) => {
    setDetailCard(null);
    loadFolders().finally(() => {
      setCaptureCard(card);
      setCaptureFolder(latestFolder || folders[0] || DEFAULT_FOLDER);
      setNewFolderName('');
    });
  }, [folders, latestFolder, loadFolders]);

  const persistFoldersIfNeeded = useCallback(async (folderName: string) => {
    const normalizedName = normalizeFolderName(folderName);
    const updated = uniqueFolderNames([...folders, normalizedName]);
    setFolders(updated);
    setLatestFolder(normalizedName);
    await AsyncStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(updated));
    return normalizedName;
  }, [folders]);

  const handleCapture = useCallback(async () => {
    if (!captureCard) return;

    const folderName = normalizeFolderName(newFolderName || captureFolder);
    const preset = getPreset(captureCard.type);
    const now = Date.now();

    const item: StoredInspirationItem = {
      id: createId('captured'),
      type: preset.label,
      prompt: customPrompt.trim() || preset.label,
      result: captureCard.content,
      createdAt: now,
      title: captureCard.title,
      content: captureCard.content,
      folderName,
      tags: [preset.tag],
      updatedAt: now,
    };

    try {
      await persistFoldersIfNeeded(folderName);
      const raw = await AsyncStorage.getItem(INSPIRATION_STORAGE_KEY);
      const list: StoredInspirationItem[] = raw ? JSON.parse(raw) : [];
      const updated = [item, ...list];
      await AsyncStorage.setItem(INSPIRATION_STORAGE_KEY, JSON.stringify(updated));

      setCards(prev => prev.map(card => (
        card.id === captureCard.id ? { ...card, captured: true } : card
      )));
      setDetailCard(prev => (
        prev?.id === captureCard.id ? { ...prev, captured: true } : prev
      ));
      setCaptureCard(null);
      setNewFolderName('');
      Alert.alert('已捕捉', `灵感已添加至"${folderName}"。`);
    } catch {
      Alert.alert('保存失败', '没有成功写入灵感记录，请稍后再试。');
    }
  }, [captureCard, captureFolder, customPrompt, newFolderName, persistFoldersIfNeeded]);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.inner, androidKeyboardHeight > 0 && { paddingBottom: Math.max(0, androidKeyboardHeight - tabBarHeight) }]}>
          <InspireCardList
            cards={cards}
            generating={generating}
            hasConfig={hasConfig}
            error={error}
            onCardPress={setDetailCard}
          />
          <InspireControlPanel
            selectedType={selectedType}
            onSelectType={type => { setSelectedType(type); setError(null); }}
            customPrompt={customPrompt}
            onChangePrompt={setCustomPrompt}
            generating={generating}
            onGenerate={handleGenerate}
          />
        </View>
      </TouchableWithoutFeedback>

      <InspireDetailModal
        card={detailCard}
        onClose={() => setDetailCard(null)}
        onCapture={openCaptureModal}
      />

      <CaptureModal
        card={captureCard}
        folders={folders}
        captureFolder={captureFolder}
        newFolderName={newFolderName}
        onChangeNewFolderName={setNewFolderName}
        onSelectFolder={folder => { setCaptureFolder(folder); setNewFolderName(''); }}
        onCapture={handleCapture}
        onClose={() => setCaptureCard(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  inner: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    padding: 32,
  },
});
