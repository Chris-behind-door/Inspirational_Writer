import type { InspirationItem } from './types';
import { DEFAULT_FOLDER } from './constants';

export function normalizeFolderName(folderName?: string) {
  const name = String(folderName || '').trim();
  return name || DEFAULT_FOLDER;
}

export function uniqueFolderNames(folderNames: string[], items?: InspirationItem[]) {
  const result: string[] = [];

  const add = (name?: string) => {
    const normalized = normalizeFolderName(name);
    if (!result.includes(normalized)) {
      result.push(normalized);
    }
  };

  folderNames.forEach(add);
  if (items) {
    items.forEach(item => add(item.folderName));
  }

  return result.length > 0 ? result : [DEFAULT_FOLDER];
}

export function createId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatTime(timestamp: number) {
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
