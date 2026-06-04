import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import type { InspirationItem } from '../shared/types';
import { INSPIRATION_STORAGE_KEY } from '../shared/constants';
import { createId } from '../shared/utils';
import type { Story } from '../shared/storyData';
import { countChars, parseChapters } from '../shared/storyData';
import { getActivePreset, getSettings, getPreferences } from '../configStore';

interface Props {
  story: Story;
  inspirations: InspirationItem[];
  onClose: () => void;
  onSave: (story: Story) => void;
}

type ToolPanel = 'none' | 'pins' | 'ai' | 'outline';
type AiMode = 'write' | 'polish';

export default function StoryEditor({ story, inspirations, onClose, onSave }: Props) {
  const tabBarHeight = useBottomTabBarHeight();
  const [title, setTitle] = useState(story.title);
  const [content, setContent] = useState(story.content);
  const [pinnedIds, setPinnedIds] = useState<string[]>(story.pinnedInspirationIds);
  const [worldSettings, setWorldSettings] = useState(story.worldSettings || '');
  const [showWorldSettings, setShowWorldSettings] = useState(false);
  const [activePanel, setActivePanel] = useState<ToolPanel>('none');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<AiMode>('write');
  const aiPolishRange = useRef<{ start: number; end: number } | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [selectedInspiration, setSelectedInspiration] = useState<InspirationItem | null>(null);
  const [contentSelection, setContentSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const contentRef = useRef<TextInput>(null);

  // ── Keyboard tracking (Android) ────────────────
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardVisible(true);
      if (Platform.OS === 'android') {
        setAndroidKeyboardHeight(e.endCoordinates.height);
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      if (Platform.OS === 'android') {
        setAndroidKeyboardHeight(0);
      }
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Auto-save on changes (debounced)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      // Derive outline from content headings
      const chapters = parseChapters(content);
      const outline = chapters.filter(c => c.title).map(c => c.title!);
      onSave({
        ...story,
        title,
        content,
        outline,
        pinnedInspirationIds: pinnedIds,
        worldSettings: worldSettings || undefined,
        updatedAt: Date.now(),
      });
    }, 800);
    return () => clearTimeout(saveTimeout.current);
  }, [title, content, pinnedIds, worldSettings]);

  const pinnedInspirations = inspirations.filter(i => pinnedIds.includes(i.id));
  const charCount = countChars(content);
  const togglePanel = (panel: ToolPanel) => {
    setActivePanel(prev => (prev === panel ? 'none' : panel));
  };

  // ── Selection helpers ─────────────────────────
  const hasSelection = !!contentSelection && contentSelection.start !== contentSelection.end;
  const selectedText = hasSelection
    ? content.substring(contentSelection!.start, contentSelection!.end)
    : '';
  const selectedCharCount = hasSelection ? countChars(selectedText) : 0;

  // ── Inspiration Pin Management ──────────────────────────
  const togglePin = (id: string) => {
    setPinnedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };
  const removePin = (id: string) => {
    setPinnedIds(prev => prev.filter(x => x !== id));
  };

  // ── Chapter Management (derived from content ## headings) ──
  const chapters = useMemo(() => parseChapters(content), [content]);

  const jumpToChapter = (title: string) => {
    const heading = `## ${title}`;
    const idx = content.indexOf(heading);
    if (idx >= 0) {
      const afterLine = content.indexOf('\n', idx);
      const pos = afterLine >= 0 ? afterLine + 1 : idx + heading.length;
      setContentSelection({ start: pos, end: pos });
      setActivePanel('none');
      contentRef.current?.focus();
    }
  };

  const addChapter = () => {
    const title = newChapterTitle.trim();
    if (!title) return;
    const heading = `## ${title}`;
    const separator = content.trim() ? '\n\n' : '';
    const newContent = content.trimEnd() + separator + heading + '\n\n';
    setContent(newContent);
    setNewChapterTitle('');
    // Jump to the new chapter
    setTimeout(() => {
      const pos = newContent.length;
      setContentSelection({ start: pos, end: pos });
      setActivePanel('none');
      contentRef.current?.focus();
    }, 50);
  };

  const deleteChapter = (title: string) => {
    Alert.alert(
      '删除章节',
      `确定要删除「${title}」及其内容吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            const heading = `## ${title}`;
            // Find this chapter's range
            const start = content.indexOf(heading);
            if (start < 0) return;
            // Find the next chapter or end of content
            const nextHeading = content.indexOf('\n## ', start + heading.length);
            const end = nextHeading >= 0 ? nextHeading + 1 : content.length;
            setContent(prev => prev.slice(0, start) + prev.slice(end));
          },
        },
      ],
    );
  };

  // ── AI Assist ───────────────────────────────────────────
  const handleAiGenerate = useCallback(async () => {
    const instruction = aiInstruction.trim();
    const isPolish = aiMode === 'polish';

    if (!isPolish && !instruction) {
      Alert.alert('请输入指令', '例如："续写下一段"、"基于灵感扩写开头"');
      return;
    }
    if (isPolish && !hasSelection) {
      Alert.alert('请先选中正文', '润色模式需要先在正文中选中一段文字。');
      return;
    }

    const preset = getActivePreset();
    if (!preset?.baseUrl || !preset?.apiKey || !preset?.modelName) {
      Alert.alert('未配置 API', '请先在设置中配置大模型 API。');
      return;
    }

    setAiGenerating(true);
    setAiResult(null);

    // Store polish range at generation time
    if (isPolish && contentSelection) {
      aiPolishRange.current = { start: contentSelection.start, end: contentSelection.end };
    } else {
      aiPolishRange.current = null;
    }

    try {
      const settings = getSettings();
      const prefs = getPreferences();

      // Build context
      const contextParts: string[] = [];

      if (isPolish) {
        // Polish mode: send the selected text + surrounding context
        contextParts.push(`【选中文本】\n${selectedText}`);
        // Surrounding context for continuity
        const beforeSelected = content.slice(0, contentSelection!.start).slice(-800);
        const afterSelected = content.slice(contentSelection!.end).slice(0, 800);
        if (beforeSelected.trim()) {
          contextParts.push(`【前文】\n${beforeSelected}`);
        }
        if (afterSelected.trim()) {
          contextParts.push(`【后文】\n${afterSelected}`);
        }
      } else {
        // Write mode: include recent content (expanded from 1500 → 3000)
        if (content.trim()) {
          contextParts.push(`【当前正文（最近部分）】\n${content.slice(-3000)}`);
        }
      }

      // World settings
      if (worldSettings.trim()) {
        contextParts.push(`【故事设定】\n${worldSettings}`);
      }

      // Pinned inspirations
      if (pinnedInspirations.length > 0) {
        const pinText = pinnedInspirations
          .map(p => `- ${p.title}：${p.content}`)
          .join('\n');
        contextParts.push(`【参考灵感】\n${pinText}`);
      }

      // Chapter outline
      if (chapters.some(c => c.title)) {
        const chapterTitles = chapters.filter(c => c.title).map(c => c.title!);
        contextParts.push(`【大纲】\n${chapterTitles.join('\n')}`);
      }

      // System prompt
      const systemParts: string[] = [];
      if (prefs.writingStyle) {
        systemParts.push(`【文风要求】${prefs.writingStyle}`);
      }

      if (isPolish) {
        systemParts.push(
          '你是一个小说编辑助手。用户会选中一段正文，请你根据用户指令和上下文来润色、改写或扩写选中的文本。保持叙事风格一致。输出只包含修改后的文本，不要加额外说明或标记。',
        );
      } else {
        systemParts.push(
          '你是一个小说写作助手。根据用户的指令和提供的上下文（正文、灵感、大纲、设定），生成合适的创作内容。保持叙事风格一致。输出只包含创作内容本身，不要加额外说明。',
        );
      }

      const userParts: string[] = [];
      if (contextParts.length > 0) {
        userParts.push(contextParts.join('\n\n'));
      }
      userParts.push(`【用户指令】${isPolish ? (instruction || '润色这段文字') : instruction}`);

      const url = `${preset.baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${preset.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: preset.modelName,
          messages: [
            { role: 'system', content: systemParts.join('\n\n') },
            { role: 'user', content: userParts.join('\n\n') },
          ],
          temperature: isPolish ? 0.7 : Math.max(settings.temperature, 0.8),
          top_p: settings.topP,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`API 错误 (${res.status}): ${errText || res.statusText}`);
      }

      const data = await res.json();
      const result = data?.choices?.[0]?.message?.content;
      if (!result) throw new Error('模型未返回内容');

      setAiResult(result.trim());
    } catch (e: any) {
      Alert.alert('AI 生成失败', e?.message || '请检查网络和 API 配置。');
    } finally {
      setAiGenerating(false);
    }
  }, [aiInstruction, aiMode, content, contentSelection, selectedText, chapters, pinnedInspirations, worldSettings]);

  const applyAiResult = () => {
    if (!aiResult) return;

    if (aiMode === 'polish' && aiPolishRange.current) {
      // Replace selected text
      const { start, end } = aiPolishRange.current;
      const newContent = content.slice(0, start) + aiResult + content.slice(end);
      setContent(newContent);
      // Set cursor after replacement
      const newPos = start + aiResult.length;
      setContentSelection({ start: newPos, end: newPos });
    } else {
      // Append to end
      setContent(prev => (prev ? prev + '\n\n' + aiResult : aiResult));
    }

    setAiResult(null);
    setAiInstruction('');
    aiPolishRange.current = null;
    setActivePanel('none');
  };

  return (
    <View style={s.container}>
      {/* ── Header ──────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={onClose} style={s.backBtn}>
          <Text style={s.backText}>← 故事</Text>
        </TouchableOpacity>
        <TextInput
          style={s.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="故事标题"
          placeholderTextColor="#C7C7CC"
          returnKeyType="done"
        />
        <Text style={s.charCount}>{charCount} 字</Text>
      </View>

      {/* ── Pinned Inspirations (collapsible) ──── */}
      {activePanel === 'pins' && (
        <View style={s.panel}>
          <View style={s.panelHeader}>
            <Text style={s.panelTitle}>📌 灵感便签</Text>
            <TouchableOpacity onPress={() => setActivePanel('none')}>
              <Text style={s.panelClose}>收起</Text>
            </TouchableOpacity>
          </View>

          {/* Currently pinned */}
          {pinnedInspirations.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pinScroll}>
              {pinnedInspirations.map(item => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedInspiration(item)}
                >
                  <View style={s.pinCard}>
                    <View style={s.pinCardHeader}>
                      <Text style={s.pinCardTitle} numberOfLines={1}>{item.title}</Text>
                      <TouchableOpacity onPress={() => removePin(item.id)}>
                        <Text style={s.pinRemove}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={s.pinCardContent} numberOfLines={3}>{item.content}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Add more pins */}
          <Text style={s.sectionLabel}>
            {pinnedInspirations.length > 0 ? '添加更多灵感' : '选择灵感作为参考'}
          </Text>
          <ScrollView style={s.pinList} keyboardShouldPersistTaps="handled">
            {inspirations
              .filter(i => !pinnedIds.includes(i.id))
              .map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={s.pinListItem}
                  onPress={() => togglePin(item.id)}
                >
                  <Text style={s.pinListTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.pinListContent} numberOfLines={1}>{item.content}</Text>
                  <Text style={s.pinListAdd}>＋</Text>
                </TouchableOpacity>
              ))}
            {inspirations.filter(i => !pinnedIds.includes(i.id)).length === 0 && (
              <Text style={s.emptyHint}>所有灵感都已添加，或灵感记录为空</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Chapters (collapsible, auto-parsed from content) ── */}
      {activePanel === 'outline' && (
        <View style={s.panel}>
          <View style={s.panelHeader}>
            <Text style={s.panelTitle}>📋 章节</Text>
            <TouchableOpacity onPress={() => setActivePanel('none')}>
              <Text style={s.panelClose}>收起</Text>
            </TouchableOpacity>
          </View>

          {chapters.filter(c => c.title).length > 0 ? (
            chapters.map((ch, idx) =>
              ch.title ? (
                <View key={idx} style={s.outlineItem}>
                  <TouchableOpacity style={s.outlineTextTouch} onPress={() => jumpToChapter(ch.title!)}>
                    <Text style={s.outlineText}>{ch.title}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteChapter(ch.title!)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={s.outlineDelete}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null,
            )
          ) : (
            <Text style={s.outlineHint}>在正文里用 ## 标题 来创建章节\n或点击下方按钮添加</Text>
          )}

          <View style={s.outlineAddRow}>
            <TextInput
              style={s.outlineInput}
              value={newChapterTitle}
              onChangeText={setNewChapterTitle}
              placeholder="新章节标题…"
              placeholderTextColor="#C7C7CC"
              returnKeyType="done"
              onSubmitEditing={addChapter}
            />
            <TouchableOpacity style={s.outlineAddBtn} onPress={addChapter}>
              <Text style={s.outlineAddBtnText}>添加</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── AI Assist (collapsible) ──────────────── */}
      {activePanel === 'ai' && (
        <View style={s.panel}>
          <View style={s.panelHeader}>
            <Text style={s.panelTitle}>🤖 AI 辅助</Text>
            <TouchableOpacity onPress={() => setActivePanel('none')}>
              <Text style={s.panelClose}>收起</Text>
            </TouchableOpacity>
          </View>

          {!aiResult ? (
            /* ── Compose mode: input controls ── */
            <>
              {/* World Settings */}
              <TouchableOpacity
                style={s.wsToggle}
                onPress={() => setShowWorldSettings(prev => !prev)}
                activeOpacity={0.6}
              >
                <Text style={s.wsToggleText}>
                  🌍 故事设定 {showWorldSettings ? '▴' : '▾'}
                  {worldSettings.trim() ? ' (已填写)' : ''}
                </Text>
              </TouchableOpacity>
              {showWorldSettings && (
                <TextInput
                  style={s.wsInput}
                  value={worldSettings}
                  onChangeText={setWorldSettings}
                  placeholder="人物设定、世界观、关系、重要伏笔…&#10;AI 写作时会自动参考这些设定"
                  placeholderTextColor="#C7C7CC"
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                />
              )}

              {/* Mode toggle */}
              <View style={s.aiModeRow}>
                <TouchableOpacity
                  style={[s.aiModeBtn, aiMode === 'write' && s.aiModeBtnActive]}
                  onPress={() => setAiMode('write')}
                >
                  <Text style={[s.aiModeBtnText, aiMode === 'write' && s.aiModeBtnTextActive]}>
                    ✏️ 续写
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.aiModeBtn, aiMode === 'polish' && s.aiModeBtnActive]}
                  onPress={() => setAiMode('polish')}
                >
                  <Text style={[s.aiModeBtnText, aiMode === 'polish' && s.aiModeBtnTextActive]}>
                    ✨ 润色
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Context hints */}
              {aiMode === 'polish' && hasSelection && (
                <Text style={s.aiSelectionHint}>
                  ✅ 已选中正文 {selectedCharCount} 字
                </Text>
              )}
              {aiMode === 'polish' && !hasSelection && (
                <Text style={s.aiSelectionWarning}>
                  ⚠️ 请先在正文中选中要润色的文字
                </Text>
              )}
              {aiMode === 'write' && (
                <>
                  {pinnedInspirations.length > 0 && (
                    <Text style={s.aiContextHint}>
                      已附带 {pinnedInspirations.length} 条灵感作为上下文
                    </Text>
                  )}
                  {chapters.some(c => c.title) && (
                    <Text style={s.aiContextHint}>
                      已附带大纲（{chapters.filter(c => c.title).length} 章）作为上下文
                    </Text>
                  )}
                  {worldSettings.trim() && (
                    <Text style={s.aiContextHint}>
                      已附带故事设定作为上下文
                    </Text>
                  )}
                </>
              )}

              <View style={s.aiInputRow}>
                <TextInput
                  style={s.aiInput}
                  value={aiInstruction}
                  onChangeText={setAiInstruction}
                  placeholder={
                    aiMode === 'polish'
                      ? '润色要求（可选），如：更有氛围感、精简一下…'
                      : '输入指令，如：续写下一段、基于灵感扩写开头…'
                  }
                  placeholderTextColor="#C7C7CC"
                  multiline
                  maxLength={500}
                  editable={!aiGenerating}
                />
                <TouchableOpacity
                  style={[s.aiSendBtn, aiGenerating && s.aiSendBtnDisabled]}
                  onPress={handleAiGenerate}
                  disabled={aiGenerating || (aiMode === 'polish' && !hasSelection)}
                >
                  {aiGenerating ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={s.aiSendBtnText}>
                      {aiMode === 'polish' ? '润色' : '生成'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {aiGenerating && (
                <Text style={s.aiTip}>AI 正在生成…</Text>
              )}
              {!aiGenerating && (
                <Text style={s.aiTip}>提示：用 📌 添加灵感便签，AI 会自动参考它们来创作</Text>
              )}
            </>
          ) : (
            /* ── Review mode: result only, full space ── */
            <View style={s.aiResultBox}>
              <Text style={s.aiResultLabel}>
                {aiMode === 'polish' ? '✨ AI 润色结果' : '✏️ AI 输出'}
              </Text>
              <ScrollView style={s.aiResultScroll} nestedScrollEnabled>
                <Text style={s.aiResultText}>{aiResult}</Text>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* ── Main Content Editor ──────────────────── */}
      <TextInput
        ref={contentRef}
        style={s.contentInput}
        value={content}
        onChangeText={setContent}
        onSelectionChange={(e) => setContentSelection(e.nativeEvent.selection)}
        selection={contentSelection}
        placeholder="开始写你的故事…"
        placeholderTextColor="#D1D1D6"
        multiline
        textAlignVertical="top"
        autoFocus={false}
      />

      {/* ── AI Result Floating Bar ──────────────── */}
      {aiResult && (
        <View style={s.aiFloatingBar}>
          <TouchableOpacity style={s.aiFloatInsertBtn} onPress={applyAiResult}>
            <Text style={s.aiFloatInsertText}>
              {aiMode === 'polish' ? '替换选中文本' : '插入到正文'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.aiRetryBtn}
            onPress={() => { setAiResult(null); handleAiGenerate(); }}
          >
            <Text style={s.aiRetryBtnText}>重新生成</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAiResult(null)}
          >
            <Text style={s.aiDiscardText}>返回修改</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom Toolbar ───────────────────────── */}
      {!keyboardVisible && (
        <View style={s.toolbar}>
        <TouchableOpacity
          style={[s.toolBtn, activePanel === 'pins' && s.toolBtnActive]}
          onPress={() => togglePanel('pins')}
        >
          <Text style={s.toolBtnEmoji}>📌</Text>
          <Text style={[s.toolBtnLabel, activePanel === 'pins' && s.toolBtnLabelActive]}>
            灵感{pinnedIds.length > 0 ? `(${pinnedIds.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.toolBtn, activePanel === 'ai' && s.toolBtnActive]}
          onPress={() => togglePanel('ai')}
        >
          <Text style={s.toolBtnEmoji}>🤖</Text>
          <Text style={[s.toolBtnLabel, activePanel === 'ai' && s.toolBtnLabelActive]}>
            AI 辅助
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.toolBtn, activePanel === 'outline' && s.toolBtnActive]}
          onPress={() => togglePanel('outline')}
        >
          <Text style={s.toolBtnEmoji}>📋</Text>
          <Text style={[s.toolBtnLabel, activePanel === 'outline' && s.toolBtnLabelActive]}>
            章节{chapters.filter(c => c.title).length > 0 ? `(${chapters.filter(c => c.title).length})` : ''}
          </Text>
        </TouchableOpacity>
        </View>
      )}

      {/* ── Android keyboard padding ─────────────── */}
      {keyboardVisible && Platform.OS === 'android' && androidKeyboardHeight > 0 && (
        <View style={{ height: Math.max(0, androidKeyboardHeight - tabBarHeight) }} />
      )}

      {/* ── Inspiration Detail Modal ─────────────── */}
      <Modal
        visible={selectedInspiration !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedInspiration(null)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedInspiration(null)}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{selectedInspiration?.title}</Text>
            <ScrollView
              style={s.modalBodyScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={s.modalBody}>{selectedInspiration?.content}</Text>
            </ScrollView>
            <TouchableOpacity
              style={s.modalCloseBtn}
              onPress={() => setSelectedInspiration(null)}
            >
              <Text style={s.modalCloseBtnText}>关闭</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backBtn: { paddingVertical: 6, paddingRight: 8 },
  backText: { fontSize: 16, color: '#007AFF' },
  titleInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  charCount: { fontSize: 13, color: '#8E8E93', marginLeft: 8 },

  // Panels
  panel: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    maxHeight: 400,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  panelTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  panelClose: { fontSize: 14, color: '#007AFF' },

  // Pins
  pinScroll: { maxHeight: 100, marginBottom: 8 },
  pinCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    width: 160,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  pinCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pinCardTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#5D4037' },
  pinRemove: { fontSize: 14, color: '#BDBDBD', marginLeft: 4 },
  pinCardContent: { marginTop: 4, fontSize: 12, color: '#795548', lineHeight: 18 },
  sectionLabel: { fontSize: 13, color: '#8E8E93', marginBottom: 6 },
  pinList: { maxHeight: 120 },
  pinListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  pinListTitle: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', width: 100 },
  pinListContent: { flex: 1, fontSize: 13, color: '#6D6D72', marginLeft: 8 },
  pinListAdd: { fontSize: 18, color: '#007AFF', fontWeight: '600', marginLeft: 8 },
  emptyHint: { fontSize: 13, color: '#C7C7CC', textAlign: 'center', paddingVertical: 12 },

  // Outline
  outlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  outlineTextTouch: { flex: 1 },
  outlineText: { flex: 1, fontSize: 15, color: '#1C1C1E' },
  outlineDelete: { fontSize: 14, color: '#C7C7CC', marginLeft: 8 },
  outlineHint: { fontSize: 14, color: '#8E8E93', lineHeight: 22, marginBottom: 8 },
  outlineAddRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  outlineInput: {
    flex: 1,
    fontSize: 15,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#1C1C1E',
  },
  outlineAddBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  outlineAddBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // World Settings
  wsToggle: {
    paddingVertical: 8,
    marginBottom: 4,
  },
  wsToggleText: { fontSize: 14, color: '#6D6D72' },
  wsInput: {
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#1C1C1E',
    minHeight: 80,
    maxHeight: 120,
    marginBottom: 8,
  },

  // AI Mode toggle
  aiModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  aiModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  aiModeBtnActive: {
    backgroundColor: '#E3F0FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  aiModeBtnText: { fontSize: 14, color: '#8E8E93' },
  aiModeBtnTextActive: { color: '#007AFF', fontWeight: '600' },

  // AI context hints
  aiContextHint: { fontSize: 12, color: '#34C759', marginBottom: 4 },
  aiSelectionHint: { fontSize: 12, color: '#34C759', marginBottom: 6, fontWeight: '500' },
  aiSelectionWarning: { fontSize: 12, color: '#FF9500', marginBottom: 6 },

  // AI input
  aiInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  aiInput: {
    flex: 1,
    fontSize: 15,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#1C1C1E',
    maxHeight: 80,
  },
  aiSendBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 40,
    justifyContent: 'center',
  },
  aiSendBtnDisabled: { backgroundColor: '#B0C4DE' },
  aiSendBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  aiResultBox: {
    backgroundColor: '#F0F6FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#B3D4FC',
  },
  aiResultLabel: { fontSize: 12, color: '#007AFF', fontWeight: '600', marginBottom: 4 },
  aiResultScroll: { maxHeight: 280 },
  aiResultText: { fontSize: 15, color: '#1C1C1E', lineHeight: 24 },

  aiTip: { fontSize: 12, color: '#C7C7CC', marginTop: 8 },

  // Editor
  contentInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 28,
    color: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  toolBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolBtnActive: { backgroundColor: '#F0F6FF' },
  toolBtnEmoji: { fontSize: 20 },
  toolBtnLabel: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  toolBtnLabelActive: { color: '#007AFF', fontWeight: '600' },

  // AI floating action bar
  aiFloatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#F0F6FF',
    borderTopWidth: 1,
    borderTopColor: '#B3D4FC',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  aiFloatInsertBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  aiFloatInsertText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  aiDiscardText: { fontSize: 14, color: '#8E8E93' },
  aiRetryBtn: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  aiRetryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Inspiration detail modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalBodyScroll: { maxHeight: '100%' },
  modalBody: {
    fontSize: 16,
    lineHeight: 28,
    color: '#1C1C1E',
  },
  modalCloseBtn: {
    marginTop: 20,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
});
