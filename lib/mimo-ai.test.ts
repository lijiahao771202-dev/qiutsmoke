// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMimoChatCompletionBody,
  getMimoSafeMaxTokens,
  getMimoChatCompletionsUrl,
  resolveMimoAIKey,
  shouldRetryMimoAITransportError,
} from "./mimo-ai.ts";

test("builds MiMo chat completion requests with lowercase V2.5 model ids", () => {
  assert.equal(
    getMimoChatCompletionsUrl({ MIMO_AI_BASE_URL: "https://example.test/v1/" }),
    "https://example.test/v1/chat/completions"
  );
  assert.equal(resolveMimoAIKey({ MIMO_API_KEY: "primary", MIMO_TTS_API_KEY: "fallback" }), "primary");
  assert.deepEqual(
    buildMimoChatCompletionBody({
      model: "mimo-v2.5",
      messages: [{ role: "user", content: "只回复 OK" }],
      maxTokens: 8,
      temperature: 0,
      stream: false,
    }),
    {
      model: "mimo-v2.5",
      messages: [{ role: "user", content: "只回复 OK" }],
      max_tokens: 8,
      temperature: 0,
      stream: false,
    }
  );
});

test("caps MiMo generation max tokens to the stable Token Plan range", () => {
  assert.equal(getMimoSafeMaxTokens(24000), 10000);
  assert.equal(getMimoSafeMaxTokens(4500), 4500);
  assert.equal(
    buildMimoChatCompletionBody({
      model: "mimo-v2.5-pro",
      messages: [{ role: "user", content: "写一篇冥想稿。" }],
      maxTokens: 24000,
      stream: true,
    }).max_tokens,
    10000
  );
});

test("classifies transient MiMo AI transport failures as retryable", () => {
  assert.equal(shouldRetryMimoAITransportError(new Error("fetch failed")), true);
  assert.equal(shouldRetryMimoAITransportError(new Error("terminated")), true);
  assert.equal(shouldRetryMimoAITransportError(new Error("HTTP 401 invalid key")), false);
});
