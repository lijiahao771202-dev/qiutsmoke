"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// Curated "Fluid Light" Palettes
const PALETTES = [
    {
        name: "Aurora Borealis",
        colors: [
            "rgba(139, 92, 246, 0.4)", // Violet
            "rgba(6, 182, 212, 0.4)",  // Cyan
            "rgba(59, 130, 246, 0.4)"  // Blue
        ]
    },
    {
        name: "Sunset Bliss",
        colors: [
            "rgba(244, 63, 94, 0.4)",  // Rose
            "rgba(249, 115, 22, 0.4)", // Orange
            "rgba(167, 139, 250, 0.4)" // Light Violet
        ]
    },
    {
        name: "Oceanic Depth",
        colors: [
            "rgba(16, 185, 129, 0.4)", // Emerald
            "rgba(56, 189, 248, 0.4)", // Light Blue
            "rgba(6, 182, 212, 0.4)"   // Cyan
        ]
    },
    {
        name: "Cyberpunk Neon",
        colors: [
            "rgba(236, 72, 153, 0.4)", // Pink
            "rgba(168, 85, 247, 0.4)", // Purple
            "rgba(34, 211, 238, 0.4)"  // Cyan Neon
        ]
    },
    {
        name: "Golden Hour",
        colors: [
            "rgba(234, 179, 8, 0.4)",  // Yellow
            "rgba(249, 115, 22, 0.4)", // Orange
            "rgba(251, 146, 60, 0.4)"  // Light Orange
        ]
    }
];

/**
 * Enhanced Dark Fluid Background
 * "Ultra-Premium" Edition
 * Features: Richer color palette (Rose/Cyan/Violet), deeper blurs, and smoother motion.
 */
export function DarkFluidBackground() {
    const [palette, setPalette] = useState(PALETTES[0]);
    const [mounted, setMounted] = useState(false);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    useEffect(() => {
        // Randomly select a palette on mount
        const randomIndex = Math.floor(Math.random() * PALETTES.length);
        setPalette(PALETTES[randomIndex]);
        setMounted(true);

        // Gyroscope Parallax Logic
        const handleOrientation = (event: DeviceOrientationEvent) => {
            const { beta, gamma } = event;
            if (beta === null || gamma === null) return;

            // X axis (Gamma): Left/Right tilt (-90 to 90)
            // Y axis (Beta): Front/Back tilt (-180 to 180)

            // Limit the tilt range to avoid extreme movement
            // Gamma: +/- 20deg -> +/- 20px
            // Beta:  +/- 20deg -> +/- 20px

            const x = Math.max(-30, Math.min(30, gamma || 0));
            const y = Math.max(-30, Math.min(30, (beta || 0) - 45)); // Subtract 45 to assume holding position

            setTilt({ x, y });
        };

        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, []);

    if (!mounted) return null; // Prevent hydration mismatch

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none bg-[#050505]" style={{ zIndex: -1 }}>

            {/* Ambient Base Light (Subtle fill) */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-[#0a0a0a] to-black" />

            {/* Orb 1: Top Left */}
            <motion.div
                className="absolute w-[80vw] h-[80vw] rounded-full blur-[160px] opacity-40 mix-blend-screen"
                style={{
                    background: `radial-gradient(circle, ${palette.colors[0]} 0%, transparent 70%)`,
                    top: '-30%',
                    left: '-20%',
                }}
                animate={{
                    x: [0, 50, -30, 0],
                    y: [0, -40, 40, 0],
                    scale: [1, 1.1, 0.9, 1],
                    rotate: [0, 20, -10, 0],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                // Apply Parallax with stiffer damping via strict transform
                style={{
                    transform: `translate(${tilt.x * 1.5}px, ${tilt.y * 1.5}px)`,
                    transition: 'transform 0.2s cubic-bezier(0.17, 0.67, 0.83, 0.67)'
                }}
            />

            {/* Orb 2: Middle Right */}
            <motion.div
                className="absolute w-[70vw] h-[70vw] rounded-full blur-[140px] opacity-30 mix-blend-screen"
                style={{
                    background: `radial-gradient(circle, ${palette.colors[1]} 0%, transparent 70%)`,
                    top: '20%',
                    right: '-30%',
                }}
                animate={{
                    x: [0, -60, 40, 0],
                    y: [0, 70, -50, 0],
                    scale: [1, 0.9, 1.2, 1],
                    rotate: [0, -15, 10, 0],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                }}
                style={{
                    transform: `translate(${tilt.x * -1.2}px, ${tilt.y * -1.2}px)`, // Inverse movement for depth
                    transition: 'transform 0.2s cubic-bezier(0.17, 0.67, 0.83, 0.67)'
                }}
            />

            {/* Orb 3: Bottom Left */}
            <motion.div
                className="absolute w-[90vw] h-[90vw] rounded-full blur-[180px] opacity-35 mix-blend-screen"
                style={{
                    background: `radial-gradient(circle, ${palette.colors[2]} 0%, transparent 70%)`,
                    bottom: '-40%',
                    left: '10%',
                }}
                animate={{
                    x: [0, 40, -40, 0],
                    y: [0, -30, 30, 0],
                    scale: [1, 1.15, 0.95, 1],
                    rotate: [0, 10, -5, 0],
                }}
                transition={{
                    duration: 28,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 5,
                }}
                style={{
                    transform: `translate(${tilt.x}px, ${tilt.y}px)`,
                    transition: 'transform 0.2s cubic-bezier(0.17, 0.67, 0.83, 0.67)'
                }}
            />

            {/* Cinematic Noise & Texture */}
            <div
                className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />
        </div>
    );
}
