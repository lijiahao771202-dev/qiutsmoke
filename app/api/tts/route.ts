/**
 * TTS Proxy API Route
 * Proxies TTS requests to Vercel backend since edge-tts requires Node.js
 */

const VERCEL_BACKEND = 'https://qiutsmoke.vercel.app';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const vercelUrl = `${VERCEL_BACKEND}/api/tts`;

        const response = await fetch(vercelUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(JSON.stringify({
                error: `Vercel proxy error: ${response.status}`,
                details: errorText
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Return audio response
        return new Response(response.body, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: 'TTS proxy failed',
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
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

export const runtime = 'edge';
