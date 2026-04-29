export type TTSProvider = "edge" | "cosyvoice" | "mimotts" | "qwentts" | "cosyvoice35plus";
export const TTS_SETTINGS_PROVIDER_OPTIONS = ["cosyvoice", "mimotts", "edge"] as const;
export type SelectableTTSProvider = (typeof TTS_SETTINGS_PROVIDER_OPTIONS)[number];
export type CosyVoiceVoiceId = "yupinglu" | "tea";
export type CosyVoice35Model = "cosyvoice-v3.5-plus" | "cosyvoice-v3.5-flash";
export type QwenTTSVoiceMode = "system" | "clone";
export type QwenTTSLanguageType = "Chinese" | "English";
export type CosyVoice35PlusLanguageHint = "zh" | "en";
export type MimoTTSModel =
  | "mimo-v2.5-tts"
  | "mimo-v2.5-tts-voicedesign"
  | "mimo-v2.5-tts-voiceclone";
export type MimoTTSVoice =
  | "mimo_default"
  | "冰糖"
  | "茉莉"
  | "苏打"
  | "白桦"
  | "Mia"
  | "Chloe"
  | "Milo"
  | "Dean";
export type QwenTTSModel =
  | "qwen3-tts-instruct-flash"
  | "qwen3-tts-flash"
  | "qwen3-tts-vc-2026-01-22";
export type QwenTTSVoice =
  | "Seren"
  | "Cherry"
  | "Ethan"
  | "Chelsie"
  | "Dylan"
  | "Jada"
  | "Sunny"
  | "Alex"
  | "Bella"
  | "Li";

export type TTSSettings = {
  provider: TTSProvider;
  cosyvoiceSpeed: number;
  cosyvoiceInstruction: string;
  cosyvoiceSeed: number;
  cosyvoiceVoiceId: CosyVoiceVoiceId;
  mimoTTSModel: MimoTTSModel;
  mimoTTSVoice: MimoTTSVoice;
  mimoTTSInstruction: string;
  mimoTTSVoiceDesignPrompt: string;
  mimoTTSCloneVoiceUrl: string;
  qwenTTSModel: QwenTTSModel;
  qwenTTSVoice: QwenTTSVoice;
  qwenTTSVoiceMode: QwenTTSVoiceMode;
  qwenTTSCloneVoiceId: CosyVoiceVoiceId;
  qwenTTSCloneVoiceCloudId: string;
  qwenTTSSpeed: number;
  qwenTTSLanguageType: QwenTTSLanguageType;
  qwenTTSInstructions: string;
  cosyvoice35PlusModel: CosyVoice35Model;
  cosyvoice35PlusVoiceId: string;
  cosyvoice35FlashVoiceId: string;
  cosyvoice35PlusVoiceProfileId: CosyVoiceVoiceId;
  cosyvoice35PlusSpeed: number;
  cosyvoice35PlusInstruction: string;
  cosyvoice35PlusLanguageHint: CosyVoice35PlusLanguageHint;
};

export type CosyVoiceInstructionPreset = {
  id: string;
  label: string;
  description: string;
  prompt: string;
};

export type MimoTTSInstructionPreset = {
  id: string;
  label: string;
  description: string;
  prompt: string;
};

export type MimoTTSVoiceDesignPreset = {
  id: string;
  label: string;
  description: string;
  prompt: string;
};

export type QwenTTSModelOption = {
  id: QwenTTSModel;
  label: string;
  description: string;
};

export type QwenTTSVoiceOption = {
  id: QwenTTSVoice;
  label: string;
  description: string;
};

export type CosyVoice35ModelOption = {
  id: CosyVoice35Model;
  label: string;
  description: string;
};

export type MimoTTSModelOption = {
  id: MimoTTSModel;
  label: string;
  description: string;
};

export type MimoTTSVoiceOption = {
  id: MimoTTSVoice;
  label: string;
  description: string;
};

export const DEFAULT_TTS_PROVIDER: TTSProvider = "cosyvoice";
export const DEFAULT_COSYVOICE_SPEED = 0.9;
export const DEFAULT_COSYVOICE_SEED = 0;
export const DEFAULT_COSYVOICE_VOICE_ID: CosyVoiceVoiceId = "yupinglu";
export const DEFAULT_COSYVOICE_INSTRUCTION =
  "请用非常轻柔、缓慢、安定的睡前冥想语气朗读，音量感偏低，语尾自然下落，不要有明显情绪起伏。每句话之间保留充分停顿，让听众有时间呼吸和放松，整体像安静陪伴而不是教学";

