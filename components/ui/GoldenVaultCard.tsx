"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { cn } from "@/lib/utils";
import { Coins, PiggyBank, ArrowUpRight } from "lucide-react";

/**
 * GOLDEN VAULT CARD (The 5th Card)
 * Concept: "Liquid Gold" - Saving money visualized as accumulating molten gold.
 */

interface GoldenVaultCardProps {
    className?: string;
    savedAmount?: number; // 累积节省金额
    cigarettesAvoided?: number; // 未吸卷烟数量
}

export default function GoldenVaultCard({
    className,
    savedAmount = 1250, // Default mock value
    cigarettesAvoided = 450 // Default mock value
}: GoldenVaultCardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const timeRef = useRef(0);
    const animationFrameRef = useRef<number>();

    // --- Liquid Physics Simulation ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize handler
        const handleResize = () => {
            if (containerRef.current && canvas) {
                // High DPI support
                const dpr = window.devicePixelRatio || 1;
                const rect = containerRef.current.getBoundingClientRect();
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);

        // Animation Loop
        const render = () => {
            if (!canvas || !containerRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;

            ctx.clearRect(0, 0, width, height);

            timeRef.current += 0.015;
            const time = timeRef.current;

            // --- Liquid Gold Simulation ---
            // 1. Calculate Liquid Surface Level (based on saved amount progress, max $5000?)
            // Let's say max is $3000 for full card. $1250 is ~40%.
            // Base fill level 0 = bottom, 1 = top
            const baseLevel = 0.45;

            // 2. Liquid Surface Sine Wave
            // Combine multiple sine waves for organic fluid look
            ctx.beginPath();
            ctx.moveTo(0, height); // Bottom Left

            // Draw the top surface wave
            for (let x = 0; x <= width; x += 2) {
                // Incorporate tilt into the wave's average height
                // Tilt Y affects the slope
                const tiltOffset = (x - width / 2) * (tilt.y * 0.5);

                const wave1 = Math.sin(x * 0.015 + time + tilt.x * 2) * 10;
                const wave2 = Math.cos(x * 0.025 - time * 0.5) * 8;
                const wave3 = Math.sin(x * 0.005 + time * 0.2) * 15; // Slow swell

                // Calculate Y position of the surface
                // (Height * (1 - baseLevel)) is the "static" y position from top
                const y = (height * (1 - baseLevel)) + wave1 + wave2 + wave3 + tiltOffset;

                if (x === 0) ctx.lineTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.lineTo(width, height); // Bottom Right
            ctx.closePath();

            // 3. Render Liquid (Gold Gradient)
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            // Molten Gold Palette
            gradient.addColorStop(0, '#FFD700'); // Gold
            gradient.addColorStop(0.3, '#FDB931'); // Darker Gold
            gradient.addColorStop(0.6, '#FFDF00'); // Bright Gold
            gradient.addColorStop(1, '#BF953F'); // Bronze/Dark Gold

            ctx.fillStyle = gradient;
            ctx.fill();

            // 4. Specular Highlights (Glossy Surface)
            ctx.save();
            ctx.globalCompositeOperation = "source-atop";
            // Top highlight
            const shineGrad = ctx.createLinearGradient(0, 0, 0, height);
            shineGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
            shineGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
            ctx.fillStyle = shineGrad;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();

            animationFrameRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [tilt]);

    // --- Tilt Sensor ---
    useEffect(() => {
        const handleMotion = (e: DeviceMotionEvent) => {
            const x = e.accelerationIncludingGravity?.x || 0;
            const y = e.accelerationIncludingGravity?.y || 0;

            // Smooth dampening
            setTilt(prev => ({
                x: prev.x + (x * 0.1 - prev.x) * 0.1,
                y: prev.y + (y * 0.1 - prev.y) * 0.1
            }));
        };

        // Fallback for non-mobile (mouse)
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            // Normalize mouse x to -1 to 1 tilt range
            const xTilt = (e.clientX - centerX) / (rect.width * 2);

            setTilt(prev => ({ ...prev, y: xTilt * 5 })); // Map X mouse to Y tilt for wave slope
        };

        if (typeof window !== 'undefined') {
            if (window.DeviceMotionEvent) {
                window.addEventListener('devicemotion', handleMotion);
            }
            window.addEventListener('mousemove', handleMouseMove);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('devicemotion', handleMotion);
                window.removeEventListener('mousemove', handleMouseMove);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full h-full rounded-[2rem] overflow-hidden",
                "bg-gradient-to-br from-neutral-900 to-black", // Dark container background
                "border border-white/10 shadow-2xl",
                className
            )}
        >
            {/* 1. Fluid Canvas Layer */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full opacity-90 mix-blend-screen"
            />

            {/* 2. Glass Overlay (Texture) */}
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] mix-blend-overlay pointer-events-none" />

            {/* 3. Content Layer */}
            <div className="relative z-10 w-full h-full flex flex-col justify-between p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-full bg-yellow-500/20 backdrop-blur-md border border-yellow-500/30 text-yellow-300">
                            <PiggyBank size={18} />
                        </div>
                        <span className="text-xs font-medium text-yellow-200/70 tracking-widest uppercase">Golden Vault</span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-white/40 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm border border-white/5">
                        <Coins size={10} />
                        <span>+${(15).toFixed(2)} / DAY</span>
                    </div>
                </div>

                {/* Main Stats */}
                <div className="flex flex-col items-center gap-1 mt-4">
                    <div className="text-sm font-medium text-yellow-100/60 tracking-wider">TOTAL SAVED</div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg text-yellow-500 font-bold">$</span>
                        <span className="text-6xl font-light text-transparent bg-clip-text bg-gradient-to-tr from-yellow-300 via-yellow-100 to-yellow-400 drop-shadow-[0_2px_10px_rgba(255,215,0,0.3)]">
                            {savedAmount.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                    <div className="bg-black/20 backdrop-blur-md rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Cigarettes</span>
                        <span className="text-xl font-medium text-white/90">-{cigarettesAvoided}</span>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-3 border border-yellow-400/50 flex flex-col items-center justify-center shadow-lg shadow-yellow-500/20"
                    >
                        <span className="text-[10px] text-yellow-950/60 font-bold uppercase tracking-wider mb-1">Projected (Yr)</span>
                        <div className="flex items-center gap-1">
                            <span className="text-lg font-bold text-yellow-950">$5,475</span>
                            <ArrowUpRight size={14} className="text-yellow-950/60" />
                        </div>
                    </motion.button>
                </div>
            </div>

            {/* 4. Shine overlay */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/10 to-transparent pointer-events-none mix-blend-soft-light" />

        </div>
    );
}
