import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

const INSPIRATION_STORAGE_KEY = '@inhunt/inspirations';
const FOLDER_STORAGE_KEY = '@inhunt/inspirationFolders';
const DEFAULT_FOLDER = '默认灵感夹';

interface StoredInspirationItem {
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

type PresetType = 'character' | 'plot' | 'world' | 'dialogue';
type InspirationTag = 'role' | 'plot' | 'world' | 'dialogue';

interface InspirationCard {
  id: string;
  title: string;
  content: string;
  type: PresetType;
  captured?: boolean;
}

const PRESETS: {
  key: PresetType;
  label: string;
  shortLabel: string;
  icon: string;
  tag: InspirationTag;
  tagLabel: string;
  systemPrompt: string;
}[] = [
  {
    key: 'character',
    label: '角色灵感',
    shortLabel: '角色',
    icon: '👤',
    tag: 'role',
    tagLabel: '角色',
    systemPrompt: '你是一位网文角色设计师，擅长生成可直接发展为主角、配角或反派的人物种子。',
  },
  {
    key: 'plot',
    label: '情节转折',
    shortLabel: '情节',
    icon: '🧩',
    tag: 'plot',
    tagLabel: '情节',
    systemPrompt: '你是一位网文情节策划师，擅长生成具有冲突、反转和连载钩子的情节灵感。',
  },
  {
    key: 'world',
    label: '世界观构建',
    shortLabel: '世界观',
    icon: '🌍',
    tag: 'world',
    tagLabel: '世界观',
    systemPrompt: '你是一位网文世界观构建师，擅长生成规则清晰、可扩展的设定灵感。',
  },
  {
    key: 'dialogue',
    label: '对话片段',
    shortLabel: '对话',
    icon: '💬',
    tag: 'dialogue',
    tagLabel: '对话',
    systemPrompt: '你是一位网文对白设计师，擅长生成有张力、有潜台词、可直接放入章节中的短对白。',
  },
];

function getPreset(type: PresetType) {
  return PRESETS.find(preset => preset.key === type) || PRESETS[0];
}

function normalizeFolderName(folderName?: string) {
  const name = String(folderName || '').trim();
  return name || DEFAULT_FOLDER;
}

function uniqueFolders(folderNames: string[]) {
  const result: string[] = [];
  folderNames.forEach(folderName => {
    const normalized = normalizeFolderName(folderName);
    if (!result.includes(normalized)) {
      result.push(normalized);
    }
  });
  return result.length > 0 ? result : [DEFAULT_FOLDER];
}

function createId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function limitText(text: string, maxLength: number) {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/^[-*•\d.、]+\s*/, '')
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength);
}

function stripCodeFence(text: string) {
  return String(text || '')
    .replace(/```(?:json|JSON)?\s*/g, '')
    .replace(/```/g, '')
    .trim();
}