export const DEFAULT_QWEN_TTS_MODEL: QwenTTSModel = "qwen3-tts-instruct-flash";
export const DEFAULT_QWEN_TTS_VOICE: QwenTTSVoice = "Seren";
export const DEFAULT_QWEN_TTS_VOICE_MODE: QwenTTSVoiceMode = "system";
export const DEFAULT_QWEN_TTS_CLONE_VOICE_ID: CosyVoiceVoiceId = "yupinglu";
export const DEFAULT_QWEN_TTS_CLONE_VOICE_CLOUD_ID = "";
export const DEFAULT_QWEN_TTS_SPEED = 1;
export const DEFAULT_QWEN_TTS_LANGUAGE_TYPE: QwenTTSLanguageType = "Chinese";
export const DEFAULT_QWEN_TTS_INSTRUCTIONS = DEFAULT_COSYVOICE_INSTRUCTION;

export const DEFAULT_COSYVOICE_35_PLUS_MODEL: CosyVoice35Model = "cosyvoice-v3.5-plus";
export const DEFAULT_COSYVOICE_35_PLUS_VOICE_ID = "";
export const DEFAULT_COSYVOICE_35_FLASH_VOICE_ID = "";
export const DEFAULT_COSYVOICE_35_PLUS_VOICE_PROFILE_ID: CosyVoiceVoiceId = "yupinglu";
export const DEFAULT_COSYVOICE_35_PLUS_SPEED = 1;
export const DEFAULT_COSYVOICE_35_PLUS_INSTRUCTION = "请用轻柔、缓慢、安定的睡前冥想语气朗读。";
export const DEFAULT_COSYVOICE_35_PLUS_LANGUAGE_HINT: CosyVoice35PlusLanguageHint = "zh";
export const DEFAULT_MIMO_TTS_MODEL: MimoTTSModel = "mimo-v2.5-tts";
export const DEFAULT_MIMO_TTS_VOICE: MimoTTSVoice = "mimo_default";
export const DEFAULT_MIMO_TTS_INSTRUCTION =
  "角色：中文正念冥想指导者，声音温柔、成熟、稳定，像在近处安静陪伴，而不是舞台朗诵或情绪表演。\n\n场景：听众正在闭眼练习呼吸、身体扫描或欲望冲浪。每一段都可能被单独合成，但必须听起来像同一位老师在同一场练习中连续引导。\n\n指导：整体极其缓慢、柔和、低刺激。吐字清楚但不要用力，音量感偏低，气息松弛，句尾自然下落。短句之间保留充分留白，让听众有时间呼吸、感受身体和整合体验。遇到 [pause] 前后的文本，也要保持同一份安稳、缓慢、温柔的冥想指导语气。";
export const DEFAULT_MIMO_TTS_VOICE_DESIGN_PROMPT =
  "成年女性，声线温柔偏低，气息松弛，口腔共鸣柔和，吐字清楚不锐利。语速慢，情绪底色平静克制，适合中文正念冥想与睡前陪伴。";
export const DEFAULT_MIMO_TTS_CLONE_VOICE_URL = "";

