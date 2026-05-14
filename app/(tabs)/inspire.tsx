import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActivePreset,
  getSettings,
  getPreferences,
  loadPresets,
  loadSettings,
  loadPreferences,
} from '../../configStore';

const INSPIRATION_STORAGE_KEY = '@inhunt/inspirations';

interface InspirationItem {
  id: string;
  type: string;
  prompt: string;
  result: string;
  createdAt: number;
}

type PresetType = 'character' | 'plot' | 'world' | 'dialogue';

const PRESETS: { key: PresetType; label: string; icon: string; systemPrompt: string }[] = [
  {
    key: 'character',
    label: '角色灵感',
    icon: '👤',
    systemPrompt: '你是一位网文角色设计师。请为用户创造一个令人难忘的小说角色，包含：姓名、外貌、性格、背景故事、核心欲望和表面欲望。用生动有趣的方式呈现。',
  },
  {
    key: 'plot',
    label: '情节转折',
    icon: '🔄',
    systemPrompt: '你是一位网文情节设计师。请为用户设计一个扣人心弦的情节转折/高潮场景，包含：场景设定、矛盾冲突、转折点、高潮效果。用画面感强的语言描写。',
  },
  {
    key: 'world',
    label: '世界观构建',
    icon: '🌍',
    systemPrompt: '你是一位网文世界观构建师。请为用户设计一个独特的世界观元素，包含：核心设定、规则体系、势力分布、隐藏的奥秘。让世界充满层次感。',
  },
  {
    key: 'dialogue',
    label: '对话片段',
    icon: '💬',
    systemPrompt: '你是一位网文对话大师。请为用户创作一段精彩的人物对话，包含：场景背景、对话内容、潜台词分析。对话要有张力、有节奏、有角色辨识度。',
  },
];

export default function InspireScreen() {
  const { width } = useWindowDimensions();
  const [ready, setReady] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [selectedType, setSelectedType] = useState<PresetType | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载配置
  useEffect(() => {
    Promise.all([loadPresets(), loadSettings(), loadPreferences()]).then(() => {
      const active = getActivePreset();
      if (active?.baseUrl && active?.apiKey && active?.modelName) {
        setHasConfig(true);
      }
      setReady(true);
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    const active = getActivePreset();
    if (!active) {
      setError('请先在设置中配置 API 并选择应用');
      return;
    }

    const preset = PRESETS.find(p => p.key === selectedType);
    if (!preset) {
      setError('请选择一个灵感类型');
      return;
    }

    setError(null);
    setResult(null);
    setGenerating(true);

    try {
      const settings = getSettings();
      const prefs = getPreferences();

      const baseUrl = active.baseUrl.replace(/\/+$/, '');
      const url = `${baseUrl}/chat/completions`;

      const messages: { role: string; content: string }[] = [];

      // 系统提示：先加用户偏好，再加类型专用提示
      const systemParts: string[] = [];
      if (prefs.writingStyle) {
        systemParts.push(`【文风偏好】${prefs.writingStyle}`);
      }
      systemParts.push(preset.systemPrompt);
      if (prefs.extraInstructions) {
        systemParts.push(`【补充要求】${prefs.extraInstructions}`);
      }

      messages.push({ role: 'system', content: systemParts.join('\n\n') });

      // 用户自定义补充
      let userContent = preset.label;
      if (customPrompt.trim()) {
        userContent = `${preset.label}：${customPrompt.trim()}`;
      }
      messages.push({ role: 'user', content: userContent });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${active.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: active.modelName,
          messages,
          temperature: settings.temperature,
          top_p: settings.topP,
          frequency_penalty: settings.frequencyPenalty,
          presence_penalty: settings.presencePenalty,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('模型未返回内容，请检查 API 配置');
      }

      setResult(content);

      // 保存到灵感记录
      const item: InspirationItem = {
        id: Date.now().toString(),
        type: preset.label,
        prompt: customPrompt.trim() || preset.label,
        result: content,
        createdAt: Date.now(),
      };
      try {
        const raw = await AsyncStorage.getItem(INSPIRATION_STORAGE_KEY);
        const list: InspirationItem[] = raw ? JSON.parse(raw) : [];
        list.unshift(item);
        await AsyncStorage.setItem(INSPIRATION_STORAGE_KEY, JSON.stringify(list));
      } catch { /* ignore */ }

    } catch (e: any) {
      setError(e?.message || '生成失败，请检查网络和 API 配置');
    } finally {
      setGenerating(false);
    }
  }, [selectedType, customPrompt]);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!hasConfig) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>⚙️</Text>
        <Text style={styles.emptyTitle}>尚未配置 API</Text>
        <Text style={styles.emptyHint}>请在「设置 → API 配置」中添加 API 预设</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 灵感类型选择 */}
        <Text style={styles.sectionTitle}>选择灵感类型</Text>
        <View style={styles.presetGrid}>
          {PRESETS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.presetCard,
                selectedType === p.key && styles.presetCardActive,
              ]}
              onPress={() => {
                setSelectedType(p.key);
                setError(null);
              }}
            >
              <Text style={styles.presetIcon}>{p.icon}</Text>
              <Text style={styles.presetLabel}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 自定义补充 */}
        {selectedType && (
          <>
            <Text style={styles.sectionTitle}>补充描述（可选）</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.promptInput}
                value={customPrompt}
                onChangeText={setCustomPrompt}
                placeholder={`比如："修仙世界的主角是炼丹师"…`}
                placeholderTextColor="#C7C7CC"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* 生成按钮 */}
            <TouchableOpacity
              style={[styles.generateButton, generating && styles.buttonDisabled]}
              onPress={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.generateButtonText}>AI 正在生成灵感…</Text>
                </>
              ) : (
                <Text style={styles.generateButtonText}>✨ 生成灵感</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* 错误提示 */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* 生成结果 */}
        {result && (
          <>
            <Text style={styles.sectionTitle}>生成结果</Text>
            <View style={styles.resultCard}>
              <Markdown style={markdownStyles(width)}>{result}</Markdown>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 15,
    color: '#6D6D72',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 20,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCardActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E8F0FE',
  },
  presetIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  presetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  promptInput: {
    fontSize: 16,
    color: '#000',
    padding: 14,
    minHeight: 80,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorCard: {
    backgroundColor: '#FFF3F2',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    lineHeight: 20,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
  },
  resultText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 26,
  },
});

function markdownStyles(containerWidth: number) {
  return {
    body: { color: '#000', fontSize: 16, lineHeight: 26 },
    heading1: { fontSize: 22, fontWeight: '700' as const, color: '#000', marginVertical: 8 },
    heading2: { fontSize: 20, fontWeight: '700' as const, color: '#000', marginVertical: 6 },
    heading3: { fontSize: 18, fontWeight: '600' as const, color: '#000', marginVertical: 6 },
    heading4: { fontSize: 16, fontWeight: '600' as const, color: '#333', marginVertical: 4 },
    strong: { fontWeight: '700' as const },
    em: { fontStyle: 'italic' as const },
    blockquote: {
      backgroundColor: '#F0F6FF',
      borderLeftWidth: 4,
      borderLeftColor: '#007AFF',
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginVertical: 8,
    },
    code_inline: {
      backgroundColor: '#F2F2F7',
      color: '#FF3B30',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
    },
    fence: {
      backgroundColor: '#F2F2F7',
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    hr: { backgroundColor: '#E0E0E0', height: 1, marginVertical: 12 },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { marginVertical: 2 },
  };
}
