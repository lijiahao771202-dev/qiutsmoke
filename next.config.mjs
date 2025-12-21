/** @type {import('next').NextConfig} */
const nextConfig = {
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
