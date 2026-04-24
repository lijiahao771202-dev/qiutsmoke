const CARD_TTS_DIRECTIVE_RE = /(\[(?:pause|rate)[^\]]+\])/g;
const COSYVOICE_SSML_MAX_BREAK_MS = 10_000;

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

function renderPauseAsSSML(durationMs: number) {
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

export function buildCosyVoiceCardSSML(content: string) {
  const parts = content.split(CARD_TTS_DIRECTIVE_RE);
  const ssml: string[] = ["<speak>"];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[")) {
      if (!trimmed.includes("pause")) continue;
      const pauseMs = parsePauseDirectiveMs(trimmed);
      if (pauseMs) {
        ssml.push(renderPauseAsSSML(pauseMs));
      }
      continue;
    }

    ssml.push(escapeXML(trimmed));
  }

  ssml.push("</speak>");
  return ssml.join("");
}
