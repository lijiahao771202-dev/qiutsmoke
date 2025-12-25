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
                className="w-full h-full flex flex-col items-center justify-between py-24"
            >
                {/* Top Spacer */}
                <div />

                {/* Stats Cluster - Labels Only (Numbers rendered by Particles) */}
                <motion.div variants={item} className="relative w-full h-[300px]">
                    {/* Duration Label (Center Top - below the 0:00 particles) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-20 flex flex-col items-center">
                        <span className="text-[10px] font-semibold text-white/30 tracking-[0.3em] uppercase">Duration</span>
                    </div>

                    {/* Avg BPM (Bottom Left - below the BPM particles) */}
                    <div className="absolute top-1/2 left-[calc(50%-140px)] -translate-x-1/2 translate-y-40 flex flex-col items-center">
                        <span className="text-[10px] font-semibold text-white/30 tracking-[0.3em] uppercase">Avg BPM</span>
                    </div>

                    {/* BPM Change (Bottom Right - below the Change particles) */}
                    <div className="absolute top-1/2 left-[calc(50%+140px)] -translate-x-1/2 translate-y-40 flex flex-col items-center">
                        <span className="text-[10px] font-semibold text-white/30 tracking-[0.3em] uppercase">BPM Change</span>
                    </div>
                </motion.div>

                {/* Main Action Button - Minimalist Glass Checkmark */}
                <motion.div variants={item} className="pointer-events-auto pb-12">
                    <button
                        onClick={onClose}
                        className="group relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        {/* Glass Background */}
                        <div className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-full group-hover:bg-white/10 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10" />

                        {/* Icon */}
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white/80 group-hover:text-white transition-colors relative z-10">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2, duration: 1 }}
                        className="text-center mt-4"
                    >
                        <span className="text-[10px] text-white/20 tracking-widest uppercase">Tap to finish</span>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );
}
