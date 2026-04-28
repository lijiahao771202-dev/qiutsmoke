export type TTSProvider =
  | "edge"
  | "cosyvoice"
  | "qwentts"
  | "cosyvoice35plus";

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
  "Please read in a very gentle, slow, and steady bedtime meditation tone. Keep the energy low, the cadence soft, and leave enough pauses between sentences for breathing and relaxation.";

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
export const DEFAULT_COSYVOICE_35_PLUS_INSTRUCTION =
  "Please read in a soft, slow, and calming meditation tone.";
export const DEFAULT_COSYVOICE_35_PLUS_LANGUAGE_HINT: CosyVoice35PlusLanguageHint = "zh";

export const COSYVOICE_INSTRUCTION_PRESETS: readonly CosyVoiceInstructionPreset[] = [
  {
    id: "sleep-companion",
    label: "Sleep Companion",
    description: "Default",
    prompt: DEFAULT_COSYVOICE_INSTRUCTION,
  },
  {
    id: "formal-course",
    label: "Formal Course",
    description: "Clear and restrained",
    prompt:
      "Please read like a professional meditation course teacher: natural, steady, clear, and restrained, with clean phrase boundaries and no exaggerated performance.",
  },
  {
    id: "breath-grounding",
    label: "Breath Grounding",
    description: "More pauses",
    prompt:
      "Please read in a slow, grounded, low-stimulation breathing-guide tone, with light emphasis, full pauses, and soft sentence endings so listeners can follow their breath easily.",
  },
  {
    id: "warm-neutral",
    label: "Warm Neutral",
    description: "Present but not clingy",
    prompt:
      "Please read in a warm but neutral mindfulness tone. Keep the voice soft, clean, and close without sounding overly intimate or theatrical.",
  },
  {
    id: "deep-sleep",
    label: "Deep Sleep",
    description: "Slower and steadier",
    prompt:
      "Please read in an even softer, slower, and steadier sleep-support tone with low intensity, low variation, soft endings, and widened pauses.",
  },
  {
    id: "tea-calm",
    label: "Tea Calm",
    description: "Quiet and clear",
    prompt:
      "Please read in a quiet, clear, and tea-ceremony-inspired guiding tone, calm and gentle, with a slightly slower pace and natural pauses.",
  },
] as const;

export const COSYVOICE_VOICE_PROFILES = [
  {
    id: "yupinglu",
    label: "Yupinglu",
    cloneAudioName: "yupinglu-9_16k_mono.wav",
    promptText:
      "This is a meditation audio test sample, 1234567. Hello, this is generated from the CosyVoice3 model.",
  },
  {
    id: "tea",
    label: "Tea Voice",
    cloneAudioName: "tea_clone_20260421b_16k_mono.wav",
    promptText:
      "Let us set down the noise and busyness, and return to inner calm through a cup of tea.",
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
    description: "Natural language instruction model with style and pacing control.",
  },
  {
    id: "qwen3-tts-flash",
    label: "Qwen3 TTS Flash",
    description: "Low-latency base model without natural-language instructions.",
  },
  {
    id: "qwen3-tts-vc-2026-01-22",
    label: "Qwen3 TTS VC",
    description: "Official voice-clone model without natural-language instructions.",
  },
] as const;

export const QWEN_TTS_VOICES: readonly QwenTTSVoiceOption[] = [
  { id: "Seren", label: "Seren", description: "Warm and natural" },
  { id: "Cherry", label: "Cherry", description: "Bright and delicate" },
  { id: "Ethan", label: "Ethan", description: "Steady male voice" },
  { id: "Chelsie", label: "Chelsie", description: "Soft female voice" },
  { id: "Dylan", label: "Dylan", description: "Balanced neutral tone" },
  { id: "Jada", label: "Jada", description: "Clean and clear" },
  { id: "Sunny", label: "Sunny", description: "Lighter and brisk" },
  { id: "Alex", label: "Alex", description: "General neutral tone" },
  { id: "Bella", label: "Bella", description: "Gentle companion tone" },
  { id: "Li", label: "Li", description: "Natural Chinese voice" },
] as const;

export const COSYVOICE_35_MODELS: readonly CosyVoice35ModelOption[] = [
  {
    id: "cosyvoice-v3.5-plus",
    label: "CosyVoice 3.5 Plus",
    description:
      "Higher quality production model with cloning, natural-language instructions, and expressive pacing.",
  },
  {
    id: "cosyvoice-v3.5-flash",
    label: "CosyVoice 3.5 Flash",
    description: "Better for preview and frequent regeneration, with lower latency and lower cost.",
  },
] as const;

