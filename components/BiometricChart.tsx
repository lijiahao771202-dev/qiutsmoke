'use client';

import React, { useEffect, useRef } from 'react';

interface BiometricChartProps {
    data: number[];
    color?: string;
    height?: number;
    className?: string;
}

export default function BiometricChart({
    data,
    color = '#10b981',
    height = 200,
    className = ''
}: BiometricChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // High DPI setup
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height; // Use full height
        const padding = 20;
        const chartW = width - padding * 2;
        const chartH = height - padding * 2;

        const minVal = Math.min(...data);
        const maxVal = Math.max(...data);
        const range = Math.max(maxVal - minVal, 10); // Minimum 10bpm range

        // Helper to map data point to XY
        const getPoint = (val: number, index: number) => ({
            x: padding + (index / (data.length - 1)) * chartW,
            y: padding + chartH - ((val - minVal) / range) * chartH // Invert Y
        });

        // Animation state
        let startTime: number | null = null;
        const duration = 1500; // 1.5s draw animation

        const draw = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);

            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            ctx.clearRect(0, 0, width, height);

            // Create Gradient
            const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
            gradient.addColorStop(0, `${color}80`); // 50% opacity
            gradient.addColorStop(1, `${color}00`); // 0% opacity

            // Generate Path
            const points = data.map(getPoint);

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            // Catmull-Rom like smoothing or simple cubic bezier through points
            // Simple smoothing strategy: connect data points with curves
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i];
                const p1 = points[i + 1];

                // Control points for smooth curve
                const c1x = p0.x + (p1.x - p0.x) * 0.5;
                const c1y = p0.y;
                const c2x = p0.x + (p1.x - p0.x) * 0.5;
                const c2y = p1.y;

                ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p1.x, p1.y);
            }

            // Draw Stroke for the visible portion based on animation
            // Using globalCompositeOperation to "mask" the line reveal is tricky with stroke
            // Instead, we can draw the full path but use lineDashOffset for animation 
            // OR simpler: just clip the drawing region

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, width * ease, height); // Reveal form left to right
            ctx.clip();

            // Re-draw path stroke
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i];
                const p1 = points[i + 1];
                const c1x = p0.x + (p1.x - p0.x) * 0.5;
                const c1y = p0.y;
                const c2x = p0.x + (p1.x - p0.x) * 0.5;
                const c2y = p1.y;
                ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p1.x, p1.y);
            }

            ctx.lineWidth = 3;
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.stroke();

            // Fill area (closed path)
            ctx.lineTo(points[points.length - 1].x, height - padding);
            ctx.lineTo(padding, height - padding);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.restore();

            // Draw end dot if animation complete
            if (progress >= 1) {
                const lastPoint = points[points.length - 1];
                ctx.beginPath();
                ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            if (progress < 1) {
                requestAnimationFrame(draw);
            }
        };

        requestAnimationFrame(draw);

    }, [data, color]);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full touch-none ${className}`}
            style={{ height: `${height}px` }}
        />
    );
}
