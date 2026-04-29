// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  AI_PROVIDER_LABELS,
  getAIModelFamilies,
  getAIModelOptions,
  getDefaultAIModel,
  normalizeAISettings,
} from "./ai-models.ts";

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

test("supports MiMo V2.5 chat models as an AI provider", () => {
  assert.equal(AI_PROVIDER_LABELS.mimo, "小米 MiMo 官方 API");
  assert.equal(getDefaultAIModel("mimo"), "mimo-v2.5");
  assert.deepEqual(
    getAIModelFamilies("mimo").map((family) => family.id),
    ["mimo"]
  );
  assert.deepEqual(
    getAIModelOptions("mimo").map((option) => option.id),
    ["mimo-v2.5", "mimo-v2.5-pro"]
  );
  assert.deepEqual(
    normalizeAISettings({
      provider: "mimo",
      model: "mimo-v2.5-pro",
      deepseekThinkingEnabled: true,
      deepseekReasoningEffort: "max",
    }),
    {
      provider: "mimo",
      model: "mimo-v2.5-pro",
      deepseekThinkingEnabled: false,
      deepseekReasoningEffort: "max",
    }
  );
});
