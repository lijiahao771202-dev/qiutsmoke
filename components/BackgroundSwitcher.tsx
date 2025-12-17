"use client";

import { useBackground } from './BackgroundContext';
import { Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export function BackgroundSwitcher() {
    const { nextWallpaper } = useBackground();

    const handleSwitch = () => {
        // Adding a small artificial delay or loading state could be nice, but for now instant switch
        nextWallpaper();
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSwitch}
            className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom)+5rem)] right-4 md:bottom-8 md:right-8 z-40 glass-button rounded-full p-3 shadow-2xl backdrop-blur-3xl group"
            aria-label="Switch Background"
        >
            <div className="relative">
                <ImageIcon className="w-6 h-6 text-white/80 group-hover:text-white transition-colors" />
                {/* Simple tooltip-like effect on hover could go here */}
            </div>
            <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-black/50 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-md">
                Switch Scene
            </span>
        </motion.button>
    );
}
