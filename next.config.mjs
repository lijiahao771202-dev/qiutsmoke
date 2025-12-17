/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
    },
    typescript: {
        // Ignore TypeScript errors during build
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
