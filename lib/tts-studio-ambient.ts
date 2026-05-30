export type TTSStudioAmbientPresetItem = {
  id: string;
  volume: number;
};

export const DEFAULT_TTS_STUDIO_AMBIENT_PRESET: readonly TTSStudioAmbientPresetItem[] = [
  { id: "campfire", volume: 0.42 },
  { id: "waves", volume: 0.36 },
];

export function getDefaultTTSStudioAmbientPreset(
  activeTracks: ReadonlySet<string>
): readonly TTSStudioAmbientPresetItem[] {
  if (activeTracks.size > 0) {
    return [];
  }

  return DEFAULT_TTS_STUDIO_AMBIENT_PRESET;
}
