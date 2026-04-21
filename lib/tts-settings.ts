export type TTSProvider = "edge" | "cosyvoice";

export type TTSSettings = {
  provider: TTSProvider;
  cosyvoiceSpeed: number;
  cosyvoiceInstruction: string;
  cosyvoiceSeed: number;
};

export const DEFAULT_TTS_PROVIDER: TTSProvider = "cosyvoice";
export const DEFAULT_COSYVOICE_SPEED = 0.9;
export const DEFAULT_COSYVOICE_SEED = 0;
export const DEFAULT_COSYVOICE_INSTRUCTION =
  "请用专业冥想引导师的语气朗读，声音温暖、克制、稳定，语速偏慢，重点词稍微放轻，留出呼吸和放松的停顿，整体要安静、清晰、具有引导感。";

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
  cloneAudioName: "玉屏路 9_16k_mono.wav",
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
};

export function isTTSProvider(value: unknown): value is TTSProvider {
  return value === "edge" || value === "cosyvoice";
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
  };
}