export const COSYVOICE_INSTRUCTION_PRESETS: readonly CosyVoiceInstructionPreset[] = [
  {
    id: "sleep-companion",
    label: "睡前安抚",
    description: "默认",
    prompt: DEFAULT_COSYVOICE_INSTRUCTION,
  },
  {
    id: "formal-course",
    label: "正式课程",
    description: "清晰克制",
    prompt:
      "请用专业冥想课程老师的语气朗读，声音自然、稳定、清晰，节奏从容，语句边界明确，整体克制，不要耳语，不要撒娇，不要表演化，像正式课程引导。",
  },
  {
    id: "breath-grounding",
    label: "呼吸放松",
    description: "停顿更足",
    prompt:
      "请用缓慢、安稳、低刺激的呼吸引导语气朗读，重音轻，停顿充分，句尾自然收住，让听众容易跟随呼吸，不要明显情绪起伏。",
  },
  {
    id: "warm-neutral",
    label: "温柔中性",
    description: "陪伴不腻",
    prompt:
      "请用温和但中性的正念语气朗读，声音柔和、干净、贴近但不过分亲密，吐字清楚，像安静陪伴，不像舞台朗诵。",
  },
  {
    id: "deep-sleep",
    label: "深度助眠",
    description: "更慢更稳",
    prompt:
      "请用更轻、更慢、更稳定的睡前助眠语气朗读，整体低饱和度、低起伏，句尾轻轻落下，停顿拉开，让人容易放松入睡。",
  },
  {
    id: "tea-calm",
    label: "茶席安定",
    description: "宁静清透",
    prompt:
      "请用安静、清透、舒缓的茶席引导语气朗读，声音平和、柔顺、克制，语速偏慢，停顿自然，整体让人感到安定而不过分亲密。",
  },
] as const;

export const MIMO_TTS_INSTRUCTION_PRESETS: readonly MimoTTSInstructionPreset[] = [
  {
    id: "meditation-slow",
    label: "冥想导演",
    description: "默认稳态",
    prompt: DEFAULT_MIMO_TTS_INSTRUCTION,
  },
  {
    id: "minimal-course",
    label: "极简课程",
    description: "干净克制",
    prompt:
      "角色：中文正念课程引导者，表达简洁、稳定、克制，不像播报，也不做情绪表演。声音像在安静的练习室里陪伴听众，而不是讲课训导。\n\n场景：听众正在进行短到中等长度的呼吸、安顿或基础正念练习。每一段都可能被单独合成，但需要保持同一场练习的连续感。\n\n指导：语速慢而清楚，句子边界干净。吐字轻，不压迫，句尾自然下落。少用戏剧化起伏，重点词轻轻落下即可。每句话之间留出足够空间，让听众能跟上呼吸和身体感受。",
  },
  {
    id: "body-scan",
    label: "身体扫描",
    description: "细腻落点",
    prompt:
      "角色：身体扫描冥想引导者，耐心、细腻、稳定，擅长把注意力轻轻带到身体的重量、触感、温度和边界感上。\n\n场景：听众闭眼躺着或坐着，正在从脚到头逐步觉察身体。文本可能按部位分段合成，但每段都要像同一条缓慢移动的觉察线。\n\n指导：整体很慢，声音轻柔但清晰。说到具体身体部位时，语气更贴近、更细腻，像把注意力轻轻放在那里。部位之间的转场要放慢，句间留白充足，不催促，不强调效果。",
  },
  {
    id: "sleep-deep",
    label: "深睡助眠",
    description: "更轻更慢",
    prompt:
      "角色：睡前冥想陪伴者，低刺激、慢节奏、安静可靠，像在深夜把声音轻轻放到听众身边。\n\n场景：听众准备入睡，身体已经放下白天的紧绷，不需要被激励或教育，只需要被慢慢带入更深的安稳。\n\n指导：语速比普通冥想更慢，音量感偏低，气息松弛，情绪起伏极小。句尾轻轻落下，长句自动拆得更从容。不要突然抬高音量，不要有戏剧性重音，留白要比白天练习更长。",
  },
  {
    id: "breath-anchor",
    label: "呼吸锚定",
    description: "跟呼吸走",
    prompt:
      "角色：呼吸冥想引导者，稳定、温和、不过度解释，像一只轻轻落在呼吸上的锚。\n\n场景：听众正在观察吸气和呼气，可能会走神，也可能呼吸不够平稳。练习目标不是控制呼吸，而是一次次温柔地回来。\n\n指导：让朗读节奏贴近自然呼吸，一句话不要太满。说到吸气时微微打开，说到呼气时自然下落。遇到“回来”“观察”“允许”等词，语气要轻，不要像命令。短句之间留出安静空间。",
  },
  {
    id: "emotion-holding",
    label: "情绪容纳",
    description: "柔和接住",
    prompt:
      "角色：情绪正念陪伴者，温和、接纳、有边界感，能把焦虑、烦躁、委屈和走神都稳稳接住。\n\n场景：听众可能正在经历不舒服的身体感受或情绪波动。引导不需要解决情绪，只需要给它一个被看见、被允许的空间。\n\n指导：语气柔和但不煽情，稳定但不冷。遇到“烦躁”“焦虑”“走神”“不舒服”等词时，声音更慢、更轻，像把评判放下来。不要急着安慰，也不要制造感动；句间留白让听众自己感觉。",
  },
  {
    id: "urge-surfing",
    label: "欲望冲浪",
    description: "清晰不激动",
    prompt:
      "角色：欲望冲浪练习引导者，清晰、稳定、有力量，但不强硬、不说教。面对冲动时像经验丰富的冲浪者，镇定地观察浪的形状和变化。\n\n场景：听众正在面对烟瘾、冲动、借口或内心博弈。练习重点是识别、允许、探究和看着冲动自然变化，而不是压制或战斗。\n\n指导：描述冲动时保持中性、冷静、细致，不恐吓、不夸张。说到“浪来了”“看着它”“不跟它走”这类关键句时稍微放慢，语气有支撑感。留白要足，让听众能真的观察身体里的变化。",
  },
  {
    id: "steady-coach",
    label: "稳态陪练",
    description: "清醒有力",
    prompt:
      "角色：清醒稳定的正念陪练者，语气温和但有骨架，适合在疲惫、分心或想放弃时，把听众重新带回练习。\n\n场景：听众不一定很放松，可能坐立不安、注意力散、或者需要一点清晰的方向感。引导要给出稳定感，但不能变成命令或鸡血鼓励。\n\n指导：语速中慢，吐字更清楚一点，关键动作词可以轻轻加重，比如“停下”“回来”“看见”。整体仍保持低刺激和温柔，不拔高、不催促。句间留白清楚，让每一步都有落点。",
  },
] as const;

