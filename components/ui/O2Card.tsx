"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Droplets, Wind, Activity } from "lucide-react";

/**
 * O2 VAULT CARD (The 4th Card)
 * Concept: "The Oxygen Tank" / "Purification"
 * Visual: High-tech medical glass container with rising bubbles.
 * Metaphor: Cleaning the body, restoring lung capacity.
 */
export default function O2Card() {
    const [isScanning, setIsScanning] = useState(false);

    // BUBBLE SYSTEM
    // Generate static array for bubbles to ensure consistent server/client hydration
    // Randomness handled via CSS/Motion props
    const bubbles = Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        size: Math.random() * 6 + 2, // 2px - 8px
        left: Math.random() * 100, // 0% - 100%
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 4, // 4s - 7s rise time
    }));

    const handleTap = () => {
        setIsScanning(!isScanning);
    };

    return (
        <div
            className="w-full h-full relative rounded-[2.5rem] overflow-hidden cursor-pointer isolate touch-none select-none bg-slate-900"
            onClick={handleTap}
        >
            {/* 1. LIQUID BACKGROUND (The Tank Fluid) */}
            {/* Murky to Clear Transition Base */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/40 via-teal-900/40 to-emerald-950/60 transition-colors duration-1000" />

            {/* Liquid Highlight/Sheen */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent opacity-50" />

            {/* 2. BUBBLE SYSTEM */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <AnimatePresence>
                    {bubbles.map((b) => (
                        <motion.div
                            key={b.id}
                            initial={{ y: 400, opacity: 0 }}
                            animate={{
                                y: -50,
                                opacity: [0, 1, 1, 0],
                                x: [0, Math.random() * 10 - 5, Math.random() * 10 - 5, 0] // Subtle Wobble
                            }}
                            transition={{
                                duration: b.duration,
                                repeat: Infinity,
                                repeatDelay: Math.random() * 2,
                                delay: b.delay,
                                ease: "linear"
                            }}
                            className="absolute rounded-full bg-cyan-200/40 backdrop-blur-sm shadow-[0_0_4px_rgba(165,243,252,0.4)]"
                            style={{
                                width: b.size,
                                height: b.size,
                                left: `${b.left}%`,
                            }}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* 3. GLASS CONTAINER EFFECTS */}
            {/* Inner Rim Highlight */}
            <div className="absolute inset-0 rounded-[2.5rem] border border-white/10 pointer-events-none" />

            {/* Glossy Reflection */}
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent opacity-30 pointer-events-none" />

            {/* 4. CONTENT LAYER */}
            <div className="absolute inset-0 flex flex-col items-center justify-between p-8 pointer-events-none z-10">
                {/* Header */}
                <div className="w-full flex justify-between items-start opacity-80">
                    <div className="flex flex-col">
                        <h3 className="text-xs font-bold tracking-widest text-cyan-200/60 uppercase">System</h3>
                        <span className="text-xl font-medium text-cyan-50 font-mono">O₂ Vault</span>
                    </div>
                    <Activity className="w-5 h-5 text-cyan-400/80" />
                </div>

                {/* Center Visual: Scan Overlay */}
                <AnimatePresence>
                    {isScanning && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center"
                        >
                            {/* Scanning Line */}
                            <motion.div
                                initial={{ top: "0%" }}
                                animate={{ top: "100%" }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute w-full h-[2px] bg-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.8)]"
                            />

                            {/* Data Grid */}
                            <div className="grid grid-cols-2 gap-4 w-3/4">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-black/40 border border-cyan-500/30 p-3 rounded-xl backdrop-blur-md"
                                >
                                    <div className="text-[10px] text-cyan-300/80 uppercase mb-1">CO Levels</div>
                                    <div className="text-lg font-bold text-white">Normal</div>
                                </motion.div>
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-black/40 border border-cyan-500/30 p-3 rounded-xl backdrop-blur-md"
                                >
                                    <div className="text-[10px] text-cyan-300/80 uppercase mb-1">Smell</div>
                                    <div className="text-lg font-bold text-emerald-400">85%</div>
                                </motion.div>
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="col-span-2 bg-black/40 border border-cyan-500/30 p-3 rounded-xl backdrop-blur-md flex justify-between items-center"
                                >
                                    <div>
                                        <div className="text-[10px] text-cyan-300/80 uppercase mb-1">Circulation</div>
                                        <div className="text-sm font-bold text-white">Improving</div>
                                    </div>
                                    <div className="h-1 w-20 bg-gray-700 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: "70%" }}
                                            transition={{ delay: 0.5, duration: 1 }}
                                            className="h-full bg-cyan-400"
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Status (Always Visible) */}
                <div className="w-full z-10">
                    <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/5 transition-opacity duration-300" style={{ opacity: isScanning ? 0 : 1 }}>
                        <div className="p-2 rounded-full bg-cyan-500/20 text-cyan-300">
                            <Wind className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-cyan-200/60 font-medium uppercase tracking-wider">Lung Capacity</span>
                            <span className="text-lg font-semibold text-white">Recovering</span>
                        </div>
                        <div className="ml-auto">
                            <span className="text-2xl font-bold text-cyan-400">85%</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
