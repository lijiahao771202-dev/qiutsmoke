"use client";

import React from 'react';
import { BackgroundProvider, useBackground } from './BackgroundContext';
import { BackgroundSwitcher } from './BackgroundSwitcher';
import { AnimatePresence, motion } from 'framer-motion';

function BackgroundLayer() {
    const { currentWallpaper, wallpaperId } = useBackground();
    const isDefault = wallpaperId === 'default';

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#0a0a1a]">
            {/* 底层基础渐变，作为兜底 */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 opacity-50" />

            <AnimatePresence mode="popLayout">
                {!isDefault && currentWallpaper ? (
                    <motion.div
                        key={wallpaperId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:bg-fixed"
                        style={{
                            backgroundImage: `url(${currentWallpaper})`,
                            height: '100dvh', // 使用 dynamic viewport height
                        }}
                    />
                ) : (
                    <motion.div
                        key="default-aurora"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                        className="absolute inset-0"
                    >
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{
                                backgroundImage: 'url(/mountain-9472312.svg)',
                                height: '100dvh',
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function AppWrapper({ children }: { children: React.ReactNode }) {
    return (
        <BackgroundProvider>
            <BackgroundLayer />
            {children}
            <BackgroundSwitcher />
        </BackgroundProvider>
    );
}
