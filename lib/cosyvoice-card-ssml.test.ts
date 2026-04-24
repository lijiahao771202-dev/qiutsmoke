// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { buildCosyVoiceCardSSML } from "./cosyvoice-card-ssml.ts";

test("builds CosyVoice SSML from card content", () => {
  const ssml = buildCosyVoiceCardSSML(
    `慢慢吸气[pause 500ms]慢慢呼气[pause 12s]保持 <平静> & 专注`
  );

  assert.equal(
    ssml,
    "<speak>慢慢吸气<break time=\"500ms\"/>慢慢呼气<break time=\"10000ms\"/></speak><speak><break time=\"2000ms\"/>保持 &lt;平静&gt; &amp; 专注</speak>"
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
