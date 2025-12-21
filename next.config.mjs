/** @type {import('next').NextConfig} */
const nextConfig = {
    // ☁️ Conditional Export: Only for Cloudflare Pages
    // Vercel needs default output for API routes to work
    output: process.env.IS_CLOUDFLARE ? 'export' : undefined,
    images: {
        unoptimized: true,
    },
    typescript: {
        // Ignore TypeScript errors during build
        ignoreBuildErrors: true,
    },
    // 强制禁用 JS 文件缓存，确保 iOS WebView 每次获取最新代码
    async headers() {
        return [
            {
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
