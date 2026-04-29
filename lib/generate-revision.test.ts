// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRevisionGenerationUserPrompt,
  normalizeGenerateRevision,
} from "./generate-revision.ts";

test("ignores empty revision feedback", () => {
  assert.equal(
    normalizeGenerateRevision({
      currentDraft: "旧稿",
      feedback: "   ",
    }),
    null
  );
});

test("normalizes revision payload while preserving the full current draft", () => {
  const fullDraft = `开头${"很长".repeat(2000)}结尾`;
  const normalized = normalizeGenerateRevision({
    currentDraft: fullDraft,
    feedback: "  开头太快，pause 太密  ",
    history: [
      { role: "system", content: "ignore" },
      { role: "user", content: "第一轮评价" },
      { role: "assistant", content: "第一轮重写" },
      { role: "user", content: "第二轮评价" },
      { role: "assistant", content: "第二轮重写" },
      { role: "user", content: "第三轮评价" },
      { role: "assistant", content: "第三轮重写" },
      { role: "user", content: "第四轮评价" },
      { role: "assistant", content: "第四轮重写" },
      { role: "user", content: "第五轮评价" },
      { role: "assistant", content: "第五轮重写" },
    ],
  });

  assert.equal(normalized?.currentDraft, fullDraft);
  assert.equal(normalized?.feedback, "开头太快，pause 太密");
  assert.equal(normalized?.history.length, 8);
  assert.deepEqual(
    normalized?.history.map((message) => message.content),
    [
      "第二轮评价",
      "第二轮重写",
      "第三轮评价",
      "第三轮重写",
      "第四轮评价",
      "第四轮重写",
      "第五轮评价",
      "第五轮重写",
    ]
  );
});

test("builds a complete-draft rewrite prompt with feedback and recent context", () => {
  const prompt = buildRevisionGenerationUserPrompt("基础生成提示", {
    currentDraft: "[rate -10%]\n旧稿正文",
    feedback: "不要这么像说明书，开头更安顿，pause 不要那么密。",
    history: [
      { role: "user", content: "上一轮：身体线索太少" },
      { role: "assistant", content: "上一版重写稿片段" },
    ],
  });

  assert.ok(prompt.includes("基础生成提示"));
  assert.ok(prompt.includes("评价重写模式"));
  assert.ok(prompt.includes("重新生成一版完整最终稿"));
  assert.ok(prompt.includes("不要局部 patch"));
  assert.ok(prompt.includes("不要输出对话"));
  assert.ok(prompt.includes("旧稿正文"));
  assert.ok(prompt.includes("开头更安顿"));
  assert.ok(prompt.includes("上一轮：身体线索太少"));
});

