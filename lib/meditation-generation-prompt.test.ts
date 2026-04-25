// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMeditationGenerationSystemPrompt,
  buildMeditationGenerationUserPrompt,
} from "./meditation-generation-prompt.ts";

test("builds heavy guidance system prompt with internal phase blueprint", () => {
  const prompt = buildMeditationGenerationSystemPrompt({
    durationMinutes: 30,
    guidanceLevel: "heavy",
  });

  assert.equal(prompt.includes("目标总时长：30 分钟"), true);
  assert.equal(prompt.includes("内部阶段蓝图"), true);
  assert.equal(prompt.includes("在完成全部内部阶段之前，不允许进入结束段"), true);
  assert.equal(prompt.includes("多引导不是一直说话"), true);
  assert.equal(prompt.includes("这必须是一篇完整成品"), true);
  assert.equal(prompt.includes("只有最后 3 个节奏块才允许进入收束"), true);
  assert.equal(prompt.includes("不能出现只包含 `[pause]` 的空段落"), true);
  assert.equal(prompt.includes("不要写“愿你充满爱与光明”"), true);
});

test("builds user prompt from a clean topic", () => {
  const prompt = buildMeditationGenerationUserPrompt({
    topic: "正念呼吸（目标时长：30分钟）",
    durationMinutes: 30,
    guidanceLevel: "heavy",
    referenceBlock: "【高质量样本参考】\n1. 焦虑时回到呼吸",
  });

  assert.equal(prompt.includes("主题：正念呼吸"), true);
  assert.equal(prompt.includes("目标用户：容易走神"), true);
  assert.equal(prompt.includes("一次性写完整篇成品"), true);
  assert.equal(prompt.includes("至少写出 21 个自然段 / 节奏块"), true);
  assert.equal(prompt.includes("高质量样本参考"), true);
});
