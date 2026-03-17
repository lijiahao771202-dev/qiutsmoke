/**
 * TTS edge entrypoint.
 * Always forward to same-origin /api/tts-impl to avoid stale hardcoded backend URLs.
 */

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const implUrl = new URL('/api/tts-impl', req.url);
        const response = await fetch(implUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        return new Response(response.body, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
                'Access-Control-Allow-Origin': '*',
                'X-TTS-Handler': 'edge-forward',
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
