// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_TTS_STUDIO_AMBIENT_PRESET,
  getDefaultTTSStudioAmbientPreset,
} from "./tts-studio-ambient.ts";

test("auto-starts fire and waves when no ambient track is active", () => {
  const preset = getDefaultTTSStudioAmbientPreset(new Set());

  assert.deepEqual(preset, DEFAULT_TTS_STUDIO_AMBIENT_PRESET);
});

test("does not override user-selected ambient tracks", () => {
  const preset = getDefaultTTSStudioAmbientPreset(new Set(["rain"]));

  assert.deepEqual(preset, []);
});
