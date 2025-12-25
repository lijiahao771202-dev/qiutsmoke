"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Types
type Phase = "IDLE" | "COUNTDOWN" | "PRACTICING" | "COMPLETED";
type BreathPhase = "INHALE" | "HOLD" | "EXHALE";

// Constants for 4-7-8 Breathing
const BREATH_CYCLE = {
    INHALE: 4000,
    HOLD: 7000,
    EXHALE: 8000,
};

export default function PracticePage() {
    const router = useRouter();

    // State
    const [phase, setPhase] = useState<Phase>("IDLE");
    const [durationMinutes, setDurationMinutes] = useState(15);
    const [timeLeft, setTimeLeft] = useState(0);
    const [breathPhase, setBreathPhase] = useState<BreathPhase>("INHALE");
    const [countdown, setCountdown] = useState(3);

    // Refs for timers
    const practiceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const breathTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize total time when duration changes
    useEffect(() => {
        if (phase === "IDLE") {
            setTimeLeft(durationMinutes * 60);
        }
    }, [durationMinutes, phase]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
            if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
        };
    }, []);

    // Format time (MM:SS)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Start Sequence
    const handleStart = () => {
        setPhase("COUNTDOWN");
        setCountdown(3);

        const countInterval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(countInterval);
                    startPractice();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Start Actual Practice
    const startPractice = () => {
        setPhase("PRACTICING");
        setBreathPhase("INHALE");
        runBreathingCycle("INHALE");

        // Main Timer
        practiceTimerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    completePractice();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Recursive Breathing Cycle
    const runBreathingCycle = (currentPhase: BreathPhase) => {
        if (phase === "COMPLETED") return;

        let nextPhase: BreathPhase;
        let duration: number;

        switch (currentPhase) {
            case "INHALE":
                nextPhase = "HOLD";
                duration = BREATH_CYCLE.INHALE;
                break;
            case "HOLD":
                nextPhase = "EXHALE";
                duration = BREATH_CYCLE.HOLD;
                break;
            case "EXHALE":
                nextPhase = "INHALE";
                duration = BREATH_CYCLE.EXHALE;
                break;
        }

        setBreathPhase(currentPhase);

        breathTimerRef.current = setTimeout(() => {
            // Need to check phase ref or state if possible, but recursive set works 
            // effectively for this simple loop as long as parent clears timeout
            runBreathingCycle(nextPhase);
        }, duration);
    };

    // Complete Practice
    const completePractice = () => {
        setPhase("COMPLETED");
        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
    };

    // Reset
    const handleReset = () => {
        setPhase("IDLE");
        setDurationMinutes(15);
        setTimeLeft(15 * 60);
        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
    };

    // --- UI Components ---

    return (
        <div className="min-h-screen relative overflow-hidden text-foreground flex flex-col items-center justify-between p-6">

            {/* Background Gradient Spot */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
            </div>

            {/* Header */}
            <header className="w-full relative z-10 flex items-center justify-between pt-safe">
                <Link href="/" className="glass-button p-3 rounded-full text-white/80 hover:text-white">
                    <ArrowLeft size={24} />
                </Link>
                <span className="text-sm font-medium tracking-widest text-white/50 uppercase">
                    Formal Practice
                </span>
                <div className="w-[48px]" /> {/* Spacer */}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full flex flex-col items-center justify-center relative z-10 w-full max-w-md">

                {/* Breathing Indicator */}
                <div className="relative w-[300px] h-[300px] flex items-center justify-center mb-12">

                    {phase === "PRACTICING" && (
                        <>
                            {/* Core Circle - Animated */}
                            <motion.div
                                animate={{
                                    scale: breathPhase === "INHALE" ? 1.5 : (breathPhase === "HOLD" ? 1.5 : 1),
                                    opacity: breathPhase === "INHALE" ? 0.8 : (breathPhase === "HOLD" ? 0.9 : 0.6),
                                }}
                                transition={{
                                    duration: breathPhase === "INHALE" ? 4 : (breathPhase === "HOLD" ? 0 : 8),
                                    ease: "easeInOut"
                                }}
                                className="absolute inset-0 m-auto w-[150px] h-[150px] rounded-full bg-white/20 backdrop-blur-3xl shadow-[0_0_50px_rgba(255,255,255,0.3)]"
                            />

                            {/* Outer Ripple for visual feedback */}
                            <motion.div
                                animate={{
                                    scale: breathPhase === "INHALE" ? [1, 1.8] : (breathPhase === "HOLD" ? 1.8 : [1.8, 1]),
                                    opacity: breathPhase === "INHALE" ? [0.1, 0.4] : (breathPhase === "HOLD" ? 0.4 : [0.4, 0.1]),
                                }}
                                transition={{
                                    duration: breathPhase === "INHALE" ? 4 : (breathPhase === "HOLD" ? 0 : 8),
                                    ease: "easeInOut"
                                }}
                                className="absolute inset-0 m-auto w-[150px] h-[150px] rounded-full border border-white/20"
                            />
                        </>
                    )}

                    {/* Idle State Circle */}
                    {phase === "IDLE" && (
                        <div className="absolute inset-0 m-auto w-[180px] h-[180px] rounded-full bg-white/10 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-center border border-white/10">
                            <span className="text-white/40 text-sm">Ready</span>
                        </div>
                    )}

                    {/* Countdown Display */}
                    {phase === "COUNTDOWN" && (
                        <motion.div
                            key={countdown}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 1 }}
                            exit={{ scale: 2, opacity: 0 }}
                            className="text-8xl font-thin text-white"
                        >
                            {countdown}
                        </motion.div>
                    )}

                    {/* Text Instruction (Center) */}
                    {phase === "PRACTICING" && (
                        <motion.div
                            key={breathPhase}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-20 text-center"
                        >
                            <h2 className="text-3xl font-light text-white tracking-wider">
                                {breathPhase === "INHALE" && "吸气"}
                                {breathPhase === "HOLD" && "屏气"}
                                {breathPhase === "EXHALE" && "呼气"}
                            </h2>
                            <p className="text-white/50 text-xs mt-1 uppercase tracking-widest">
                                {breathPhase === "INHALE" && "Inhale"}
                                {breathPhase === "HOLD" && "Hold"}
                                {breathPhase === "EXHALE" && "Exhale"}
                            </p>
                        </motion.div>
                    )}

                    {phase === "COMPLETED" && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
                            <span className="text-2xl text-white">Completed</span>
                        </motion.div>
                    )}
                </div>

                {/* Timer Display */}
                <div className="mb-12 text-center relative z-10">
                    <span className={`text-6xl font-extralight tracking-tight ${phase === "IDLE" ? "text-white/90" : "text-white"}`}>
                        {formatTime(timeLeft)}
                    </span>
                    <p className="text-white/40 text-sm mt-2">
                        {phase === "IDLE" && "Set Duration"}
                        {phase === "PRACTICING" && "Remaining Time"}
                        {phase === "COMPLETED" && "Session Finished"}
                    </p>
                </div>

            </main>

            {/* Bottom Controls */}
            <footer className="w-full relative z-20 max-w-sm pb-safe">
                <AnimatePresence mode="wait">
                    {phase === "IDLE" && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Time Slider */}
                            <div className="glass-panel p-6 rounded-3xl">
                                <div className="flex justify-between text-xs text-white/50 mb-4">
                                    <span>5 min</span>
                                    <span>{durationMinutes} min</span>
                                    <span>60 min</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="60"
                                    step="5"
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-blue-200 transition-all"
                                />
                            </div>

                            {/* Start Button */}
                            <button
                                onClick={handleStart}
                                className="w-full glass-button h-16 rounded-full flex items-center justify-center space-x-3 group"
                            >
                                <Play className="w-6 h-6 fill-white text-white group-hover:scale-110 transition-transform" />
                                <span className="text-lg font-medium text-white">开始冥想</span>
                            </button>
                        </motion.div>
                    )}

                    {(phase === "PRACTICING" || phase === "COUNTDOWN") && (
                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            onClick={handleReset}
                            className="w-full glass-button h-14 rounded-full text-white/70 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all flex items-center justify-center space-x-2"
                        >
                            <span className="text-sm">End Session</span>
                        </motion.button>
                    )}

                    {phase === "COMPLETED" && (
                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            onClick={handleReset}
                            className="w-full glass-button h-16 rounded-full flex items-center justify-center space-x-3"
                        >
                            <RefreshCw className="w-5 h-5 text-white" />
                            <span className="text-lg font-medium text-white">Start New Session</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </footer>

            {/* Global Style Override for Range Input (optional for better styling) */}
            <style jsx global>{`
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 24px;
            width: 24px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 1);
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            margin-top: -8px; /* You need to specify a margin in Chrome, but in Firefox and IE it is automatic */
        }
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%;
            height: 8px;
            cursor: pointer;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
        }
      `}</style>
        </div>
    );
}
