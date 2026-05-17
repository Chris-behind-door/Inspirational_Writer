import { createId } from './utils';

export type PresetType = 'character' | 'plot' | 'world' | 'dialogue';

export interface InspirationCard {
  id: string;
  title: string;
  content: string;
  type: PresetType;
  captured?: boolean;
}

// ── text cleaning ──

export function limitText(text: string, maxLength: number) {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/^[-*•\d.、]+\s*/, '')
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength);
}

export function stripCodeFence(text: string) {
  return String(text || '')
    .replace(/```(?:json|JSON)?\s*/g, '')
    .replace(/```/g, '')
    .trim();
}

export function compactText(text: string) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeTitle(text: string, fallback: string) {
  const cleaned = String(text || '')
    .replace(/^[-*•\d.、)）\s]+/, '')
    .replace(/^标题\s*[:：]\s*/i, '')
    .replace(/[《》「」"""'`*_#]/g, '')
    .trim();
  return limitText(cleaned || fallback, 24) || fallback;
}

export function normalizeContent(text: string) {
  return limitText(
    String(text || '')
      .replace(/^[-*•\d.、)）\s]+/, '')
      .replace(/^(正文|内容|描述|灵感)\s*[:：]\s*/i, '')
      .replace(/["'`*_#]/g, '')
      .trim(),
    100,
  );
}

// ── dedup insertion ──

function addParsedCard(
  cards: InspirationCard[],
  title: string,
  content: string,
  type: PresetType,
) {
  const normalizedContent = normalizeContent(content);
  if (!normalizedContent) return;

  const normalizedTitle = normalizeTitle(title, `灵感 ${cards.length + 1}`);
  const duplicated = cards.some(
    card => card.title === normalizedTitle && card.content === normalizedContent,
  );
  if (duplicated) return;

  cards.push({
    id: createId(`generated-${cards.length}`),
    title: normalizedTitle,
    content: normalizedContent,
    type,
  });
}

// ── JSON parse path ──

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
      // try next candidate
    }
  }

  return cards;
}

// ── text block parse path ──

function parseSingleTextBlock(
  block: string,
  index: number,
  _type: PresetType,
) {
  let cleaned = compactText(stripCodeFence(block))
    .replace(/^[-*•\d.、)）\s]+/, '')
    .replace(/\*\*/g, '')
    .trim();

  if (!cleaned) return null;

  const titleBodyMatch = cleaned.match(/标题\s*[:：]\s*([^\n]+)[\n\s]*(?:正文|内容|描述|灵感)\s*[:：]\s*([\s\S]+)/i);
  if (titleBodyMatch) {
    return { title: titleBodyMatch[1], content: titleBodyMatch[2] };
  }

  const nameBodyMatch = cleaned.match(/(?:名称|题目|卡片)\s*[:：]\s*([^\n]+)[\n\s]*(?:正文|内容|描述|灵感)\s*[:：]\s*([\s\S]+)/i);
  if (nameBodyMatch) {
    return { title: nameBodyMatch[1], content: nameBodyMatch[2] };
  }

  const colonIndex = cleaned.search(/[:：]/);
  if (colonIndex > 1 && colonIndex <= 32) {
    return { title: cleaned.slice(0, colonIndex), content: cleaned.slice(colonIndex + 1) };
  }

  const dashMatch = cleaned.match(/^(.{2,28}?)(?:\s*[—–-]\s+)([\s\S]+)/);
  if (dashMatch) {
    return { title: dashMatch[1], content: dashMatch[2] };
  }

  const lines = cleaned.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length >= 2 && lines[0].length <= 28) {
    return { title: lines[0], content: lines.slice(1).join(' ') };
  }

  return { title: `灵感 ${index + 1}`, content: cleaned };
}

function splitNumberedBlocks(text: string) {
  const cleaned = compactText(stripCodeFence(text));
  const matches = Array.from(
    cleaned.matchAll(/(?:^|\n|\s)(\d{1,2})[.、)）]\s+([\s\S]*?)(?=(?:\n|\s)\d{1,2}[.、)）]\s+|$)/g),
  );
  const blocks = matches.map(match => match[2].trim()).filter(block => block.length > 0);
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

// ── public entry ──

export function parseGeneratedCards(rawText: string, type: PresetType): InspirationCard[] {
  const jsonCards = tryParseJsonCards(rawText, type);
  const parsedCards = jsonCards.length > 0 ? jsonCards : parseTextCards(rawText, type);

  return parsedCards.slice(0, 8).map((card, index) => ({
    ...card,
    title: card.title || `灵感 ${index + 1}`,
    content: limitText(card.content, 100),
  }));
}
