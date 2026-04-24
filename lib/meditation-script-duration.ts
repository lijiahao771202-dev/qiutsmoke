const CARD_DIRECTIVE_RE = /(\[(?:pause|rate)[^\]]+\])/g;

export type GuidanceLevel = "light" | "medium" | "heavy";

export type AIGenerationTargets = {
  totalSeconds: number;
  textRatio: number;
  targetTextSeconds: number;
  targetPauseSeconds: number;
  estimatedChars: number;
};

const PROMPT_CHARS_PER_MINUTE = 260;
const ESTIMATED_TTS_CHARS_PER_MINUTE = 210;

export function getGuidanceTextRatio(guidanceLevel: string) {
  if (guidanceLevel === "light") return 0.1;
  if (guidanceLevel === "heavy") return 0.7;
  return 0.5;
}

export function buildAIGenerationTargets(
  durationMinutes: number,
  guidanceLevel: string,
  charsPerMinute = PROMPT_CHARS_PER_MINUTE
): AIGenerationTargets {
  const totalSeconds = durationMinutes * 60;
  const textRatio = getGuidanceTextRatio(guidanceLevel);
  const targetTextSeconds = Math.round(totalSeconds * textRatio);
  const targetPauseSeconds = Math.round(totalSeconds * (1 - textRatio));
  const estimatedChars = Math.round(targetTextSeconds * (charsPerMinute / 60));

  return {
    totalSeconds,
    textRatio,
    targetTextSeconds,
    targetPauseSeconds,
    estimatedChars,
  };
}

export function estimateMeditationScriptDurationSeconds(
  content: string,
  charsPerMinute = ESTIMATED_TTS_CHARS_PER_MINUTE
) {
  const safeCharsPerMinute = Math.max(1, charsPerMinute);
  const parts = content.split(CARD_DIRECTIVE_RE);
  let totalSeconds = 0;
  let currentRatePercent = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[")) {
      const pauseMatch = trimmed.match(/pause\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(ms|s)?/i);
      if (pauseMatch) {
        const value = Number.parseFloat(pauseMatch[1]);
        const unit = (pauseMatch[2] || "").toLowerCase();
        if (Number.isFinite(value) && value > 0) {
          totalSeconds += unit === "ms" ? value / 1000 : value;
        }
        continue;
      }

      const rateMatch = trimmed.match(/rate\s*[:=]?\s*([+-]?\d+)%/i);
      if (rateMatch) {
        currentRatePercent = Number.parseInt(rateMatch[1], 10) || 0;
      }
      continue;
    }

    const effectiveCharsPerMinute = Math.max(
      80,
      safeCharsPerMinute * Math.max(0.3, 1 + currentRatePercent / 100)
    );
    totalSeconds += (Array.from(trimmed).length / effectiveCharsPerMinute) * 60;
  }

  return totalSeconds;
}

export function formatDurationMinutes(seconds: number) {
  return (seconds / 60).toFixed(1);
}