export const MIMO_TTS_VOICE_DESIGN_PRESETS: readonly MimoTTSVoiceDesignPreset[] = [
  {
    id: "soft-meditation-female",
    label: "柔和女声",
    description: "默认",
    prompt: DEFAULT_MIMO_TTS_VOICE_DESIGN_PROMPT,
  },
  {
    id: "clear-course-female",
    label: "清晰课程",
    description: "专业克制",
    prompt:
      "成年女性，声音清澈稳定，吐字干净，鼻腔与口腔共鸣平衡，边界感清楚。语速中慢，情绪底色专业、温和、克制，适合正式冥想课程。",
  },
  {
    id: "warm-neutral",
    label: "温润中性",
    description: "长时耐听",
    prompt:
      "中性偏女性的成熟声线，音色温润不甜腻，气息平稳，句尾自然下落。语速慢，情绪底色安定、可靠，适合长时间身体扫描引导。",
  },
  {
    id: "deep-sleep-whisper",
    label: "深夜助眠",
    description: "低刺激",
    prompt:
      "成年女性，声线轻柔偏气声，音量感低，共鸣位置靠前且柔软。语速很慢，情绪底色安静、松弛、低刺激，适合深夜助眠冥想。",
  },
  {
    id: "grounded-male",
    label: "低稳男声",
    description: "沉静可靠",
    prompt:
      "成年男性，声线低稳温厚，胸腔共鸣自然，吐字清楚但不压迫。语速慢，情绪底色沉静、可靠、温和，适合呼吸练习和压力释放。",
  },
] as const;

export const COSYVOICE_VOICE_PROFILES = [
  {
    id: "yupinglu",
    label: "玉屏路",
    cloneAudioName: "玉屏路 9_16k_mono.wav",
    promptText: "这是一段冥想音频的测试，1234567，你好这是从cosyvoice3模型测试，正念鸭梨实验室出品。",
  },
  {
    id: "tea",
    label: "茶语音色",
    cloneAudioName: "tea_clone_20260421b_16k_mono.wav",
    promptText: "我们放下忙碌与杂念，借由一杯茶回归内心的安静",
  },
] as const satisfies ReadonlyArray<{
  id: CosyVoiceVoiceId;
  label: string;
  cloneAudioName: string;
  promptText: string;
}>;

