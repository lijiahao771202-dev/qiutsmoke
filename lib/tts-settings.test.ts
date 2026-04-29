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
  DEFAULT_MIMO_TTS_CLONE_VOICE_URL,
  DEFAULT_MIMO_TTS_INSTRUCTION,
  DEFAULT_MIMO_TTS_MODEL,
  DEFAULT_MIMO_TTS_VOICE,
  DEFAULT_MIMO_TTS_VOICE_DESIGN_PROMPT,
  DEFAULT_TTS_PROVIDER,
  MIMO_TTS_INSTRUCTION_PRESETS,
  MIMO_TTS_VOICE_DESIGN_PRESETS,
  MIMO_TTS_MODELS,
  MIMO_TTS_VOICES,
  TTS_SETTINGS_PROVIDER_OPTIONS,
  normalizeTTSSettings,
} from "./tts-settings.ts";

test("defaults to cosyvoice and cosyvoice defaults when values are missing or invalid", () => {
  assert.equal(DEFAULT_TTS_PROVIDER, "cosyvoice");
  assert.equal(
    DEFAULT_COSYVOICE_INSTRUCTION,
    "请用非常轻柔、缓慢、安定的睡前冥想语气朗读，音量感偏低，语尾自然下落，不要有明显情绪起伏。每句话之间保留充分停顿，让听众有时间呼吸和放松，整体像安静陪伴而不是教学"
  );
  const defaults = normalizeTTSSettings({});
  assert.equal(defaults.provider, "cosyvoice");
  assert.equal(defaults.cosyvoiceSpeed, DEFAULT_COSYVOICE_SPEED);
  assert.equal(defaults.cosyvoiceInstruction, DEFAULT_COSYVOICE_INSTRUCTION);
  assert.equal(defaults.cosyvoiceSeed, DEFAULT_COSYVOICE_SEED);
  assert.equal(defaults.cosyvoiceVoiceId, DEFAULT_COSYVOICE_VOICE_ID);
  assert.equal(defaults.qwenTTSModel, "qwen3-tts-instruct-flash");
  assert.equal(defaults.cosyvoice35PlusModel, DEFAULT_COSYVOICE_35_PLUS_MODEL);
  assert.equal(defaults.cosyvoice35PlusLanguageHint, "zh");
  assert.equal(defaults.mimoTTSModel, DEFAULT_MIMO_TTS_MODEL);
  assert.equal(defaults.mimoTTSVoice, DEFAULT_MIMO_TTS_VOICE);
  assert.equal(defaults.mimoTTSInstruction, DEFAULT_MIMO_TTS_INSTRUCTION);
  assert.equal(defaults.mimoTTSVoiceDesignPrompt, DEFAULT_MIMO_TTS_VOICE_DESIGN_PROMPT);
  assert.equal(defaults.mimoTTSCloneVoiceUrl, DEFAULT_MIMO_TTS_CLONE_VOICE_URL);

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

test("exposes MiMo meditation instruction presets for quick switching", () => {
  assert.equal(MIMO_TTS_INSTRUCTION_PRESETS.length, 8);
  assert.equal(MIMO_TTS_INSTRUCTION_PRESETS[0].id, "meditation-slow");
  assert.equal(MIMO_TTS_INSTRUCTION_PRESETS[0].prompt, DEFAULT_MIMO_TTS_INSTRUCTION);
  assert.deepEqual(
    MIMO_TTS_INSTRUCTION_PRESETS.map((preset) => preset.id),
    [
      "meditation-slow",
      "minimal-course",
      "body-scan",
      "sleep-deep",
      "breath-anchor",
      "emotion-holding",
      "urge-surfing",
      "steady-coach",
    ]
  );
  for (const preset of MIMO_TTS_INSTRUCTION_PRESETS) {
    assert.ok(preset.prompt.includes("角色："), `${preset.id} should use director role`);
    assert.ok(preset.prompt.includes("场景："), `${preset.id} should use director scene`);
    assert.ok(preset.prompt.includes("指导："), `${preset.id} should use director guidance`);
    assert.ok(!preset.prompt.includes("参考音频"), `${preset.id} should not be clone-only`);
    assert.ok(!preset.prompt.includes("VoiceDesign"), `${preset.id} should not be voice-design-only`);
    assert.ok(!preset.prompt.includes("女声"), `${preset.id} should not bind a voice gender`);
  }
  assert.ok(MIMO_TTS_INSTRUCTION_PRESETS.some((preset) => preset.prompt.includes("句间留白")));
});

test("exposes separate MiMo voice design presets for quick switching", () => {
  assert.equal(MIMO_TTS_VOICE_DESIGN_PRESETS.length, 5);
  assert.equal(MIMO_TTS_VOICE_DESIGN_PRESETS[0].id, "soft-meditation-female");
  assert.equal(MIMO_TTS_VOICE_DESIGN_PRESETS[0].prompt, DEFAULT_MIMO_TTS_VOICE_DESIGN_PROMPT);
  assert.ok(MIMO_TTS_VOICE_DESIGN_PRESETS.every((preset) => !preset.prompt.includes("角色：")));
  assert.ok(MIMO_TTS_VOICE_DESIGN_PRESETS.some((preset) => preset.id === "grounded-male"));
});

test("accepts cosyvoice provider and normalizes runtime controls", () => {
  const settings = normalizeTTSSettings({
    provider: "cosyvoice",
    cosyvoiceSpeed: "1.26",
    cosyvoiceInstruction: "  自定义冥想引导  ",
    cosyvoiceSeed: "42",
    cosyvoiceVoiceId: "tea",
  });
  assert.equal(settings.provider, "cosyvoice");
  assert.equal(settings.cosyvoiceSpeed, 1.25);
  assert.equal(settings.cosyvoiceInstruction, "自定义冥想引导");
  assert.equal(settings.cosyvoiceSeed, 42);
  assert.equal(settings.cosyvoiceVoiceId, "tea");

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

test("accepts MiMo TTS provider and normalizes model-specific controls", () => {
  assert.equal(MIMO_TTS_MODELS.length, 3);
  assert.equal(MIMO_TTS_VOICES.length, 9);

  const settings = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "mimo-v2.5-tts-voiceclone",
    mimoTTSVoice: "Chloe",
    mimoTTSInstruction: "  请用温柔、克制、低刺激的冥想语气朗读。  ",
    mimoTTSVoiceDesignPrompt: "  成年女性，声音温柔偏低，语速慢。  ",
    mimoTTSCloneVoiceUrl: "  https://cdn.example.com/voice-sample.wav  ",
  });

  assert.equal(settings.provider, "mimotts");
  assert.equal(settings.mimoTTSModel, "mimo-v2.5-tts-voiceclone");
  assert.equal(settings.mimoTTSVoice, "Chloe");
  assert.equal(settings.mimoTTSInstruction, "请用温柔、克制、低刺激的冥想语气朗读。");
  assert.equal(settings.mimoTTSVoiceDesignPrompt, "成年女性，声音温柔偏低，语速慢。");
  assert.equal(settings.mimoTTSCloneVoiceUrl, "https://cdn.example.com/voice-sample.wav");

  const invalid = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "not-a-real-model",
    mimoTTSVoice: "nobody",
    mimoTTSInstruction: "",
    mimoTTSVoiceDesignPrompt: "",
  });
  assert.equal(invalid.mimoTTSModel, DEFAULT_MIMO_TTS_MODEL);
  assert.equal(invalid.mimoTTSVoice, DEFAULT_MIMO_TTS_VOICE);
  assert.equal(invalid.mimoTTSInstruction, DEFAULT_MIMO_TTS_INSTRUCTION);
  assert.equal(invalid.mimoTTSVoiceDesignPrompt, DEFAULT_MIMO_TTS_VOICE_DESIGN_PROMPT);

  const migrated = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSInstruction: DEFAULT_COSYVOICE_INSTRUCTION,
  });
  assert.equal(migrated.mimoTTSInstruction, DEFAULT_MIMO_TTS_INSTRUCTION);
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

test("falls back to cosyvoice when legacy cloud providers are loaded from persisted settings", () => {
  assert.deepEqual(TTS_SETTINGS_PROVIDER_OPTIONS, ["cosyvoice", "mimotts", "edge"]);
  assert.equal(normalizeTTSSettings({ provider: "qwentts" }).provider, DEFAULT_TTS_PROVIDER);
  assert.equal(normalizeTTSSettings({ provider: "cosyvoice35plus" }).provider, DEFAULT_TTS_PROVIDER);
});
