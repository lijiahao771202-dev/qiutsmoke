// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSynthSnapshot,
  buildTTSCardAudioCacheKey,
  getSynthModelBadgeLabel,
  getTTSSettingsModelBadgeLabel,
  isTTSCardSynthSnapshotNewer,
} from "./tts-card-synth.ts";
import { normalizeTTSSettings } from "./tts-settings.ts";

test("freezes card cache key to the saved synth snapshot instead of active settings", () => {
  const card = {
    id: "card-1",
    content: "鎱㈡參鍛煎惛锛屾斁鏉捐偐鑶€銆?",
    voice_id: "zh-CN-XiaoxiaoNeural",
    rate: "0%",
  };

  const savedSnapshot = buildSynthSnapshot(
    "card-1",
    normalizeTTSSettings({
      provider: "cosyvoice35plus",
      cosyvoice35PlusModel: "cosyvoice-v3.5-flash",
      cosyvoice35PlusVoiceProfileId: "tea",
      cosyvoice35FlashVoiceId: "flash-tea",
      cosyvoice35PlusSpeed: 1.1,
      cosyvoice35PlusInstruction: "璇蜂繚鎸佸钩绋宠嚜鐒躲€?",
      cosyvoice35PlusLanguageHint: "zh",
    })
  );

  const cacheKeyWithCurrentEdge = buildTTSCardAudioCacheKey(
    card,
    normalizeTTSSettings({ provider: "edge" }),
    savedSnapshot
  );
  const cacheKeyWithCurrentLocal = buildTTSCardAudioCacheKey(
    card,
    normalizeTTSSettings({
      provider: "cosyvoice",
      cosyvoiceVoiceId: "yupinglu",
      cosyvoiceInstruction: "璇疯交鏌斾竴鐐广€?",
      cosyvoiceSpeed: 0.8,
      cosyvoiceSeed: 7,
    }),
    savedSnapshot
  );

  assert.equal(cacheKeyWithCurrentEdge, cacheKeyWithCurrentLocal);
});

test("uses active settings in cache key before the card has any synth snapshot", () => {
  const card = {
    id: "card-2",
    content: "鎶婃敞鎰忓姏甯﹀洖韬綋銆?",
    voice_id: "zh-CN-XiaoxiaoNeural",
    rate: "0%",
  };

  const flashKey = buildTTSCardAudioCacheKey(
    card,
    normalizeTTSSettings({
      provider: "cosyvoice35plus",
      cosyvoice35PlusModel: "cosyvoice-v3.5-flash",
    }),
    null
  );
  const plusKey = buildTTSCardAudioCacheKey(
    card,
    normalizeTTSSettings({
      provider: "cosyvoice35plus",
      cosyvoice35PlusModel: "cosyvoice-v3.5-plus",
    }),
    null
  );

  assert.notEqual(flashKey, plusKey);
});

test("builds short model badge labels for saved synth snapshots", () => {
  assert.equal(
    getSynthModelBadgeLabel(
      buildSynthSnapshot("card-a", normalizeTTSSettings({ provider: "cosyvoice" }))
    ),
    "3.0local"
  );
  assert.equal(
    getSynthModelBadgeLabel(
      buildSynthSnapshot(
        "card-b",
        normalizeTTSSettings({
          provider: "cosyvoice35plus",
          cosyvoice35PlusModel: "cosyvoice-v3.5-flash",
        })
      )
    ),
    "cy3.5-flash"
  );
  assert.equal(
    getSynthModelBadgeLabel(
      buildSynthSnapshot(
        "card-c",
        normalizeTTSSettings({
          provider: "cosyvoice35plus",
          cosyvoice35PlusModel: "cosyvoice-v3.5-plus",
        })
      )
    ),
    "3.5plus"
  );
  assert.equal(
    getSynthModelBadgeLabel(
      buildSynthSnapshot("card-d", normalizeTTSSettings({ provider: "edge" }))
    ),
    "edgetts"
  );
});

test("builds short model badge labels from active settings before first synth", () => {
  assert.equal(
    getTTSSettingsModelBadgeLabel(normalizeTTSSettings({ provider: "cosyvoice" })),
    "3.0local"
  );
  assert.equal(
    getTTSSettingsModelBadgeLabel(
      normalizeTTSSettings({
        provider: "cosyvoice35plus",
        cosyvoice35PlusModel: "cosyvoice-v3.5-flash",
      })
    ),
    "cy3.5-flash"
  );
  assert.equal(
    getTTSSettingsModelBadgeLabel(normalizeTTSSettings({ provider: "edge" })),
    "edgetts"
  );
});

test("prefers the newer synth snapshot when syncing across devices", () => {
  const localSnapshot = buildSynthSnapshot(
    "card-sync",
    normalizeTTSSettings({ provider: "cosyvoice" }),
    "2026-04-25T10:00:00.000Z"
  );
  const cloudSnapshot = buildSynthSnapshot(
    "card-sync",
    normalizeTTSSettings({
      provider: "cosyvoice35plus",
      cosyvoice35PlusModel: "cosyvoice-v3.5-flash",
    }),
    "2026-04-25T10:05:00.000Z"
  );

  assert.equal(isTTSCardSynthSnapshotNewer(cloudSnapshot, localSnapshot), true);
  assert.equal(isTTSCardSynthSnapshotNewer(localSnapshot, cloudSnapshot), false);
  assert.equal(isTTSCardSynthSnapshotNewer(localSnapshot, localSnapshot), false);
});
