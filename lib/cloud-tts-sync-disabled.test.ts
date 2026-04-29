// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  deleteCloudTTSAudioCache,
  getCloudTTSAudioCache,
  saveCloudTTSAudioCache,
} from "./cloudTTSAudioCache.ts";
import {
  deleteCloudTTSCardSynthSnapshot,
  getCloudTTSCardSynthSnapshot,
  saveCloudTTSCardSynthSnapshot,
} from "./cloudTTSCardSynth.ts";
import {
  deleteCloudTTSCardSynthVersion,
  deleteCloudTTSCardSynthVersionsForCard,
  getCloudTTSCardSynthVersions,
  saveCloudTTSCardSynthVersion,
} from "./cloudTTSCardSynthVersions.ts";

test("cloud TTS sync helpers are disabled and never touch the network", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalWarn = console.warn;
  let fetchCalls = 0;
  let warnCalls = 0;

  globalThis.window = { location: { origin: "http://localhost:3000" } };
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("cloud sync should be disabled");
  };
  console.warn = () => {
    warnCalls += 1;
  };

  try {
    assert.equal(await getCloudTTSAudioCache("audio-key"), null);
    assert.equal(await saveCloudTTSAudioCache("audio-key", new Blob(["abc"], { type: "audio/wav" })), false);
    assert.equal(await deleteCloudTTSAudioCache("audio-key"), false);

    const snapshot = {
      id: "card-1",
      provider: "edge",
      synthesizedAt: "2026-04-29T10:00:00.000Z",
    };
    assert.equal(await getCloudTTSCardSynthSnapshot("card-1"), null);
    assert.equal(await saveCloudTTSCardSynthSnapshot(snapshot), false);
    assert.equal(await deleteCloudTTSCardSynthSnapshot("card-1"), false);

    const version = {
      id: "cache-key",
      cardId: "card-1",
      cacheKey: "cache-key",
      synthesizedAt: "2026-04-29T10:00:00.000Z",
      snapshot,
      modelLabel: "edgetts",
    };
    assert.deepEqual(await getCloudTTSCardSynthVersions("card-1"), []);
    assert.equal(await saveCloudTTSCardSynthVersion(version), false);
    assert.equal(await deleteCloudTTSCardSynthVersion("card-1", "cache-key"), false);
    assert.equal(await deleteCloudTTSCardSynthVersionsForCard("card-1"), false);

    assert.equal(fetchCalls, 0);
    assert.equal(warnCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
    console.warn = originalWarn;
  }
});
