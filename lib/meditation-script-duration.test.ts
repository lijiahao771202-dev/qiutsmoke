// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAIGenerationTargets,
  estimateMeditationScriptDurationSeconds,
} from "./meditation-script-duration.ts";

test("builds duration targets for heavy guidance", () => {
  const targets = buildAIGenerationTargets(30, "heavy");

  assert.equal(targets.totalSeconds, 1800);
  assert.equal(targets.targetTextSeconds, 1224);
  assert.equal(targets.targetPauseSeconds, 576);
  assert.equal(targets.estimatedChars, 3060);
});

test("estimates duration from text, pauses, and rate directives", () => {
  const seconds = estimateMeditationScriptDurationSeconds(
    "[rate -10%]你好世界[pause 10s]慢慢呼吸"
  );

  assert.equal(Math.round(seconds), 14);
});
