import { NextResponse } from 'next/server';

/**
 * TTS API Route - Edge Runtime Version
 * 
 * This route runs on Edge Runtime for Cloudflare compatibility.
 * - On Vercel: It should proxy to a Node.js serverless function
 * - On Cloudflare: It proxies to the Vercel backend
 * 
 * The actual TTS implementation is in /api/tts-impl (Node.js only)
 */

const VERCEL_BACKEND = 'https://qiutsmoke.vercel.app';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, voice, rate } = body;

        // Check environment
        const isVercel = !!process.env.VERCEL;
        const isProxied = req.headers.get('x-tts-proxy') === 'true';

        console.log(`[TTS Edge] Request: vercel=${isVercel}, proxied=${isProxied}`);

        // If we're on Vercel and this is a proxied request, use the implementation
        if (isVercel && isProxied) {
            // Forward to the Node.js implementation internally
            const implUrl = new URL('/api/tts-impl', req.url);
            const implResponse = await fetch(implUrl.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            return new Response(implResponse.body, {
                status: implResponse.status,
                headers: {
                    'Content-Type': implResponse.headers.get('Content-Type') || 'audio/mpeg',
                    'Access-Control-Allow-Origin': '*',
                    'X-TTS-Handler': 'vercel-impl',
                },
            });
        }

        // Otherwise, proxy to Vercel backend
        const vercelUrl = `${VERCEL_BACKEND}/api/tts`;

        // Safety: prevent loop if we're already on Vercel
        const url = new URL(req.url);
        if (url.hostname.includes('vercel.app') && !isProxied) {
            // We're on Vercel, forward to implementation
            const implUrl = new URL('/api/tts-impl', req.url);
            const implResponse = await fetch(implUrl.toString(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            return new Response(implResponse.body, {
                status: implResponse.status,
                headers: {
                    'Content-Type': implResponse.headers.get('Content-Type') || 'audio/mpeg',
                    'Access-Control-Allow-Origin': '*',
                    'X-TTS-Handler': 'vercel-direct',
                },
            });
        }

        console.log(`[TTS Edge] Proxying to: ${vercelUrl}`);

        const response = await fetch(vercelUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-TTS-Proxy': 'true',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[TTS Edge] Backend error ${response.status}: ${errorText}`);
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
                'X-TTS-Handler': 'edge-proxy',
            },
        });
    } catch (error) {
        console.error("[TTS Edge Error]", error);
        return new Response(JSON.stringify({
            error: 'TTS proxy failure',
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

// Edge runtime for Cloudflare compatibility
export const runtime = 'edge';
