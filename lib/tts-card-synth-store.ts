'use client';

import {
  deleteCloudTTSCardSynthSnapshot,
  getCloudTTSCardSynthSnapshot,
  saveCloudTTSCardSynthSnapshot,
} from "./cloudTTSCardSynth";
import { getById, put, remove } from "./localDB";
import {
  isTTSCardSynthSnapshotNewer,
  type TTSCardSynthSnapshot,
} from "./tts-card-synth";

const STORE_NAME = "tts_card_synth_meta";

export async function getTTSCardSynthSnapshot(cardId: string) {
  const localSnapshot = await getById<TTSCardSynthSnapshot>(STORE_NAME, cardId);
  const cloudSnapshot = await getCloudTTSCardSynthSnapshot(cardId);

  if (isTTSCardSynthSnapshotNewer(cloudSnapshot, localSnapshot)) {
    await put(STORE_NAME, cloudSnapshot!);
    return cloudSnapshot;
  }

  if (isTTSCardSynthSnapshotNewer(localSnapshot, cloudSnapshot)) {
    void saveCloudTTSCardSynthSnapshot(localSnapshot!);
  }

  return localSnapshot ?? cloudSnapshot ?? undefined;
}

export async function saveTTSCardSynthSnapshot(snapshot: TTSCardSynthSnapshot) {
  await put(STORE_NAME, snapshot);
  await saveCloudTTSCardSynthSnapshot(snapshot);
}

export async function deleteTTSCardSynthSnapshot(cardId: string) {
  await remove(STORE_NAME, cardId);
  await deleteCloudTTSCardSynthSnapshot(cardId);
}