export const TTS_PROVIDER_LABELS: Record<TTSProvider, string> = {
  edge: "EdgeTTS",
  cosyvoice: "CosyVoice3",
  qwentts: "Qwen-TTS",
  cosyvoice35plus: "CosyVoice 3.5",
};

export const TTS_PROVIDER_DESCRIPTIONS: Partial<Record<TTSProvider, string>> = {
  edge: "Best browser compatibility and zero extra setup.",
  cosyvoice: "Local CosyVoice3 with natural-language control.",
  qwentts: "Alibaba Qwen-TTS with system voices or VC cloning.",
  cosyvoice35plus: "Alibaba CosyVoice 3.5 with switchable Plus and Flash models.",
};

export const COSYVOICE_PROFILE = {
  mode: "natural-language-control",
  cloneAudioName: COSYVOICE_VOICE_PROFILES[0].cloneAudioName,
  stream: true,
  speed: DEFAULT_COSYVOICE_SPEED,
  seed: DEFAULT_COSYVOICE_SEED,
  instruction: DEFAULT_COSYVOICE_INSTRUCTION,
} as const;

type TTSSettingsInput = Partial<Record<keyof TTSSettings, unknown>>;

export function isTTSProvider(value: unknown): value is TTSProvider {
  return (
    value === "edge" ||
    value === "cosyvoice" ||
    value === "qwentts" ||
    value === "cosyvoice35plus"
  );
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

export function isCosyVoice35PlusLanguageHint(
  value: unknown
): value is CosyVoice35PlusLanguageHint {
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
  return Math.round(clamped * 20) / 20;
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
  const qwenTTSModel = isQwenTTSModel(input.qwenTTSModel)
    ? input.qwenTTSModel
    : DEFAULT_QWEN_TTS_MODEL;
  const requestedVoiceMode = isQwenTTSVoiceMode(input.qwenTTSVoiceMode)
    ? input.qwenTTSVoiceMode
    : DEFAULT_QWEN_TTS_VOICE_MODE;

  return {
    provider,
    cosyvoiceSpeed: normalizeSpeed(input.cosyvoiceSpeed, DEFAULT_COSYVOICE_SPEED),
    cosyvoiceInstruction: normalizeInstruction(
      input.cosyvoiceInstruction,
      DEFAULT_COSYVOICE_INSTRUCTION
    ),
    cosyvoiceSeed: normalizeSeed(input.cosyvoiceSeed),
    cosyvoiceVoiceId: isCosyVoiceVoiceId(input.cosyvoiceVoiceId)
      ? input.cosyvoiceVoiceId
      : DEFAULT_COSYVOICE_VOICE_ID,
    qwenTTSModel,
    qwenTTSVoice: isQwenTTSVoice(input.qwenTTSVoice)
      ? input.qwenTTSVoice
      : DEFAULT_QWEN_TTS_VOICE,
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
    qwenTTSInstructions: normalizeInstruction(
      input.qwenTTSInstructions,
      DEFAULT_QWEN_TTS_INSTRUCTIONS
    ),
    cosyvoice35PlusModel: isCosyVoice35Model(input.cosyvoice35PlusModel)
      ? input.cosyvoice35PlusModel
      : DEFAULT_COSYVOICE_35_PLUS_MODEL,
    cosyvoice35PlusVoiceId: normalizeString(
      input.cosyvoice35PlusVoiceId,
      DEFAULT_COSYVOICE_35_PLUS_VOICE_ID
    ),
    cosyvoice35FlashVoiceId: normalizeString(
      input.cosyvoice35FlashVoiceId,
      DEFAULT_COSYVOICE_35_FLASH_VOICE_ID
    ),
    cosyvoice35PlusVoiceProfileId: isCosyVoiceVoiceId(input.cosyvoice35PlusVoiceProfileId)
      ? input.cosyvoice35PlusVoiceProfileId
      : DEFAULT_COSYVOICE_35_PLUS_VOICE_PROFILE_ID,
    cosyvoice35PlusSpeed: normalizeSpeed(
      input.cosyvoice35PlusSpeed,
      DEFAULT_COSYVOICE_35_PLUS_SPEED
    ),
    cosyvoice35PlusInstruction: normalizeInstruction(
      input.cosyvoice35PlusInstruction,
      DEFAULT_COSYVOICE_35_PLUS_INSTRUCTION
    ),
    cosyvoice35PlusLanguageHint: isCosyVoice35PlusLanguageHint(input.cosyvoice35PlusLanguageHint)
      ? input.cosyvoice35PlusLanguageHint
      : DEFAULT_COSYVOICE_35_PLUS_LANGUAGE_HINT,
  };
}
