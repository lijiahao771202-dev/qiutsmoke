import type { TTSCardLocalSynthVersion } from "./tts-card-synth-local.ts";

export async function getCloudTTSCardSynthVersions(
  cardId: string,
): Promise<TTSCardLocalSynthVersion[]> {
  void cardId;
  return [];
}

export async function saveCloudTTSCardSynthVersion(
  version: TTSCardLocalSynthVersion,
): Promise<boolean> {
  void version;
  return false;
}

export async function deleteCloudTTSCardSynthVersion(
  cardId: string,
  cacheKey: string,
): Promise<boolean> {
  void cardId;
  void cacheKey;
  return false;
}

export async function deleteCloudTTSCardSynthVersionsForCard(
  cardId: string,
): Promise<boolean> {
  void cardId;
  return false;
}