export const QWEN_TTS_MODELS: readonly QwenTTSModelOption[] = [
  {
    id: "qwen3-tts-instruct-flash",
    label: "Qwen3 TTS Instruct Flash",
    description: "自然语言指令模型，支持风格和语速倾向。",
  },
  {
    id: "qwen3-tts-flash",
    label: "Qwen3 TTS Flash",
    description: "普通低延迟模型，不支持自然语言指令。",
  },
  {
    id: "qwen3-tts-vc-2026-01-22",
    label: "Qwen3 TTS VC",
    description: "官方克隆音色模型，不支持自然语言指令。",
  },
] as const;

export const QWEN_TTS_VOICES: readonly QwenTTSVoiceOption[] = [
  { id: "Seren", label: "Seren", description: "温和自然" },
  { id: "Cherry", label: "Cherry", description: "明亮细腻" },
  { id: "Ethan", label: "Ethan", description: "沉稳男声" },
  { id: "Chelsie", label: "Chelsie", description: "轻柔女声" },
  { id: "Dylan", label: "Dylan", description: "平稳中性" },
  { id: "Jada", label: "Jada", description: "清晰干净" },
  { id: "Sunny", label: "Sunny", description: "更轻快" },
  { id: "Alex", label: "Alex", description: "通用中性" },
  { id: "Bella", label: "Bella", description: "柔和陪伴" },
  { id: "Li", label: "Li", description: "中文自然" },
] as const;

export const COSYVOICE_35_MODELS: readonly CosyVoice35ModelOption[] = [
  {
    id: "cosyvoice-v3.5-plus",
    label: "CosyVoice 3.5 Plus",
    description: "高质量成品档，支持克隆、自然语言指令和硬语速，价格更高。",
  },
  {
    id: "cosyvoice-v3.5-flash",
    label: "CosyVoice 3.5 Flash",
    description: "预览和频繁重合成更合适，支持克隆、自然语言指令和硬语速，价格更低。",
  },
] as const;

export const MIMO_TTS_MODELS: readonly MimoTTSModelOption[] = [
  {
    id: "mimo-v2.5-tts",
    label: "MiMo V2.5 TTS",
    description: "官方内建音色模型，适合直接用系统音色生成成品。",
  },
  {
    id: "mimo-v2.5-tts-voicedesign",
    label: "MiMo V2.5 VoiceDesign",
    description: "通过自然语言描述声音风格，自定义新的讲述气质。",
  },
  {
    id: "mimo-v2.5-tts-voiceclone",
    label: "MiMo V2.5 VoiceClone",
    description: "用公开音频 URL 作为参考音色，复刻指定说话人。",
  },
] as const;

export const MIMO_TTS_VOICES: readonly MimoTTSVoiceOption[] = [
  { id: "mimo_default", label: "mimo_default", description: "官方默认音色" },
  { id: "冰糖", label: "冰糖", description: "清亮自然" },
  { id: "茉莉", label: "茉莉", description: "柔和贴近" },
  { id: "苏打", label: "苏打", description: "轻快中性" },
  { id: "白桦", label: "白桦", description: "沉稳克制" },
  { id: "Mia", label: "Mia", description: "英文女声" },
  { id: "Chloe", label: "Chloe", description: "英文柔和女声" },
  { id: "Milo", label: "Milo", description: "英文男声" },
  { id: "Dean", label: "Dean", description: "英文沉稳男声" },
] as const;

export const TTS_PROVIDER_LABELS: Record<TTSProvider, string> = {
  edge: "EdgeTTS",
  cosyvoice: "CosyVoice3",
  mimotts: "MiMo TTS",
  qwentts: "Qwen-TTS",
  cosyvoice35plus: "CosyVoice 3.5",
};

export const TTS_PROVIDER_DESCRIPTIONS: Record<TTSProvider, string> = {
  edge: "浏览器兼容性最好，零配置。",
  cosyvoice: "本地 CosyVoice3，自然语言控制。",
  mimotts: "小米 MiMo Open Platform，支持内建音色、声音设计和声音克隆。",
  qwentts: "阿里 Qwen-TTS，可选系统音色或 VC 克隆。",
  cosyvoice35plus: "阿里 CosyVoice 3.5，可切换 Plus / Flash，支持克隆、自然语言和硬语速。",
};

export const COSYVOICE_PROFILE = {
  mode: "自然语言控制",
  cloneAudioName: COSYVOICE_VOICE_PROFILES[0].cloneAudioName,
  stream: true,
  speed: DEFAULT_COSYVOICE_SPEED,
  seed: DEFAULT_COSYVOICE_SEED,
  instruction: DEFAULT_COSYVOICE_INSTRUCTION,
} as const;

