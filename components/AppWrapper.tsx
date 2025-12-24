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

import { usePathname } from 'next/navigation';
import { PageTransition } from './PageTransition';
import { AnimatePresence } from 'framer-motion';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith('/admin');

    return (
        <BackgroundProvider>
            <AuthProvider>
                <PushSubscriber />
                {!isAdmin && <BackgroundLayer />}
                {!isAdmin && <IOS26CompatLayer />}
                <AnimatePresence mode="wait">
                    <PageTransition key={pathname}>
                        {children}
                    </PageTransition>
                </AnimatePresence>
                {!isAdmin && <NavBar />}
                {!isAdmin && <UserProfile />}
            </AuthProvider>
        </BackgroundProvider>
    );
}
