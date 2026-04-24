import { buildCosyVoiceCardSSMLChunks } from "./cosyvoice-card-ssml.ts";
import type { TTSSettings } from "./tts-settings.ts";

const CARD_DIRECTIVE_RE = /\[(?:pause|rate)[^\]]+\]/g;
const SSML_TAG_RE = /<[^>]+>/g;
const DASHSCOPE_FLASH_PRICE_PER_10K_CHARS = 0.8;
const DASHSCOPE_PLUS_PRICE_PER_10K_CHARS = 1.5;

export type TTSPriceBadgeTone = "free" | "metered" | "neutral";

export type TTSCardPriceEstimate = {
  label: string;
  detail: string;
  amountCny: number | null;
  billedChars: number | null;
  tone: TTSPriceBadgeTone;
};

type CardLike = {
  content: string;
};

function isHanCharacter(char: string) {
  return /\p{Script=Han}/u.test(char);
}

function formatCNY(amount: number) {
  if (amount <= 0) return "¥0";
  if (amount < 0.01) return "<¥0.01";
  return `¥${amount.toFixed(2)}`;
}

function stripSSMLTags(ssml: string) {
  return ssml.replace(SSML_TAG_RE, "");
}

export function countDashScopeBillableCharacters(text: string) {
  let total = 0;

  for (const char of Array.from(text)) {
    total += isHanCharacter(char) ? 2 : 1;
  }

  return total;
}

export function estimateCosyVoice35BilledCharacters(content: string) {
  const chunks = buildCosyVoiceCardSSMLChunks(content);

  return chunks.reduce((total, chunk) => {
    if (chunk.type !== "ssml") return total;
    return total + countDashScopeBillableCharacters(stripSSMLTags(chunk.ssml));
  }, 0);
}

export function estimateTTSCardPrice(card: CardLike, settings: TTSSettings): TTSCardPriceEstimate {
  if (settings.provider === "edge") {
    return {
      label: "Edge 免费",
      detail: "当前卡片使用 EdgeTTS，不按阿里云字符计费。",
      amountCny: 0,
      billedChars: null,
      tone: "free",
    };
  }

  if (settings.provider === "cosyvoice") {
    return {
      label: "本地免费",
      detail: "当前卡片使用本地 CosyVoice，不产生云端字符费用。",
      amountCny: 0,
      billedChars: null,
      tone: "free",
    };
  }

  if (settings.provider === "qwentts") {
    return {
      label: "Qwen 计费",
      detail: "Qwen-TTS 当前按模型侧计费，暂不在卡片上估算金额。",
      amountCny: null,
      billedChars: null,
      tone: "neutral",
    };
  }

  const billedChars = estimateCosyVoice35BilledCharacters(card.content.replace(CARD_DIRECTIVE_RE, ""));
  const isFlash = settings.cosyvoice35PlusModel === "cosyvoice-v3.5-flash";
  const unitPrice = isFlash ? DASHSCOPE_FLASH_PRICE_PER_10K_CHARS : DASHSCOPE_PLUS_PRICE_PER_10K_CHARS;
  const amountCny = (billedChars / 10_000) * unitPrice;
  const providerLabel = isFlash ? "Flash" : "Plus";

  return {
    label: `${providerLabel} ${formatCNY(amountCny)}`,
    detail: `${providerLabel} 约 ${billedChars} 计费字符，按 ¥${unitPrice}/万字符估算。`,
    amountCny,
    billedChars,
    tone: "metered",
  };
}
