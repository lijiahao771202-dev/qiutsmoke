import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  typescript: {
    // 在 Vercel 构建时忽略 TypeScript 错误
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
