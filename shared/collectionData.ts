import type { InspirationTag, InspirationItem } from './types';
import { TAG_OPTIONS } from './constants';
import { normalizeFolderName } from './utils';

export function buildSampleFolders(): string[] {
  return ['三生三世', '长安夜行', '星海遗民', '空白新坑'];
}

export function buildSampleItems(): InspirationItem[] {
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
      result: '"你不是忘了我，你只是终于学会了不再等我。"',
      createdAt: now - 1000 * 60 * 36,
      title: '月下诀别的半句对白',
      content: '"你不是忘了我，你只是终于学会了不再等我。"这句话可以安排在男女主第三世重逢时出现：说话的人看似决绝，其实是在试探对方是否还记得第一世的约定。',
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
      content: '人类文明把所有记忆上传到星海档案馆，却发现档案馆深处早已存在另一套关于人类灭亡的记录。主角的职业是"记忆修复师"，专门修补被战争损坏的人格备份。',
      folderName: '星海遗民',
      tags: ['world', 'plot'],
    },
  ];
}

export function inferTags(type?: string): InspirationTag[] {
  if (!type) return [];
  if (type.includes('角色')) return ['role'];
  if (type.includes('对话') || type.includes('对白') || type.includes('台词')) return ['dialogue'];
  if (type.includes('情节') || type.includes('剧情')) return ['plot'];
  if (type.includes('世界观') || type.includes('设定') || type.includes('场景')) return ['world'];
  return [];
}

export function normalizeTagValue(tag: string): InspirationTag | null {
  if (tag === 'role' || tag === 'plot' || tag === 'world' || tag === 'dialogue') {
    return tag;
  }
  if (tag === 'scene') return 'world';
  if (tag === 'line' || tag === 'conversation') return 'dialogue';
  return null;
}

export function normalizeItem(raw: any): InspirationItem {
  const rawTags = Array.isArray(raw?.tags) ? raw.tags : inferTags(raw?.type);
  const tags = Array.from(new Set(
    rawTags
      .map((tag: string) => normalizeTagValue(String(tag)))
      .filter(Boolean),
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

export function getTagLabel(tag: InspirationTag) {
  return TAG_OPTIONS.find(option => option.key === tag)?.label || tag;
}