function compactText(text: string) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeTitle(text: string, fallback: string) {
  const cleaned = String(text || '')
    .replace(/^[-*•\d.、)）\s]+/, '')
    .replace(/^标题\s*[:：]\s*/i, '')
    .replace(/[《》「」“”"'`*_#]/g, '')
    .trim();
  return limitText(cleaned || fallback, 24) || fallback;
}

function normalizeContent(text: string) {
  return limitText(
    String(text || '')
      .replace(/^[-*•\d.、)）\s]+/, '')
      .replace(/^(正文|内容|描述|灵感)\s*[:：]\s*/i, '')
      .replace(/["'`*_#]/g, '')
      .trim(),
    100
  );
}

function addParsedCard(cards: InspirationCard[], title: string, content: string, type: PresetType) {
  const normalizedContent = normalizeContent(content);
  if (!normalizedContent) return;

  const normalizedTitle = normalizeTitle(title, `灵感 ${cards.length + 1}`);
  const duplicated = cards.some(card => (
    card.title === normalizedTitle && card.content === normalizedContent
  ));
  if (duplicated) return;

  cards.push({
    id: createId(`generated-${cards.length}`),
    title: normalizedTitle,
    content: normalizedContent,
    type,
  });
}

function pickArrayFromParsed(parsed: any): any[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') return null;

  const candidateKeys = [
    'cards', 'inspirations', 'ideas', 'items', 'results', 'data',
    '灵感', '灵感卡片', 'inspirationCards',
  ];
  for (const key of candidateKeys) {
    if (Array.isArray(parsed[key])) return parsed[key];
  }

  const firstArray = Object.values(parsed).find(value => Array.isArray(value));
  return Array.isArray(firstArray) ? firstArray : null;
}

function tryParseJsonCards(rawText: string, type: PresetType): InspirationCard[] {
  const cards: InspirationCard[] = [];
  const cleaned = stripCodeFence(rawText);
  const candidates = [cleaned];

  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(cleaned.slice(arrayStart, arrayEnd + 1));
  }

  const objectStart = cleaned.indexOf('{');
  const objectEnd = cleaned.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(cleaned.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      let parsed = JSON.parse(candidate);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }

      const array = pickArrayFromParsed(parsed);
      if (!array) continue;

      array.forEach((item, index) => {
        if (typeof item === 'string') {
          const parsedLine = parseSingleTextBlock(item, index, type);
          if (parsedLine) addParsedCard(cards, parsedLine.title, parsedLine.content, type);
          return;
        }

        const title =
          item?.title || item?.Title || item?.name || item?.heading ||
          item?.标题 || item?.名称 || `灵感 ${index + 1}`;
        const content =
          item?.content || item?.body || item?.text || item?.description || item?.desc ||
          item?.正文 || item?.内容 || item?.描述 || item?.灵感 || '';
        addParsedCard(cards, String(title), String(content), type);
      });

      if (cards.length > 0) return cards;
    } catch {
      // 继续尝试其他候选片段。
    }
  }

  return cards;
}

function parseSingleTextBlock(block: string, index: number, type: PresetType) {
  let cleaned = compactText(stripCodeFence(block))
    .replace(/^[-*•\d.、)）\s]+/, '')
    .replace(/\*\*/g, '')
    .trim();

  if (!cleaned) return null;

  const titleBodyMatch = cleaned.match(/标题\s*[:：]\s*([^\n]+)[\n\s]*(?:正文|内容|描述|灵感)\s*[:：]\s*([\s\S]+)/i);
  if (titleBodyMatch) {
    return {
      title: titleBodyMatch[1],
      content: titleBodyMatch[2],
    };
  }

  const nameBodyMatch = cleaned.match(/(?:名称|题目|卡片)\s*[:：]\s*([^\n]+)[\n\s]*(?:正文|内容|描述|灵感)\s*[:：]\s*([\s\S]+)/i);
  if (nameBodyMatch) {
    return {
      title: nameBodyMatch[1],
      content: nameBodyMatch[2],
    };
  }

  const colonIndex = cleaned.search(/[:：]/);
  if (colonIndex > 1 && colonIndex <= 32) {
    return {
      title: cleaned.slice(0, colonIndex),
      content: cleaned.slice(colonIndex + 1),
    };
  }

  const dashMatch = cleaned.match(/^(.{2,28}?)(?:\s*[—–-]\s+)([\s\S]+)/);
  if (dashMatch) {
    return {
      title: dashMatch[1],
      content: dashMatch[2],
    };
  }

  const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length >= 2 && lines[0].length <= 28) {
    return {
      title: lines[0],
      content: lines.slice(1).join(' '),
    };
  }

  return {
    title: `灵感 ${index + 1}`,
    content: cleaned,
  };
}

function splitNumberedBlocks(text: string) {
  const cleaned = compactText(stripCodeFence(text));
  const matches = Array.from(cleaned.matchAll(/(?:^|\n|\s)(\d{1,2})[.、)）]\s+([\s\S]*?)(?=(?:\n|\s)\d{1,2}[.、)）]\s+|$)/g));
  const blocks = matches
    .map(match => match[2].trim())
    .filter(block => block.length > 0);
  return blocks.length >= 2 ? blocks : [];
}

