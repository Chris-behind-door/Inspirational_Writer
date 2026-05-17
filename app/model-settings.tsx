import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Stack } from 'expo-router';
import {
  getSettings,
  saveSettings,
  loadSettings,
  ModelSettings,
} from '../configStore';

type ParamDef = {
  key: keyof ModelSettings;
  label: string;
  sublabel: string;
  min: number;
  max: number;
  step: number;
};

const PARAMS: ParamDef[] = [
  { key: 'temperature', label: '温度', sublabel: 'Temperature', min: 0, max: 2, step: 0.1 },
  { key: 'topP', label: 'Top P', sublabel: 'Top P', min: 0, max: 1, step: 0.1 },
  { key: 'frequencyPenalty', label: '频率惩罚', sublabel: 'Frequency Penalty', min: -2, max: 2, step: 0.1 },
  { key: 'presencePenalty', label: '存在惩罚', sublabel: 'Presence Penalty', min: -2, max: 2, step: 0.1 },
  { key: 'concurrency', label: '并发数', sublabel: 'Concurrency', min: 1, max: 4, step: 1 },
];

export default function ModelSettingsScreen() {
  const [settings, setSettings] = useState<ModelSettings>(() => getSettings());
  const [editingKey, setEditingKey] = useState<keyof ModelSettings | null>(null);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => {
    loadSettings().then(() => setSettings({ ...getSettings() }));
  }, []);

  const isInteger = useCallback((key: keyof ModelSettings) => {
    const def = PARAMS.find(p => p.key === key);
    return def ? def.step >= 1 : false;
  }, []);

  const formatValue = useCallback((key: keyof ModelSettings, value: number) => {
    return isInteger(key) ? String(Math.round(value)) : value.toFixed(1);
  }, [isInteger]);

  const update = useCallback((key: keyof ModelSettings, value: number) => {
    const rounded = isInteger(key) ? Math.round(value) : Math.round(value * 10) / 10;
    const s = { ...settings, [key]: rounded };
    setSettings(s);
    saveSettings(s);
  }, [settings, isInteger]);

  const openEditor = useCallback((key: keyof ModelSettings) => {
    setEditingKey(key);
    setEditingValue(formatValue(key, settings[key]));
  }, [settings, formatValue]);

  const commitEdit = useCallback(() => {
    if (!editingKey) return;
    const v = parseFloat(editingValue);
    if (isNaN(v)) { setEditingKey(null); return; }
    const def = PARAMS.find(p => p.key === editingKey)!;
    const rounded = isInteger(editingKey) ? Math.round(v) : Math.round(v * 10) / 10;
    const clamped = Math.min(def.max, Math.max(def.min, rounded));
    update(editingKey, clamped);
    setEditingKey(null);
  }, [editingKey, editingValue, update, isInteger]);

  return (
    <>
      <Stack.Screen options={{ title: '模型参数' }} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        {PARAMS.map((def, i) => (
          <React.Fragment key={def.key}>
            {i > 0 && <View style={styles.separator} />}
            <View style={styles.paramRow}>
              <View style={styles.labelCol}>
                <Text style={styles.paramLabel}>{def.label}</Text>
                <Text style={styles.paramSublabel}>{def.sublabel}</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={def.min}
                maximumValue={def.max}
                step={def.step}
                value={settings[def.key]}
                onValueChange={(v: number) => update(def.key, v)}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#C7C7CC"
              />
              <TouchableOpacity onPress={() => openEditor(def.key)}>
                <Text style={styles.paramValue}>{formatValue(def.key, settings[def.key])}</Text>
              </TouchableOpacity>
            </View>
          </React.Fragment>
        ))}
      </ScrollView>

      {/* Inline edit modal */}
      <Modal visible={editingKey !== null} transparent animationType="fade" onRequestClose={() => setEditingKey(null)}>
        <View style={styles.centerOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>
              {PARAMS.find(p => p.key === editingKey)?.label}
            </Text>
            <TextInput
              style={styles.dialogInput}
              value={editingValue}
              onChangeText={setEditingValue}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              onSubmitEditing={commitEdit}
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={styles.dialogButton} onPress={() => setEditingKey(null)}>
                <Text style={styles.dialogButtonCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogButton, styles.dialogButtonPrimary]} onPress={commitEdit}>
                <Text style={styles.dialogButtonPrimaryText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 20,
    marginHorizontal: 16,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  labelCol: {
    width: 80,
  },
  paramLabel: {
    fontSize: 17,
    color: '#000000',
  },
  paramSublabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  paramValue: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
    width: 44,
    textAlign: 'right',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
  },
  centerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '80%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: 20,
    paddingBottom: 12,
  },
  dialogInput: {
    fontSize: 17,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
    marginHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
    color: '#000000',
  },
  dialogButtons: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    marginTop: 20,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dialogButtonCancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  dialogButtonPrimary: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#C6C6C8',
  },
  dialogButtonPrimaryText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
});
