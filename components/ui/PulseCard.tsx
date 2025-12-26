"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { cn } from "@/lib/utils";

/**
 * PULSE ANCHOR CARD (The 3rd Card)
 * Concept: "Pocket Sun" / "Warm Plush" - A warm, fuzzy, comforting entity.
 * Function: Tactile anxiety relief via synchronized breathing and haptics.
 */
export default function PulseCard() {
    const [isPressed, setIsPressed] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const { triggerLight, triggerMedium, triggerHeavy, triggerSuccess } = useHaptics();

    // Animation Controls
    const coreControls = useAnimation();

    // Logic Refs
    const loopRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const phaseRef = useRef<"inhale" | "hold" | "exhale">("inhale");

    // Visual State for Text
    const [visualPhase, setVisualPhase] = useState<"idle" | "inhale" | "hold" | "exhale">("idle");
    const [breathCount, setBreathCount] = useState(0); // Track sets of 10
    const [showCelebration, setShowCelebration] = useState(false);

    // Audio Logic
    const playSuccessTone = () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const ctx = audioContextRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
            oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // Slide to A5

            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 1.5);
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    // --- HAPTIC PATTERNS ---
    const runHapticLoop = () => {
        const now = Date.now();
        const elapsed = (now - startTimeRef.current) % 10000; // 0 - 10000ms

        // Determine Phase & Update Visuals
        let currentPhase: "inhale" | "hold" | "exhale" = "inhale";

        if (elapsed < 4000) {
            // INHALE (0-4s): Rapid, Light "Charging" Ticks
            if (Math.floor(elapsed / 200) !== Math.floor((elapsed - 50) / 200)) {
                triggerLight();
            }
            currentPhase = "inhale";

        } else if (elapsed < 6000) {
            // HOLD (4-6s): "Suspension"
            if (elapsed < 4100 && phaseRef.current === "inhale") {
                triggerHeavy();
            }
            currentPhase = "hold";

        } else {
            // EXHALE (6-10s): Slow, Deep "Release" Pulses
            if (Math.floor((elapsed - 6000) / 800) !== Math.floor(((elapsed - 6000) - 50) / 800)) {
                triggerMedium();
            }
            currentPhase = "exhale";

            // Check for Cycle Completion (Just before loop restarts at 10000ms)
            // We use a small window (9900-10000) to trigger the increment once per loop
            if (elapsed > 9900 && phaseRef.current === "exhale") {
                // Increment logic handled in the state update block to avoid duplicates
            }
        }

        // State Update & Cycle Counting
        if (currentPhase !== phaseRef.current) {
            // If we just finished Exhaling and are switching to Inhale (or loop restart), increment count
            if (phaseRef.current === "exhale" && currentPhase === "inhale") {
                setBreathCount(prev => {
                    const next = prev + 1;
                    if (next === 10) {
                        // CELEBRATION MOMENT
                        setShowCelebration(true);
                        triggerHeavy();
                        playSuccessTone(); // Play Sound

                        // STOP THE LOOP
                        if (loopRef.current) clearTimeout(loopRef.current);
                        setIsPressed(false); // Force release state visually
                        coreControls.stop(); // Stop breathing animation

                        setTimeout(() => triggerSuccess(), 300); // Cascading vibration
                        setTimeout(() => setShowCelebration(false), 4000); // Longer celebration
                        return 10;
                    }
                    if (prev === 10) return 1; // Reset to 1 if kept holding after 10
                    return next;
                });
            }
            if (breathCount !== 9) { // Don't continue if we just hit 10 (handled above implicitly via ref check, but safe guard)
                phaseRef.current = currentPhase;
                setVisualPhase(currentPhase);
            }
        }

        // Special Case: Detect loop wrap-around (10000 -> 0)
        // Since runHapticLoop calls itself, we need to handle the exact moment of wrap
        if (elapsed < 50 && phaseRef.current === "exhale") {
            // This safeguards the "wrap around" increment if the phase check missed it
            phaseRef.current = "inhale";
            setVisualPhase("inhale");
            setBreathCount(prev => Math.min(prev + 1, 10));
        }

        loopRef.current = setTimeout(runHapticLoop, 50); // 20Hz Check loop
    };

    const handlePressStart = () => {
        setIsPressed(true);
        triggerMedium(); // Wake up thump

        startTimeRef.current = Date.now();
        phaseRef.current = "inhale";
        setVisualPhase("inhale"); // Immediate visual update
        setBreathCount(0); // Reset counter on new press

        // Start Haptic Loop
        runHapticLoop();

        // Start Animation (Synced)

        coreControls.start({
            scale: [1, 1.8, 1.8, 0.7], // Drastic Scale Difference (Inhale big, Exhale small)
            opacity: [0.7, 1, 1, 0.6],
            transition: {
                duration: 10,
                times: [0, 0.4, 0.6, 1], // Inhale(4s) -> Hold(2s) -> Exhale(4s)
                repeat: Infinity,
                ease: "easeInOut"
            }
        });
    };

    const handlePressEnd = () => {
        setIsPressed(false);
        setVisualPhase("idle");
        triggerLight();

        // Kill Loop
        if (loopRef.current) clearTimeout(loopRef.current);

        // Reset Animation
        coreControls.stop();
        coreControls.start({
            scale: 1,
            opacity: 0.8,
            transition: { duration: 1.5, ease: "easeOut" }
        });
    };

    return (
        <div
            className="w-full h-full relative rounded-[2.5rem] overflow-hidden cursor-pointer isolate touch-none select-none"
            onPointerDown={handlePressStart}
            onPointerUp={handlePressEnd}
            onPointerLeave={handlePressEnd}
        >
            {/* 1. WARM BACKGROUND */}
            <div className={cn(
                "absolute inset-0 transition-colors duration-1000",
                visualPhase === "idle" && "bg-orange-50",
                visualPhase === "inhale" && "bg-orange-100",
                visualPhase === "hold" && "bg-rose-50",
                visualPhase === "exhale" && "bg-amber-50"
            )}>
                {/* Felt/Fleece Texture (High opacity noise) */}
                <div className="absolute inset-0 opacity-60 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-multiply" />

                {/* Warm Glow from bottom */}
                <motion.div
                    animate={isPressed ? { opacity: 1, scale: 1.2 } : { opacity: 0.5, scale: 1 }}
                    transition={{ duration: 2 }}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-2/3 bg-gradient-to-t from-orange-300/40 to-transparent blur-3xl"
                />
            </div>

            {/* 2. THE CORE (Fuzzy Sun / Plush Ball) */}
            <div className="absolute inset-0 flex items-center justify-center">
                {/* Outer Warm Aura */}
                <motion.div
                    animate={coreControls}
                    className="absolute w-40 h-40 rounded-full bg-orange-300/30 blur-[60px]"
                />

                {/* The Physical Core - Fuzzy Edges */}
                <motion.div
                    animate={isPressed ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                    transition={isPressed ? { duration: 10, repeat: Infinity } : {}}
                    className={cn(
                        "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-1000",
                        // Dynamic Colors based on Phase
                        visualPhase === "idle" && "bg-gradient-to-br from-orange-200 to-rose-300 shadow-xl",
                        visualPhase === "inhale" && "bg-gradient-to-br from-orange-400 to-red-500 shadow-[0_0_80px_rgba(251,146,60,0.8)]", // Hot/Intense
                        visualPhase === "hold" && "bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_0_100px_rgba(244,63,94,0.9)] scale-[1.05]", // Peak Tension
                        visualPhase === "exhale" && "bg-gradient-to-br from-amber-100 to-yellow-50 shadow-[0_0_40px_rgba(251,191,36,0.4)]" // Calm/Cool/Pale
                    )}
                >
                    {/* Fuzziness layer */}
                    <div className="absolute inset-[-10px] rounded-full bg-white/40 blur-xl" />
                    <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-sm" />
                </motion.div>

                {/* 4. TEXT (Overlay on Center) */}
                <div className="absolute z-10 flex items-center justify-center pointer-events-none">
                    <AnimatePresence mode="wait">
                        {!showCelebration ? (
                            <motion.h3
                                key={visualPhase}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.2 }}
                                transition={{ duration: 0.3 }}
                                className={cn(
                                    "text-lg font-bold tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] text-center",
                                    isPressed ? "text-white" : "text-white/60"
                                )}
                            >
                                {visualPhase === "idle" && "Sun"}
                                {visualPhase === "inhale" && "Inhale"}
                                {visualPhase === "hold" && "Hold"}
                                {visualPhase === "exhale" && "Release"}
                            </motion.h3>
                        ) : (
                            <motion.h3
                                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                                animate={{ opacity: 1, scale: 1.5, rotate: 0 }}
                                exit={{ opacity: 0, scale: 2 }}
                                className="text-2xl font-black bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent drop-shadow-sm"
                            >
                                GREAT!
                            </motion.h3>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* CELEBRATION PARTICLES */}
            <AnimatePresence>
                {showCelebration && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {[...Array(30)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ x: 0, y: 0, scale: 0 }}
                                animate={{
                                    x: (Math.random() - 0.5) * 300,
                                    y: (Math.random() - 0.5) * 300,
                                    scale: [0, 1, 0],
                                    rotate: Math.random() * 360,
                                    opacity: [1, 1, 0]
                                }}
                                transition={{ duration: 2, ease: "easeOut" }}
                                className="absolute w-2 h-2 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-lg"
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* 3. SHOCKWAVES (Warm Ripples) */}
            <AnimatePresence>
                {isPressed && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1.5 }}
                        exit={{ opacity: 0, scale: 2 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                        <div className="w-48 h-48 rounded-full border-2 border-orange-400/20 blur-sm" />
                    </motion.div>
                )}
            </AnimatePresence>



            {/* Instruction / Counter */}
            {!isPressed ? (
                <div className="absolute bottom-10 w-full text-center pointer-events-none animate-bounce-slow">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-semibold bg-white/30 px-3 py-1 rounded-full backdrop-blur-md">
                        Hold to Hug
                    </span>
                </div>
            ) : (
                /* Breath Counter (Only visible when ACTIVE) */
                <div className="absolute bottom-10 w-full text-center pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/10 backdrop-blur-md border border-white/10"
                    >
                        <span className="text-xs font-bold text-white/80 tracking-widest uppercase">
                            Session
                        </span>
                        <div className="w-px h-3 bg-white/20" />
                        <span className={cn(
                            "text-sm font-bold tabular-nums",
                            breathCount >= 10 ? "text-amber-300" : "text-white"
                        )}>
                            {breathCount} <span className="text-white/40 text-[10px] font-normal">/ 10</span>
                        </span>
                    </motion.div>
                </div>
            )}

        </div>
    );
}
