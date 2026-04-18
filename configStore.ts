import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Preset {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

const KEYS = {
  presets: '@configStore/presets',
  activeId: '@configStore/activePresetId',
};

let presets: Preset[] = [];
let activePresetId: string | null = null;

export async function loadPresets(): Promise<void> {
  try {
    const [raw, idRaw] = await AsyncStorage.multiGet([KEYS.presets, KEYS.activeId]);
    if (raw[1]) presets = JSON.parse(raw[1]) as Preset[];
    if (idRaw[1] !== null && idRaw[1] !== undefined) activePresetId = idRaw[1];
  } catch {
    presets = [];
    activePresetId = null;
  }
}

export function getPresets() { return presets; }
export function getActivePresetId() { return activePresetId; }
export function getActivePreset() { return presets.find(p => p.id === activePresetId) || null; }

export async function savePreset(preset: Preset): Promise<void> {
  const idx = presets.findIndex(p => p.id === preset.id);
  if (idx >= 0) presets[idx] = preset;
  else presets.push(preset);
  try {
    await AsyncStorage.setItem(KEYS.presets, JSON.stringify(presets));
  } catch { /* ignore */ }
}

export async function setActivePreset(id: string): Promise<void> {
  activePresetId = id;
  try {
    await AsyncStorage.setItem(KEYS.activeId, id);
  } catch { /* ignore */ }
}

export async function deletePreset(id: string): Promise<void> {
  presets = presets.filter(p => p.id !== id);
  if (activePresetId === id) activePresetId = null;
  try {
    await AsyncStorage.setItem(KEYS.presets, JSON.stringify(presets));
    await AsyncStorage.setItem(KEYS.activeId, activePresetId ?? '');
  } catch { /* ignore */ }
}
