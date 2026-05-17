import type { InspirationTag } from './types';

export const INSPIRATION_STORAGE_KEY = '@inhunt/inspirations';
export const FOLDER_STORAGE_KEY = '@inhunt/inspirationFolders';
export const DEFAULT_FOLDER = '默认灵感夹';

export const ALL_FOLDERS = '__all_folders__';
export const ALL_TAGS = '__all_tags__';

export const TAG_OPTIONS: { key: InspirationTag; label: string; icon: string }[] = [
  { key: 'role', label: '角色', icon: '👤' },
  { key: 'plot', label: '情节', icon: '🧩' },
  { key: 'world', label: '世界观', icon: '🌍' },
  { key: 'dialogue', label: '对话', icon: '💬' },
];
