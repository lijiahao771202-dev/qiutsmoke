// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  TTS_AUDIO_CACHE_CHUNK_BYTES,
  buildAudioCacheManifest,
  buildAudioCacheUploadMarker,
  cacheKeyToAudioStoragePaths,
  parseAudioCacheManifest,
  parseAudioCacheUploadMarker,
  shouldStoreAudioCacheInChunks,
} from "./tts-audio-cache-storage.ts";

test("builds stable audio cache storage paths from a cache key", () => {
  const paths = cacheKeyToAudioStoragePaths("user-1", "cosyvoice:abc:card-1");

  assert.equal(paths.folder, "user-1");
  assert.match(paths.fileName, /\.wav$/);
  assert.match(paths.fullPath, /^user-1\/.+\.wav$/);
  assert.match(paths.manifestPath, /^user-1\/.+\.manifest\.json$/);
  assert.match(paths.uploadMarkerPath, /^user-1\/.+\.uploading\.json$/);
  assert.match(paths.chunkPath(3), /^user-1\/.+\.chunks\/00003\.part$/);
});

test("stores audio in chunks when it exceeds the chunk size", () => {
  assert.equal(shouldStoreAudioCacheInChunks(TTS_AUDIO_CACHE_CHUNK_BYTES), false);
  assert.equal(shouldStoreAudioCacheInChunks(TTS_AUDIO_CACHE_CHUNK_BYTES + 1), true);
});

test("builds and parses audio cache manifests", () => {
  const manifest = buildAudioCacheManifest(
    "cosyvoice:abc:card-1",
    "audio/wav",
    TTS_AUDIO_CACHE_CHUNK_BYTES * 2 + 1
  );

  assert.equal(manifest.chunkCount, 3);
  assert.deepEqual(parseAudioCacheManifest(JSON.stringify(manifest)), manifest);
  assert.equal(parseAudioCacheManifest(JSON.stringify({ version: 1 })), null);
});

test("builds and parses fresh audio cache upload markers", () => {
  const now = Date.UTC(2026, 3, 26, 10, 0, 0);
  const marker = buildAudioCacheUploadMarker("cosyvoice:abc:card-1", now);

  assert.deepEqual(parseAudioCacheUploadMarker(JSON.stringify(marker), now + 30_000), marker);
  assert.equal(parseAudioCacheUploadMarker(JSON.stringify(marker), now + 11 * 60_000), null);
  assert.equal(parseAudioCacheUploadMarker(JSON.stringify({ version: 1 }), now), null);
});
