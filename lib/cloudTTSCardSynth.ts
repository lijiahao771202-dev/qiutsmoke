import type { TTSCardSynthSnapshot } from "./tts-card-synth.ts";

export async function getCloudTTSCardSynthSnapshot(cardId: string): Promise<TTSCardSynthSnapshot | null> {
  void cardId;
  return null;
}

export async function saveCloudTTSCardSynthSnapshot(snapshot: TTSCardSynthSnapshot): Promise<boolean> {
  void snapshot;
  return false;
}

export async function deleteCloudTTSCardSynthSnapshot(cardId: string): Promise<boolean> {
  void cardId;
  return false;
}
