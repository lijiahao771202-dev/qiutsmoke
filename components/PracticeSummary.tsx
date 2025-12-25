'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

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
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Calculate statistics
    const hasData = heartRateHistory.length > 0;
    const avgBPM = hasData
        ? Math.round(heartRateHistory.reduce((a, b) => a + b, 0) / heartRateHistory.length)
        : null;
    const minBPM = hasData ? Math.min(...heartRateHistory) : null;
    const maxBPM = hasData ? Math.max(...heartRateHistory) : null;

    // Format duration
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Draw heart rate curve
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !hasData) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const padding = 20;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Calculate range with some padding
        const range = (maxBPM! - minBPM!) || 10;
        const yMin = minBPM! - range * 0.1;
        const yMax = maxBPM! + range * 0.1;

        // Draw gradient fill
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)');

        ctx.beginPath();
        ctx.moveTo(padding, height - padding);

        heartRateHistory.forEach((bpm, index) => {
            const x = padding + (index / (heartRateHistory.length - 1)) * chartWidth;
            const y = height - padding - ((bpm - yMin) / (yMax - yMin)) * chartHeight;
            if (index === 0) {
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.lineTo(padding + chartWidth, height - padding);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        heartRateHistory.forEach((bpm, index) => {
            const x = padding + (index / (heartRateHistory.length - 1)) * chartWidth;
            const y = height - padding - ((bpm - yMin) / (yMax - yMin)) * chartHeight;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Draw dots at data points
        heartRateHistory.forEach((bpm, index) => {
            const x = padding + (index / (heartRateHistory.length - 1)) * chartWidth;
            const y = height - padding - ((bpm - yMin) / (yMax - yMin)) * chartHeight;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
        });

    }, [heartRateHistory, hasData, minBPM, maxBPM]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-[90%] max-w-md rounded-3xl overflow-hidden"
                style={{
                    background: 'linear-gradient(145deg, rgba(30,30,40,0.95), rgba(20,20,30,0.98))',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                }}
            >
                {/* Header */}
                <div className="text-center pt-8 pb-4">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                    >
                        <span className="text-3xl">✓</span>
                    </motion.div>
                    <h2 className="text-2xl font-semibold text-white">练习完成</h2>
                </div>

                {/* Heart Rate Chart */}
                <div className="px-6 py-4">
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">❤️</span>
                            <span className="text-sm text-gray-400">心率变化</span>
                        </div>
                        {hasData ? (
                            <canvas
                                ref={canvasRef}
                                className="w-full"
                                style={{ height: '120px' }}
                            />
                        ) : (
                            <div className="h-[120px] flex items-center justify-center text-gray-500 text-sm">
                                暂无心率数据
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="px-6 pb-4">
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard icon="⏱️" label="时长" value={formatDuration(duration)} />
                        <StatCard icon="❤️" label="平均心率" value={avgBPM ? `${avgBPM} BPM` : '--'} />
                        <StatCard icon="📉" label="最低" value={minBPM ? `${minBPM} BPM` : '--'} />
                        <StatCard icon="📈" label="最高" value={maxBPM ? `${maxBPM} BPM` : '--'} />
                    </div>
                </div>

                {/* Close Button */}
                <div className="px-6 pb-8 pt-2">
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-2xl text-white font-medium text-lg transition-all active:scale-[0.98]"
                        style={{
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
                        }}
                    >
                        完成
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div
            className="rounded-xl p-3 text-center"
            style={{ background: 'rgba(255,255,255,0.05)' }}
        >
            <div className="text-lg mb-1">{icon}</div>
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="text-white font-semibold">{value}</div>
        </div>
    );
}
