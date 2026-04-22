import test from "node:test";
import assert from "node:assert/strict";
import {
  isIOSLikeUserAgent,
  shouldBypassWebAudioForBackgroundPlayback,
} from "./audio-platform.ts";

test("detects iOS-like user agents including iPadOS desktop UA", () => {
  assert.equal(
    isIOSLikeUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
    ),
    true
  );
  assert.equal(
    isIOSLikeUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    ),
    true
  );
  assert.equal(
    isIOSLikeUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36"
    ),
    false
  );
});

test("bypasses Web Audio only for standalone iOS/PWA playback", () => {
  assert.equal(
    shouldBypassWebAudioForBackgroundPlayback({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      displayModeStandalone: true,
      navigatorStandalone: false,
    }),
    true
  );
  assert.equal(
    shouldBypassWebAudioForBackgroundPlayback({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      displayModeStandalone: false,
      navigatorStandalone: false,
    }),
    false
  );
  assert.equal(
    shouldBypassWebAudioForBackgroundPlayback({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      displayModeStandalone: true,
      navigatorStandalone: true,
    }),
    false
  );
});
