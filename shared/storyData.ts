import type { InspirationTag } from './types';

export interface Story {
  id: string;
  title: string;
  content: string;
  outline: string[];
  pinnedInspirationIds: string[];
  createdAt: number;
  updatedAt: number;
}

export const STORY_STORAGE_KEY = '@inhunt/stories';

export function buildSampleStories(): Story[] {
  const now = Date.now();
  return [
    {
      id: 'sample-sansheng-story',
      title: '三生三世·青丘旧梦',
      content:
        '## 第一章：月圆之夜的古井\n\n月光洒在十里桃林的枝头，白狐蹲在古井旁，低头看着井水中没有倒映的自己。\n\n"你又来了。"身后传来一个熟悉的声音。\n\n她没有回头。三百年了，每次月圆之夜她都会来这里，而每次都会听见这个声音。她不确定这是记忆还是幻觉，但她知道——如果回头，就会想起那个已经被三生石抹去的名字。\n\n（未完待续…）',
      outline: [
        '第一章：月圆之夜的古井',
        '第二章：被封印的青丘旧梦',
        '第三章：三生石上的无名',
      ],
      pinnedInspirationIds: [
        'sample-sansheng-fox',
        'sample-sansheng-peach-forest',
        'sample-sansheng-dialogue',
      ],
      createdAt: now - 1000 * 60 * 60 * 2,
      updatedAt: now - 1000 * 60 * 30,
    },
    {
      id: 'sample-changan-story',
      title: '长安夜行',
      content: '## 第一章：宵禁后的夜市\n\n长安城的宵禁鼓刚过，坊门紧闭。\n\n巡夜人陆沉提着灯笼走过平康坊的巷口，忽然闻到一股不属于人间的脂粉香。他停下脚步，看到巷尾亮起了一排红灯笼——那是一条只有亡魂才能看见的夜市。\n\n（刚开始写…）',
      outline: ['第一章：宵禁后的夜市', '第二章：母亲的遗言'],
      pinnedInspirationIds: [
        'sample-changan-night-market',
        'sample-changan-assassin',
      ],
      createdAt: now - 1000 * 60 * 60 * 24,
      updatedAt: now - 1000 * 60 * 60 * 5,
    },
  ];
}

export function countChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

/** Parsed chapter */
export interface Chapter {
  title: string | null;  // null = content before the first ## heading
  body: string;
}

/**
 * Parse content into chapters.
 * Chapters are delimited by lines starting with "## ".
 * Content before the first heading becomes a chapter with title=null.
 */
export function parseChapters(content: string): Chapter[] {
  if (!content?.trim()) return [];

  const lines = content.split('\n');
  const chapters: Chapter[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      // Flush previous chapter
      if (currentLines.length > 0 || currentTitle !== null) {
        chapters.push({ title: currentTitle, body: currentLines.join('\n') });
      }
      currentTitle = line.slice(3).trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Flush last chapter
  if (currentLines.length > 0 || currentTitle !== null) {
    chapters.push({ title: currentTitle, body: currentLines.join('\n') });
  }

  // If no headings at all, return as single untitled chapter
  if (chapters.length === 0) {
    chapters.push({ title: null, body: content });
  }

  return chapters;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}
