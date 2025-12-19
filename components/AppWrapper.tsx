"use client";

import React from 'react';
import { BackgroundProvider, useBackground, WALLPAPERS } from './BackgroundContext';
import { BackgroundSwitcher } from './BackgroundSwitcher';
import NavBar from './NavBar';
import UserProfile from './UserProfile';
import { AuthProvider } from './AuthProvider';
import { AnimatePresence, motion } from 'framer-motion';
import { DarkFluidBackground } from './DarkFluidBackground';

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
                {/* 动态背景：深色流体 */}
                {isDynamicBackground && wallpaperId === 'dark-fluid' && (
                    <motion.div
                        key="dark-fluid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <DarkFluidBackground />
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
                            marginTop: 'calc(-1 * env(safe-area-inset-top, 0px))',
                            paddingTop: 'env(safe-area-inset-top, 0px)',
                            minHeight: 'calc(100vh + env(safe-area-inset-top, 0px))',
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

export default function AppWrapper({ children }: { children: React.ReactNode }) {
    return (
        <BackgroundProvider>
            <AuthProvider>
                <BackgroundLayer />
                <IOS26CompatLayer />
                {children}
                <NavBar />
                <UserProfile />
                <BackgroundSwitcher />
            </AuthProvider>
        </BackgroundProvider>
    );
}

