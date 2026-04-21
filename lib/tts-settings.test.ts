// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  COSYVOICE_PROFILE,
  DEFAULT_COSYVOICE_INSTRUCTION,
  DEFAULT_COSYVOICE_SEED,
  DEFAULT_COSYVOICE_SPEED,
  DEFAULT_TTS_PROVIDER,
  normalizeTTSSettings,
} from "./tts-settings.ts";

test("defaults to cosyvoice and cosyvoice defaults when values are missing or invalid", () => {
  assert.equal(DEFAULT_TTS_PROVIDER, "cosyvoice");
  assert.deepEqual(normalizeTTSSettings({}), {
    provider: "cosyvoice",
    cosyvoiceSpeed: DEFAULT_COSYVOICE_SPEED,
    cosyvoiceInstruction: DEFAULT_COSYVOICE_INSTRUCTION,
    cosyvoiceSeed: DEFAULT_COSYVOICE_SEED,
  });
  assert.deepEqual(
    normalizeTTSSettings({
      provider: "invalid",
      cosyvoiceSpeed: "oops",
      cosyvoiceInstruction: "",
      cosyvoiceSeed: "-1",
    }),
    {
      provider: "cosyvoice",
      cosyvoiceSpeed: DEFAULT_COSYVOICE_SPEED,
      cosyvoiceInstruction: DEFAULT_COSYVOICE_INSTRUCTION,
      cosyvoiceSeed: DEFAULT_COSYVOICE_SEED,
    }
  );
});

test("accepts cosyvoice provider and normalizes runtime controls", () => {
  assert.deepEqual(
    normalizeTTSSettings({
      provider: "cosyvoice",
      cosyvoiceSpeed: "1.26",
      cosyvoiceInstruction: "  自定义冥想引导  ",
      cosyvoiceSeed: "42",
    }),
    {
      provider: "cosyvoice",
      cosyvoiceSpeed: 1.3,
      cosyvoiceInstruction: "自定义冥想引导",
      cosyvoiceSeed: 42,
    }
  );

  assert.equal(COSYVOICE_PROFILE.mode, "自然语言控制");
  assert.equal(COSYVOICE_PROFILE.seed, DEFAULT_COSYVOICE_SEED);
  assert.equal(COSYVOICE_PROFILE.speed, DEFAULT_COSYVOICE_SPEED);
  assert.equal(COSYVOICE_PROFILE.stream, true);
  assert.equal(COSYVOICE_PROFILE.cloneAudioName, "玉屏路 9_16k_mono.wav");
});
