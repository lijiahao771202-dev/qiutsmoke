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
    // Calculate stats
    const hasData = heartRateHistory && heartRateHistory.length >= 2;
    const avgBPM = hasData
        ? Math.round(heartRateHistory.reduce((a, b) => a + b, 0) / heartRateHistory.length)
        : null;
    const minBPM = hasData ? Math.min(...heartRateHistory) : null;
    const maxBPM = hasData ? Math.max(...heartRateHistory) : null;

    const formatDuration = (seconds: number) => {
        if (!seconds || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

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

                {/* Stats Cluster */}
                <motion.div variants={item} className="grid grid-cols-2 gap-x-12 gap-y-8 w-full">
                    {/* Duration */}
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-medium text-white/50 tracking-widest uppercase mb-1">Duration</span>
                        <span className="text-5xl font-light tabular-nums tracking-widest drop-shadow-md">
                            {formatDuration(duration)}
                        </span>
                    </div>

                    {/* Avg Heart Rate */}
                    <div className="flex flex-col items-center">
                        <span className="text-sm font-medium text-white/50 tracking-widest uppercase mb-1">Avg BPM</span>
                        <span className="text-5xl font-light tabular-nums tracking-widest drop-shadow-md">
                            {avgBPM || '--'}
                        </span>
                    </div>

                    {/* Min/Max (Smaller) */}
                    <div className="col-span-2 flex justify-center gap-16 mt-2 opacity-80">
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-white/40 tracking-wider">MIN</span>
                            <span className="text-xl font-light">{minBPM || '--'}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-white/40 tracking-wider">MAX</span>
                            <span className="text-xl font-light">{maxBPM || '--'}</span>
                        </div>
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
