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
    content: "慢慢呼吸，放松肩膀。",
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
      cosyvoice35PlusInstruction: "请保持平稳自然。",
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
      cosyvoiceInstruction: "请轻柔一点。",
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
    content: "把注意力带回身体。",
    voice_id: "zh-CN-XiaoxiaoNeural",
    rate: "0%",
  };

  const slowKey = buildTTSCardAudioCacheKey(
    card,
    normalizeTTSSettings({
      provider: "cosyvoice",
      cosyvoiceVoiceId: "tea",
      cosyvoiceSpeed: 0.7,
      cosyvoiceInstruction: "请更慢、更轻、更安静。",
      cosyvoiceSeed: 7,
    }),
    null
  );
  const fasterKey = buildTTSCardAudioCacheKey(
    card,
    normalizeTTSSettings({
      provider: "cosyvoice",
      cosyvoiceVoiceId: "tea",
      cosyvoiceSpeed: 1.05,
      cosyvoiceInstruction: "请保持平稳自然。",
      cosyvoiceSeed: 9,
    }),
    null
  );

  assert.notEqual(slowKey, fasterKey);
});

test("uses MiMo settings in cache keys before the first synth snapshot exists", () => {
  const card = {
    id: "card-mimo",
    content: "让呼吸自己进出。",
    voice_id: "zh-CN-XiaoxiaoNeural",
    rate: "0%",
  };

  const builtInKey = buildTTSCardAudioCacheKey(
    card,
    normalizeTTSSettings({
      provider: "mimotts",
      mimoTTSModel: "mimo-v2.5-tts",
      mimoTTSVoice: "Chloe",
      mimoTTSInstruction: "请用轻柔、低刺激的冥想语气朗读。",
    }),
    null
  );
  const designKey = buildTTSCardAudioCacheKey(
    card,
    normalizeTTSSettings({
      provider: "mimotts",
      mimoTTSModel: "mimo-v2.5-tts-voicedesign",
      mimoTTSInstruction: "女声，温柔，像睡前陪伴。",
    }),
    null
  );

  assert.notEqual(builtInKey, designKey);
});

test("uses separate MiMo voice design prompts in cache keys", () => {
  const card = {
    id: "card-mimo-design-voice",
    content: "慢慢吸气，然后呼气。",
    voice_id: "zh-CN-XiaoxiaoNeural",
    rate: "0%",
  };
  const softFemale = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "mimo-v2.5-tts-voicedesign",
    mimoTTSVoiceDesignPrompt: "成年女性，声线温柔偏低，语速慢。",
    mimoTTSInstruction: "角色：中文正念冥想指导者。",
  });
  const groundedMale = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "mimo-v2.5-tts-voicedesign",
    mimoTTSVoiceDesignPrompt: "成年男性，声线低稳温厚，语速慢。",
    mimoTTSInstruction: "角色：中文正念冥想指导者。",
  });

  assert.notEqual(
    buildTTSCardAudioCacheKey(card, softFemale, null),
    buildTTSCardAudioCacheKey(card, groundedMale, null)
  );
  assert.equal(
    buildSynthSnapshot("card-mimo-design-voice", softFemale).mimoTTSVoiceDesignPrompt,
    "成年女性，声线温柔偏低，语速慢。"
  );
});

test("ignores MiMo voice design prompts in cache keys outside voice design mode", () => {
  const card = {
    id: "card-mimo-built-in",
    content: "让身体安稳地坐着。",
    voice_id: "zh-CN-XiaoxiaoNeural",
    rate: "0%",
  };
  const first = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "mimo-v2.5-tts",
    mimoTTSVoice: "Chloe",
    mimoTTSVoiceDesignPrompt: "成年女性，声线温柔偏低。",
    mimoTTSInstruction: "角色：中文正念冥想指导者。",
  });
  const second = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "mimo-v2.5-tts",
    mimoTTSVoice: "Chloe",
    mimoTTSVoiceDesignPrompt: "成年男性，声线低稳温厚。",
    mimoTTSInstruction: "角色：中文正念冥想指导者。",
  });

  assert.equal(
    buildTTSCardAudioCacheKey(card, first, null),
    buildTTSCardAudioCacheKey(card, second, null)
  );
});

test("keeps cache keys stable across synth attempts with the same MiMo settings", () => {
  const card = {
    id: "card-mimo-resume",
    content: "闭上眼睛。[pause 5s] 慢慢呼气。",
    voice_id: "zh-CN-XiaoxiaoNeural",
    rate: "0%",
  };
  const settings = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "mimo-v2.5-tts-voicedesign",
    mimoTTSInstruction: "女声，温柔，慢速。",
  });

  const firstAttempt = buildTTSCardAudioCacheKey(
    card,
    settings,
    buildSynthSnapshot("card-mimo-resume", settings, "2026-04-28T10:00:00.000Z")
  );
  const retryAttempt = buildTTSCardAudioCacheKey(
    card,
    settings,
    buildSynthSnapshot("card-mimo-resume", settings, "2026-04-28T10:05:00.000Z")
  );

  assert.equal(firstAttempt, retryAttempt);
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
      {
        id: "card-b",
        provider: "cosyvoice35plus",
        synthesizedAt: "2026-04-25T10:00:00.000Z",
        cosyvoice35PlusModel: "cosyvoice-v3.5-flash",
      }
    ),
    "cy3.5-flash"
  );
  assert.equal(
    getSynthModelBadgeLabel(
      {
        id: "card-c",
        provider: "cosyvoice35plus",
        synthesizedAt: "2026-04-25T10:00:00.000Z",
        cosyvoice35PlusModel: "cosyvoice-v3.5-plus",
      }
    ),
    "3.5plus"
  );
  assert.equal(
    getSynthModelBadgeLabel(
      buildSynthSnapshot("card-d", normalizeTTSSettings({ provider: "edge" }))
    ),
    "edgetts"
  );
  assert.equal(
    getSynthModelBadgeLabel(
      buildSynthSnapshot(
        "card-e",
        normalizeTTSSettings({
          provider: "mimotts",
          mimoTTSModel: "mimo-v2.5-tts-voicedesign",
        })
      )
    ),
    "mimo-design"
  );
});

test("builds short model badge labels from active settings before first synth", () => {
  assert.equal(
    getTTSSettingsModelBadgeLabel(normalizeTTSSettings({ provider: "cosyvoice" })),
    "3.0local"
  );
  assert.equal(
    getTTSSettingsModelBadgeLabel(normalizeTTSSettings({ provider: "edge" })),
    "edgetts"
  );
  assert.equal(
    getTTSSettingsModelBadgeLabel(
      normalizeTTSSettings({
        provider: "mimotts",
        mimoTTSModel: "mimo-v2.5-tts-voiceclone",
      })
    ),
    "mimo-clone"
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
