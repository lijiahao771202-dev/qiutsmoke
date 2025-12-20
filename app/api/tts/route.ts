import { NextResponse } from 'next/server';

/**
 * TTS API Route
 * - On Vercel (Node.js): Implements TTS using node-edge-tts
 * - On Cloudflare (Edge): Proxies to Vercel backend
 */

const VERCEL_BACKEND = 'https://qiutsmoke.vercel.app';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, voice, rate } = body;

        // Loop prevention check: Did we send this request from our own proxy?
        const isProxied = req.headers.get('x-tts-proxy') === 'true';

        // 1. Check if we should run implementation
        // Force implementation if already proxied or if we are on Vercel Node runtime
        const isNodejs = process.env.NEXT_RUNTIME === 'nodejs' || typeof window === 'undefined';
        const isVercel = !!process.env.VERCEL;

        // Detailed logging to help debug in production
        console.log(`[TTS] Request: proxied=${isProxied}, runtime=${process.env.NEXT_RUNTIME}, vercel=${isVercel}`);

        // If it's already a proxied request, we MUST implement it here (no more proxying!)
        // Or if we're in a Node.js environment where we can run edge-tts
        if (isProxied || (isNodejs && !process.env.FORCE_TTS_PROXY)) {
            console.log(`[TTS] Implementing TTS for: "${text.substring(0, 20)}..."`);

            // Dynamic import to avoid edge runtime errors on Cloudflare build
            const { EdgeTTS } = await import('node-edge-tts');
            const fs = await import('fs');
            const path = await import('path');
            const os = await import('os');

            const tts = new EdgeTTS({
                voice: voice || "zh-CN-XiaohanNeural",
                lang: "zh-CN",
                outputFormat: "audio-24khz-48kbitrate-mono-mp3",
                rate: rate || "0%",
            });

            const tempDir = os.tmpdir();
            const tempFile = path.join(tempDir, `tts-${Date.now()}.mp3`);

            // Backend Retry Logic for edge-tts
            let audioBuffer: Buffer | null = null;
            let lastError: any = null;
            const maxRetries = 2;

            for (let i = 0; i <= maxRetries; i++) {
                try {
                    console.log(`[TTS] Attempt ${i + 1}/${maxRetries + 1} for text: "${text.substring(0, 20)}..."`);
                    await tts.ttsPromise(text, tempFile);
                    audioBuffer = fs.readFileSync(tempFile);
                    if (audioBuffer && audioBuffer.length > 0) break;
                } catch (e) {
                    lastError = e;
                    console.warn(`[TTS] Attempt ${i + 1} failed:`, e instanceof Error ? e.message : e);
                    if (i < maxRetries) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
                } finally {
                    try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) { }
                }
            }

            if (!audioBuffer || audioBuffer.length === 0) {
                throw lastError || new Error("Failed to generate audio buffer after retries");
            }

            return new Response(audioBuffer as any, {
                status: 200,
                headers: {
                    'Content-Type': 'audio/mpeg',
                    'Access-Control-Allow-Origin': '*',
                    'X-TTS-Handler': 'nodejs-edge-tts',
                    'X-TTS-Attempts': String(maxRetries + 1)
                },
            });
        }

        // 2. Otherwise Proxy to Vercel (Cloudflare/Edge case)
        const vercelUrl = `${VERCEL_BACKEND}/api/tts`;

        // Extra safety check for hostname
        const url = new URL(req.url);
        if (url.hostname.includes('vercel.app')) {
            return new Response(JSON.stringify({
                error: 'Loop Detected: Vercel attempting to proxy to itself',
                info: { isProxied, isNodejs, isVercel }
            }), { status: 508 });
        }

        console.log(`[TTS Proxy] Forwarding request to: ${vercelUrl}`);

        const response = await fetch(vercelUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-TTS-Proxy': 'true' // Flag to prevent infinite loop
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[TTS Proxy] Backend error ${response.status}: ${errorText}`);
            return new Response(JSON.stringify({
                error: `Backend error: ${response.status}`,
                details: errorText
            }), { status: response.status });
        }

        return new Response(response.body, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error("[TTS API Error]", error);
        return new Response(JSON.stringify({
            error: 'TTS internal failure',
            details: error instanceof Error ? error.message : String(error)
        }), { status: 500 });
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

// Default to nodejs to enable full feature on Vercel. 
// Cloudflare builds will still treat this as Edge due to their build system (next-on-pages).
export const runtime = 'nodejs';