type TTSSettingsInput = Partial<Record<keyof TTSSettings, unknown>>;

export function isTTSProvider(value: unknown): value is TTSProvider {
  return value === "edge" || value === "cosyvoice" || value === "mimotts" || value === "qwentts" || value === "cosyvoice35plus";
}

export function isSelectableTTSProvider(value: unknown): value is SelectableTTSProvider {
  return value === "edge" || value === "cosyvoice" || value === "mimotts";
}

export function isCosyVoiceVoiceId(value: unknown): value is CosyVoiceVoiceId {
  return COSYVOICE_VOICE_PROFILES.some((profile) => profile.id === value);
}

export function isQwenTTSVoiceMode(value: unknown): value is QwenTTSVoiceMode {
  return value === "system" || value === "clone";
}

export function isQwenTTSLanguageType(value: unknown): value is QwenTTSLanguageType {
  return value === "Chinese" || value === "English";
}

export function isCosyVoice35PlusLanguageHint(value: unknown): value is CosyVoice35PlusLanguageHint {
  return value === "zh" || value === "en";
}

export function isCosyVoice35Model(value: unknown): value is CosyVoice35Model {
  return value === "cosyvoice-v3.5-plus" || value === "cosyvoice-v3.5-flash";
}

export function isQwenTTSModel(value: unknown): value is QwenTTSModel {
  return QWEN_TTS_MODELS.some((model) => model.id === value);
}

export function isMimoTTSModel(value: unknown): value is MimoTTSModel {
  return MIMO_TTS_MODELS.some((model) => model.id === value);
}

export function isMimoTTSVoice(value: unknown): value is MimoTTSVoice {
  return MIMO_TTS_VOICES.some((voice) => voice.id === value);
}

export function isQwenTTSVoice(value: unknown): value is QwenTTSVoice {
  return QWEN_TTS_VOICES.some((voice) => voice.id === value);
}

export function isQwenTTSInstructionModel(model: unknown) {
  return model === "qwen3-tts-instruct-flash";
}

export function isQwenTTSCloneModel(model: unknown) {
  return model === "qwen3-tts-vc-2026-01-22";
}

function normalizeSpeed(value: unknown, defaultValue: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return defaultValue;
  const clamped = Math.min(2, Math.max(0.5, parsed));
  return Math.round(clamped * 20) / 20;
}

function normalizeInstruction(value: unknown, defaultValue: string) {
  if (typeof value !== "string") return defaultValue;
  const trimmed = value.trim();
  return trimmed === "" ? defaultValue : trimmed;
}

function normalizeMimoInstruction(value: unknown) {
  const normalized = normalizeInstruction(value, DEFAULT_MIMO_TTS_INSTRUCTION);
  // Early MiMo integration reused the long CosyVoice prompt as a default value.
  // That prompt is a poor fit for MiMo voice-design mode, so migrate it silently.
  return normalized === DEFAULT_COSYVOICE_INSTRUCTION ? DEFAULT_MIMO_TTS_INSTRUCTION : normalized;
}

function normalizeSeed(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_COSYVOICE_SEED;
  const normalized = Math.trunc(parsed);
  return normalized >= 0 ? normalized : DEFAULT_COSYVOICE_SEED;
}

function normalizeString(value: unknown, defaultValue = "") {
  return typeof value === "string" ? value.trim() : defaultValue;
}

