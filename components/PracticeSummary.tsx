'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BiometricChart from './BiometricChart';
import LiquidBackground from './LiquidBackground';

interface PracticeSummaryProps {
    duration: number; // in seconds
    heartRateHistory: number[];
    onClose: () => void;
}

export default function PracticeSummary({
    duration,
    heartRateHistory,
    onClose
}: PracticeSummaryProps) {
    // Animation Stages: 'intro' (full screen success) -> 'card' (data summary)
    const [viewState, setViewState] = useState<'intro' | 'card'>('intro');

    useEffect(() => {
        // Transition from Intro to Card after 2.5 seconds
        const timer = setTimeout(() => {
            setViewState('card');
        }, 2200);
        return () => clearTimeout(timer);
    }, []);

    // Statistics
    const hasData = heartRateHistory && heartRateHistory.length >= 2;
    const avgBPM = hasData
        ? Math.round(heartRateHistory.reduce((a, b) => a + b, 0) / heartRateHistory.length)
        : null;
    const minBPM = hasData ? Math.min(...heartRateHistory) : null;
    const maxBPM = hasData ? Math.max(...heartRateHistory) : null;

    // Formatting
    const formatDuration = (seconds: number) => {
        if (!seconds || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isCard = viewState === 'card';

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center font-sans overflow-hidden">
            {/* 1. Ambient Background - Always present */}
            <LiquidBackground />

            {/* 2. Backdrop Blur - Fades in during Card phase */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isCard ? 1 : 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-xl z-0"
            />

            {/* 3. Main Container - Morphs from Full Screen to Card */}
            <motion.div
                layout
                initial={{ width: '100%', height: '100%', borderRadius: 0, background: 'rgba(0,0,0,0)' }}
                animate={{
                    width: isCard ? '90%' : '100%',
                    maxWidth: isCard ? '384px' : '100%', // max-w-sm
                    height: isCard ? 'auto' : '100%',
                    borderRadius: isCard ? 32 : 0,
                    background: isCard ? 'rgba(30, 30, 40, 0.65)' : 'rgba(0,0,0,0)'
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                className="relative z-10 overflow-hidden flex flex-col items-center justify-center"
                style={isCard ? {
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(40px)',
                    WebkitBackdropFilter: 'blur(40px)',
                } : {}}
            >
                {/* Content Container */}
                <motion.div layout className={`w-full flex flex-col items-center ${isCard ? 'pt-8 pb-4' : ''}`}>

                    {/* Intro Glow Effect - Only in intro */}
                    <AnimatePresence>
                        {!isCard && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none"
                            />
                        )}
                    </AnimatePresence>

                    {/* Animated Checkmark Ring - Morphs position */}
                    <motion.div
                        layout
                        className="relative flex items-center justify-center rounded-full mb-4"
                        animate={{
                            width: isCard ? 80 : 120,
                            height: isCard ? 80 : 120,
                            marginBottom: isCard ? 16 : 32
                        }}
                        style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
                            boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        <svg className={`${isCard ? 'w-10 h-10' : 'w-16 h-16'} text-emerald-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <motion.path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                            />
                        </svg>
                    </motion.div>

                    <motion.h2
                        layout
                        className={`font-medium text-white tracking-wide text-center ${isCard ? 'text-2xl' : 'text-4xl font-light tracking-widest'}`}
                    >
                        {isCard ? '练习完成' : 'Session Complete'}
                    </motion.h2>

                    {isCard && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-sm text-gray-400 mt-1"
                        >
                            Great session
                        </motion.p>
                    )}
                </motion.div>

                {/* Data Content - Fades in when Card is ready */}
                <AnimatePresence>
                    {isCard && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="w-full"
                        >
                            {/* Data Visual Section */}
                            <div
                                className="mx-5 mb-6 rounded-2xl overflow-hidden relative"
                                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                    <span className="text-xs font-medium text-gray-300 tracking-wider uppercase">Heart Rate</span>
                                </div>

                                <div className="pt-8 pb-2">
                                    {hasData ? (
                                        <BiometricChart
                                            data={heartRateHistory}
                                            color="#10b981"
                                            height={120}
                                        />
                                    ) : (
                                        <div className="h-[120px] flex items-center justify-center text-gray-600 text-sm italic">
                                            No data recorded
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="px-5 pb-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <StatItem label="DURATION" value={formatDuration(duration)} delay={0.4} />
                                    <StatItem label="AVG BPM" value={avgBPM || '--'} unit="BPM" delay={0.5} />
                                    <StatItem label="MIN BPM" value={minBPM || '--'} delay={0.6} compact />
                                    <StatItem label="MAX BPM" value={maxBPM || '--'} delay={0.7} compact />
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="p-5 pt-0">
                                <motion.button
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    onClick={onClose}
                                    className="w-full py-4 rounded-2xl font-medium text-lg text-white relative overflow-hidden group transition-all active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                        boxShadow: '0 8px 20px -4px rgba(59, 130, 246, 0.5)',
                                    }}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    <span className="relative z-10">Complete</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

function StatItem({ label, value, unit, delay, compact }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: "spring", stiffness: 300, damping: 20 }}
            className={`flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] ${compact ? 'py-3' : 'py-4'}`}
        >
            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-1">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className={`font-semibold text-white ${compact ? 'text-lg' : 'text-2xl'}`}>
                    {value}
                </span>
                {unit && <span className="text-xs text-gray-400 font-medium">{unit}</span>}
            </div>
        </motion.div>
    );
}
