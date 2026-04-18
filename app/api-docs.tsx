import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { Stack } from 'expo-router';

export default function ApiDocsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'API 使用文档' }} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <IntroCard />
        <QuickPickCard />
        <FreeSection />
        <PaidSection />
        <PlanSection />
        <StepsCard />
        <SecurityCard />
        <FaqCard />
        <Text style={styles.footer}>最后更新：2026 年 4 月 · 价格以官方为准</Text>
      </ScrollView>
    </>
  );
}

/* ── 卡片容器 ── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

/* ── 概览 ── */
function IntroCard() {
  return (
    <Card title="🔌 概览">
      <P>inHunt灵觅 需要接入大语言模型 API 才能使用 AI 功能。</P>
      <P>本应用兼容所有 OpenAI 兼容接口（{'/v1/chat/completions'}），只需填写三个字段即可接入：Base URL、API Key、模型名称。</P>
      <P>流程很简单：选平台 → 注册 → 拿 Key → 在设置中填入 Base URL、API Key 和模型名，不到 5 分钟。</P>
    </Card>
  );
}

/* ── 快速选择 ── */
function QuickPickCard() {
  return (
    <Card title="💡 不知道选哪个？">
      <View style={styles.bulletRow}>
        <Text style={styles.bullet}>🟢 零成本体验 → 智谱 GLM-4.7-Flash（免费，200K 上下文）</Text>
      </View>
      <View style={styles.bulletRow}>
        <Text style={styles.bullet}>🟠 偶尔用 → 按量计费，几元/月</Text>
      </View>
      <View style={styles.bulletRow}>
        <Text style={styles.bullet}>🩷 重度用 → 套餐方案，更划算</Text>
      </View>
    </Card>
  );
}

/* ── 免费方案 ── */
function FreeSection() {
  return (
    <Card title="🟢 免费方案">
      {/* 智谱免费 */}
      <Text style={styles.subHeading}>智谱 GLM — 免费额度</Text>
      <P>GLM-4.7-Flash 永久免费，200K 上下文，中文能力强。</P>
      <P>新用户注册还送额外 token 额度。免费模型处理复杂工程问题不如付费模型。</P>
      <View style={styles.stepBox}>
        <Text style={styles.step}>1. 注册 open.bigmodel.cn，完成实名认证</Text>
        <Text style={styles.step}>2. 在控制台创建 API Key 并复制</Text>
        <Text style={styles.step}>3. 灵觅设置中填写：</Text>
        <Text style={styles.step}>   · Base URL: https://open.bigmodel.cn/api/paas/v4</Text>
        <Text style={styles.step}>   · API Key: 粘贴你的 Key</Text>
        <Text style={styles.step}>   · 模型名称: glm-4.7-flash</Text>
      </View>

      <View style={styles.divider} />

      {/* ModelScope */}
      <Text style={styles.subHeading}>ModelScope 免费 API</Text>
      <P>阿里达摩院魔搭社区，支持 Qwen、DeepSeek 等模型。有频率和每日 token 限制，高峰期可能排队。</P>
      <View style={styles.stepBox}>
        <Text style={styles.step}>1. 注册 modelscope.cn，绑定阿里云账号 + 实名认证</Text>
        <Text style={styles.step}>2. 访问 modelscope.cn/my/myaccesstoken 创建 Token</Text>
        <Text style={styles.step}>3. 灵觅设置中填写：</Text>
        <Text style={styles.step}>   · Base URL: https://api-inference.modelscope.cn/v1</Text>
        <Text style={styles.step}>   · API Key: 粘贴你的 Token</Text>
        <Text style={styles.step}>   · 模型名称: 如 Qwen/Qwen3.5-35B-A3B</Text>
      </View>
    </Card>
  );
}

/* ── 按量计费 ── */
function PaidSection() {
  return (
    <Card title="🟠 按量计费">
      <P>用多少付多少，每月通常几元到几十元。</P>

      <Text style={styles.subHeading}>智谱 GLM</Text>
      <P>glm-4.7 / glm-5 / glm-5-turbo，200K 上下文。glm-5 旗舰级，Coding 能力对标 Claude Opus 4.5。详细价格见 open.bigmodel.cn/pricing</P>
      <View style={styles.stepBox}>
        <Text style={styles.step}>注册 → 实名认证 → 充值 → 创建 Key</Text>
        <Text style={styles.step}>Base URL: https://open.bigmodel.cn/api/paas/v4</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.subHeading}>DeepSeek</Text>
      <P>deepseek-chat (V3.2) / deepseek-reasoner，输入 ￥2/百万 token，输出 ￥3/百万 token，128K 上下文。</P>
      <View style={styles.stepBox}>
        <Text style={styles.step}>注册 platform.deepseek.com → 充值 → 创建 Key</Text>
        <Text style={styles.step}>Base URL: https://api.deepseek.com/v1</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.subHeading}>通义千问（阿里百炼）</Text>
      <P>qwen3.5-flash 超低价（输入 ￥0.2/百万），qwen3.5-plus 性价比高。百万 token 上下文。新用户有免费额度。</P>
      <View style={styles.stepBox}>
        <Text style={styles.step}>登录阿里云百炼控制台 → 开通 → 创建 Key</Text>
        <Text style={styles.step}>Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1</Text>
      </View>
    </Card>
  );
}

