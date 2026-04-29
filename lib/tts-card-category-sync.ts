import type { StoreName } from "./localDB";

const LOCAL_ONLY_TTS_CARD_CATEGORY_FIELDS = ["category_id", "subcategory_id"] as const;

type TTSCardLike = Record<string, unknown>;

export function buildTTSCardCloudPayload(card: TTSCardLike) {
  const payload: TTSCardLike = {};
  for (const [key, value] of Object.entries(card)) {
    if ((LOCAL_ONLY_TTS_CARD_CATEGORY_FIELDS as readonly string[]).includes(key)) continue;
    if (key === "syncStatus" || key === "updatedAt" || key === "cloudId") continue;
    if (value === undefined) continue;
    payload[key] = value;
  }
  return payload;
}

export function preserveLocalTTSCardCategoryFields<T extends TTSCardLike>(
  storeName: StoreName,
  cloudRecord: T,
  localRecord?: TTSCardLike
): T {
  if (storeName !== "tts_cards" || !localRecord) return cloudRecord;

  const nextRecord = { ...cloudRecord };
  for (const field of LOCAL_ONLY_TTS_CARD_CATEGORY_FIELDS) {
    if (nextRecord[field] === undefined && localRecord[field] !== undefined) {
      nextRecord[field] = localRecord[field];
    }
  }

  return nextRecord;
}
