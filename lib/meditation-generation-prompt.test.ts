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
  assert.equal(prompt.includes("内部结构蓝图"), true);
  assert.equal(prompt.includes("在完成主要阶段前，不允许提前进入结束口吻"), true);
  assert.equal(prompt.includes("多引导不是一直说话"), true);
  assert.equal(prompt.includes("写的是最终成品"), true);
  assert.equal(prompt.includes("只有最后 3 个节奏块才允许进入收束"), true);
  assert.equal(prompt.includes("不能用空段落、单独停顿或连续停顿标签来凑时长"), true);
  assert.equal(prompt.includes("[pause] 的作用不是机械补时长"), true);
  assert.equal(prompt.includes("不评判、耐心、初心、信任、不争取、接纳、放下"), true);
  assert.equal(prompt.includes("【引导模式与文本布局】"), true);
  assert.equal(prompt.includes("【[pause] 用法对照示范】"), true);
  assert.equal(prompt.includes("当前产品里的轻 / 中 / 多引导，按“陪伴密度”来理解"), true);
  assert.equal(prompt.includes("文本约占总时长 62%-70%"), true);
  assert.equal(prompt.includes("轻引导 / 段内微停顿"), true);
  assert.equal(prompt.includes("中引导 / 段内微停顿"), true);
  assert.equal(prompt.includes("多引导 / 段内微停顿"), true);
  assert.equal(prompt.includes("参考片段只是帮助你校准结构、节奏、体感颗粒度"), true);
  assert.equal(prompt.includes("内部估算公式"), true);
  assert.equal(prompt.includes("不要写“愿你充满爱与光明”"), true);
  assert.equal(prompt.includes("第一句之前不能直接出现 `[pause]`"), true);
  assert.equal(prompt.includes("也应该经常出现在段内"), true);
  assert.equal(prompt.includes("多数时候，一句或两句真实引导之后"), true);
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
  assert.equal(prompt.includes("段内也要自然插入 `[pause]`"), true);
  assert.equal(prompt.includes("不评判、耐心、初心、信任、不争取、接纳、放下"), true);
  assert.equal(prompt.includes("向量检索片段只是参考，不是必须引入"), true);
  assert.equal(prompt.includes("不要求逐条照搬任何参考"), true);
});
