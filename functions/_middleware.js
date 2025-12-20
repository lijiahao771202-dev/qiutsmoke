/**
 * Cloudflare Worker Proxy
 * 
 * This worker proxies requests for Node.js API routes to Vercel
 * while serving static content from CF Pages.
 */

const VERCEL_BACKEND = 'https://qiutsmoke.vercel.app';

// Routes that need to be proxied to Vercel (Node.js runtime)
const PROXY_ROUTES = [
    '/api/tts',
    '/api/cron/send-reminders',
    '/api/notifications/send',
];

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathname = url.pathname;

        // Check if this route needs to be proxied to Vercel
        const needsProxy = PROXY_ROUTES.some(route => pathname.startsWith(route));

        if (needsProxy) {
            // Clone the request with the Vercel backend URL
            const vercelUrl = new URL(pathname + url.search, VERCEL_BACKEND);

            const modifiedRequest = new Request(vercelUrl.toString(), {
                method: request.method,
                headers: request.headers,
                body: request.body,
                redirect: 'follow',
            });

            // Fetch from Vercel
            const response = await fetch(modifiedRequest);

            // Return the response with CORS headers
            const modifiedResponse = new Response(response.body, response);
            modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
            modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            return modifiedResponse;
        }

        // For all other routes, let CF Pages handle it (pass through)
        return env.ASSETS.fetch(request);
    },
};
