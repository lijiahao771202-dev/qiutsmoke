// IMPORTANT: This route must run in Node.js runtime.
export const runtime = 'nodejs';

const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural';
const DEFAULT_RATE = '0%';
const DEFAULT_TIMEOUT_MS = 15000;

const GOOGLE_TTS_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

type TTSRequest = {
    text?: string;
    voice?: string;
    rate?: string;
};

function getLangFromVoice(voice: string): string {
    const m = voice.match(/^([a-z]{2,3}-[A-Z]{2})/);
    return m?.[1] || 'zh-CN';
}

function splitForGoogleTTS(input: string, maxLen = 180): string[] {
    const text = input.trim();
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
}

async function synthesizeGoogleTTS(text: string, lang: string): Promise<Buffer> {
    const chunks = splitForGoogleTTS(text);
    if (chunks.length === 0) throw new Error('Empty text for Google fallback');

    const parts: Buffer[] = [];
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
            throw new Error(`Google fallback failed: ${res.status} ${txt.slice(0, 120)}`);
        }
        const ab = await res.arrayBuffer();
        const buf = Buffer.from(ab);
        if (buf.length < 100) throw new Error('Google fallback returned empty audio');
        parts.push(buf);
    }

    return Buffer.concat(parts);
}

export async function POST(req: Request) {
    try {
        let body: TTSRequest;
        try {
            body = await req.json();
        } catch {
            return new Response(
                JSON.stringify({
                    error: 'Invalid JSON body',
                    details: 'Request body must be valid JSON',
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        const text = String(body.text || '').trim();
        if (!text) {
            return new Response(JSON.stringify({ error: 'Missing text' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const voice = String(body.voice || DEFAULT_VOICE).trim() || DEFAULT_VOICE;
        const rate = String(body.rate || DEFAULT_RATE).trim() || DEFAULT_RATE;
        const lang = getLangFromVoice(voice);
        const timeout = Number(process.env.TTS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
        const proxy =
            process.env.TTS_PROXY ||
            process.env.HTTPS_PROXY ||
            process.env.HTTP_PROXY ||
            '';
        const enableGoogleFallback = process.env.ENABLE_GOOGLE_TTS_FALLBACK === 'true';

        const { EdgeTTS } = await import('node-edge-tts');
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        const tempDir = os.tmpdir();
        const tempFile = path.join(
            tempDir,
            `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`
        );

        const minExpectedBytes = Math.max(100, text.length * 80);
        const maxRetries = 2;
        let audioBuffer: Buffer | null = null;
        let edgeErr: string | null = null;

        const tryVoices = voice === DEFAULT_VOICE ? [voice] : [voice, DEFAULT_VOICE];
        for (const tryVoice of tryVoices) {
            for (let i = 0; i <= maxRetries; i++) {
                try {
                    const tts = new EdgeTTS({
                        voice: tryVoice,
                        lang: getLangFromVoice(tryVoice),
                        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
                        rate,
                        timeout,
                        proxy,
                    });

                    await tts.ttsPromise(text, tempFile);
                    if (!fs.existsSync(tempFile)) throw new Error('No output file generated');

                    const size = fs.statSync(tempFile).size;
                    if (size < minExpectedBytes) {
                        throw new Error(`Audio too short: ${size} bytes`);
                    }

                    audioBuffer = fs.readFileSync(tempFile);
                    break;
                } catch (e) {
                    edgeErr = e instanceof Error ? e.message : String(e);
                    if (i < maxRetries) {
                        await new Promise((r) => setTimeout(r, 700 * (i + 1)));
                    }
                } finally {
                    if (fs.existsSync(tempFile)) {
                        try {
                            fs.unlinkSync(tempFile);
                        } catch {}
                    }
                }
            }
            if (audioBuffer) break;
        }

        if (audioBuffer) {
            return new Response(audioBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache',
                    'X-TTS-Impl': 'edge',
                },
            });
        }

        if (enableGoogleFallback) {
            const googleAudio = await synthesizeGoogleTTS(text, lang);
            return new Response(googleAudio, {
                status: 200,
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache',
                    'X-TTS-Impl': 'google-fallback',
                },
            });
        }

        return new Response(
            JSON.stringify({
                error: 'TTS Implementation failure',
                details: edgeErr || 'EdgeTTS failed',
                provider: 'edge',
                fallback: 'disabled',
                hint: 'Set TTS_PROXY in Vercel env if your network cannot reach Edge TTS.',
            }),
            {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: 'TTS Implementation failure',
                details: error instanceof Error ? error.message : String(error),
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
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

