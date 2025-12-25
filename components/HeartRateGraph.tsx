'use client';

import { useEffect, useRef } from 'react';

interface HeartRateGraphProps {
    data: number[];
    currentBPM: number | null;
    isMonitoring: boolean;
}

export default function HeartRateGraph({
    data,
    currentBPM,
    isMonitoring,
}: HeartRateGraphProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Draw the heart rate curve
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        // Set canvas size with DPR
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        if (data.length < 2) {
            // Show placeholder line when no data
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();
            return;
        }

        // Calculate min/max for scaling
        const minBPM = Math.min(...data) - 10;
        const maxBPM = Math.max(...data) + 10;
        const range = maxBPM - minBPM || 1;

        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(255, 100, 100, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');

        // Draw filled area
        ctx.beginPath();
        ctx.moveTo(0, height);

        data.forEach((bpm, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((bpm - minBPM) / range) * height * 0.8 - height * 0.1;
            if (i === 0) {
                ctx.lineTo(x, y);
            } else {
                // Smooth curve using quadratic bezier
                const prevX = ((i - 1) / (data.length - 1)) * width;
                const prevBPM = data[i - 1];
                const prevY =
                    height - ((prevBPM - minBPM) / range) * height * 0.8 - height * 0.1;
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
                if (i === data.length - 1) {
                    ctx.lineTo(x, y);
                }
            }
        });

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw the line
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        data.forEach((bpm, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((bpm - minBPM) / range) * height * 0.8 - height * 0.1;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                const prevX = ((i - 1) / (data.length - 1)) * width;
                const prevBPM = data[i - 1];
                const prevY =
                    height - ((prevBPM - minBPM) / range) * height * 0.8 - height * 0.1;
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
                if (i === data.length - 1) {
                    ctx.lineTo(x, y);
                }
            }
        });

        ctx.stroke();

        // Draw endpoint dot
        if (data.length > 0) {
            const lastX = width;
            const lastBPM = data[data.length - 1];
            const lastY =
                height - ((lastBPM - minBPM) / range) * height * 0.8 - height * 0.1;

            ctx.beginPath();
            ctx.arc(lastX - 4, lastY, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 100, 100, 1)';
            ctx.fill();
        }
    }, [data]);

    if (!isMonitoring && data.length === 0) {
        return null; // Don't show when not monitoring and no data
    }

    return (
        <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-2xl"
            style={{
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                width: '85%',
                maxWidth: '360px',
            }}
        >
            {/* Heart icon with pulse animation */}
            <div className="flex flex-col items-center justify-center min-w-[60px]">
                <div
                    className={`text-2xl ${isMonitoring ? 'animate-pulse' : ''}`}
                    style={{ color: 'rgba(255, 100, 100, 0.9)' }}
                >
                    ♥
                </div>
                <div className="text-white text-sm font-medium">
                    {currentBPM ? `${currentBPM}` : '--'}
                </div>
                <div className="text-white/50 text-[10px]">BPM</div>
            </div>

            {/* Heart rate curve */}
            <canvas
                ref={canvasRef}
                className="flex-1 h-12"
                style={{ display: 'block' }}
            />
        </div>
    );
}
