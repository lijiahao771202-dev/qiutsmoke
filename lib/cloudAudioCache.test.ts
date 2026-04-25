// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { saveCloudAudioCache } from "./cloudAudioCache.ts";

test("retries transient cloud audio upload failures once", async () => {
  const originalFetch = globalThis.fetch;
  const responses = [500, 200];
  let callCount = 0;

  globalThis.fetch = async () => {
    const status = responses[Math.min(callCount, responses.length - 1)];
    callCount += 1;
    return new Response(status === 200 ? JSON.stringify({ success: true }) : "server error", {
      status,
      headers: { "Content-Type": status === 200 ? "application/json" : "text/plain" },
    });
  };

  try {
    const uploaded = await saveCloudAudioCache(
      "cache-key-1",
      new Blob(["audio"], { type: "audio/wav" })
    );
    assert.equal(uploaded, true);
    assert.equal(callCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not retry unauthorized cloud audio uploads", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;

  globalThis.fetch = async () => {
    callCount += 1;
    return new Response("Unauthorized", { status: 401 });
  };

  try {
    const uploaded = await saveCloudAudioCache(
      "cache-key-2",
      new Blob(["audio"], { type: "audio/wav" })
    );
    assert.equal(uploaded, false);
    assert.equal(callCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
