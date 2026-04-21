export type TTSProvider = "edge" | "cosyvoice";
export type CosyVoiceVoiceId = "yupinglu" | "tea";

export type TTSSettings = {
  provider: TTSProvider;
  cosyvoiceSpeed: number;
  cosyvoiceInstruction: string;
  cosyvoiceSeed: number;
  cosyvoiceVoiceId: CosyVoiceVoiceId;
};

export type CosyVoiceInstructionPreset = {
  id: string;
  label: string;
  description: string;
  prompt: string;
};

export const DEFAULT_TTS_PROVIDER: TTSProvider = "cosyvoice";
export const DEFAULT_COSYVOICE_SPEED = 0.9;
export const DEFAULT_COSYVOICE_SEED = 0;
export const DEFAULT_COSYVOICE_VOICE_ID: CosyVoiceVoiceId = "yupinglu";
export const DEFAULT_COSYVOICE_INSTRUCTION =
  "请用非常轻柔、缓慢、安定的睡前冥想语气朗读，音量感偏低，语尾自然下落，不要有明显情绪起伏。每句话之间保留充分停顿，让听众有时间呼吸和放松，整体像安静陪伴而不是教学";

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
    promptText: "这是一段冥想音频的测试1234567，你好这是cosyvoice3模式测试，正念鸭梨实验室出品",
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

export const TTS_PROVIDER_LABELS: Record<TTSProvider, string> = {
  edge: "EdgeTTS",
  cosyvoice: "CosyVoice3",
};

export const TTS_PROVIDER_DESCRIPTIONS: Record<TTSProvider, string> = {
  edge: "保留当前 EdgeTTS 语音链路，继续使用音色与语速控制。",
  cosyvoice: "使用本机 CosyVoice3 冥想克隆音色，自然语言控制全局生效。",
};

export const COSYVOICE_PROFILE = {
  mode: "自然语言控制",
  cloneAudioName: COSYVOICE_VOICE_PROFILES[0].cloneAudioName,
  stream: true,
  speed: DEFAULT_COSYVOICE_SPEED,
  seed: DEFAULT_COSYVOICE_SEED,
  instruction: DEFAULT_COSYVOICE_INSTRUCTION,
} as const;

type TTSSettingsInput = {
  provider?: unknown;
  cosyvoiceSpeed?: unknown;
  cosyvoiceInstruction?: unknown;
  cosyvoiceSeed?: unknown;
  cosyvoiceVoiceId?: unknown;
};

export function isTTSProvider(value: unknown): value is TTSProvider {
  return value === "edge" || value === "cosyvoice";
}

export function isCosyVoiceVoiceId(value: unknown): value is CosyVoiceVoiceId {
  return COSYVOICE_VOICE_PROFILES.some((profile) => profile.id === value);
}

function normalizeCosyvoiceSpeed(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_COSYVOICE_SPEED;

  const clamped = Math.min(2, Math.max(0.5, parsed));
  return Math.round(clamped * 10) / 10;
}

function normalizeCosyvoiceInstruction(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_COSYVOICE_INSTRUCTION;
  const trimmed = value.trim();
  return trimmed === "" ? DEFAULT_COSYVOICE_INSTRUCTION : trimmed;
}

function normalizeCosyvoiceSeed(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_COSYVOICE_SEED;

  const normalized = Math.trunc(parsed);
  if (normalized < 0) return DEFAULT_COSYVOICE_SEED;
  return normalized;
}

export function normalizeTTSSettings(input: TTSSettingsInput): TTSSettings {
  return {
    provider: isTTSProvider(input.provider) ? input.provider : DEFAULT_TTS_PROVIDER,
    cosyvoiceSpeed: normalizeCosyvoiceSpeed(input.cosyvoiceSpeed),
    cosyvoiceInstruction: normalizeCosyvoiceInstruction(input.cosyvoiceInstruction),
    cosyvoiceSeed: normalizeCosyvoiceSeed(input.cosyvoiceSeed),
    cosyvoiceVoiceId: isCosyVoiceVoiceId(input.cosyvoiceVoiceId)
      ? input.cosyvoiceVoiceId
      : DEFAULT_COSYVOICE_VOICE_ID,
  };
}
