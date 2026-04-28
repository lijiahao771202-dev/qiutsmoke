// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  COSYVOICE_35_MODELS,
  COSYVOICE_INSTRUCTION_PRESETS,
  COSYVOICE_PROFILE,
  COSYVOICE_VOICE_PROFILES,
  DEFAULT_COSYVOICE_INSTRUCTION,
  DEFAULT_COSYVOICE_35_PLUS_MODEL,
  DEFAULT_COSYVOICE_SEED,
  DEFAULT_COSYVOICE_SPEED,
  DEFAULT_COSYVOICE_VOICE_ID,
  DEFAULT_TTS_PROVIDER,
  normalizeTTSSettings,
} from "./tts-settings.ts";

test("defaults to cosyvoice and cosyvoice defaults when values are missing or invalid", () => {
  assert.equal(DEFAULT_TTS_PROVIDER, "cosyvoice");
  assert.match(DEFAULT_COSYVOICE_INSTRUCTION, /gentle/i);
  const defaults = normalizeTTSSettings({});
  assert.equal(defaults.provider, "cosyvoice");
  assert.equal(defaults.cosyvoiceSpeed, DEFAULT_COSYVOICE_SPEED);
  assert.equal(defaults.cosyvoiceInstruction, DEFAULT_COSYVOICE_INSTRUCTION);
  assert.equal(defaults.cosyvoiceSeed, DEFAULT_COSYVOICE_SEED);
  assert.equal(defaults.cosyvoiceVoiceId, DEFAULT_COSYVOICE_VOICE_ID);
  assert.equal(defaults.qwenTTSModel, "qwen3-tts-instruct-flash");
  assert.equal(defaults.cosyvoice35PlusModel, DEFAULT_COSYVOICE_35_PLUS_MODEL);
  assert.equal(defaults.cosyvoice35PlusLanguageHint, "zh");

  const invalid = normalizeTTSSettings({
    provider: "invalid",
    cosyvoiceSpeed: "oops",
    cosyvoiceInstruction: "",
    cosyvoiceSeed: "-1",
    cosyvoiceVoiceId: "missing",
  });
  assert.equal(invalid.provider, "cosyvoice");
  assert.equal(invalid.cosyvoiceSpeed, DEFAULT_COSYVOICE_SPEED);
  assert.equal(invalid.cosyvoiceInstruction, DEFAULT_COSYVOICE_INSTRUCTION);
  assert.equal(invalid.cosyvoiceSeed, DEFAULT_COSYVOICE_SEED);
  assert.equal(invalid.cosyvoiceVoiceId, DEFAULT_COSYVOICE_VOICE_ID);
});

test("exposes six cosyvoice instruction presets including the new default", () => {
  assert.equal(COSYVOICE_INSTRUCTION_PRESETS.length, 6);
  assert.equal(COSYVOICE_INSTRUCTION_PRESETS[0].id, "sleep-companion");
  assert.equal(COSYVOICE_INSTRUCTION_PRESETS[0].prompt, DEFAULT_COSYVOICE_INSTRUCTION);
  assert.equal(COSYVOICE_INSTRUCTION_PRESETS[5].id, "tea-calm");
});

test("accepts cosyvoice provider and normalizes runtime controls", () => {
  const settings = normalizeTTSSettings({
    provider: "cosyvoice",
    cosyvoiceSpeed: "1.26",
    cosyvoiceInstruction: "  custom calming guide  ",
    cosyvoiceSeed: "42",
    cosyvoiceVoiceId: "tea",
  });
  assert.equal(settings.provider, "cosyvoice");
  assert.equal(settings.cosyvoiceSpeed, 1.25);
  assert.equal(settings.cosyvoiceInstruction, "custom calming guide");
  assert.equal(settings.cosyvoiceSeed, 42);
  assert.equal(settings.cosyvoiceVoiceId, "tea");

  assert.equal(DEFAULT_COSYVOICE_VOICE_ID, "yupinglu");
  assert.equal(COSYVOICE_VOICE_PROFILES.length, 2);
  assert.equal(COSYVOICE_VOICE_PROFILES[1].id, "tea");
  assert.equal(COSYVOICE_VOICE_PROFILES[1].cloneAudioName, "tea_clone_20260421b_16k_mono.wav");
  assert.match(COSYVOICE_VOICE_PROFILES[1].promptText, /tea/i);
  assert.equal(COSYVOICE_PROFILE.mode, "natural-language-control");
  assert.equal(COSYVOICE_PROFILE.seed, DEFAULT_COSYVOICE_SEED);
  assert.equal(COSYVOICE_PROFILE.speed, DEFAULT_COSYVOICE_SPEED);
  assert.equal(COSYVOICE_PROFILE.stream, true);
  assert.equal(COSYVOICE_PROFILE.cloneAudioName, "yupinglu-9_16k_mono.wav");
});

test("accepts CosyVoice 3.5 plus and flash model selection", () => {
  assert.equal(COSYVOICE_35_MODELS.length, 2);
  assert.equal(COSYVOICE_35_MODELS[0].id, "cosyvoice-v3.5-plus");
  assert.equal(COSYVOICE_35_MODELS[1].id, "cosyvoice-v3.5-flash");

  const flash = normalizeTTSSettings({
    provider: "cosyvoice35plus",
    cosyvoice35PlusModel: "cosyvoice-v3.5-flash",
    cosyvoice35FlashVoiceId: "  flash-voice  ",
  });
  assert.equal(flash.cosyvoice35PlusModel, "cosyvoice-v3.5-flash");
  assert.equal(flash.cosyvoice35FlashVoiceId, "flash-voice");

  const invalid = normalizeTTSSettings({
    provider: "cosyvoice35plus",
    cosyvoice35PlusModel: "not-a-model",
  });
  assert.equal(invalid.cosyvoice35PlusModel, DEFAULT_COSYVOICE_35_PLUS_MODEL);
});
