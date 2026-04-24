// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCosyVoiceCardSSML,
  buildCosyVoiceCardSSMLChunks,
} from "./cosyvoice-card-ssml.ts";

test("builds CosyVoice SSML from card content", () => {
  const ssml = buildCosyVoiceCardSSML(
    `慢慢吸气[pause 500ms]慢慢呼气[pause 12s]保持 <平静> & 专注`
  );

  assert.equal(
    ssml,
    "<speak>慢慢吸气<break time=\"500ms\"/>慢慢呼气<break time=\"12000ms\"/>保持 &lt;平静&gt; &amp; 专注</speak>"
  );
});

test("ignores rate directives while keeping text and pauses", () => {
  const ssml = buildCosyVoiceCardSSML(
    `[rate -10%]开始[pause 2s][rate +10%]结束`
  );

  assert.equal(
    ssml,
    "<speak>开始<break time=\"2000ms\"/>结束</speak>"
  );
});

test("keeps long pauses inside one speak block by default", () => {
  const ssml = buildCosyVoiceCardSSML(
    `第一句[pause 60s]第二句[pause 120s]结束`
  );

  assert.equal(
    ssml,
    "<speak>第一句<break time=\"60000ms\"/>第二句<break time=\"120000ms\"/>结束</speak>"
  );
});

test("can still split long pauses for compatibility fallback", () => {
  const ssml = buildCosyVoiceCardSSML(`慢慢呼气[pause 12s]保持`, {
    splitLongPauses: true,
  });

  assert.equal(
    ssml,
    "<speak>慢慢呼气<break time=\"10000ms\"/></speak><speak><break time=\"2000ms\"/>保持</speak>"
  );
});

test("splits only pauses longer than the SSML break limit into local pause chunks", () => {
  const chunks = buildCosyVoiceCardSSMLChunks(
    `开始[pause 8s]继续[pause 12s]结束[pause 500ms]收尾`
  );

  assert.deepEqual(chunks, [
    {
      type: "ssml",
      ssml: "<speak>开始<break time=\"8000ms\"/>继续</speak>",
    },
    { type: "pause", durationSeconds: 12 },
    {
      type: "ssml",
      ssml: "<speak>结束<break time=\"500ms\"/>收尾</speak>",
    },
  ]);
});
