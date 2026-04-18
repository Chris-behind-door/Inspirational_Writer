# inHunt 灵觅

专为网文作者提供的灵感助手 APP。

## 技术栈

- **框架：** React Native + Expo (Expo Router)
- **语言：** TypeScript
- **持久化：** AsyncStorage (`@react-native-async-storage/async-storage`)
- **导航：** Expo Router（基于文件的路由，`app/` 目录）

## 项目结构

```
inHunt/
├── app/                          # 页面（Expo Router）
│   ├── _layout.tsx               # 根布局（Stack）
│   ├── +not-found.tsx            # 404 页
│   ├── +html.tsx                 # HTML 壳
│   ├── api-config.tsx            # API 配置页（预设管理 + 连接测试）
│   ├── api-docs.tsx              # API 使用文档
│   ├── model-settings.tsx        # 模型参数设置（温度、Top P 等）
│   ├── preferences.tsx           # 写作偏好设置
│   └── (tabs)/                   # 底部 Tab 页
│       ├── _layout.tsx           # Tab 布局定义
│       ├── inspire.tsx           # 灵感捕捉
│       ├── collection.tsx        # 灵感记录
│       ├── story.tsx             # 故事管理
│       └── settings.tsx          # 设置入口
├── configStore.ts                # 全局数据存储（预设、模型参数、偏好）
├── components/                   # 共享组件
└── constants/
    └── Colors.ts                 # 颜色常量
```

## 环境配置

```bash
# 安装依赖
npm install

# 启动开发服务器（Expo Go 扫码调试）
npm start

# 或指定平台
npx expo start --android
npx expo start --ios
npx expo start --web
```

**依赖：**
- Node.js v18+
- Expo Go（手机端）
- Android Studio / Xcode（如需模拟器）

## 数据存储

所有数据通过 `configStore.ts` 统一管理，使用 AsyncStorage 持久化。

### 导入

```typescript
import {
  // 预设
  Preset, loadPresets, getPresets, getActivePreset, getActivePresetId,
  savePreset, setActivePreset, deletePreset,
  // 模型参数
  ModelSettings, DEFAULT_SETTINGS, loadSettings, getSettings, saveSettings,
  // 偏好
  Preferences, loadPreferences, getPreferences, savePreferences,
} from '../configStore';
```

### 数据结构

```typescript
// API 预设
interface Preset {
  id: string;          // Date.now().toString()
  name: string;        // 用户自定义名称
  baseUrl: string;     // API Base URL（如 https://api.deepseek.com/v1）
  apiKey: string;      // API Key
  modelName: string;   // 模型名（如 glm-4-flash）
}

// 模型参数（全局共用，不按预设区分）
interface ModelSettings {
  temperature: number;        // 默认 0.7，范围 0~2
  topP: number;               // 默认 1.0，范围 0~1
  frequencyPenalty: number;   // 默认 0，范围 -2~2
  presencePenalty: number;    // 默认 0，范围 -2~2
}

// 写作偏好
interface Preferences {
  writingStyle: string;        // 文风偏好
  extraInstructions: string;   // 补充指令
}
```

### 用法模式

所有数据遵循同一模式：

```typescript
// 1. 页面加载时读取
useEffect(() => {
  loadPresets().then(() => { /* getPresets() 可用 */ });
  loadSettings().then(() => { /* getSettings() 可用 */ });
  loadPreferences().then(() => { /* getPreferences() 可用 */ });
}, []);

// 2. 读取（同步，从内存缓存）
const presets = getPresets();
const active = getActivePreset();
const settings = getSettings();
const prefs = getPreferences();

// 3. 保存（异步，写入 AsyncStorage + 更新内存）
await savePreset(preset);
await saveSettings(newSettings);
await savePreferences(newPrefs);
```

### AsyncStorage Keys

| Key | 内容 |
|-----|------|
| `@configStore/presets` | Preset[] JSON |
| `@configStore/activePresetId` | 当前应用预设的 id |
| `@configStore/modelSettings` | ModelSettings JSON |
| `@configStore/preferences` | Preferences JSON |

## 调用 AI API

测试消息的调用方式（供后续灵感生成等功能参考）：

```typescript
const activePreset = getActivePreset();
const settings = getSettings();
const prefs = getPreferences();

const baseUrl = activePreset.baseUrl.replace(/\/+$/, '');
const url = `${baseUrl}/chat/completions`;

const messages = [];
// 系统提示（偏好）
if (prefs.writingStyle || prefs.extraInstructions) {
  messages.push({
    role: 'system',
    content: [prefs.writingStyle, prefs.extraInstructions].filter(Boolean).join('\n'),
  });
}
messages.push({ role: 'user', content: '用户输入' });

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${activePreset.apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: activePreset.modelName,
    messages,
    temperature: settings.temperature,
    top_p: settings.topP,
    frequency_penalty: settings.frequencyPenalty,
    presence_penalty: settings.presencePenalty,
  }),
});
```

## UI 风格

iOS 设置页风格：
- 背景 `#F2F2F7`
- 卡片白色圆角 `borderRadius: 10`
- 分组标题灰色小字 `#6D6D72`，左对齐
- 导航项右侧 `›` 箭头
- 主色调 `#007AFF`
