// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildMimoTTSPayload,
  buildMimoTTSInstructionWithRate,
  extractMimoTTSAudioBase64,
  getMimoTTSResponseErrorMessage,
  getMimoTTSEndpoint,
  resolveMimoTTSCloneVoiceSource,
  shouldRetryMimoTTSResponse,
} from "./mimo-tts.ts";
import { normalizeTTSSettings } from "./tts-settings.ts";

test("builds a MiMo built-in voice payload with style instruction and assistant text", () => {
  const settings = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "mimo-v2.5-tts",
    mimoTTSVoice: "Chloe",
    mimoTTSInstruction: "请用轻柔、缓慢、安定的冥想语气朗读。",
  });

  assert.deepEqual(buildMimoTTSPayload("慢慢呼气。", settings), {
    model: "mimo-v2.5-tts",
    messages: [
      { role: "user", content: "请用轻柔、缓慢、安定的冥想语气朗读。" },
      { role: "assistant", content: "慢慢呼气。" },
    ],
    audio: {
      format: "wav",
      voice: "Chloe",
    },
    stream: false,
  });
});

test("builds a MiMo voice design payload without a fixed voice id", () => {
  const settings = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "mimo-v2.5-tts-voicedesign",
    mimoTTSVoiceDesignPrompt: "成年女性，声线温柔偏低，气息松弛，语速慢。",
    mimoTTSInstruction: "角色：中文正念冥想指导者。\n\n指导：句尾轻轻落下，句间留白充分。",
  });

  assert.deepEqual(buildMimoTTSPayload("肩膀慢慢沉下来。", settings), {
    model: "mimo-v2.5-tts-voicedesign",
    messages: [
      {
        role: "user",
        content:
          "声音设计：成年女性，声线温柔偏低，气息松弛，语速慢。\n\n朗读导演：\n角色：中文正念冥想指导者。\n\n指导：句尾轻轻落下，句间留白充分。",
      },
      { role: "assistant", content: "肩膀慢慢沉下来。" },
    ],
    audio: {
      format: "wav",
    },
    stream: false,
  });
});

test("builds a MiMo voice clone payload with resolved clone voice data", () => {
  const settings = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "mimo-v2.5-tts-voiceclone",
    mimoTTSInstruction: "请保持平稳、中性、低刺激。",
  });

  assert.deepEqual(
    buildMimoTTSPayload(
      "现在把注意力带回呼吸。",
      settings,
      "data:audio/wav;base64,QUJDRA=="
    ),
    {
      model: "mimo-v2.5-tts-voiceclone",
      messages: [
        { role: "user", content: "请保持平稳、中性、低刺激。" },
        { role: "assistant", content: "现在把注意力带回呼吸。" },
      ],
      audio: {
        format: "wav",
        voice: "data:audio/wav;base64,QUJDRA==",
      },
      stream: false,
    }
  );
});

test("appends per-segment rate control to MiMo natural language instruction", () => {
  assert.equal(
    buildMimoTTSInstructionWithRate("女声，温柔，慢速。", "-10%"),
    "女声，温柔，慢速。\n本段请在保持自然连贯的前提下，把整体语速降低约 10%，句尾更轻，句间留白更充分。"
  );

  assert.equal(
    buildMimoTTSInstructionWithRate("清晰，稳定。", "+15%"),
    "清晰，稳定。\n本段请在保持自然清晰的前提下，把整体语速提高约 15%，节奏更紧凑但不要急促。"
  );

  assert.equal(buildMimoTTSInstructionWithRate("清晰，稳定。", "0%"), "清晰，稳定。");
});

test("builds a MiMo clone payload with instruction that already includes segment rate control", () => {
  const settings = normalizeTTSSettings({
    provider: "mimotts",
    mimoTTSModel: "mimo-v2.5-tts-voiceclone",
    mimoTTSInstruction: buildMimoTTSInstructionWithRate(
      "请保留参考音色，同时用冥想引导方式朗读。",
      "-10%"
    ),
  });

  const payload = buildMimoTTSPayload(
    "把注意力带回呼吸。",
    settings,
    "data:audio/wav;base64,QUJDRA=="
  );

  assert.equal(payload.model, "mimo-v2.5-tts-voiceclone");
  assert.equal(payload.messages[0]?.role, "user");
  assert.match(payload.messages[0]?.content || "", /保留参考音色/);
  assert.match(payload.messages[0]?.content || "", /语速降低约 10%/);
  assert.equal(payload.messages[1]?.content, "把注意力带回呼吸。");
});

test("resolves a remote MiMo clone voice url into a data url", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://cdn.example.com/voice.wav");
    assert.equal(init?.cache, "no-store");
    return new Response(new Uint8Array([0x41, 0x42, 0x43]), {
      status: 200,
      headers: { "Content-Type": "audio/wav" },
    });
  };

  try {
    assert.equal(
      await resolveMimoTTSCloneVoiceSource("https://cdn.example.com/voice.wav"),
      "data:audio/wav;base64,QUJD"
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("resolves a local MiMo clone voice path into a data url", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mimo-tts-"));
  const voicePath = join(dir, "voice.wav");
  await writeFile(voicePath, Buffer.from([0x41, 0x42, 0x43]));

  assert.equal(
    await resolveMimoTTSCloneVoiceSource(voicePath),
    "data:audio/wav;base64,QUJD"
  );
});

test("extracts base64 audio from a MiMo chat completions response", () => {
  assert.equal(
    extractMimoTTSAudioBase64({
      choices: [
        {
          message: {
            audio: {
              data: "QUJDRA==",
            },
          },
        },
      ],
    }),
    "QUJDRA=="
  );
  assert.equal(extractMimoTTSAudioBase64({ choices: [{ message: {} }] }), "");
});

test("classifies transient MiMo upstream multimodal loading failures as retryable", () => {
  const data = {
    error: {
      code: "500",
      message:
        "Internal server error: An exception occurred while loading multimodal data: Error while loading audio.",
    },
  };

  assert.equal(
    getMimoTTSResponseErrorMessage(data),
    "code 500: Internal server error: An exception occurred while loading multimodal data: Error while loading audio."
  );
  assert.equal(shouldRetryMimoTTSResponse(data), true);
  assert.equal(shouldRetryMimoTTSResponse({ error: { code: "400", message: "invalid model" } }), false);
});

test("builds the MiMo OpenAI-compatible chat completions endpoint", () => {
  assert.equal(
    getMimoTTSEndpoint("https://api.xiaomimimo.com/v1"),
    "https://api.xiaomimimo.com/v1/chat/completions"
  );
});
