// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCosyVoice35PlusPayload,
  extractCosyVoiceCloudAudioUrl,
  getCosyVoiceCloudErrorMessage,
  getCosyVoice35PlusVoiceId,
  getCosyVoiceCloudEndpoint,
  shouldUseCosyVoiceCloudCurl,
} from "./cosyvoice-cloud.ts";
import { normalizeTTSSettings } from "./tts-settings.ts";

test("builds a CosyVoice 3.5 Plus DashScope payload", () => {
  const settings = normalizeTTSSettings({
    provider: "cosyvoice35plus",
    cosyvoice35PlusVoiceId: "voice-abc",
    cosyvoice35PlusInstruction: "请用轻柔缓慢的冥想语气。",
    cosyvoice35PlusLanguageHint: "zh",
  });

  assert.deepEqual(buildCosyVoice35PlusPayload("慢慢吸气。", settings), {
    model: "cosyvoice-v3.5-plus",
    input: {
      text: "慢慢吸气。",
      voice: "voice-abc",
      format: "wav",
      sample_rate: 24000,
      rate: 1,
      language_hints: ["zh"],
      instruction: "请用轻柔缓慢的冥想语气。",
    },
  });
});

test("builds a CosyVoice 3.5 Plus SSML payload when requested", () => {
  const settings = normalizeTTSSettings({
    provider: "cosyvoice35plus",
    cosyvoice35PlusVoiceId: "voice-abc",
  });

  assert.deepEqual(
    buildCosyVoice35PlusPayload(
      "<speak>开始<break time=\"500ms\"/>结束</speak>",
      settings,
      "voice-abc",
      { enableSSML: true }
    ),
    {
      model: "cosyvoice-v3.5-plus",
      input: {
        text: "<speak>开始<break time=\"500ms\"/>结束</speak>",
        voice: "voice-abc",
        format: "wav",
        sample_rate: 24000,
        rate: 1,
        language_hints: ["zh"],
        instruction: "请用轻柔、缓慢、安定的睡前冥想语气朗读。",
        enable_ssml: true,
      },
    }
  );
});

test("uses env voice id when CosyVoice 3.5 Plus setting is empty", () => {
  const settings = normalizeTTSSettings({
    provider: "cosyvoice35plus",
    cosyvoice35PlusVoiceId: "",
  });

  assert.equal(
    getCosyVoice35PlusVoiceId(settings, {
      COSYVOICE_35_PLUS_VOICE_ID: "env-voice",
    }),
    "env-voice"
  );
});

test("builds the CosyVoice cloud endpoint and extracts audio url", () => {
  assert.equal(
    getCosyVoiceCloudEndpoint("https://dashscope.aliyuncs.com/api/v1"),
    "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer"
  );
  assert.equal(
    extractCosyVoiceCloudAudioUrl({
      output: {
        audio: {
          url: "https://dashscope-result/audio.wav",
        },
      },
    }),
    "https://dashscope-result/audio.wav"
  );
  assert.equal(extractCosyVoiceCloudAudioUrl({ output: {} }), "");
  assert.equal(
    getCosyVoiceCloudErrorMessage({
      code: "InvalidParameter",
      message: "voice id not found",
    }),
    "InvalidParameter: voice id not found"
  );
});

test("shares curl transport setting with Qwen-TTS unless overridden", () => {
  assert.equal(shouldUseCosyVoiceCloudCurl({ QWEN_TTS_TRANSPORT: "curl" }), true);
  assert.equal(shouldUseCosyVoiceCloudCurl({ COSYVOICE_CLOUD_TRANSPORT: "curl" }), true);
  assert.equal(shouldUseCosyVoiceCloudCurl({ QWEN_TTS_TRANSPORT: "fetch" }), false);
});
