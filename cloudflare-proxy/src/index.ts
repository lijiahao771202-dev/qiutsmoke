/**
 * Cloudflare Worker 反向代理
 * 用于代理 Vercel 部署的应用，解决国内访问问题
 */

interface Env {
    BACKEND_HOST: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // 将请求转发到 Vercel
        const backendUrl = new URL(url.pathname + url.search, `https://${env.BACKEND_HOST}`);

        // 复制请求头，但修改 Host
        const headers = new Headers(request.headers);
        headers.set('Host', env.BACKEND_HOST);
        headers.set('X-Forwarded-Host', url.host);
        headers.set('X-Forwarded-Proto', 'https');

        // 删除可能导致问题的头
        headers.delete('cf-connecting-ip');
        headers.delete('cf-ray');
        headers.delete('cf-visitor');

        // 创建新请求
        const newRequest = new Request(backendUrl.toString(), {
            method: request.method,
            headers: headers,
            body: request.body,
            redirect: 'manual', // 手动处理重定向
        });

        try {
            const response = await fetch(newRequest);

            // 复制响应头
            const responseHeaders = new Headers(response.headers);

            // 处理重定向，将 Vercel 域名替换为代理域名
            const location = responseHeaders.get('Location');
            if (location) {
                const locationUrl = new URL(location, backendUrl);
                if (locationUrl.host === env.BACKEND_HOST) {
                    locationUrl.host = url.host;
                    locationUrl.protocol = url.protocol;
                    responseHeaders.set('Location', locationUrl.toString());
                }
            }

            // 添加 CORS 头（如果需要）
            responseHeaders.set('Access-Control-Allow-Origin', '*');
            responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            responseHeaders.set('Access-Control-Allow-Headers', '*');

            // 处理 OPTIONS 预检请求
            if (request.method === 'OPTIONS') {
                return new Response(null, {
                    status: 204,
                    headers: responseHeaders,
                });
            }

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
            });
        } catch (error) {
            return new Response(`Proxy Error: ${error}`, { status: 502 });
        }
    },
};
