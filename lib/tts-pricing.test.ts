// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import { countDashScopeBillableCharacters, estimateCosyVoice35BilledCharacters, estimateTTSCardPrice } from "./tts-pricing.ts";

test("counts Han characters as two and punctuation as one", () => {
  assert.equal(countDashScopeBillableCharacters("你好，A."), 7);
});

test("estimates billed chars from TTS card content while ignoring pauses and SSML tags", () => {
  const billedChars = estimateCosyVoice35BilledCharacters("你好[pause 12s]世界[rate -10%]A.");

  assert.equal(billedChars, 10);
});

test("returns a Flash price badge for CosyVoice 3.5 Flash cards", () => {
  const estimate = estimateTTSCardPrice(
    { content: "请慢慢呼吸，感受身体放松。" },
    {
      provider: "cosyvoice35plus",
      cosyvoiceSpeed: 0.9,
      cosyvoiceInstruction: "",
      cosyvoiceSeed: 0,
      cosyvoiceVoiceId: "yupinglu",
      qwenTTSModel: "qwen3-tts-flash",
      qwenTTSVoice: "Seren",
      qwenTTSVoiceMode: "system",
      qwenTTSCloneVoiceId: "yupinglu",
      qwenTTSCloneVoiceCloudId: "",
      qwenTTSSpeed: 1,
      qwenTTSLanguageType: "Chinese",
      qwenTTSInstructions: "",
      cosyvoice35PlusModel: "cosyvoice-v3.5-flash",
      cosyvoice35PlusVoiceId: "",
      cosyvoice35FlashVoiceId: "",
      cosyvoice35PlusVoiceProfileId: "yupinglu",
      cosyvoice35PlusSpeed: 1,
      cosyvoice35PlusInstruction: "",
      cosyvoice35PlusLanguageHint: "zh",
    }
  );

  assert.equal(estimate.label.startsWith("Flash "), true);
  assert.equal(estimate.amountCny !== null, true);
  assert.equal(estimate.tone, "metered");
});

test("returns free badge for local provider", () => {
  const estimate = estimateTTSCardPrice(
    { content: "任意内容" },
    {
      provider: "cosyvoice",
      cosyvoiceSpeed: 0.9,
      cosyvoiceInstruction: "",
      cosyvoiceSeed: 0,
      cosyvoiceVoiceId: "yupinglu",
      qwenTTSModel: "qwen3-tts-flash",
      qwenTTSVoice: "Seren",
      qwenTTSVoiceMode: "system",
      qwenTTSCloneVoiceId: "yupinglu",
      qwenTTSCloneVoiceCloudId: "",
      qwenTTSSpeed: 1,
      qwenTTSLanguageType: "Chinese",
      qwenTTSInstructions: "",
      cosyvoice35PlusModel: "cosyvoice-v3.5-flash",
      cosyvoice35PlusVoiceId: "",
      cosyvoice35FlashVoiceId: "",
      cosyvoice35PlusVoiceProfileId: "yupinglu",
      cosyvoice35PlusSpeed: 1,
      cosyvoice35PlusInstruction: "",
      cosyvoice35PlusLanguageHint: "zh",
    }
  );

  assert.equal(estimate.label, "本地免费");
  assert.equal(estimate.amountCny, 0);
});
