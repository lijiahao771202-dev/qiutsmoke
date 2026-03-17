// IMPORTANT: This file MUST use 'nodejs' runtime because it uses node-edge-tts
// which depends on Node.js native modules (fs, path, os).
export const runtime = 'nodejs';

const GOOGLE_TTS_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const toLang = (voice?: string): string => {
    if (!voice || typeof voice !== 'string') return 'zh-CN';
    const m = voice.match(/^([a-z]{2,3}-[A-Z]{2})/);
    return m?.[1] || 'zh-CN';
};

const splitForGoogleTTS = (input: string, maxLen = 180): string[] => {
    const text = (input || '').trim();
    if (!text) return [];
    if (text.length <= maxLen) return [text];

    const out: string[] = [];
    let rest = text;
    while (rest.length > maxLen) {
        let cut = maxLen;
        for (let i = maxLen; i > Math.floor(maxLen * 0.6); i--) {
            const ch = rest[i];
            if (ch && /[，。！？,.!?;；\n]/.test(ch)) {
                cut = i + 1;
                break;
            }
        }
        out.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
    return out.filter(Boolean);
};

const googleTTS = async (text: string, lang: string): Promise<Buffer> => {
    const chunks = splitForGoogleTTS(text);
    if (chunks.length === 0) throw new Error('Empty text for Google TTS');

    const results: Buffer[] = [];
    for (const chunk of chunks) {
        const qs = new URLSearchParams({
            ie: 'UTF-8',
            client: 'tw-ob',
            tl: lang,
            q: chunk,
        });
        const url = `https://translate.googleapis.com/translate_tts?${qs.toString()}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': GOOGLE_TTS_UA },
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Google TTS failed: ${res.status} ${txt.slice(0, 120)}`);
        }
        const ab = await res.arrayBuffer();
        const buf = Buffer.from(ab);
        if (buf.length < 100) throw new Error('Google TTS returned empty audio');
        results.push(buf);
    }

    return Buffer.concat(results);
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, voice, rate } = body;
        const normalizedText = String(text || '').trim();
        if (!normalizedText) {
            return new Response(JSON.stringify({ error: 'Missing text' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log(`[TTS Impl] Generating audio for: "${normalizedText.substring(0, 20)}..." | Voice: ${voice} | Rate: ${rate}`);

        // Dynamic import to be safe, though this file is nodejs runtime
        const { EdgeTTS } = await import('node-edge-tts');
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        // Extract language from voice ID (e.g., "zh-CN-XiaoxiaoNeural" -> "zh-CN")
        // Default to "zh-CN" if parsing fails
        const lang = toLang(voice);

        const tts = new EdgeTTS({
            voice: voice || "zh-CN-XiaohanNeural",
            lang: lang,
            outputFormat: "audio-24khz-48kbitrate-mono-mp3",
            rate: rate || "0%",
        });

        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);

        // Backend Retry Logic for edge-tts
        let audioBuffer: Buffer | null = null;
        let lastError: any = null;
        const maxRetries = 3;

        // Estimate min bytes: 1500 bytes per char is a safe rough estimate for high quality mp3
        // or just ensure it's not basically empty. 
        // 48kbps = 6KB/s. 
        // Relaxed check: 200 bytes per char or 100 bytes absolute min
        const minExpectedBytes = Math.max(normalizedText.length * 120, 100);

        for (let i = 0; i <= maxRetries; i++) {
            try {
                if (i > 0) console.log(`[TTS Impl] Retry ${i}/${maxRetries}...`);

                await tts.ttsPromise(normalizedText, tempFile);

                if (fs.existsSync(tempFile)) {
                    const stats = fs.statSync(tempFile);
                    if (stats.size >= minExpectedBytes) {
                        audioBuffer = fs.readFileSync(tempFile);
                        console.log(`[TTS Impl] Success: ${stats.size} bytes`);
                        break;
                    } else {
                        console.warn(`[TTS Impl] Audio too short: ${stats.size} bytes`);
                    }
                }
            } catch (e) {
                lastError = e;
                console.warn(`[TTS Impl] Attempt ${i} failed:`, e);

                // If last attempt and failed, try fallback voice (Xiaoxiao) if not already using it
                if (i === maxRetries && voice !== 'zh-CN-XiaoxiaoNeural') {
                    console.log(`[TTS Impl] Fallback to safe voice: zh-CN-XiaoxiaoNeural`);
                    try {
                        const fallbackTts = new EdgeTTS({
                            voice: 'zh-CN-XiaoxiaoNeural',
                            lang: 'zh-CN',
                            outputFormat: "audio-24khz-48kbitrate-mono-mp3",
                            rate: rate || "0%",
                        });
                        await fallbackTts.ttsPromise(normalizedText, tempFile);
                        if (fs.existsSync(tempFile)) {
                            const stats = fs.statSync(tempFile);
                            if (stats.size >= minExpectedBytes) {
                                audioBuffer = fs.readFileSync(tempFile);
                                console.log(`[TTS Impl] Fallback Success: ${stats.size} bytes`);
                                break;
                            }
                        }
                    } catch (fbError) {
                        console.error(`[TTS Impl] Fallback failed too:`, fbError);
                    }
                }
            } finally {
                if (fs.existsSync(tempFile)) {
                    try { fs.unlinkSync(tempFile); } catch (e) { }
                }
            }

            if (i < maxRetries) await new Promise(r => setTimeout(r, 1000));
        }

        if (!audioBuffer) {
            const edgeErr = lastError instanceof Error ? lastError.message : String(lastError || 'unknown');
            console.warn(`[TTS Impl] EdgeTTS failed, trying Google fallback: ${edgeErr}`);
            try {
                const googleAudio = await googleTTS(normalizedText, lang);
                return new Response(googleAudio, {
                    status: 200,
                    headers: {
                        'Content-Type': 'audio/mpeg',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'no-cache',
                        'X-TTS-Impl': 'google-fallback',
                    },
                });
            } catch (gErr) {
                const gMsg = gErr instanceof Error ? gErr.message : String(gErr);
                throw new Error(`EdgeTTS failed: ${edgeErr}; Google fallback failed: ${gMsg}`);
            }
        }

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache',
                'X-TTS-Impl': 'success'
            },
        });

    } catch (error) {
        console.error("[TTS Impl Error]", error);
        return new Response(JSON.stringify({
            error: 'TTS Implementation failure',
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
