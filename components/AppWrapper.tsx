"use client";

import React, { lazy, Suspense } from 'react';
import { BackgroundProvider, useBackground, WALLPAPERS } from './BackgroundContext';
import NavBar from './NavBar';
import UserProfile from './UserProfile';
import { AuthProvider } from './AuthProvider';
import { AnimatePresence, motion } from 'framer-motion';
import { PushSubscriber } from './PushSubscriber';

// 懒加载重量级组件
const DarkFluidBackground = lazy(() => import('./DarkFluidBackground').then(mod => ({ default: mod.DarkFluidBackground })));

function BackgroundLayer() {
    const { currentWallpaper, wallpaperId } = useBackground();

    // 检查是否是动态背景
    const currentWallpaperConfig = WALLPAPERS.find(w => w.id === wallpaperId);
    const isDynamicBackground = currentWallpaperConfig?.type === 'dynamic';

    return (
        <>
            {/* 状态栏安全区域专用覆盖层 - 确保iOS PWA正确渲染 */}
            <div
                className="fixed top-0 left-0 right-0 pointer-events-none"
                style={{
                    height: 'env(safe-area-inset-top, 50px)',
                    zIndex: 9999,
                    background: 'transparent',
                }}
            />

            <AnimatePresence mode="popLayout">
                {/* 动态背景：深色流体 - 懒加载 */}
                {isDynamicBackground && wallpaperId === 'dark-fluid' && (
                    <motion.div
                        key="dark-fluid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
                            <DarkFluidBackground />
                        </Suspense>
                    </motion.div>
                )}

                {/* 静态壁纸图片 */}
                {!isDynamicBackground && currentWallpaper && (
                    <motion.div
                        key={currentWallpaper}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="fixed bg-cover bg-center bg-no-repeat pointer-events-none"
                        style={{
                            backgroundImage: `url(${currentWallpaper})`,
                            zIndex: 0,
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                        }}
                    />
                )}

                {/* 回退：黑色背景 */}
                {!isDynamicBackground && !currentWallpaper && (
                    <motion.div
                        key="fallback"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black"
                        style={{ zIndex: 0 }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

/**
 * iOS 26 兼容层
 * 统计页面能正常工作是因为它有一个 fixed inset-0 的装饰层
 * 这个层让 iOS 26 能正确识别页面顶部区域的颜色
 * 我们把这个层添加到全局，让所有页面都能受益
 */
function IOS26CompatLayer() {
    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
            aria-hidden="true"
        >
            {/* 顶部深色渐变 - 确保状态栏区域始终深色 */}
            <div
                className="absolute top-0 left-0 right-0"
                style={{
                    height: 'calc(env(safe-area-inset-top, 50px) + 60px)',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)',
                }}
            />
        </div>
    );
}

/**
 * 高级毛玻璃质感层 (Premium Frosted Glass Layer)
 * 升级版：纹理毛雾 (Textured Mist)
 * 结合了流动的雾气感（低频噪声）和物理磨砂感（高频噪声）
 */
function PremiumGlassLayer() {
    // 1. 雾气纹理 (Mist): 低频、云雾状、柔和
    // baseFrequency="0.007" 产生类似云层的效果
    const mistSvg = `data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='mistFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.007' numOctaves='4' stitchTiles='stitch'/%3E%3CcomponentTransfer%3E%3CfuncA type='table' tableValues='0 0.5 0'/%3E%3C/componentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23mistFilter)' opacity='1'/%3E%3C/svg%3E`;

    // 2. 磨砂纹理 (Grain): 高频、细微、物理质感
    const grainSvg = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grainFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grainFilter)' opacity='0.6'/%3E%3C/svg%3E`;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[1]"
            aria-hidden="true"
        >
            {/* Base Atmosphere: 强力模糊 + 饱和度，确立基调 */}
            <div className="absolute inset-0 backdrop-blur-[80px] backdrop-saturate-[1.8] bg-black/10 transition-all duration-1000" />

            {/* Layer 1: The Mist (雾气层) - 赋予深度和不均匀的朦胧感 */}
            <div
                className="absolute inset-0 opacity-[0.4] mix-blend-overlay"
                style={{
                    backgroundImage: `url("${mistSvg}")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'cover',
                    filter: 'blur(20px)', // 二次模糊让雾气更柔和
                }}
            />

            {/* Layer 2: The Grain (磨砂层) - 赋予物理触感 */}
            <div
                className="absolute inset-0 opacity-[0.07] mix-blend-screen"
                style={{
                    backgroundImage: `url("${grainSvg}")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '128px'
                }}
            />

            {/* Layer 3: Cinematic Vignette (电影感暗角) */}
            <div className="absolute inset-0 bg-radial-gradient-vignette opacity-50 mix-blend-multiply" />

            {/* Layer 4: Subtle Top Highlight (顶部高光，模拟天光) */}
            <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent mix-blend-soft-light" />
        </div>
    );
}

import { usePathname } from 'next/navigation';
import { PageTransition } from './PageTransition';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith('/admin');
    const isSoundscapes = pathname?.startsWith('/practice/soundscapes');

    return (
        <BackgroundProvider>
            <AuthProvider>
                <PushSubscriber />
                {!isAdmin && <BackgroundLayer />}
                {!isAdmin && <PremiumGlassLayer />}
                {!isAdmin && <IOS26CompatLayer />}
                {/* 移除动画，直接渲染 */}
                <div style={{ width: '100%', height: '100%' }}>
                    {children}
                </div>
                {!isAdmin && !isSoundscapes && <NavBar />}
                {!isAdmin && !isSoundscapes && <UserProfile />}
            </AuthProvider>
        </BackgroundProvider>
    );
}
