/**
 * Cloudflare Pages Functions - 反向代理
 * 使用 [[path]].ts 捕获所有路径
 */

interface Env {
    // 可在 Pages 设置中添加环境变量
}

const BACKEND_HOST = 'qiutsmoke.vercel.app';

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request } = context;
    const url = new URL(request.url);

    // 构建后端 URL
    const backendUrl = new URL(url.pathname + url.search, `https://${BACKEND_HOST}`);

    // 复制请求头
    const headers = new Headers(request.headers);
    headers.set('Host', BACKEND_HOST);
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', 'https');

    // 删除 Cloudflare 特有的头
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');

    // 创建代理请求
    const newRequest = new Request(backendUrl.toString(), {
        method: request.method,
        headers: headers,
        body: request.body,
        redirect: 'manual',
    });

    try {
        const response = await fetch(newRequest);

        // 复制响应头
        const responseHeaders = new Headers(response.headers);

        // 处理重定向
        const location = responseHeaders.get('Location');
        if (location) {
            try {
                const locationUrl = new URL(location, backendUrl);
                if (locationUrl.host === BACKEND_HOST) {
                    locationUrl.host = url.host;
                    locationUrl.protocol = url.protocol;
                    responseHeaders.set('Location', locationUrl.toString());
                }
            } catch (e) {
                // 相对路径，不需要处理
            }
        }

        // 添加 CORS 头
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', '*');

        // OPTIONS 预检
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
};
