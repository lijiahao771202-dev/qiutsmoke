// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMeditationQueryText,
  chunkMeditationSample,
  formatMeditationReferenceBlock,
  parseMeditationSampleFile,
} from "./meditation-rag.ts";

test("parses frontmatter-driven meditation sample files", () => {
  const sample = parseMeditationSampleFile(
    "focus.md",
    `---
title: 专注呼吸
guidanceLevel: heavy
durationMinutes: 12
themes: 焦虑, 呼吸
styleTags: 稳定, 具体
audience: 容易慌的人
summary: 让呼吸重新变成身体的锚点。
source: curated-original
---
[rate -10%]
现在把注意力放在鼻尖。[pause 4s]

感受气息进出。`
  );

  assert.equal(sample.title, "专注呼吸");
  assert.equal(sample.guidanceLevel, "heavy");
  assert.deepEqual(sample.themes, ["焦虑", "呼吸"]);
  assert.equal(sample.audience, "容易慌的人");
});

test("chunks long samples while keeping searchable metadata", () => {
  const sample = parseMeditationSampleFile(
    "long.md",
    `---
title: 长样本
guidanceLevel: medium
durationMinutes: 15
themes: 身体扫描, 放松
styleTags: 温柔, 具体
audience: 晚上很累的人
summary: 通过身体扫描慢慢落下来。
---
第一段第一段第一段第一段第一段第一段第一段第一段第一段第一段第一段第一段第一段第一段第一段第一段第一段第一段第一段第一段。

第二段第二段第二段第二段第二段第二段第二段第二段第二段第二段第二段第二段第二段第二段第二段第二段第二段第二段第二段第二段。

第三段第三段第三段第三段第三段第三段第三段第三段第三段第三段第三段第三段第三段第三段第三段第三段第三段第三段第三段第三段。

第四段第四段第四段第四段第四段第四段第四段第四段第四段第四段第四段第四段第四段第四段第四段第四段第四段第四段第四段第四段。`
  );

  const chunks = chunkMeditationSample(sample);
  assert.equal(chunks.length >= 1, true);
  assert.equal(chunks[0].searchableText.includes("标题：长样本"), true);
  assert.equal(chunks[0].searchableText.includes("适合主题：身体扫描、放松"), true);
});

test("formats retrieval references as anti-copy guidance block", () => {
  const block = formatMeditationReferenceBlock([
    {
      id: "sample#1",
      title: "焦虑时回到呼吸",
      excerpt: "先感觉脚底，再回到鼻尖与胸口起伏。",
      score: 0.9,
      reason: "引导强度匹配 heavy；主题贴近 焦虑、呼吸",
      metadata: {
        guidanceLevel: "heavy",
        durationMinutes: 12,
        themes: ["焦虑", "呼吸"],
        styleTags: ["稳定", "具体"],
        audience: "容易慌的人",
        summary: "把注意力从脑内噪音拉回身体。",
        source: "curated-original",
      },
    },
  ]);

  assert.equal(block.includes("只借鉴结构"), true);
  assert.equal(block.includes("焦虑时回到呼吸"), true);
  assert.equal(block.includes("可借鉴点"), true);
});

test("builds a retrieval query with duration and guidance hints", () => {
  const query = buildMeditationQueryText({
    topic: "睡前放松",
    durationMinutes: 20,
    guidanceLevel: "heavy",
  });

  assert.equal(query.includes("主题：睡前放松"), true);
  assert.equal(query.includes("目标时长：20 分钟"), true);
  assert.equal(query.includes("引导强度：heavy"), true);
});
