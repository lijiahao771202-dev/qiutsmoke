// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  appendGenerateStreamChunk,
  createGenerateStreamState,
  GENERATE_ERROR_END,
  GENERATE_ERROR_START,
  GENERATE_RAG_END,
  GENERATE_RAG_START,
  GENERATE_REPLACE,
} from "./generate-stream-protocol.ts";

test("parses streamed RAG metadata without leaking protocol markers into text", () => {
  let state = createGenerateStreamState();

  state = appendGenerateStreamChunk(state, `${GENERATE_RAG_START}{"references":[{"id":"a"}]}`);
  assert.equal(state.text, "");
  assert.equal(state.ragDebug, null);

  state = appendGenerateStreamChunk(state, `${GENERATE_RAG_END}[rate -10%]`);
  state = appendGenerateStreamChunk(state, "慢慢呼吸");

  assert.deepEqual(state.ragDebug, { references: [{ id: "a" }] });
  assert.equal(state.text, "[rate -10%]慢慢呼吸");
});

test("supports replacing a short streamed draft with a retry draft", () => {
  let state = createGenerateStreamState();

  state = appendGenerateStreamChunk(state, "短稿第一句。");
  state = appendGenerateStreamChunk(state, `${GENERATE_REPLACE}新版第一句。`);
  state = appendGenerateStreamChunk(state, "新版第二句。");

  assert.equal(state.wasReplaced, true);
  assert.equal(state.text, "新版第一句。新版第二句。");
});

test("strips streamed error payloads and exposes the user-facing error", () => {
  let state = createGenerateStreamState();

  state = appendGenerateStreamChunk(state, "已经生成的内容。");
  state = appendGenerateStreamChunk(
    state,
    `${GENERATE_ERROR_START}{"details":"上游断开"}${GENERATE_ERROR_END}`
  );

  assert.equal(state.text, "已经生成的内容。");
  assert.equal(state.error, "上游断开");
});

