import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { getPreferences, loadPreferences, savePreferences } from '../configStore';

export default function PreferencesScreen() {
  const router = useRouter();
  const [writingStyle, setWritingStyle] = useState('');
  const [extraInstructions, setExtraInstructions] = useState('');

  useEffect(() => {
    loadPreferences().then(() => {
      const p = getPreferences();
      setWritingStyle(p.writingStyle);
      setExtraInstructions(p.extraInstructions);
    });
  }, []);

  const handleSave = async () => {
    await savePreferences({ writingStyle, extraInstructions });
    Alert.alert('已保存', '偏好设置已更新');
  };

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: '偏好设置', headerBackTitle: '返回' }} />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.sectionTitle}>文风偏好</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="描述你喜欢的写作风格，如：轻松幽默、口语化、少用成语..."
            placeholderTextColor="#C7C7CC"
            value={writingStyle}
            onChangeText={setWritingStyle}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.sectionTitle}>补充指令</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="给 AI 的额外规则，如：对话多写一点，不要用排比句..."
            placeholderTextColor="#C7C7CC"
            value={extraInstructions}
            onChangeText={setExtraInstructions}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>保存</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  textInput: {
    height: 120,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
