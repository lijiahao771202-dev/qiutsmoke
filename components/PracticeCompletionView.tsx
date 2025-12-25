'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PracticeCompletionViewProps {
    duration: number; // in seconds
    heartRateHistory: number[];
    onClose: () => void;
    theme: string;
}

export default function PracticeCompletionView({
    duration,
    heartRateHistory,
    onClose,
    theme
}: PracticeCompletionViewProps) {
    // Staggered animation variants
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 1.0 // Wait for canvas bloom to start clearing
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center text-white">
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="w-full max-w-sm px-6 flex flex-col items-center gap-12"
            >
                {/* Title */}
                <motion.div variants={item} className="text-center">
                    <h1 className="text-4xl font-extralight tracking-[0.2em] text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                        COMPLETED
                    </h1>
                    <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto mt-4" />
                </motion.div>

                {/* Stats Cluster - Labels Only (Numbers rendered by Particles) */}
                <motion.div variants={item} className="flex flex-col gap-24 w-full items-center">
                    {/* Duration Label */}
                    <div className="flex flex-col items-center">
                        {/* Placeholder space for Particle Text (approx 80px) */}
                        <div className="h-20" />
                        <span className="text-sm font-medium text-white/50 tracking-widest uppercase">Duration</span>
                    </div>

                    {/* Avg Heart Rate Label */}
                    <div className="flex flex-col items-center">
                        {/* Placeholder space for Particle Text (approx 80px) */}
                        <div className="h-20" />
                        <span className="text-sm font-medium text-white/50 tracking-widest uppercase">Avg BPM</span>
                    </div>
                </motion.div>

                {/* Main Action Button */}
                <motion.div variants={item} className="pt-8 pointer-events-auto">
                    <button
                        onClick={onClose}
                        className="group relative px-12 py-4 rounded-full overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors" />
                        <div className="absolute inset-0 rounded-full border border-white/20 group-hover:border-white/40 transition-colors" />
                        <span className="relative text-lg font-light tracking-[0.2em] text-white">DONE</span>
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
}
