// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { normalizeAISettings } from "./ai-models.ts";

test("defaults DeepSeek to V4 Flash with thinking disabled", () => {
  assert.deepEqual(normalizeAISettings({}), {
    provider: "deepseek",
    model: "deepseek-v4-flash",
    deepseekThinkingEnabled: false,
    deepseekReasoningEffort: "high",
  });
});

test("forces thinking on for legacy deepseek-reasoner alias", () => {
  assert.deepEqual(
    normalizeAISettings({
      provider: "deepseek",
      model: "deepseek-reasoner",
      deepseekThinkingEnabled: false,
      deepseekReasoningEffort: "max",
    }),
    {
      provider: "deepseek",
      model: "deepseek-reasoner",
      deepseekThinkingEnabled: true,
      deepseekReasoningEffort: "max",
    }
  );
});

test("normalizes non-DeepSeek providers without deep thinking", () => {
  assert.deepEqual(
    normalizeAISettings({
      provider: "nvidia",
      model: "moonshotai/kimi-k2-instruct",
      deepseekThinkingEnabled: true,
      deepseekReasoningEffort: "max",
    }),
    {
      provider: "nvidia",
      model: "moonshotai/kimi-k2-instruct",
      deepseekThinkingEnabled: false,
      deepseekReasoningEffort: "max",
    }
  );
});
