import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTTSCardCloudPayload,
  preserveLocalTTSCardCategoryFields,
} from "./tts-card-category-sync";

test("omits local-only category fields from tts card cloud payloads", () => {
  const payload = buildTTSCardCloudPayload({
    id: "card-1",
    title: "正念",
    content: "hello",
    voice_id: "voice",
    rate: "0%",
    guidance_level: "medium",
    category_id: "custom",
    subcategory_id: "morning",
    created_at: "2026-01-01T00:00:00.000Z",
  });

  assert.deepEqual(payload, {
    id: "card-1",
    title: "正念",
    content: "hello",
    voice_id: "voice",
    rate: "0%",
    guidance_level: "medium",
    created_at: "2026-01-01T00:00:00.000Z",
  });
});

test("preserves local category fields when cloud snapshot lacks them", () => {
  const merged = preserveLocalTTSCardCategoryFields(
    "tts_cards",
    { id: "card-1", content: "remote" },
    { id: "card-1", content: "local", category_id: "custom", subcategory_id: "night" }
  );

  assert.deepEqual(merged, {
    id: "card-1",
    content: "remote",
    category_id: "custom",
    subcategory_id: "night",
  });
});

test("does not affect other stores", () => {
  assert.deepEqual(
    preserveLocalTTSCardCategoryFields(
      "meditation_topics",
      { id: "topic-1", title: "remote" },
      { id: "topic-1", category_id: "local" }
    ),
    { id: "topic-1", title: "remote" }
  );
});
