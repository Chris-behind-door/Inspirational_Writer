import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PRESETS } from '../shared/inspirePresets';
import type { PresetType } from '../shared/parseCards';

interface Props {
  selectedType: PresetType;
  onSelectType: (type: PresetType) => void;
  customPrompt: string;
  onChangePrompt: (text: string) => void;
  generating: boolean;
  onGenerate: () => void;
}

export default function InspireControlPanel({
  selectedType,
  onSelectType,
  customPrompt,
  onChangePrompt,
  generating,
  onGenerate,
}: Props) {
  return (
    <View style={styles.controlPanel}>
      <View style={styles.typeRow}>
        {PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.key}
            style={[styles.typeButton, selectedType === preset.key && styles.typeButtonActive]}
            onPress={() => onSelectType(preset.key)}
            activeOpacity={0.85}
          >
            <Text style={styles.typeIcon}>{preset.icon}</Text>
            <Text style={[styles.typeLabel, selectedType === preset.key && styles.typeLabelActive]}>
              {preset.shortLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.promptBox}>
        <TextInput
          style={styles.promptInput}
          value={customPrompt}
          onChangeText={onChangePrompt}
          placeholder="补充描述，可不填。例如：青丘、狐狸、前世旧约…"
          placeholderTextColor="#A1A1A6"
          multiline
          numberOfLines={2}
          textAlignVertical="top"
          returnKeyType="done"
          blurOnSubmit={true}
        />
      </View>

      <TouchableOpacity
        style={[styles.generateButton, generating && styles.buttonDisabled]}
        onPress={onGenerate}
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
  );
}

const styles = StyleSheet.create({
  controlPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
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
});
