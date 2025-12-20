import { NextResponse } from 'next/server';

/**
 * TTS Cards API Route - Edge Runtime Proxy
 * 
 * Proxies requests to:
 * - /api/tts/cards-impl (Node.js) when running on Vercel
 * - Vercel Backend when running on Cloudflare
 */

const VERCEL_BACKEND = 'https://qiutsmoke.vercel.app';

export const runtime = 'edge';

async function handleRequest(req: Request) {
    const isVercel = !!process.env.VERCEL;
    const url = new URL(req.url); // Original URL (e.g. .../api/tts/cards?id=123)

    // 1. If on Vercel: Forward internally to implementation
    if (isVercel) {
        const implUrl = new URL('/api/tts/cards-impl' + url.search, req.url);

        console.log(`[TTS Cards Edge] Forwarding internal to: ${implUrl.pathname}`);

        const response = await fetch(implUrl.toString(), {
            method: req.method,
            headers: req.headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
        });

        // Mirror the response
        return new Response(response.body, {
            status: response.status,
            headers: response.headers
        });
    }

    // 2. If on Cloudflare: Proxy to Vercel
    const targetUrl = `${VERCEL_BACKEND}/api/tts/cards${url.search}`;
    console.log(`[TTS Cards Edge] Proxying to Vercel: ${targetUrl}`);

    const headers = new Headers(req.headers);
    headers.set('x-tts-proxy', 'true'); // Just a flag, though Vercel logic is mainly based on env

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
        });

        // Clone response to safely read it or modify headers
        const newRes = new Response(response.body, response);
        // Ensure CORS allows Cloudflare domain
        newRes.headers.set('Access-Control-Allow-Origin', '*');
        return newRes;
    } catch (error) {
        console.error('[TTS Cards Edge] Proxy Error:', error);
        return new Response(JSON.stringify({ error: 'Proxy Failed', details: String(error) }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const DELETE = handleRequest;
export const PATCH = handleRequest;

export async function OPTIONS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
