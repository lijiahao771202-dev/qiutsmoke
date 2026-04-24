const CARD_TTS_DIRECTIVE_RE = /(\[(?:pause|rate)[^\]]+\])/g;
const COSYVOICE_SSML_MAX_BREAK_MS = 10_000;
const COSYVOICE_SSML_MAX_BREAK_SECONDS = COSYVOICE_SSML_MAX_BREAK_MS / 1000;
const COSYVOICE_SSML_MAX_BODY_CHARS = 450;
const COSYVOICE_SSML_SENTENCE_RE = /[^。！？!?；;，,\n]+[。！？!?；;，,\n]*/g;

type CosyVoiceCardSSMLOptions = {
  splitLongPauses?: boolean;
};

export type CosyVoiceCardSSMLChunk =
  | { type: "ssml"; ssml: string }
  | { type: "pause"; durationSeconds: number };

function escapeXML(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parsePauseDirectiveMs(part: string) {
  const match = part.match(/pause\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(ms|s)?/i);
  if (!match) return null;

  const rawValue = Number.parseFloat(match[1]);
  if (!Number.isFinite(rawValue) || rawValue <= 0) return null;

  const unit = (match[2] || "").toLowerCase();
  if (unit === "ms") {
    return Math.round(rawValue);
  }
  if (unit === "s" || rawValue < 50) {
    return Math.round(rawValue * 1000);
  }
  return Math.round(rawValue);
}

function renderPauseAsSSML(durationMs: number, options: CosyVoiceCardSSMLOptions) {
  if (options.splitLongPauses !== true) {
    return `<break time="${Math.max(0, durationMs)}ms"/>`;
  }

  let remainingMs = Math.max(0, durationMs);
  const parts: string[] = [];

  while (remainingMs > 0) {
    const chunkMs = Math.min(COSYVOICE_SSML_MAX_BREAK_MS, remainingMs);
    if (parts.length > 0) {
      parts.push(`</speak><speak>`);
    }
    parts.push(`<break time="${chunkMs}ms"/>`);
    remainingMs -= chunkMs;
  }

  return parts.join("");
}

export function buildCosyVoiceCardSSML(
  content: string,
  options: CosyVoiceCardSSMLOptions = {}
) {
  const parts = content.split(CARD_TTS_DIRECTIVE_RE);
  const ssml: string[] = ["<speak>"];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[")) {
      if (!trimmed.includes("pause")) continue;
      const pauseMs = parsePauseDirectiveMs(trimmed);
      if (pauseMs) {
        ssml.push(renderPauseAsSSML(pauseMs, options));
      }
      continue;
    }

    ssml.push(escapeXML(trimmed));
  }

  ssml.push("</speak>");
  return ssml.join("");
}

export function buildCosyVoiceCardSSMLChunks(
  content: string,
  maxSSMLBreakSeconds = COSYVOICE_SSML_MAX_BREAK_SECONDS
): CosyVoiceCardSSMLChunk[] {
  const maxBreakMs = Math.max(0, Math.round(maxSSMLBreakSeconds * 1000));
  const parts = content.split(CARD_TTS_DIRECTIVE_RE);
  const chunks: CosyVoiceCardSSMLChunk[] = [];
  let ssmlParts: string[] = [];
  let ssmlBodyLength = 0;

  const flushSSML = () => {
    if (ssmlParts.length === 0) return;
    chunks.push({ type: "ssml", ssml: `<speak>${ssmlParts.join("")}</speak>` });
    ssmlParts = [];
    ssmlBodyLength = 0;
  };

  const appendSSMLPart = (part: string) => {
    if (!part) return;
    if (ssmlBodyLength > 0 && ssmlBodyLength + part.length > COSYVOICE_SSML_MAX_BODY_CHARS) {
      flushSSML();
    }
    ssmlParts.push(part);
    ssmlBodyLength += part.length;
  };

  const splitEscapedText = (text: string) => {
    const sentences = text.match(COSYVOICE_SSML_SENTENCE_RE) || [text];
    const pieces: string[] = [];

    for (const sentence of sentences) {
      const escapedSentence = escapeXML(sentence);
      if (escapedSentence.length <= COSYVOICE_SSML_MAX_BODY_CHARS) {
        pieces.push(escapedSentence);
        continue;
      }

      const chars = Array.from(sentence);
      for (let index = 0; index < chars.length; index += COSYVOICE_SSML_MAX_BODY_CHARS) {
        pieces.push(escapeXML(chars.slice(index, index + COSYVOICE_SSML_MAX_BODY_CHARS).join("")));
      }
    }

    return pieces;
  };

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[")) {
      if (!trimmed.includes("pause")) continue;
      const pauseMs = parsePauseDirectiveMs(trimmed);
      if (!pauseMs) continue;

      if (maxBreakMs > 0 && pauseMs <= maxBreakMs) {
        appendSSMLPart(`<break time="${pauseMs}ms"/>`);
        continue;
      }

      flushSSML();
      chunks.push({ type: "pause", durationSeconds: pauseMs / 1000 });
      continue;
    }

    for (const piece of splitEscapedText(trimmed)) {
      appendSSMLPart(piece);
    }
  }

  flushSSML();
  return chunks;
}
