import { NextResponse } from 'next/server';

// IMPORTANT: This file MUST use 'nodejs' runtime because it uses node-edge-tts
// which depends on Node.js native modules (fs, path, os).
export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, voice, rate } = body;

        console.log(`[TTS Impl] Generating audio for: "${text.substring(0, 20)}..." | Voice: ${voice} | Rate: ${rate}`);

        // Dynamic import to be safe, though this file is nodejs runtime
        const { EdgeTTS } = await import('node-edge-tts');
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        // Extract language from voice ID (e.g., "zh-CN-XiaoxiaoNeural" -> "zh-CN")
        // Default to "zh-CN" if parsing fails
        const lang = voice ? voice.split('-').slice(0, 2).join('-') : "zh-CN";

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
        const minExpectedBytes = Math.max(text.length * 200, 100);

        for (let i = 0; i <= maxRetries; i++) {
            try {
                if (i > 0) console.log(`[TTS Impl] Retry ${i}/${maxRetries}...`);

                await tts.ttsPromise(text, tempFile);

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
                        await fallbackTts.ttsPromise(text, tempFile);
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
            throw lastError || new Error("Failed to generate valid audio");
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
