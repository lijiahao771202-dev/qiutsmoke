import type { AmbientSoundType } from "@/hooks/useWhiteNoise";

export type TTSStudioAmbientPresetItem = {
  id: AmbientSoundType;
  volume: number;
};

export const DEFAULT_TTS_STUDIO_AMBIENT_PRESET: readonly TTSStudioAmbientPresetItem[] = [
  { id: "fire", volume: 0.42 },
  { id: "waves", volume: 0.36 },
];

export function getDefaultTTSStudioAmbientPreset(
  activeTracks: ReadonlySet<AmbientSoundType>
): readonly TTSStudioAmbientPresetItem[] {
  if (activeTracks.size > 0) {
    return [];
  }

  return DEFAULT_TTS_STUDIO_AMBIENT_PRESET;
}
