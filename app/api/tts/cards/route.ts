/**
 * TTS Cards Proxy API Route
 * Proxies TTS cards requests to Vercel backend
 */

const VERCEL_BACKEND = 'https://qiutsmoke.vercel.app';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const vercelUrl = `${VERCEL_BACKEND}/api/tts/cards${url.search}`;

        const response = await fetch(vercelUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': req.headers.get('cookie') || '',
            },
        });

        const data = await response.text();
        return new Response(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: 'TTS cards proxy failed',
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const vercelUrl = `${VERCEL_BACKEND}/api/tts/cards`;

        const response = await fetch(vercelUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': req.headers.get('cookie') || '',
            },
            body: body,
        });

        const data = await response.text();
        return new Response(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: 'TTS cards proxy failed',
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const vercelUrl = `${VERCEL_BACKEND}/api/tts/cards${url.search}`;

        const response = await fetch(vercelUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': req.headers.get('cookie') || '',
            },
        });

        const data = await response.text();
        return new Response(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: 'TTS cards proxy failed',
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
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export const runtime = 'edge';
