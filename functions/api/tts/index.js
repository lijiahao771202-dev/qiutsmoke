/**
 * TTS Proxy Function
 * Proxies TTS requests to Vercel backend
 */

const VERCEL_BACKEND = 'https://qiutsmoke.vercel.app';

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    // Build Vercel URL
    const vercelUrl = new URL('/api/tts' + url.search, VERCEL_BACKEND);

    // Create new request to Vercel
    const proxyRequest = new Request(vercelUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    try {
        const response = await fetch(proxyRequest);

        // Return response with CORS headers
        return new Response(response.body, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Proxy error', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
