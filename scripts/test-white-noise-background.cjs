const fs = require('fs');
const path = require('path');
const assert = require('assert');

const file = path.join(__dirname, '..', 'contexts', 'WhiteNoiseContext.tsx');
const source = fs.readFileSync(file, 'utf8');

assert(
  /Howler\.autoSuspend\s*=\s*false/.test(source),
  'Expected Howler.autoSuspend = false for iOS/PWA background playback stability.'
);

assert(
  /html5:\s*true/.test(source),
  'Expected Howl config to use html5: true so background playback uses HTMLAudio.'
);

console.log('white-noise background config checks passed');
