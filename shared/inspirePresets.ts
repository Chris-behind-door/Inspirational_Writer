import type { InspirationTag } from './types';
import { createId } from './utils';
import type { PresetType, InspirationCard } from './parseCards';
import { limitText } from './parseCards';

export const PRESETS: {
  key: PresetType;
  label: string;
  shortLabel: string;
  icon: string;
  tag: InspirationTag;
  tagLabel: string;
  systemPrompt: string;
}[] = [
  {
    key: 'character',
    label: '角色灵感',
    shortLabel: '角色',
    icon: '👤',
    tag: 'role',
    tagLabel: '角色',
    systemPrompt: '你是一位网文角色设计师，擅长生成可直接发展为主角、配角或反派的人物种子。',
  },
  {
    key: 'plot',
    label: '情节转折',
    shortLabel: '情节',
    icon: '🧩',
    tag: 'plot',
    tagLabel: '情节',
    systemPrompt: '你是一位网文情节策划师，擅长生成具有冲突、反转和连载钩子的情节灵感。',
  },
  {
    key: 'world',
    label: '世界观构建',
    shortLabel: '世界观',
    icon: '🌍',
    tag: 'world',
    tagLabel: '世界观',
    systemPrompt: '你是一位网文世界观构建师，擅长生成规则清晰、可扩展的设定灵感。',
  },
  {
    key: 'dialogue',
    label: '对话片段',
    shortLabel: '对话',
    icon: '💬',
    tag: 'dialogue',
    tagLabel: '对话',
    systemPrompt: '你是一位网文对白设计师，擅长生成有张力、有潜台词、可直接放入章节中的短对白。',
  },
];

export function getPreset(type: PresetType) {
  return PRESETS.find(preset => preset.key === type) || PRESETS[0];
}

export function buildFallbackCards(type: PresetType, customPrompt: string): InspirationCard[] {
  const preset = getPreset(type);
  const seed = customPrompt.trim() || preset.shortLabel;
  const templates: Record<PresetType, { title: string; content: string }[]> = {
    character: [
      { title: '隐姓埋名的继承人', content: `围绕"${seed}"，设计一位拒绝继承命运的人物。他越想逃离旧身份，越会被一个细节暴露。` },
      { title: '只说真话的骗子', content: '他从不撒谎，却能让所有人误解真相。主角第一次相信他时，也走进了最大的陷阱。' },
      { title: '失去名字的少女', content: '她的名字被写进禁书后从世上消失，只有仇敌还记得她是谁。' },
      { title: '替神明收债的人', content: '他替一位陨落神明讨回旧债，却发现每笔债都与自己的前世有关。' },
      { title: '被预言杀死的师父', content: '师父明知徒弟将来会杀自己，仍一步步把最危险的绝学教给他。' },
      { title: '不会做梦的王子', content: '王国所有预言都来自梦境，唯一不会做梦的王子反而成了最不可预测的人。' },
      { title: '雨夜来的医女', content: '她只在雨夜出诊，能救将死之人，却会带走患者最珍贵的一段记忆。' },
      { title: '收藏结局的书商', content: '他售卖别人故事的结局。主角发现自己的结局，被标成了特价旧书。' },
    ],
    plot: [
      { title: '胜利后的背叛', content: `围绕"${seed}"，主角刚赢下关键战役，却发现胜利本身正是敌人等待的开关。` },
      { title: '救人等于放出灾厄', content: '主角拼命救下的人，其实是封印大阵最后一枚活锁；善意立刻变成新的危机。' },
      { title: '婚礼上的通缉令', content: '婚礼进行到一半，宾客忽然发现新郎新娘都在同一张百年前的通缉令上。' },
      { title: '反派提前认输', content: '反派突然投降，请求主角杀了自己，因为真正的敌人只会在他死后现身。' },
      { title: '假死者寄来的信', content: '主角收到已故好友的来信，信中准确写出了明天将发生的背叛。' },
      { title: '全城共同撒谎', content: '主角查案时发现，全城人都知道真相，却为了同一个死人选择说谎。' },
      { title: '宝物选择了敌人', content: '传说中只认主角血脉的宝物，在众人面前主动飞向了敌方少年。' },
      { title: '最后一章被偷走', content: '主角发现自己的命运像书一样被书写，而最后一章已经被人提前撕走。' },
    ],
    world: [
      { title: '以记忆纳税的王朝', content: `围绕"${seed}"，这个世界用记忆缴税。富人保留财富，穷人慢慢忘记自己为何活着。` },
      { title: '月亮负责审判', content: '每逢满月，天空会显现一名罪人的过去。贵族们因此拼命控制月相历法。' },
      { title: '禁止说谎的城市', content: '城中所有谎言都会化为黑鸟飞出喉咙。最会沉默的人因此掌握最高权力。' },
      { title: '神明按季节轮值', content: '四季由不同神明管理，换季时权柄交接，凡人的命运也会被重新结算。' },
      { title: '影子可以继承家产', content: '贵族死亡后，影子若保持完整，就可以继承爵位；谋杀因此变成破坏影子的艺术。' },
      { title: '书页决定寿命', content: '每个人出生时都有一本命书，页数就是寿命。改写命书是最昂贵的禁术。' },
      { title: '城门只向死人开放', content: '边境巨城只允许死者通过，活人若想入城，必须先交出一半灵魂。' },
      { title: '梦境是公共道路', content: '梦境被修成道路和驿站，刺客不再翻墙，而是在目标梦里等待。' },
    ],
    dialogue: [
      { title: '重逢试探', content: `"你还记得我？""不记得。但我记得，恨你这件事练习过很多遍。"` },
      { title: '诀别反问', content: '"你要我留下？""不，我要你走得慢一点，好让我有时间后悔。"' },
      { title: '师徒对峙', content: '"你教我仁义，却让我杀人。""我教你仁义，是怕你杀人时忘了疼。"' },
      { title: '敌友未明', content: '"你到底站哪边？""站在能让你活下去的那边，哪怕你会恨我。"' },
      { title: '婚约暗涌', content: '"这桩婚事你满意吗？""满意，至少它让我终于有理由接近仇人。"' },
      { title: '神明低语', content: '"求神有用吗？""有用。神会记住你低头的样子。"' },
      { title: '雨夜告白', content: '"我不是来救你的。""我知道，你每次说谎前，都会先看一眼雨。"' },
      { title: '王座之前', content: '"坐上去，你会失去所有朋友。""那就让他们先学会恨我。"' },
    ],
  };

  return templates[type].map((item, index) => ({
    id: createId(`fallback-${index}`),
    title: item.title,
    content: limitText(item.content, 100),
    type,
  }));
}

export function buildPrompt(preset: ReturnType<typeof getPreset>, customPrompt: string, count: number = 8) {
  const extra = customPrompt.trim();
  return [
    `请生成 ${count} 个不同的"${preset.label}"网文灵感卡片。`,
    extra ? `用户补充描述：${extra}` : '用户没有补充描述，请自由随机发散。',
    '硬性输出要求：',
    `1. 必须返回 ${count} 条，不多不少。`,
    '2. 每条必须有明确 title 和 content。',
    '3. content 控制在 65~85 个汉字左右，最多不能超过 120 个汉字。',
    `4. ${count} 条灵感之间不要重复，标题也不要重复。`,
    '5. 不要解释，不要前言，不要总结，不要 Markdown，不要代码块，不要编号列表。',
    '6. 整个回复只能是严格 JSON 数组，数组元素只能使用英文键 title 和 content。',
    '7. 格式必须类似：[{"title":"标题","content":"约75字正文"}]。',
  ].join('\n');
}
