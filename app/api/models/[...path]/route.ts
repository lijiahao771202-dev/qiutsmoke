import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ path: string[] }> }) {
    try {
        const { path } = await props.params;
        const modelPath = path.join('/');
        const targetUrl = `https://hf-mirror.com/${modelPath}`;
        
        console.log("Proxying model request to:", targetUrl);
        
        const response = await fetch(targetUrl, {
            headers: {
                // 有些镜像站需要 User-Agent
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            }
        });

        if (!response.ok) {
            return new NextResponse(`Error fetching from mirror: ${response.statusText}`, { status: response.status });
        }

        // 转发流式响应并添加 CORS 头，以允许前端访问
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        headers.delete('content-encoding'); // 如果代理层处理了解压，需移除此头

        return new Response(response.body, {
            status: response.status,
            headers,
        });
    } catch (error: any) {
        console.error("Model Proxy Error:", error);
        return new NextResponse(`Internal Proxy Error: ${error.message}`, { status: 500 });
    }
}