export function normalizeTTSSettings(input: TTSSettingsInput): TTSSettings {
  const provider = isSelectableTTSProvider(input.provider) ? input.provider : DEFAULT_TTS_PROVIDER;
  const qwenTTSModel = isQwenTTSModel(input.qwenTTSModel) ? input.qwenTTSModel : DEFAULT_QWEN_TTS_MODEL;
  const mimoTTSModel = isMimoTTSModel(input.mimoTTSModel) ? input.mimoTTSModel : DEFAULT_MIMO_TTS_MODEL;
  const requestedVoiceMode = isQwenTTSVoiceMode(input.qwenTTSVoiceMode)
    ? input.qwenTTSVoiceMode
    : DEFAULT_QWEN_TTS_VOICE_MODE;

  return {
    provider,
    cosyvoiceSpeed: normalizeSpeed(input.cosyvoiceSpeed, DEFAULT_COSYVOICE_SPEED),
    cosyvoiceInstruction: normalizeInstruction(input.cosyvoiceInstruction, DEFAULT_COSYVOICE_INSTRUCTION),
    cosyvoiceSeed: normalizeSeed(input.cosyvoiceSeed),
    cosyvoiceVoiceId: isCosyVoiceVoiceId(input.cosyvoiceVoiceId)
      ? input.cosyvoiceVoiceId
      : DEFAULT_COSYVOICE_VOICE_ID,
    mimoTTSModel,
    mimoTTSVoice: isMimoTTSVoice(input.mimoTTSVoice) ? input.mimoTTSVoice : DEFAULT_MIMO_TTS_VOICE,
    mimoTTSInstruction: normalizeMimoInstruction(input.mimoTTSInstruction),
    mimoTTSVoiceDesignPrompt: normalizeInstruction(
      input.mimoTTSVoiceDesignPrompt,
      DEFAULT_MIMO_TTS_VOICE_DESIGN_PROMPT
    ),
    mimoTTSCloneVoiceUrl: normalizeString(input.mimoTTSCloneVoiceUrl, DEFAULT_MIMO_TTS_CLONE_VOICE_URL),
    qwenTTSModel,
    qwenTTSVoice: isQwenTTSVoice(input.qwenTTSVoice) ? input.qwenTTSVoice : DEFAULT_QWEN_TTS_VOICE,
    qwenTTSVoiceMode: isQwenTTSCloneModel(qwenTTSModel) ? "clone" : requestedVoiceMode,
    qwenTTSCloneVoiceId: isCosyVoiceVoiceId(input.qwenTTSCloneVoiceId)
      ? input.qwenTTSCloneVoiceId
      : DEFAULT_QWEN_TTS_CLONE_VOICE_ID,
    qwenTTSCloneVoiceCloudId: normalizeString(
      input.qwenTTSCloneVoiceCloudId,
      DEFAULT_QWEN_TTS_CLONE_VOICE_CLOUD_ID
    ),
    qwenTTSSpeed: normalizeSpeed(input.qwenTTSSpeed, DEFAULT_QWEN_TTS_SPEED),
    qwenTTSLanguageType: isQwenTTSLanguageType(input.qwenTTSLanguageType)
      ? input.qwenTTSLanguageType
      : DEFAULT_QWEN_TTS_LANGUAGE_TYPE,
    qwenTTSInstructions: normalizeInstruction(input.qwenTTSInstructions, DEFAULT_QWEN_TTS_INSTRUCTIONS),
    cosyvoice35PlusModel: isCosyVoice35Model(input.cosyvoice35PlusModel)
      ? input.cosyvoice35PlusModel
      : DEFAULT_COSYVOICE_35_PLUS_MODEL,
    cosyvoice35PlusVoiceId: normalizeString(input.cosyvoice35PlusVoiceId, DEFAULT_COSYVOICE_35_PLUS_VOICE_ID),
    cosyvoice35FlashVoiceId: normalizeString(input.cosyvoice35FlashVoiceId, DEFAULT_COSYVOICE_35_FLASH_VOICE_ID),
    cosyvoice35PlusVoiceProfileId: isCosyVoiceVoiceId(input.cosyvoice35PlusVoiceProfileId)
      ? input.cosyvoice35PlusVoiceProfileId
      : DEFAULT_COSYVOICE_35_PLUS_VOICE_PROFILE_ID,
    cosyvoice35PlusSpeed: normalizeSpeed(input.cosyvoice35PlusSpeed, DEFAULT_COSYVOICE_35_PLUS_SPEED),
    cosyvoice35PlusInstruction: normalizeInstruction(
      input.cosyvoice35PlusInstruction,
      DEFAULT_COSYVOICE_35_PLUS_INSTRUCTION
    ),
    cosyvoice35PlusLanguageHint: isCosyVoice35PlusLanguageHint(input.cosyvoice35PlusLanguageHint)
      ? input.cosyvoice35PlusLanguageHint
      : DEFAULT_COSYVOICE_35_PLUS_LANGUAGE_HINT,
  };
}
