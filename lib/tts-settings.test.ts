// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  COSYVOICE_INSTRUCTION_PRESETS,
  COSYVOICE_PROFILE,
  COSYVOICE_VOICE_PROFILES,
  DEFAULT_COSYVOICE_INSTRUCTION,
  DEFAULT_COSYVOICE_SEED,
  DEFAULT_COSYVOICE_SPEED,
  DEFAULT_COSYVOICE_VOICE_ID,
  DEFAULT_TTS_PROVIDER,
  normalizeTTSSettings,
} from "./tts-settings.ts";

test("defaults to cosyvoice and cosyvoice defaults when values are missing or invalid", () => {
  assert.equal(DEFAULT_TTS_PROVIDER, "cosyvoice");
  assert.equal(
    DEFAULT_COSYVOICE_INSTRUCTION,
    "请用非常轻柔、缓慢、安定的睡前冥想语气朗读，音量感偏低，语尾自然下落，不要有明显情绪起伏。每句话之间保留充分停顿，让听众有时间呼吸和放松，整体像安静陪伴而不是教学"
  );
  assert.deepEqual(normalizeTTSSettings({}), {
    provider: "cosyvoice",
    cosyvoiceSpeed: DEFAULT_COSYVOICE_SPEED,
    cosyvoiceInstruction: DEFAULT_COSYVOICE_INSTRUCTION,
    cosyvoiceSeed: DEFAULT_COSYVOICE_SEED,
    cosyvoiceVoiceId: DEFAULT_COSYVOICE_VOICE_ID,
  });
  assert.deepEqual(
    normalizeTTSSettings({
      provider: "invalid",
      cosyvoiceSpeed: "oops",
      cosyvoiceInstruction: "",
      cosyvoiceSeed: "-1",
      cosyvoiceVoiceId: "missing",
    }),
    {
      provider: "cosyvoice",
      cosyvoiceSpeed: DEFAULT_COSYVOICE_SPEED,
      cosyvoiceInstruction: DEFAULT_COSYVOICE_INSTRUCTION,
      cosyvoiceSeed: DEFAULT_COSYVOICE_SEED,
      cosyvoiceVoiceId: DEFAULT_COSYVOICE_VOICE_ID,
    }
  );
});

test("exposes six cosyvoice instruction presets including the new default", () => {
  assert.equal(COSYVOICE_INSTRUCTION_PRESETS.length, 6);
  assert.equal(COSYVOICE_INSTRUCTION_PRESETS[0].id, "sleep-companion");
  assert.equal(COSYVOICE_INSTRUCTION_PRESETS[0].prompt, DEFAULT_COSYVOICE_INSTRUCTION);
  assert.equal(COSYVOICE_INSTRUCTION_PRESETS[5].id, "tea-calm");
});

test("accepts cosyvoice provider and normalizes runtime controls", () => {
  assert.deepEqual(
    normalizeTTSSettings({
      provider: "cosyvoice",
      cosyvoiceSpeed: "1.26",
      cosyvoiceInstruction: "  自定义冥想引导  ",
      cosyvoiceSeed: "42",
      cosyvoiceVoiceId: "tea",
    }),
    {
      provider: "cosyvoice",
      cosyvoiceSpeed: 1.3,
      cosyvoiceInstruction: "自定义冥想引导",
      cosyvoiceSeed: 42,
      cosyvoiceVoiceId: "tea",
    }
  );

  assert.equal(DEFAULT_COSYVOICE_VOICE_ID, "yupinglu");
  assert.equal(COSYVOICE_VOICE_PROFILES.length, 2);
  assert.equal(COSYVOICE_VOICE_PROFILES[1].id, "tea");
  assert.equal(COSYVOICE_VOICE_PROFILES[1].cloneAudioName, "tea_clone_20260421b_16k_mono.wav");
  assert.equal(COSYVOICE_VOICE_PROFILES[1].promptText, "我们放下忙碌与杂念，借由一杯茶回归内心的安静");
  assert.equal(COSYVOICE_PROFILE.mode, "自然语言控制");
  assert.equal(COSYVOICE_PROFILE.seed, DEFAULT_COSYVOICE_SEED);
  assert.equal(COSYVOICE_PROFILE.speed, DEFAULT_COSYVOICE_SPEED);
  assert.equal(COSYVOICE_PROFILE.stream, true);
  assert.equal(COSYVOICE_PROFILE.cloneAudioName, "玉屏路 9_16k_mono.wav");
});
