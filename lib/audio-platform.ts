export type AudioPlatformDetectionInput = {
  userAgent: string;
  displayModeStandalone: boolean;
  navigatorStandalone: boolean;
  capacitorNative?: boolean;
};

export function isIOSLikeUserAgent(userAgent: string): boolean {
  return /iP(hone|ad|od)/i.test(userAgent) || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent));
}

export function shouldBypassWebAudioForBackgroundPlayback(
  input: AudioPlatformDetectionInput
): boolean {
  return (
    isIOSLikeUserAgent(input.userAgent) &&
    (input.displayModeStandalone || input.navigatorStandalone || input.capacitorNative === true)
  );
}