/* ── 套餐方案 ── */
function PlanSection() {
  return (
    <Card title="🩷 套餐方案">
      <P>重度用户更划算。</P>

      <Text style={styles.subHeading}>智谱 Coding Plan</Text>
      <P>Lite ￥49 / Pro ￥149 / Max ￥469 每月。按 Prompt 数计费，GLM-5+ 高峰期消耗 2-3 倍额度。经常缺货，需蹲点抢购。</P>
      <View style={styles.stepBox}>
        <Text style={styles.step}>Base URL: https://open.bigmodel.cn/api/coding/paas/v4</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.subHeading}>MiniMax Token Plan</Text>
      <P>Starter ￥29 / Plus ￥49 / Max ￥119 每月。极速版更贵但更快。</P>
      <View style={styles.stepBox}>
        <Text style={styles.step}>Base URL: https://api.minimaxi.com/v1</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.subHeading}>腾讯云 Coding Plan（聚合版）</Text>
      <P>Lite ￥40 / Pro ￥200 每月。一个订阅用多家模型（Hunyuan 2.0、GLM-5、Kimi-k2.5 等）。</P>

      <View style={styles.divider} />

      <Text style={styles.subHeading}>阿里百炼套餐</Text>
      <P>多种套餐可选，新用户可先用免费额度体验。详见百炼控制台。</P>
    </Card>
  );
}

/* ── 配置步骤 ── */
function StepsCard() {
  return (
    <Card title="📋 配置步骤">
      <View style={styles.stepBox}>
        <Text style={styles.step}>1. 打开灵觅 APP，点击底部 Tab「设置」</Text>
        <Text style={styles.step}>2. 点击「API 配置」</Text>
        <Text style={styles.step}>3. 填写 Base URL（参考上方各平台提供的地址）</Text>
        <Text style={styles.step}>4. 填写 API Key（从平台控制台获取）</Text>
        <Text style={styles.step}>5. 填写模型名称（如 glm-4.7-flash、deepseek-chat 等）</Text>
        <Text style={styles.step}>6. 保存后发一条消息测试</Text>
      </View>
    </Card>
  );
}

/* ── 安全说明 ── */
function SecurityCard() {
  return (
    <Card title="🔒 安全说明">
      <P>API Key 存储在系统密钥链（iOS Keychain / Android Keystore），不会明文保存。</P>
      <P>Key 仅发送到你填写的 Base URL 对应的模型 API 服务器，不会泄露给第三方。</P>
    </Card>
  );
}

/* ── FAQ ── */
function FaqCard() {
  return (
    <Card title="❓ 常见问题">
      <Text style={styles.subHeading}>提示「未配置 API Key」？</Text>
      <P>按上方步骤获取 Key 并填入设置。</P>

      <Text style={styles.subHeading}>403 错误？</Text>
      <P>检查 Key 是否完整、账户是否有余额、模型名是否正确。</P>

      <Text style={styles.subHeading}>很慢或超时？</Text>
      <P>检查网络；高峰期免费模型较慢，可尝试付费模型。</P>

      <Text style={styles.subHeading}>月费大概多少？</Text>
      <P>偶尔用 0~3 元 · 经常用 5~15 元 · 重度 ￥29~200/月。</P>

      <Text style={styles.subHeading}>支持哪些平台？</Text>
      <P>所有提供 OpenAI 兼容接口（{'/v1/chat/completions'}）的平台均可接入，包括但不限于上文列出的平台。其他常见平台：</P>
      <Text style={styles.note}>OpenAI → api.openai.com/v1 · Moonshot → api.moonshot.cn/v1 · 硅基流动 → api.siliconflow.cn/v1 · Groq → api.groq.com/openai/v1</Text>
    </Card>
  );
}

/* ── 样式 ── */
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingBottom: 48 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13, color: '#6D6D72', textTransform: 'uppercase',
    marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16, overflow: 'hidden',
  },
  body: { fontSize: 15, color: '#333', lineHeight: 22, marginBottom: 6 },
  subHeading: { fontSize: 16, fontWeight: '600', color: '#000', marginTop: 12, marginBottom: 4 },
  stepBox: { marginTop: 6, paddingLeft: 4 },
  step: { fontSize: 14, color: '#444', lineHeight: 22 },
  bulletRow: { marginBottom: 4 },
  bullet: { fontSize: 15, color: '#333', lineHeight: 22 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA', marginVertical: 12 },
  note: { fontSize: 13, color: '#8E8E93', lineHeight: 18, marginTop: 8 },
  footer: { fontSize: 12, color: '#AEAEB2', textAlign: 'center', marginTop: 16 },
});
