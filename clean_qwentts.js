const fs = require('fs');
let content = fs.readFileSync('app/tts-studio/page.tsx', 'utf8');

// 1. Remove imports
content = content.replace(/\s*DEFAULT_QWEN_TTS_INSTRUCTIONS,\s*/g, '');
content = content.replace(/\s*DEFAULT_QWEN_TTS_LANGUAGE_TYPE,\s*/g, '');
content = content.replace(/\s*DEFAULT_QWEN_TTS_MODEL,\s*/g, '');
content = content.replace(/\s*DEFAULT_QWEN_TTS_VOICE,\s*/g, '');
content = content.replace(/\s*isQwenTTSLanguageType,\s*/g, '');
content = content.replace(/\s*isQwenTTSModel,\s*/g, '');
content = content.replace(/\s*isQwenTTSVoice,\s*/g, '');
content = content.replace(/\s*type QwenTTSLanguageType,\s*/g, '');
content = content.replace(/\s*type QwenTTSModel,\s*/g, '');
content = content.replace(/\s*type QwenTTSVoice,\s*/g, '');

// 2. Remove buildAudioCacheKey logic for qwentts
const regexStr = "\\s*if \\(settings\\.provider === \\\"qwentts\\\"\\) \\{[\\s\\S]*?return \\`qwentts:\\$\\{signature\\}:\\$\\{cardId\\}\\`;\\s*\\}";
content = content.replace(new RegExp(regexStr, 'g'), '');

// 3. Remove from ttsSettings usages (multiple places)
content = content.replace(/\s*qwenTTSModel: ttsSettings\.qwenTTSModel,\s*/g, '');
content = content.replace(/\s*qwenTTSVoice: ttsSettings\.qwenTTSVoice,\s*/g, '');
content = content.replace(/\s*qwenTTSLanguageType: ttsSettings\.qwenTTSLanguageType,\s*/g, '');
content = content.replace(/\s*qwenTTSInstructions: ttsSettings\.qwenTTSInstructions,\s*/g, '');

// 4. Remove useState definitions
content = content.replace(/\s*const \[qwenTTSModel, setQwenTTSModel\] = useState[\s\S]*?;\s*/g, '');
content = content.replace(/\s*const \[qwenTTSVoice, setQwenTTSVoice\] = useState[\s\S]*?;\s*/g, '');
content = content.replace(/\s*const \[qwenTTSLanguageType, setQwenTTSLanguageType\] = useState[\s\S]*?;\s*/g, '');
content = content.replace(/\s*const \[qwenTTSInstructions, setQwenTTSInstructions\] = useState[\s\S]*?;\s*/g, '');

// 5. Remove fetch logic checks
content = content.replace(/\s*if \(isQwenTTSModel\([\s\S]*?\}\s*/g, '');
content = content.replace(/\s*if \(isQwenTTSVoice\([\s\S]*?\}\s*/g, '');
content = content.replace(/\s*if \(isQwenTTSLanguageType\([\s\S]*?\}\s*/g, '');
content = content.replace(/\s*if \(typeof data\?\.qwenTTSInstructions === "string"\) \{[\s\S]*?\}\s*/g, '');
content = content.replace(/\s*if \(typeof detail\.qwenTTSInstructions === "string"\) \{[\s\S]*?\}\s*/g, '');

// 6. Remove from ttsSettings object initialization
content = content.replace(/\s*qwenTTSModel,\s*/g, '');
content = content.replace(/\s*qwenTTSVoice,\s*/g, '');
content = content.replace(/\s*qwenTTSLanguageType,\s*/g, '');
content = content.replace(/\s*qwenTTSInstructions,\s*/g, '');

fs.writeFileSync('app/tts-studio/page.tsx', content);
