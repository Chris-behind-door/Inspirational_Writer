import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { getPresets, savePreset, setActivePreset, loadPresets, getActivePresetId, Preset } from '../configStore';

const NEW_PRESET_ID = '__new__';

function buildApiUrl(baseUrl: string, path: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed + path;
}

export default function ApiConfigScreen() {
  const router = useRouter();

  // 预设列表（本地镜像，初始化从 store）
  const [presets, setPresets] = useState<Preset[]>(() => getPresets());

  // 启动时从 AsyncStorage 恢复
  useEffect(() => {
    loadPresets().then(() => setPresets([...getPresets()]));
  }, []);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(NEW_PRESET_ID);
  // 记录原始值用于比较
  const [originalValues, setOriginalValues] = useState<{ baseUrl: string; apiKey: string; model: string } | null>(null);

  // 表单字段
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // 操作状态
  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [connectionResult, setConnectionResult] = useState<string | null>(null);
  const [messageResult, setMessageResult] = useState<string | null>(null);

  // 保存模态框
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // 预设选择
  const [pickerVisible, setPickerVisible] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const onSelectPreset = useCallback(
    (id: string) => {
      setPickerVisible(false);
      if (id === NEW_PRESET_ID) {
        setSelectedPresetId(NEW_PRESET_ID);
        setBaseUrl('');
        setApiKey('');
        setModel('');
        setOriginalValues(null);
      } else {
        const p = presets.find((x) => x.id === id);
        if (p) {
          setSelectedPresetId(p.id);
          setBaseUrl(p.baseUrl);
          setApiKey(p.apiKey);
          setModel(p.modelName);
          setOriginalValues({ baseUrl: p.baseUrl, apiKey: p.apiKey, model: p.modelName });
        }
      }
      setConnectionResult(null);
      setMessageResult(null);
    },
    [presets],
  );

  const validateFields = useCallback(() => {
    if (!baseUrl.trim() || !apiKey.trim() || !model.trim()) {
      Alert.alert('提示', '请填写所有字段');
      return false;
    }
    return true;
  }, [baseUrl, apiKey, model]);

  // 连接测试（真实）
  const handleTestConnection = useCallback(async () => {
    if (!validateFields()) return;
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const url = buildApiUrl(baseUrl.trim(), '/models');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (res.ok) {
        setConnectionResult('✅ 连接成功');
      } else {
        setConnectionResult(`❌ 连接失败: HTTP ${res.status} ${res.statusText}`);
      }
    } catch (e: any) {
      setConnectionResult(`❌ 连接失败: ${e.message || '网络错误'}`);
    } finally {
      setTestingConnection(false);
    }
  }, [baseUrl, apiKey, validateFields]);

  // 发送测试消息（真实）
  const handleSendTestMessage = useCallback(async () => {
    if (!validateFields()) return;
    setSendingMessage(true);
    setMessageResult(null);
    try {
      const url = buildApiUrl(baseUrl.trim(), '/chat/completions');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.trim(),
          messages: [{ role: 'user', content: '请用一句话回复：你好' }],
          max_tokens: 512,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        setMessageResult(`❌ 请求失败: HTTP ${res.status} ${res.statusText}\n${errText}`);
      } else {
        const data = await res.json();
        const choice = data?.choices?.[0];
        if (choice?.finish_reason === 'length') {
          setMessageResult('⚠️ 回复被截断（max_tokens 不够），请尝试增大或换用不支持思考模式的模型');
        } else {
          const reply = choice?.message?.content || JSON.stringify(data);
          setMessageResult(`✅ 模型回复: "${reply}"`);
        }
      }
    } catch (e: any) {
      setMessageResult(`❌ 请求失败: ${e.message || '网络错误'}`);
    } finally {
      setSendingMessage(false);
    }
  }, [baseUrl, apiKey, model, validateFields]);

  // 判断保存按钮是否禁用：新建始终可点；已应用的未修改预设禁用
  const isSaveDisabled = useCallback(() => {
    if (selectedPresetId === NEW_PRESET_ID) return false;
    if (!originalValues) return false;
    const activeId = getActivePresetId();
    // 如果当前预设就是已应用的，且未修改，则禁用
    if (selectedPresetId === activeId &&
        baseUrl === originalValues.baseUrl &&
        apiKey === originalValues.apiKey &&
        model === originalValues.model) {
      return true;
    }
    return false;
  }, [selectedPresetId, baseUrl, apiKey, model, originalValues]);

  // 保存（已有预设）
  const handleSave = useCallback(async () => {
    if (!validateFields()) return;

    if (selectedPresetId === NEW_PRESET_ID) {
      setNewPresetName('');
      setSaveModalVisible(true);
    } else {
      const updated: Preset = {
        id: selectedPresetId,
        name: presets.find(p => p.id === selectedPresetId)?.name || '',
        baseUrl,
        apiKey,
        modelName: model,
      };
      await savePreset(updated);
      await setActivePreset(selectedPresetId);
      setPresets([...getPresets()]);
      setOriginalValues({ baseUrl, apiKey, model });
      showToast('已保存并应用');
    }
  }, [selectedPresetId, presets, baseUrl, apiKey, model, validateFields, showToast]);

  const handleSaveNewPreset = useCallback(async () => {
    const name = newPresetName.trim();
    if (!name) {
      Alert.alert('提示', '请输入预设名称');
      return;
    }
    const id = Date.now().toString();
    const preset: Preset = { id, name, baseUrl, apiKey, modelName: model };
    await savePreset(preset);
    await setActivePreset(id);
    setPresets([...getPresets()]);
    setSelectedPresetId(id);
    setOriginalValues({ baseUrl, apiKey, model });
    setSaveModalVisible(false);
    showToast('已保存并应用');
  }, [newPresetName, baseUrl, apiKey, model, showToast]);

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);
  const currentActiveId = getActivePresetId() ?? null;
  const presetLabel = selectedPreset ? selectedPreset.name + (selectedPreset.id === currentActiveId ? ' ✓' : '') : '新建预设';

  return (
    <>
      <Stack.Screen options={{ title: 'API 配置' }} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        {/* 预设选择 */}
        <Text style={styles.sectionTitle}>预设</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.navItem} onPress={() => setPickerVisible(true)}>
            <Text style={styles.navLabel}>{presetLabel}</Text>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 配置字段 */}
        <Text style={styles.sectionTitle}>连接配置</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Base URL</Text>
            <TextInput
              style={styles.fieldInput}
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder="https://api.example.com/v1"
              placeholderTextColor="#C7C7CC"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>API Key</Text>
            <View style={styles.apiKeyRow}>
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="sk-..."
                placeholderTextColor="#C7C7CC"
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowApiKey((v) => !v)}
                style={styles.eyeButton}>
                <Text style={styles.eyeIcon}>{showApiKey ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>模型</Text>
            <TextInput
              style={styles.fieldInput}
              value={model}
              onChangeText={setModel}
              placeholder="glm-4-flash"
              placeholderTextColor="#C7C7CC"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* 操作按钮 */}
        <Text style={styles.sectionTitle}>测试</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.buttonRow, testingConnection && styles.buttonDisabled]}
            onPress={handleTestConnection}
            disabled={testingConnection}>
            {testingConnection ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : null}
            <Text
              style={[
                styles.buttonText,
                testingConnection && { marginLeft: 8 },
              ]}>
              {testingConnection ? '测试中…' : '连接测试'}
            </Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity
            style={[styles.buttonRow, sendingMessage && styles.buttonDisabled]}
            onPress={handleSendTestMessage}
            disabled={sendingMessage}>
            {sendingMessage ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : null}
            <Text
              style={[
                styles.buttonText,
                sendingMessage && { marginLeft: 8 },
              ]}>
              {sendingMessage ? '发送中…' : '发送测试消息'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 反馈区域 */}
        {(connectionResult || messageResult) && (
          <View style={styles.resultCard}>
            {connectionResult ? (
              <Text style={[styles.resultText, connectionResult.startsWith('❌') && styles.resultError]}>
                {connectionResult}
              </Text>
            ) : null}
            {messageResult ? (
              <Text style={[styles.resultText, messageResult.startsWith('❌') && styles.resultError]}>
                {messageResult}
              </Text>
            ) : null}
          </View>
        )}

        {/* 保存按钮 */}
        <TouchableOpacity
          style={[styles.saveButton, isSaveDisabled() && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaveDisabled()}>
          <Text style={[styles.saveButtonText, isSaveDisabled() && styles.saveButtonTextDisabled]}>
            保存并应用
          </Text>
        </TouchableOpacity>

        {/* API 文档导航 */}
        <Text style={styles.sectionTitle}>更多</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/api-docs' as any)}>
            <Text style={styles.navLabel}>API 使用文档</Text>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 预设选择 ActionSheet (Modal) */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerVisible(false)} />
        <View style={styles.actionSheet}>
          <View style={styles.actionSheetHeader}>
            <Text style={styles.actionSheetTitle}>选择预设</Text>
          </View>
          <ScrollView style={styles.actionSheetList}>
            {presets.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.actionSheetItem,
                  p.id === selectedPresetId && styles.actionSheetItemActive,
                ]}
                onPress={() => onSelectPreset(p.id)}>
                <Text
                  style={[
                    styles.actionSheetItemText,
                    p.id === selectedPresetId && styles.actionSheetItemTextActive,
                  ]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.actionSheetItem,
                selectedPresetId === NEW_PRESET_ID && styles.actionSheetItemActive,
              ]}
              onPress={() => onSelectPreset(NEW_PRESET_ID)}>
              <Text
                style={[
                  styles.actionSheetItemText,
                  selectedPresetId === NEW_PRESET_ID && styles.actionSheetItemTextActive,
                ]}>
                ＋ 新建预设
              </Text>
            </TouchableOpacity>
          </ScrollView>
          <TouchableOpacity
            style={styles.actionSheetCancel}
            onPress={() => setPickerVisible(false)}>
            <Text style={styles.actionSheetCancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* 保存新建预设 Modal */}
      <Modal visible={saveModalVisible} transparent animationType="fade" onRequestClose={() => setSaveModalVisible(false)}>
        <View style={styles.centerOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>新建预设</Text>
            <TextInput
              style={styles.dialogInput}
              value={newPresetName}
              onChangeText={setNewPresetName}
              placeholder="输入预设名称"
              placeholderTextColor="#C7C7CC"
              autoFocus
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.dialogButton}
                onPress={() => setSaveModalVisible(false)}>
                <Text style={styles.dialogButtonCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={handleSaveNewPreset}>
                <Text style={styles.dialogButtonPrimaryText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
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
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navLabel: {
    fontSize: 17,
    color: '#000000',
  },
  navArrow: {
    fontSize: 20,
    color: '#C7C7CC',
    fontWeight: '600',
  },

  // Fields
  fieldRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#6D6D72',
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 17,
    color: '#000000',
    padding: 0,
    minHeight: 24,
  },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  eyeIcon: {
    fontSize: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginLeft: 16,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Result
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
  },
  resultText: {
    fontSize: 15,
    color: '#34C759',
    lineHeight: 22,
  },
  resultError: {
    color: '#FF3B30',
  },

  // Save
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  saveButtonTextDisabled: {
    color: '#E0E0E0',
  },

  // ActionSheet
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  actionSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 34,
  },
  actionSheetHeader: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  actionSheetTitle: {
    fontSize: 13,
    color: '#6D6D72',
    textTransform: 'uppercase',
  },
  actionSheetList: {
    maxHeight: 300,
  },
  actionSheetItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  actionSheetItemActive: {
    backgroundColor: '#E8F0FE',
  },
  actionSheetItemText: {
    fontSize: 20,
    color: '#007AFF',
    textAlign: 'center',
  },
  actionSheetItemTextActive: {
    fontWeight: '600',
  },
  actionSheetCancel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 8,
    marginHorizontal: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: '600',
  },

  // Dialog
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

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
