// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  appendRevisionAssistantHistory,
  applyRewriteStreamText,
  createRewriteStreamState,
  restorePreviousDraftAfterRewriteFailure,
} from "./ai-revision-flow.ts";

test("keeps the previous draft until the first rewrite chunk arrives", () => {
  const state = createRewriteStreamState("旧稿不要先消失");

  assert.equal(state.displayText, "旧稿不要先消失");
  const metadataOnly = applyRewriteStreamText(state, "");
  assert.equal(metadataOnly.hasReceivedFirstChunk, false);
  assert.equal(metadataOnly.displayText, "旧稿不要先消失");

  const updated = applyRewriteStreamText(metadataOnly, "新稿第一句");

  assert.equal(updated.hasReceivedFirstChunk, true);
  assert.equal(updated.displayText, "新稿第一句");
});

test("restores the previous draft when rewrite fails before replacement", () => {
  const state = createRewriteStreamState("旧稿保留");

  assert.equal(restorePreviousDraftAfterRewriteFailure(state), "旧稿保留");
});

test("appends user feedback and assistant draft while keeping recent context bounded", () => {
  const history = appendRevisionAssistantHistory(
    Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `旧消息 ${index}`,
    })),
    "评价：更慢一点",
    "新稿"
  );

  assert.equal(history.length, 8);
  assert.equal(history.at(-2)?.content, "评价：更慢一点");
  assert.equal(history.at(-1)?.content, "新稿");
  assert.equal(history[0].content, "旧消息 2");
});
