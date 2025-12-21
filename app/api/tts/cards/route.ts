import { NextResponse } from 'next/server';

/**
 * TTS Cards API Route - Edge Runtime Proxy
 * 
 * 路由逻辑：
 * - 本地开发 / Vercel：转发到 /api/tts/cards-impl (Node.js)
 * - Cloudflare Pages：代理到 Vercel 后端
 */

const VERCEL_BACKEND = 'https://qiutsmoke.vercel.app';

export const runtime = 'edge';

// 检测是否在 Cloudflare 环境
function isCloudflare(): boolean {
    // Cloudflare Workers 有 caches.default，Node.js / Vercel 没有
    return typeof (globalThis as any).caches !== 'undefined' &&
        typeof (globalThis as any).caches.default !== 'undefined';
}

async function handleRequest(req: Request) {
    const url = new URL(req.url);

    // 1. 如果在 Cloudflare：代理到 Vercel
    if (isCloudflare()) {
        const targetUrl = `${VERCEL_BACKEND}/api/tts/cards${url.search}`;
        console.log(`[TTS Cards Edge] Proxying to Vercel: ${targetUrl}`);

        const headers = new Headers(req.headers);
        headers.set('x-tts-proxy', 'true');

        try {
            const response = await fetch(targetUrl, {
                method: req.method,
                headers: headers,
                body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
            });

            const newRes = new Response(response.body, response);
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

    // 2. 本地开发 或 Vercel：转发到实现 API
    const implUrl = new URL('/api/tts/cards-impl' + url.search, req.url);
    console.log(`[TTS Cards Edge] Forwarding internal to: ${implUrl.pathname}`);

    const response = await fetch(implUrl.toString(), {
        method: req.method,
        headers: req.headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    });

    return new Response(response.body, {
        status: response.status,
        headers: response.headers
    });
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
