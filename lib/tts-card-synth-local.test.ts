// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { buildSynthSnapshot, buildTTSCardAudioCacheKey } from "./tts-card-synth.ts";
import { resolveLocalTTSCardVersion } from "./tts-card-synth-local.ts";
import { normalizeTTSSettings } from "./tts-settings.ts";

const card = {
  id: "card-local-1",
  content: "把注意力带回呼吸。",
  voice_id: "zh-CN-XiaoxiaoNeural",
  rate: "0%",
};

test("auto follows the current settings when a matching local version exists", () => {
  const edgeSettings = normalizeTTSSettings({ provider: "edge" });
  const edgeSnapshot = buildSynthSnapshot("card-local-1", edgeSettings, "2026-04-26T10:00:00.000Z");
  const edgeCacheKey = buildTTSCardAudioCacheKey(card, edgeSettings, edgeSnapshot);

  const resolved = resolveLocalTTSCardVersion({
    card,
    settings: edgeSettings,
    localVersions: [
      {
        id: edgeCacheKey,
        cardId: card.id,
        cacheKey: edgeCacheKey,
        synthesizedAt: edgeSnapshot.synthesizedAt,
        snapshot: edgeSnapshot,
        modelLabel: "edgetts",
      },
    ],
    selectedVersionCacheKey: null,
    legacySnapshot: null,
  });

  assert.equal(resolved.source, "matched");
  assert.equal(resolved.cacheKey, edgeCacheKey);
  assert.equal(resolved.snapshot?.provider, "edge");
});

test("manual local selection can pin a different provider version for the same card", () => {
  const edgeSettings = normalizeTTSSettings({ provider: "edge" });
  const mimoSettings = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "mimo-v2.5-tts-voicedesign",
    mimoTTSInstruction: "女声，温柔，慢速。",
  });

  const edgeSnapshot = buildSynthSnapshot("card-local-1", edgeSettings, "2026-04-26T10:00:00.000Z");
  const mimoSnapshot = buildSynthSnapshot("card-local-1", mimoSettings, "2026-04-26T10:05:00.000Z");
  const edgeCacheKey = buildTTSCardAudioCacheKey(card, edgeSettings, edgeSnapshot);
  const mimoCacheKey = buildTTSCardAudioCacheKey(card, mimoSettings, mimoSnapshot);

  const resolved = resolveLocalTTSCardVersion({
    card,
    settings: edgeSettings,
    localVersions: [
      {
        id: edgeCacheKey,
        cardId: card.id,
        cacheKey: edgeCacheKey,
        synthesizedAt: edgeSnapshot.synthesizedAt,
        snapshot: edgeSnapshot,
        modelLabel: "edgetts",
      },
      {
        id: mimoCacheKey,
        cardId: card.id,
        cacheKey: mimoCacheKey,
        synthesizedAt: mimoSnapshot.synthesizedAt,
        snapshot: mimoSnapshot,
        modelLabel: "mimo-design",
      },
    ],
    selectedVersionCacheKey: mimoCacheKey,
    legacySnapshot: null,
  });

  assert.equal(resolved.source, "manual");
  assert.equal(resolved.cacheKey, mimoCacheKey);
  assert.equal(resolved.snapshot?.provider, "mimotts");
  assert.equal(resolved.compatibleVersions.length, 2);
});

test("stale local versions stop matching after the card content changes", () => {
  const edgeSettings = normalizeTTSSettings({ provider: "edge" });
  const edgeSnapshot = buildSynthSnapshot("card-local-1", edgeSettings, "2026-04-26T10:00:00.000Z");
  const oldCacheKey = buildTTSCardAudioCacheKey(
    { ...card, content: "旧版本内容" },
    edgeSettings,
    edgeSnapshot,
  );

  const resolved = resolveLocalTTSCardVersion({
    card,
    settings: edgeSettings,
    localVersions: [
      {
        id: oldCacheKey,
        cardId: card.id,
        cacheKey: oldCacheKey,
        synthesizedAt: edgeSnapshot.synthesizedAt,
        snapshot: edgeSnapshot,
        modelLabel: "edgetts",
      },
    ],
    selectedVersionCacheKey: oldCacheKey,
    legacySnapshot: null,
  });

  assert.equal(resolved.source, "current");
  assert.equal(resolved.compatibleVersions.length, 0);
  assert.equal(resolved.snapshot, null);
});

test("legacy single-snapshot audio still appears as a switchable version after changing provider", () => {
  const edgeSettings = normalizeTTSSettings({ provider: "edge" });
  const cosySettings = normalizeTTSSettings({
    provider: "cosyvoice35plus",
    cosyvoice35PlusModel: "cosyvoice-v3.5-flash",
  });
  const legacyEdgeSnapshot = buildSynthSnapshot(
    "card-local-1",
    edgeSettings,
    "2026-04-26T10:00:00.000Z",
  );

  const resolved = resolveLocalTTSCardVersion({
    card,
    settings: cosySettings,
    localVersions: [],
    selectedVersionCacheKey: null,
    legacySnapshot: legacyEdgeSnapshot,
  });

  assert.equal(
    resolved.compatibleVersions.some((version) => version.modelLabel === "edgetts"),
    true,
  );
});
