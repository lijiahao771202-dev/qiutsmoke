'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Renders a slow-moving, ethereal "Northern Lights" style background using Canvas.
 */
export default function LiquidBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize handler
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            ctx.scale(dpr, dpr);
        };
        window.addEventListener('resize', resize);
        resize();

        // Animation variables
        let time = 0;

        // Colors: Deep Teal, Navy, Purple
        // We simulate "blobs" of color moving around

        const draw = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            // Clear screen
            ctx.fillStyle = '#000000'; // Deep black base
            ctx.fillRect(0, 0, width, height);

            // Slow time increment
            time += 0.002;

            // Create a complex gradient based on sine waves
            // Blob 1: Teal/Green - Bottom Left moving
            const x1 = width * 0.3 + Math.sin(time) * 100;
            const y1 = height * 0.6 + Math.cos(time * 0.8) * 100;
            const r1 = Math.min(width, height) * 0.6;

            const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
            grad1.addColorStop(0, 'rgba(5, 150, 105, 0.2)'); // Emerald
            grad1.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = grad1;
            ctx.fillRect(0, 0, width, height);

            // Blob 2: Purple/Blue - Top Right moving
            const x2 = width * 0.7 + Math.cos(time * 0.5) * 120;
            const y2 = height * 0.4 + Math.sin(time * 0.6) * 120;
            const r2 = Math.min(width, height) * 0.7;

            const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
            grad2.addColorStop(0, 'rgba(79, 70, 229, 0.15)'); // Indigo
            grad2.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = grad2;
            ctx.fillRect(0, 0, width, height);

            // Blob 3: Cyan - Center breathing
            const x3 = width * 0.5;
            const y3 = height * 0.5;
            const r3 = Math.min(width, height) * (0.4 + Math.sin(time * 0.3) * 0.1);

            const grad3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, r3);
            grad3.addColorStop(0, 'rgba(6, 182, 212, 0.1)'); // Cyan
            grad3.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = grad3;
            ctx.fillRect(0, 0, width, height);

            requestAnimationFrame(draw);
        };

        const animationId = requestAnimationFrame(draw);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-0"
            style={{ opacity: 0.8 }} // Subtle blend
        />
    );
}
