export type TTSProvider = "edge" | "cosyvoice" | "qwentts" | "cosyvoice35plus";
export type CosyVoiceVoiceId = "yupinglu" | "tea";
export type CosyVoice35Model = "cosyvoice-v3.5-plus" | "cosyvoice-v3.5-flash";
export type QwenTTSVoiceMode = "system" | "clone";
export type QwenTTSLanguageType = "Chinese" | "English";
export type CosyVoice35PlusLanguageHint = "zh" | "en";
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

export const TTS_PROVIDER_LABELS: Record<TTSProvider, string> = {
  edge: "EdgeTTS",
  cosyvoice: "CosyVoice3",
  qwentts: "Qwen-TTS",
  cosyvoice35plus: "CosyVoice 3.5",
};

export const TTS_PROVIDER_DESCRIPTIONS: Record<TTSProvider, string> = {
  edge: "浏览器兼容性最好，零配置。",
  cosyvoice: "本地 CosyVoice3，自然语言控制。",
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
  return value === "edge" || value === "cosyvoice" || value === "qwentts" || value === "cosyvoice35plus";
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
  return Math.round(clamped * 10) / 10;
}

function normalizeInstruction(value: unknown, defaultValue: string) {
  if (typeof value !== "string") return defaultValue;
  const trimmed = value.trim();
  return trimmed === "" ? defaultValue : trimmed;
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
  const provider = isTTSProvider(input.provider) ? input.provider : DEFAULT_TTS_PROVIDER;
  const qwenTTSModel = isQwenTTSModel(input.qwenTTSModel) ? input.qwenTTSModel : DEFAULT_QWEN_TTS_MODEL;
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
