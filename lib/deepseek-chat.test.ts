// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDeepSeekChatCompletionBody,
  getEffectiveDeepSeekThinking,
} from "./deepseek-chat.ts";

test("builds a DeepSeek V4 non-thinking payload", () => {
  assert.deepEqual(
    buildDeepSeekChatCompletionBody({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: "hi" }],
      stream: true,
      thinkingEnabled: false,
      reasoningEffort: "high",
      temperature: 0.6,
      presencePenalty: 0.2,
      frequencyPenalty: 0.2,
    }),
    {
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: "hi" }],
      stream: true,
      thinking: { type: "disabled" },
      temperature: 0.6,
      frequency_penalty: 0.2,
      presence_penalty: 0.2,
    }
  );
});

test("builds a DeepSeek V4 thinking payload with reasoning effort", () => {
  assert.deepEqual(
    buildDeepSeekChatCompletionBody({
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: "hi" }],
      stream: false,
      thinkingEnabled: true,
      reasoningEffort: "max",
      maxTokens: 128,
    }),
    {
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: "hi" }],
      stream: false,
      max_tokens: 128,
      thinking: { type: "enabled" },
      reasoning_effort: "max",
    }
  );
});

test("legacy deepseek-reasoner always enables thinking", () => {
  assert.equal(getEffectiveDeepSeekThinking("deepseek-reasoner", false), true);
});