function splitMarkdownBlocks(text: string) {
  const cleaned = compactText(stripCodeFence(text));
  const blocks = cleaned
    .split(/\n(?=\s*(?:#{1,4}\s+|[-*•]\s+|标题\s*[:：]))/g)
    .map(block => block.replace(/^#{1,4}\s+/, '').trim())
    .filter(Boolean);
  return blocks.length >= 2 ? blocks : [];
}

function splitLooseBlocks(text: string) {
  const cleaned = compactText(stripCodeFence(text));
  const byBlank = cleaned.split(/\n\s*\n/g).map(block => block.trim()).filter(Boolean);
  if (byBlank.length >= 2) return byBlank;

  const byTitle = cleaned
    .split(/(?=标题\s*[:：])/g)
    .map(block => block.trim())
    .filter(Boolean);
  if (byTitle.length >= 2) return byTitle;

  const bySemicolon = cleaned
    .split(/(?<=。|！|？)\s*(?=\d{1,2}[.、)）]?\s*[^，。！？]{2,24}[：:])/g)
    .map(block => block.trim())
    .filter(Boolean);
  return bySemicolon.length >= 2 ? bySemicolon : [cleaned];
}

function parseTextCards(rawText: string, type: PresetType): InspirationCard[] {
  const cards: InspirationCard[] = [];
  const blockGroups = [
    splitNumberedBlocks(rawText),
    splitMarkdownBlocks(rawText),
    splitLooseBlocks(rawText),
  ];

  for (const blocks of blockGroups) {
    cards.length = 0;
    blocks.forEach((block, index) => {
      const parsed = parseSingleTextBlock(block, index, type);
      if (parsed) addParsedCard(cards, parsed.title, parsed.content, type);
    });

    if (cards.length >= 2) return cards;
  }

  return cards;
}

function parseGeneratedCards(rawText: string, type: PresetType): InspirationCard[] {
  const jsonCards = tryParseJsonCards(rawText, type);
  const parsedCards = jsonCards.length > 0 ? jsonCards : parseTextCards(rawText, type);

  return parsedCards.slice(0, 8).map((card, index) => ({
    ...card,
    title: card.title || `灵感 ${index + 1}`,
    content: limitText(card.content, 100),
  }));
}

function buildFallbackCards(type: PresetType, customPrompt: string): InspirationCard[] {
  const preset = getPreset(type);
  const seed = customPrompt.trim() || preset.shortLabel;
  const templates: Record<PresetType, { title: string; content: string }[]> = {
    character: [
      { title: '隐姓埋名的继承人', content: `围绕“${seed}”，设计一位拒绝继承命运的人物。他越想逃离旧身份，越会被一个细节暴露。` },
      { title: '只说真话的骗子', content: '他从不撒谎，却能让所有人误解真相。主角第一次相信他时，也走进了最大的陷阱。' },
      { title: '失去名字的少女', content: '她的名字被写进禁书后从世上消失，只有仇敌还记得她是谁。' },
      { title: '替神明收债的人', content: '他替一位陨落神明讨回旧债，却发现每笔债都与自己的前世有关。' },
      { title: '被预言杀死的师父', content: '师父明知徒弟将来会杀自己，仍一步步把最危险的绝学教给他。' },
      { title: '不会做梦的王子', content: '王国所有预言都来自梦境，唯一不会做梦的王子反而成了最不可预测的人。' },
      { title: '雨夜来的医女', content: '她只在雨夜出诊，能救将死之人，却会带走患者最珍贵的一段记忆。' },
      { title: '收藏结局的书商', content: '他售卖别人故事的结局。主角发现自己的结局，被标成了特价旧书。' },
    ],
    plot: [
      { title: '胜利后的背叛', content: `围绕“${seed}”，主角刚赢下关键战役，却发现胜利本身正是敌人等待的开关。` },
      { title: '救人等于放出灾厄', content: '主角拼命救下的人，其实是封印大阵最后一枚活锁；善意立刻变成新的危机。' },
      { title: '婚礼上的通缉令', content: '婚礼进行到一半，宾客忽然发现新郎新娘都在同一张百年前的通缉令上。' },
      { title: '反派提前认输', content: '反派突然投降，请求主角杀了自己，因为真正的敌人只会在他死后现身。' },
      { title: '假死者寄来的信', content: '主角收到已故好友的来信，信中准确写出了明天将发生的背叛。' },
      { title: '全城共同撒谎', content: '主角查案时发现，全城人都知道真相，却为了同一个死人选择说谎。' },
      { title: '宝物选择了敌人', content: '传说中只认主角血脉的宝物，在众人面前主动飞向了敌方少年。' },
      { title: '最后一章被偷走', content: '主角发现自己的命运像书一样被书写，而最后一章已经被人提前撕走。' },
    ],
    world: [
      { title: '以记忆纳税的王朝', content: `围绕“${seed}”，这个世界用记忆缴税。富人保留财富，穷人慢慢忘记自己为何活着。` },
      { title: '月亮负责审判', content: '每逢满月，天空会显现一名罪人的过去。贵族们因此拼命控制月相历法。' },
      { title: '禁止说谎的城市', content: '城中所有谎言都会化为黑鸟飞出喉咙。最会沉默的人因此掌握最高权力。' },
      { title: '神明按季节轮值', content: '四季由不同神明管理，换季时权柄交接，凡人的命运也会被重新结算。' },
      { title: '影子可以继承家产', content: '贵族死亡后，影子若保持完整，就能继承爵位；谋杀因此变成破坏影子的艺术。' },
      { title: '书页决定寿命', content: '每个人出生时都有一本命书，页数就是寿命。改写命书是最昂贵的禁术。' },
      { title: '城门只向死人开放', content: '边境巨城只允许死者通过，活人若想入城，必须先交出一半灵魂。' },
      { title: '梦境是公共道路', content: '梦境被修成道路和驿站，刺客不再翻墙，而是在目标梦里等待。' },
    ],
    dialogue: [
      { title: '重逢试探', content: `“你还记得我？”“不记得。但我记得，恨你这件事练习过很多遍。”` },
      { title: '诀别反问', content: '“你要我留下？”“不，我要你走得慢一点，好让我有时间后悔。”' },
      { title: '师徒对峙', content: '“你教我仁义，却让我杀人。”“我教你仁义，是怕你杀人时忘了疼。”' },
      { title: '敌友未明', content: '“你到底站哪边？”“站在能让你活下去的那边，哪怕你会恨我。”' },
      { title: '婚约暗涌', content: '“这桩婚事你满意吗？”“满意，至少它让我终于有理由接近仇人。”' },
      { title: '神明低语', content: '“求神有用吗？”“有用。神会记住你低头的样子。”' },
      { title: '雨夜告白', content: '“我不是来救你的。”“我知道，你每次说谎前，都会先看一眼雨。”' },
      { title: '王座之前', content: '“坐上去，你会失去所有朋友。”“那就让他们先学会恨我。”' },
    ],
  };

  return templates[type].map((item, index) => ({
    id: createId(`fallback-${index}`),
    title: item.title,
    content: limitText(item.content, 100),
    type,
  }));
}

function buildPrompt(preset: ReturnType<typeof getPreset>, customPrompt: string) {
  const extra = customPrompt.trim();
  return [
    `请生成 8 个不同的“${preset.label}”网文灵感卡片。`,
    extra ? `用户补充描述：${extra}` : '用户没有补充描述，请自由随机发散。',
    '硬性输出要求：',
    '1. 必须返回 8 条，不多不少。',
    '2. 每条必须有明确 title 和 content。',
    '3. content 控制在 65~85 个汉字左右，最多不能超过 120 个汉字。',
    '4. 8 条灵感之间不要重复，标题也不要重复。',
    '5. 不要解释，不要前言，不要总结，不要 Markdown，不要代码块，不要编号列表。',
    '6. 整个回复只能是严格 JSON 数组，数组元素只能使用英文键 title 和 content。',
    '7. 格式必须类似：[{"title":"标题","content":"约75字正文"}]。',
  ].join('\n');
}

export default function InspireScreen() {
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


  const loadFolders = useCallback(async () => {
    try {
      const rawFolders = await AsyncStorage.getItem(FOLDER_STORAGE_KEY);
      const rawItems = await AsyncStorage.getItem(INSPIRATION_STORAGE_KEY);
      const folderNames: string[] = [];

      if (rawFolders) {
        const parsedFolders = JSON.parse(rawFolders);
        if (Array.isArray(parsedFolders)) {
          parsedFolders.forEach(folder => folderNames.push(normalizeFolderName(folder)));
        }
      }

      if (rawItems) {
        const parsedItems = JSON.parse(rawItems);
        if (Array.isArray(parsedItems)) {
          parsedItems.forEach(item => {
            if (item?.folderName) {
              folderNames.push(normalizeFolderName(item.folderName));
            }
          });
        }
      }

      const normalized = uniqueFolders(folderNames);
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
    }, [loadFolders])
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

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${active.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: active.modelName,
          messages: [
            { role: 'system', content: systemParts.join('\n\n') },
            { role: 'user', content: buildPrompt(preset, customPrompt) },
          ],
          temperature: Math.max(settings.temperature, 0.9),
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

      const generated = parseGeneratedCards(content, selectedType);
      if (generated.length === 0) {
        throw new Error('模型返回格式无法解析：没有识别到可展示的灵感卡片。请重新生成一次');
      }

      setCards(generated);
      if (generated.length < 8) {
        setError(`模型要求返回 8 条，但当前只成功解析出 ${generated.length} 条。未使用本地备用灵感补全，建议重新生成一次。`);
      }
    } catch (e: any) {
      setCards([]);
      setError(e?.message || '生成失败，请检查模型返回格式或重新生成一次。');
    } finally {
      setGenerating(false);
    }
  }, [selectedType, customPrompt]);

  const openCaptureModal = useCallback((card: InspirationCard) => {
    // 关闭详情弹窗后再打开捕捉弹窗，避免双层 Modal 在 Expo Go 中出现点击层级问题。
    setDetailCard(null);
    loadFolders().finally(() => {
      setCaptureCard(card);
      setCaptureFolder(latestFolder || folders[0] || DEFAULT_FOLDER);
      setNewFolderName('');
    });
  }, [folders, latestFolder, loadFolders]);

  const persistFoldersIfNeeded = useCallback(async (folderName: string) => {
    const normalizedName = normalizeFolderName(folderName);
    const updated = uniqueFolders([...folders, normalizedName]);
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
      Alert.alert('已捕捉', `灵感已添加至“${folderName}”。`);
    } catch {
      Alert.alert('保存失败', '没有成功写入灵感记录，请稍后再试。');
    }
  }, [captureCard, captureFolder, customPrompt, newFolderName, persistFoldersIfNeeded]);

  const renderCard = useCallback(({ item }: { item: InspirationCard }) => {
    const preset = getPreset(item.type);
    return (
      <TouchableOpacity
        style={styles.inspirationCard}
        activeOpacity={0.88}
        onPress={() => setDetailCard(item)}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTag}>{preset.tagLabel}</Text>
          <Text style={[styles.captureState, item.captured && styles.captureStateDone]}>
            {item.captured ? '已捕捉' : '可捕捉'}
          </Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardContent} numberOfLines={4}>{item.content}</Text>
      </TouchableOpacity>
    );
  }, []);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={styles.resultsArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.pageSubtitle}>生成多张灵感卡片，点开后可捕捉到灵感夹。</Text>
          </View>
          {generating && <ActivityIndicator color="#007AFF" />}
        </View>

        {!hasConfig && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>⚙️ 尚未配置 API。点击生成时会使用本地备用灵感，正式生成请到设置页配置 API。</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {cards.length === 0 ? (
          <View style={styles.emptyResult}>
            <Text style={styles.emptyResultIcon}>✨</Text>
            <Text style={styles.emptyResultTitle}>还没有生成灵感</Text>
            <Text style={styles.emptyResultHint}>在底部选择类型，补充一点方向，然后点击生成。</Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            keyExtractor={item => item.id}
            renderItem={renderCard}
            numColumns={2}
            columnWrapperStyle={styles.cardRow}
            contentContainerStyle={styles.cardList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      <View style={styles.controlPanel}>
        <View style={styles.typeRow}>
          {PRESETS.map(preset => (
            <TouchableOpacity
              key={preset.key}
              style={[
                styles.typeButton,
                selectedType === preset.key && styles.typeButtonActive,
              ]}
              onPress={() => {
                setSelectedType(preset.key);
                setError(null);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.typeIcon}>{preset.icon}</Text>
              <Text style={[
                styles.typeLabel,
                selectedType === preset.key && styles.typeLabelActive,
              ]}>{preset.shortLabel}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.promptBox}>
          <TextInput
            style={styles.promptInput}
            value={customPrompt}
            onChangeText={setCustomPrompt}
            placeholder="补充描述，可不填。例如：青丘、狐狸、前世旧约…"
            placeholderTextColor="#A1A1A6"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        <TouchableOpacity
          style={[styles.generateButton, generating && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={generating}
          activeOpacity={0.9}
        >
          {generating ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.generateButtonText}>生成中…</Text>
            </>
          ) : (
            <Text style={styles.generateButtonText}>生成灵感</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!detailCard}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailCard(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModal}>
            {detailCard && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setDetailCard(null)}>
                    <Text style={styles.modalCancel}>关闭</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openCaptureModal(detailCard)}>
                    <Text style={styles.modalCapture}>{detailCard.captured ? '再次捕捉' : '捕捉'}</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.detailTag}>{getPreset(detailCard.type).tagLabel}</Text>
                  <Text style={styles.detailTitle}>{detailCard.title}</Text>
                  <Text style={styles.detailContent}>{detailCard.content}</Text>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!captureCard}
        transparent
        animationType="slide"
        onRequestClose={() => setCaptureCard(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.captureModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCaptureCard(null)}>
                <Text style={styles.modalCancel}>取消</Text>
              </TouchableOpacity>
              <Text style={styles.captureTitle}>选择灵感夹</Text>
              <TouchableOpacity onPress={handleCapture}>
                <Text style={styles.modalCapture}>添加</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.folderList} keyboardShouldPersistTaps="handled">
              {folders.map(folder => (
                <TouchableOpacity
                  key={folder}
                  style={styles.folderRow}
                  onPress={() => {
                    setCaptureFolder(folder);
                    setNewFolderName('');
                  }}
                >
                  <Text style={styles.folderName}>{folder}</Text>
                  <Text style={styles.folderCheck}>{captureFolder === folder && !newFolderName.trim() ? '✓' : ''}</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.newFolderBox}>
                <Text style={styles.newFolderLabel}>新建灵感夹并添加</Text>
                <TextInput
                  style={styles.newFolderInput}
                  value={newFolderName}
                  onChangeText={setNewFolderName}
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
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  resultsArea: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  pageSubtitle: {
    maxWidth: 320,
    fontSize: 14,
    color: '#6D6D72',
    lineHeight: 20,
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
    color: '#000000',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 15,
    color: '#6D6D72',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorCard: {
    backgroundColor: '#FFF3F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    lineHeight: 19,
  },
  warningCard: {
    backgroundColor: '#FFF9E8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 13,
    color: '#8A5A00',
    lineHeight: 19,
  },
  emptyResult: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  emptyResultIcon: {
    fontSize: 46,
    marginBottom: 12,
  },
  emptyResultTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  emptyResultHint: {
    fontSize: 14,
    color: '#6D6D72',
    textAlign: 'center',
  },
  cardList: {
    paddingBottom: 10,
  },
  cardRow: {
    gap: 10,
    marginBottom: 10,
  },
  inspirationCard: {
    flex: 1,
    minHeight: 152,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 13,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTag: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#E8F0FE',
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  captureState: {
    fontSize: 11,
    color: '#8E8E93',
  },
  captureStateDone: {
    color: '#34C759',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    lineHeight: 21,
    marginBottom: 7,
  },
  cardContent: {
    fontSize: 13,
    color: '#3A3A3C',
    lineHeight: 20,
  },
  controlPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: '#E8F0FE',
    borderColor: '#007AFF',
  },
  typeIcon: {
    fontSize: 17,
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 12,
    color: '#3A3A3C',
    fontWeight: '600',
  },
  typeLabelActive: {
    color: '#007AFF',
  },
  promptBox: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 10,
  },
  promptInput: {
    minHeight: 46,
    maxHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#000000',
    fontSize: 14,
    lineHeight: 19,
  },
  generateButton: {
    height: 48,
    backgroundColor: '#007AFF',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
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
  captureModal: {
    width: '100%',
    maxHeight: '76%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  captureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
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
