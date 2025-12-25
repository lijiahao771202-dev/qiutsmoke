"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

// --- Types ---
type Phase = "IDLE" | "COUNTDOWN" | "PRACTICING" | "COMPLETED";
type BreathPhase = "INHALE" | "HOLD" | "EXHALE";

// --- Configuration ---
const BREATH_CYCLE = {
    INHALE: 4000,
    HOLD: 7000,
    EXHALE: 8000,
};

const PARTICLE_COUNT = 2000;
const BASE_RADIUS = 100;
const EXPAND_RADIUS = 280; // Mobile friendly max radius

export default function ImmersivePracticePage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    // Ensure we only render portal on client
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <PracticeContent router={router} />,
        document.body
    );
}

function PracticeContent({ router }: { router: any }) {
    // --- State ---
    const [phase, setPhase] = useState<Phase>("IDLE");
    const [durationMinutes, setDurationMinutes] = useState(15);
    const [timeLeft, setTimeLeft] = useState(0);
    const [breathPhase, setBreathPhase] = useState<BreathPhase>("INHALE");
    const [countdown, setCountdown] = useState(3);

    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const practiceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const breathTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Animation State Refs
    const animState = useRef({
        currentRadius: BASE_RADIUS,
        targetRadius: BASE_RADIUS,
        particles: [] as any[],
        hue: 200, // Cyan base
        phaseStartTime: 0,
        phaseDuration: 0,
        globalAlpha: 0.5,
    });

    // --- Initialization ---
    useEffect(() => {
        setTimeLeft(durationMinutes * 60);
    }, [durationMinutes]);

    // --- Canvas Logic ---
    const initParticles = (width: number, height: number) => {
        const particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = (Math.random() * 0.5 + 0.5) * BASE_RADIUS;

            particles.push({
                x: 0,
                y: 0,
                angle,
                initialAngle: angle,
                dist,
                speed: 0.005 + Math.random() * 0.02,
                size: Math.random() * 2 + 0.5,
                wobble: Math.random() * 20,
            });
        }
        animState.current.particles = particles;
    };

    const updateParticles = (timestamp: number, width: number, height: number, ctx: CanvasRenderingContext2D) => {
        const state = animState.current;

        // Smooth Radius Transition
        const now = Date.now();
        let progress = 0;

        if (phase === "PRACTICING") {
            const elapsed = now - state.phaseStartTime;
            progress = Math.min(elapsed / state.phaseDuration, 1);

            // Easing
            const easeNodes = (t: number) => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
            const smoothedProgress = easeNodes(progress);

            if (breathPhase === "INHALE") {
                // Expand
                state.currentRadius = BASE_RADIUS + (EXPAND_RADIUS - BASE_RADIUS) * smoothedProgress;
                state.hue = 200 + (20 * smoothedProgress);
            } else if (breathPhase === "HOLD") {
                // Maintain
                state.currentRadius = EXPAND_RADIUS + Math.sin(timestamp * 0.002) * 10;
                state.hue = 220;
            } else if (breathPhase === "EXHALE") {
                // Contract
                state.currentRadius = EXPAND_RADIUS - (EXPAND_RADIUS - BASE_RADIUS) * smoothedProgress;
                state.hue = 220 - (20 * smoothedProgress);
            }
        } else if (phase === "IDLE") {
            // Idling
            state.currentRadius = BASE_RADIUS + Math.sin(timestamp * 0.001) * 20;
        }

        // Clear Canvas with Fade
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;

        state.particles.forEach((p, i) => {
            p.angle += p.speed;

            const scaleFactor = state.currentRadius / BASE_RADIUS;
            const currentDist = p.dist * scaleFactor + Math.sin(timestamp * 0.005 + p.wobble) * 5;

            const x = centerX + Math.cos(p.angle) * currentDist;
            const y = centerY + Math.sin(p.angle) * currentDist;

            const alpha = 0.5 + Math.sin(timestamp * 0.002 + i) * 0.3;
            ctx.fillStyle = `hsla(${state.hue}, 80%, 70%, ${alpha})`;

            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const draw = (time: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        updateParticles(time, canvas.width, canvas.height, ctx);
        requestRef.current = requestAnimationFrame(draw);
    };

    // Resize Handler
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles(canvas.width, canvas.height);
            requestRef.current = requestAnimationFrame(draw);
        }

        const handleResize = () => {
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // --- Control Logic ---
    useEffect(() => {
        animState.current.phaseStartTime = Date.now();
        if (breathPhase === "INHALE") animState.current.phaseDuration = BREATH_CYCLE.INHALE;
        if (breathPhase === "HOLD") animState.current.phaseDuration = BREATH_CYCLE.HOLD;
        if (breathPhase === "EXHALE") animState.current.phaseDuration = BREATH_CYCLE.EXHALE;
    }, [breathPhase]);

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

    const startPractice = () => {
        setPhase("PRACTICING");
        setBreathPhase("INHALE");
        runBreathingCycle("INHALE");

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

    const runBreathingCycle = (currentPhase: BreathPhase) => {
        if (phase === "COMPLETED") return;

        let nextPhase: BreathPhase;
        let duration: number;

        switch (currentPhase) {
            case "INHALE": nextPhase = "HOLD"; duration = BREATH_CYCLE.INHALE; break;
            case "HOLD": nextPhase = "EXHALE"; duration = BREATH_CYCLE.HOLD; break;
            case "EXHALE": nextPhase = "INHALE"; duration = BREATH_CYCLE.EXHALE; break;
        }

        setBreathPhase(currentPhase);

        breathTimerRef.current = setTimeout(() => {
            runBreathingCycle(nextPhase);
        }, duration);
    };

    const completePractice = () => {
        setPhase("COMPLETED");
        cleanup();
    };

    const cleanup = () => {
        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
    };

    const handleExit = () => {
        cleanup();
        router.back();
    };


    return (
        <div className="fixed inset-0 z-[99999] bg-black text-white font-sans overflow-hidden animate-in fade-in duration-500">

            {/* Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 block touch-none" />

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-safe">

                {/* Header */}
                <header className="w-full p-6 flex justify-between items-start pointer-events-auto z-50">
                    <button
                        onClick={handleExit}
                        className="p-3 bg-white/5 backdrop-blur-md rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/5 group"
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                    <div className="w-[46px]" />
                </header>

                {/* Center Content */}
                <main className="flex-1 flex flex-col items-center justify-center -mt-20 pointer-events-none z-40">
                    <AnimatePresence mode="wait">
                        {phase === "COUNTDOWN" && (
                            <motion.div
                                key="cnt"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 2 }}
                                className="text-9xl font-thin text-white mix-blend-screen"
                            >
                                {countdown}
                            </motion.div>
                        )}

                        {phase === "PRACTICING" && (
                            <motion.div
                                key={breathPhase}
                                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                                transition={{ duration: 1 }}
                                className="text-center mix-blend-screen"
                            >
                                <h1 className="text-4xl md:text-5xl font-extralight tracking-[0.2em] uppercase text-white drop-shadow-[0_0_15px_rgba(100,200,255,0.5)]">
                                    {breathPhase === "INHALE" && "吸 气"}
                                    {breathPhase === "HOLD" && "屏 气"}
                                    {breathPhase === "EXHALE" && "呼 气"}
                                </h1>
                            </motion.div>
                        )}

                        {phase === "COMPLETED" && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center"
                            >
                                <h2 className="text-3xl font-light mb-2">Practice Complete</h2>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>

                {/* Footer */}
                <footer className="w-full max-w-sm pb-12 px-6 pointer-events-auto z-50">
                    <AnimatePresence>
                        {phase === "IDLE" && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                className="flex flex-col gap-8"
                            >
                                <div className="space-y-4">
                                    <div className="flex justify-between text-white/60 text-sm font-medium tracking-wide">
                                        <span>Duration</span>
                                        <span>{durationMinutes} min</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="60"
                                        step="5"
                                        value={durationMinutes}
                                        onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer outline-none"
                                    />
                                </div>

                                <button
                                    onClick={handleStart}
                                    className="w-full py-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-xl font-light tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                                >
                                    <Play size={20} fill="currentColor" />
                                    <span>BEGIN</span>
                                </button>
                            </motion.div>
                        )}

                        {phase === "COMPLETED" && (
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setPhase("IDLE")}
                                className="w-full py-4 glass-panel rounded-full flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                            >
                                <RefreshCw size={18} />
                                <span>Repeat Session</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </footer>
            </div>

            <style jsx global>{`
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: white;
            box-shadow: 0 0 10px rgba(255,255,255,0.8);
        }
        .p-safe {
             padding-top: env(safe-area-inset-top);
             padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
        </div>
    );
}
