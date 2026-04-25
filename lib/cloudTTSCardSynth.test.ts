// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { getCloudTTSCardSynthSnapshot } from "./cloudTTSCardSynth.ts";

test("treats snapshot-not-found 500 responses as missing cloud snapshot", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  let warned = false;

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "Snapshot not found" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  console.warn = () => {
    warned = true;
  };

  try {
    const snapshot = await getCloudTTSCardSynthSnapshot("card-500");
    assert.equal(snapshot, null);
    assert.equal(warned, false);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});
