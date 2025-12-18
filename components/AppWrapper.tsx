"use client";

import React from 'react';
import { BackgroundProvider, useBackground } from './BackgroundContext';
import { BackgroundSwitcher } from './BackgroundSwitcher';
import { AnimatePresence, motion } from 'framer-motion';

function BackgroundLayer() {
    const { currentWallpaper, wallpaperId } = useBackground();
    const isDefault = wallpaperId === 'default';

    return (
        <div className="bg-fullscreen z-0 overflow-hidden pointer-events-none">
            <AnimatePresence mode="popLayout">
                {!isDefault && currentWallpaper ? (
                    <motion.div
                        key={wallpaperId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                        className="bg-fullscreen bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: `url(${currentWallpaper})`,
                        }}
                    />
                ) : (
                    <motion.div
                        key="default-aurora"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: "easeInOut" }}
                        className="bg-fullscreen"
                    >
                        {/* 默认渐变背景 */}
                        <div className="bg-fullscreen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900" />
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
