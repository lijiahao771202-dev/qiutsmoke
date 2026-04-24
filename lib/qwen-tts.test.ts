// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQwenTTSPayload,
  downloadQwenTTSAudio,
  extractQwenTTSAudioUrl,
  getQwenTTSCurlProxyArgs,
  getQwenTTSGenerationEndpoint,
  getQwenTTSProxyUrl,
  shouldUseQwenTTSCurl,
} from "./qwen-tts.ts";
import { normalizeTTSSettings } from "./tts-settings.ts";

test("builds a Qwen-TTS instruct payload with voice, language and instructions", () => {
  const settings = normalizeTTSSettings({
    provider: "qwentts",
    qwenTTSModel: "qwen3-tts-instruct-flash",
    qwenTTSVoice: "Seren",
    qwenTTSLanguageType: "Chinese",
    qwenTTSInstructions: "请用轻柔缓慢的睡前冥想语气。",
  });

  assert.deepEqual(buildQwenTTSPayload("慢慢吸气。", settings), {
    model: "qwen3-tts-instruct-flash",
    input: {
      text: "慢慢吸气。",
      voice: "Seren",
      language_type: "Chinese",
      instructions: "请用轻柔缓慢的睡前冥想语气。",
      optimize_instructions: true,
    },
  });
});

test("uses system voice and speed instruction for Qwen instruct mode", () => {
  const settings = normalizeTTSSettings({
    provider: "qwentts",
    qwenTTSModel: "qwen3-tts-instruct-flash",
    qwenTTSVoiceMode: "clone",
    qwenTTSVoice: "Seren",
    qwenTTSSpeed: 0.8,
    qwenTTSInstructions: "请用克制的冥想语气朗读。",
  });

  assert.deepEqual(buildQwenTTSPayload("放松。", settings), {
    model: "qwen3-tts-instruct-flash",
    input: {
      text: "放松。",
      voice: "Seren",
      language_type: "Chinese",
      instructions: "请用克制的冥想语气朗读。 语速请放慢到默认的大约 0.8 倍，句间停顿更充分。",
      optimize_instructions: true,
    },
  });
});

test("does not send instructions for the non-instruct Qwen-TTS model", () => {
  const settings = normalizeTTSSettings({
    provider: "qwentts",
    qwenTTSModel: "qwen3-tts-flash",
    qwenTTSVoice: "Li",
    qwenTTSLanguageType: "Chinese",
    qwenTTSInstructions: "这条指令不应该发送。",
  });

  assert.deepEqual(buildQwenTTSPayload("保持觉察。", settings), {
    model: "qwen3-tts-flash",
    input: {
      text: "保持觉察。",
      voice: "Li",
      language_type: "Chinese",
    },
  });
});

test("forces clone voice resolution for the Qwen VC model", () => {
  const settings = normalizeTTSSettings({
    provider: "qwentts",
    qwenTTSModel: "qwen3-tts-vc-2026-01-22",
    qwenTTSVoiceMode: "system",
    qwenTTSVoice: "Seren",
    qwenTTSCloneVoiceCloudId: "qwen-vc-voice-1",
  });

  assert.deepEqual(buildQwenTTSPayload("现在放松。", settings), {
    model: "qwen3-tts-vc-2026-01-22",
    input: {
      text: "现在放松。",
      voice: "qwen-vc-voice-1",
      language_type: "Chinese",
    },
  });
});

test("builds the Beijing DashScope generation endpoint by default", () => {
  assert.equal(
    getQwenTTSGenerationEndpoint("https://dashscope.aliyuncs.com/api/v1"),
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
  );
});

test("extracts Qwen-TTS audio url from DashScope response", () => {
  assert.equal(
    extractQwenTTSAudioUrl({
      output: {
        audio: {
          url: "https://dashscope-result/audio.wav",
        },
      },
    }),
    "https://dashscope-result/audio.wav"
  );

  assert.equal(extractQwenTTSAudioUrl({ output: {} }), "");
});

test("downloads Qwen-TTS audio with native fetch before curl fallback", async () => {
  const previousFetch = globalThis.fetch;
  let called = 0;
  globalThis.fetch = async (url, init) => {
    called += 1;
    assert.equal(url, "https://dashscope-result/audio.wav");
    assert.equal(init?.cache, "no-store");
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "audio/x-wav" },
    });
  };

  try {
    assert.deepEqual(
      await downloadQwenTTSAudio("https://dashscope-result/audio.wav", 1000),
      Buffer.from([1, 2, 3])
    );
    assert.equal(called, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("prefers Qwen-TTS proxy env and falls back to shared TTS proxy", () => {
  assert.equal(
    getQwenTTSProxyUrl({
      QWEN_TTS_PROXY: "http://127.0.0.1:9000",
      TTS_PROXY: "http://127.0.0.1:7897",
    }),
    "http://127.0.0.1:9000"
  );
  assert.equal(
    getQwenTTSProxyUrl({
      TTS_PROXY: "http://127.0.0.1:7897",
    }),
    "http://127.0.0.1:7897"
  );
});

test("builds curl proxy arguments from Qwen-TTS proxy settings", () => {
  assert.deepEqual(
    getQwenTTSCurlProxyArgs({
      TTS_PROXY: "http://127.0.0.1:7897",
    }),
    ["--proxy", "http://127.0.0.1:7897"]
  );
  assert.deepEqual(getQwenTTSCurlProxyArgs({}), []);
});

test("enables curl transport only when explicitly configured", () => {
  assert.equal(shouldUseQwenTTSCurl({ QWEN_TTS_TRANSPORT: "curl" }), true);
  assert.equal(shouldUseQwenTTSCurl({ QWEN_TTS_TRANSPORT: "fetch" }), false);
  assert.equal(shouldUseQwenTTSCurl({}), false);
});
