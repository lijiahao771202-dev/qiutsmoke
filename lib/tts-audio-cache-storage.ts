export const TTS_AUDIO_CACHE_BUCKET = "tts-audio-cache";
export const TTS_AUDIO_CACHE_MAX_BYTES = 200 * 1024 * 1024;
export const TTS_AUDIO_CACHE_CHUNK_BYTES = 1024 * 1024;
export const TTS_AUDIO_CACHE_UPLOAD_MARKER_TTL_MS = 10 * 60 * 1000;

export type TTSAudioCacheManifest = {
  version: 1;
  cacheKey: string;
  contentType: string;
  byteLength: number;
  chunkBytes: number;
  chunkCount: number;
};

export type TTSAudioCacheUploadMarker = {
  version: 1;
  cacheKey: string;
  startedAt: number;
};

export function encodeAudioCacheKey(cacheKey: string) {
  return Buffer.from(cacheKey, "utf8").toString("base64url");
}

export function cacheKeyToAudioStoragePaths(userId: string, cacheKey: string) {
  const encodedKey = encodeAudioCacheKey(cacheKey);
  const chunkPrefix = `${userId}/${encodedKey}.chunks`;

  return {
    folder: userId,
    fileName: `${encodedKey}.wav`,
    fullPath: `${userId}/${encodedKey}.wav`,
    manifestPath: `${userId}/${encodedKey}.manifest.json`,
    uploadMarkerPath: `${userId}/${encodedKey}.uploading.json`,
    chunkPrefix,
    chunkPath: (index: number) => `${chunkPrefix}/${index.toString().padStart(5, "0")}.part`,
  };
}

export function shouldStoreAudioCacheInChunks(byteLength: number) {
  return byteLength > TTS_AUDIO_CACHE_CHUNK_BYTES;
}

export function buildAudioCacheManifest(
  cacheKey: string,
  contentType: string,
  byteLength: number
): TTSAudioCacheManifest {
  return {
    version: 1,
    cacheKey,
    contentType: contentType || "audio/wav",
    byteLength,
    chunkBytes: TTS_AUDIO_CACHE_CHUNK_BYTES,
    chunkCount: Math.ceil(byteLength / TTS_AUDIO_CACHE_CHUNK_BYTES),
  };
}

export function parseAudioCacheManifest(value: string | ArrayBuffer): TTSAudioCacheManifest | null {
  try {
    const text = typeof value === "string" ? value : new TextDecoder().decode(value);
    const parsed = JSON.parse(text) as Partial<TTSAudioCacheManifest>;

    if (
      parsed.version !== 1 ||
      typeof parsed.cacheKey !== "string" ||
      typeof parsed.contentType !== "string" ||
      typeof parsed.byteLength !== "number" ||
      typeof parsed.chunkBytes !== "number" ||
      typeof parsed.chunkCount !== "number" ||
      parsed.chunkCount < 1
    ) {
      return null;
    }

    return parsed as TTSAudioCacheManifest;
  } catch {
    return null;
  }
}

export function buildAudioCacheUploadMarker(
  cacheKey: string,
  startedAt = Date.now()
): TTSAudioCacheUploadMarker {
  return {
    version: 1,
    cacheKey,
    startedAt,
  };
}

export function parseAudioCacheUploadMarker(
  value: string | ArrayBuffer,
  now = Date.now()
): TTSAudioCacheUploadMarker | null {
  try {
    const text = typeof value === "string" ? value : new TextDecoder().decode(value);
    const parsed = JSON.parse(text) as Partial<TTSAudioCacheUploadMarker>;

    if (
      parsed.version !== 1 ||
      typeof parsed.cacheKey !== "string" ||
      typeof parsed.startedAt !== "number" ||
      parsed.startedAt <= 0 ||
      now - parsed.startedAt > TTS_AUDIO_CACHE_UPLOAD_MARKER_TTL_MS
    ) {
      return null;
    }

    return parsed as TTSAudioCacheUploadMarker;
  } catch {
    return null;
  }
}
