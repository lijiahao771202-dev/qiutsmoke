"use client";

import React from 'react';
import { BackgroundProvider, useBackground } from './BackgroundContext';
import { BackgroundSwitcher } from './BackgroundSwitcher';
import { AnimatePresence, motion } from 'framer-motion';

function BackgroundLayer() {
    const { currentWallpaper, wallpaperId } = useBackground();
    const isDefault = wallpaperId === 'default';

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <AnimatePresence mode="wait">
                {!isDefault && currentWallpaper && (
                    <motion.div
                        key={wallpaperId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${currentWallpaper})` }}
                    />
                )}
                {isDefault && (
                    <motion.div
                        key="default-aurora"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0"
                    >
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: 'url(/mountain-9472312.svg)' }}
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
