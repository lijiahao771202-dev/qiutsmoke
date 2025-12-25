"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, RefreshCw, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/useHaptics";

// --- Types ---
type Phase = "IDLE" | "TRANSITION_TO_PRACTICE" | "PRACTICING" | "COMPLETED";
type BreathPhase = "INHALE" | "HOLD" | "EXHALE";

// --- Configuration ---
const BREATH_CYCLE = {
    INHALE: 4000,
    HOLD: 7000,
    EXHALE: 8000,
};

const PARTICLE_COUNT = 2000;
const BASE_RADIUS = 100;
const EXPAND_RADIUS = 280;

// --- Helper Functions ---
function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// -----------------------------------------------------------------------------
// Component: Ruler Time Selector
// -----------------------------------------------------------------------------
const RulerTimeSelector = ({
    value,
    onChange,
    min = 5,
    max = 60
}: {
    value: number,
    onChange: (val: number) => void,
    min?: number,
    max?: number
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { triggerLight } = useHaptics();
    const lastValue = useRef(value);

    // Generate ticks: each minute is a tick.
    // We want some padding before and after so the first/last items can be centered.
    // Let's say 1 minute = 10px width.
    const TICK_WIDTH = 12;

    useEffect(() => {
        if (scrollRef.current) {
            // Initial scroll position alignment
            // value 5 -> index 0. value = min + index.
            const index = value - min;
            scrollRef.current.scrollLeft = index * TICK_WIDTH;
        }
    }, []); // Run once on mount to set initial position

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;

        // Calculate raw value
        const rawIndex = scrollLeft / TICK_WIDTH;
        const index = Math.round(rawIndex);
        let newValue = min + index;

        // Clamp
        if (newValue < min) newValue = min;
        if (newValue > max) newValue = max;

        if (newValue !== lastValue.current) {
            triggerLight();
            lastValue.current = newValue;
            onChange(newValue);
        }
    };

    return (
        <div className="w-full relative h-24 flex flex-col items-center justify-center">
            {/* Current Value Display */}
            <div className="text-4xl font-light mb-2 text-white tabular-nums tracking-widest">
                {value}<span className="text-base text-white/40 ml-1">min</span>
            </div>

            {/* Ruler Container */}
            <div className="relative w-full h-12 overflow-hidden">
                {/* Center Indicator Line (Red/Accent) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-8 bg-red-500 z-10 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>

                {/* Scrollable Area */}
                <div
                    ref={scrollRef}
                    className="absolute inset-0 overflow-x-auto hide-scrollbar snap-x snap-mandatory"
                    onScroll={handleScroll}
                    style={{ scrollBehavior: 'smooth' }}
                >
                    <div
                        className="flex items-end h-full px-[50%]"
                        style={{ width: 'max-content' }}
                    >
                        {Array.from({ length: max - min + 1 }).map((_, i) => {
                            const val = min + i;
                            const isMajor = val % 5 === 0;
                            return (
                                <div
                                    key={val}
                                    className="flex flex-col items-center justify-end shrink-0 snap-center"
                                    style={{ width: TICK_WIDTH }}
                                >
                                    <div
                                        className={`w-[1px] bg-white/40 rounded-full`}
                                        style={{ height: isMajor ? 24 : 12, opacity: isMajor ? 0.8 : 0.3 }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Fade Edges */}
                <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black to-transparent pointer-events-none" />
            </div>
        </div>
    );
};


// -----------------------------------------------------------------------------
// Component: Main Page
// -----------------------------------------------------------------------------

export default function ImmersivePracticePage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

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
    const { triggerHeavy, triggerMedium } = useHaptics();

    // --- State ---
    const [phase, setPhase] = useState<Phase>("IDLE");
    const [durationMinutes, setDurationMinutes] = useState(15);
    const [timeLeft, setTimeLeft] = useState(0);
    const [breathPhase, setBreathPhase] = useState<BreathPhase>("INHALE");
    const [countdown, setCountdown] = useState(3);
    const { triggerLight, triggerMedium, triggerHeavy, triggerSuccess } = useHaptics();

    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hapticTimers = useRef<NodeJS.Timeout[]>([]);
    const requestRef = useRef<number>(0);
    const practiceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const breathTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Animation State
    // We add 'diffuse' properties for the idle cloud state
    const animState = useRef({
        particles: [] as any[],
        hue: 200,

        // Sync State (for stale closure fix)
        phase: "IDLE" as Phase,
        breathPhase: "INHALE" as BreathPhase,

        // Transition
        transitionStartTime: 0,
        transitionDuration: 2000,
        completionStartTime: 0, // NEW

        // Breath Cycle
        currentRadius: BASE_RADIUS,
        phaseStartTime: 0,
        phaseDuration: 0,
    });

    // --- Initialization ---
    useEffect(() => {
        setTimeLeft(durationMinutes * 60);
    }, [durationMinutes]);

    // --- Canvas Logic ---
    const initParticles = (width: number, height: number) => {
        const particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Structured (Target) Properties
            const angle = Math.random() * Math.PI * 2;
            const dist = (Math.random() * 0.5 + 0.5) * BASE_RADIUS;

            // Diffuse (Initial/Idle) Properties - Random Galaxy
            const diffuseX = (Math.random() - 0.5) * width * 1.5 + width / 2;
            const diffuseY = (Math.random() - 0.5) * height * 1.5 + height / 2;

            particles.push({
                // Current Pos (Starts as diffuse)
                x: diffuseX,
                y: diffuseY,

                // Diffuse State (Drift)
                dx: (Math.random() - 0.5) * 0.5,
                dy: (Math.random() - 0.5) * 0.5,
                diffuseX,
                diffuseY,

                // Structured State (Orbit)
                angle,
                dist,
                speed: 0.005 + Math.random() * 0.02,

                // Visuals
                size: Math.random() * 2 + 0.5,
                wobble: Math.random() * 20,
            });
        }
        animState.current.particles = particles;
    };

    const updateParticles = (timestamp: number, width: number, height: number, ctx: CanvasRenderingContext2D) => {
        const state = animState.current;
        const centerX = width / 2;
        const centerY = height / 2;

        // --- 1. Transition Logic (Condense) ---
        const now = Date.now();
        let transitionProgress = 0; // 0 = Diffuse, 1 = Structured

        if (state.phase === "TRANSITION_TO_PRACTICE") {
            const elapsed = now - state.transitionStartTime;
            transitionProgress = Math.min(elapsed / state.transitionDuration, 1);
            transitionProgress = easeInOutCubic(transitionProgress); // Smooth implosion
        } else if (state.phase === "PRACTICING" || state.phase === "COUNTDOWN") {
            transitionProgress = 1;
        } else if (state.phase === "COMPLETED") {
            // disperse back to 0
            const elapsed = now - (state.completionStartTime || now);
            transitionProgress = 1 - Math.min(elapsed / 2000, 1);
            transitionProgress = easeInOutCubic(transitionProgress);
        } else {
            transitionProgress = 0; // IDLE
        }

        // --- 2. Breath Logic (Only matters if transitionProgress > 0) ---
        let breathScale = 1;
        if (state.phase === "PRACTICING") {
            const elapsed = now - state.phaseStartTime;
            const breathProg = Math.min(elapsed / state.phaseDuration, 1);
            const smoothedBreath = easeInOutCubic(breathProg);

            if (state.breathPhase === "INHALE") {
                // Expand
                state.currentRadius = BASE_RADIUS + (EXPAND_RADIUS - BASE_RADIUS) * smoothedBreath;
                state.hue = 200 + (20 * smoothedBreath);
            } else if (state.breathPhase === "HOLD") {
                // Maintain
                state.currentRadius = EXPAND_RADIUS + Math.sin(timestamp * 0.003) * 5;
                state.hue = 220;
            } else if (state.breathPhase === "EXHALE") {
                // Contract
                state.currentRadius = EXPAND_RADIUS - (EXPAND_RADIUS - BASE_RADIUS) * smoothedBreath;
                state.hue = 220 - (20 * smoothedBreath);
            }
            breathScale = state.currentRadius / BASE_RADIUS;
        } else {
            // Idle breathing for the circle itself
            state.currentRadius = BASE_RADIUS + Math.sin(timestamp * 0.001) * 10;
            breathScale = state.currentRadius / BASE_RADIUS;
        }


        // --- 3. Draw ---
        // Clear Canvas
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)"; // Slightly more trail for the "implosion" effect
        ctx.fillRect(0, 0, width, height);

        state.particles.forEach((p, i) => {
            // Update Diffuse State (Drift)
            p.diffuseX += p.dx;
            p.diffuseY += p.dy;
            // Wrap around screen? simpler to just let them drift, they are placeholders

            // Update Structured State (Orbit)
            p.angle += p.speed;
            const currentOrbitDist = p.dist * breathScale + Math.sin(timestamp * 0.005 + p.wobble) * 5;
            const orbitX = Math.cos(p.angle) * currentOrbitDist;
            const orbitY = Math.sin(p.angle) * currentOrbitDist;

            // Interpolate Position
            // X = lerp(diffuseX, centerX + orbitX, t)
            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            // Color Logic
            // Diffuse = Dimmer, White/Blue
            // Structured = Brighter, Cyan
            let alpha = 0.5 + Math.sin(timestamp * 0.002 + i) * 0.3;
            if (transitionProgress < 1) alpha *= 0.6; // dimmer when diffuse

            ctx.fillStyle = `hsla(${state.hue}, 80%, 70%, ${alpha})`;

            ctx.beginPath();
            ctx.arc(finalX, finalY, p.size, 0, Math.PI * 2);
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

    // --- Logic ---
    const clearHapticTimers = () => {
        hapticTimers.current.forEach(t => clearTimeout(t));
        hapticTimers.current = [];
    };

    const playHapticPattern = (phaseType: BreathPhase) => {
        clearHapticTimers();

        if (phaseType === "INHALE") {
            // Ramp up: Light -> Light -> Medium -> Heavy
            const t1 = setTimeout(triggerLight, 0);
            const t2 = setTimeout(triggerLight, 1000);
            const t3 = setTimeout(triggerMedium, 2000);
            const t4 = setTimeout(triggerHeavy, 3000);
            hapticTimers.current.push(t1, t2, t3, t4);
        } else if (phaseType === "HOLD") {
            // Heartbeat: Light..... Light.....
            const beat = () => { triggerLight(); setTimeout(triggerLight, 150); }; // double tap? or just single? Plan says single/heartbeat. Let's do single gentle pulses.
            // Actually plan said: T+0, 2, 4, 6.
            const p1 = setTimeout(triggerLight, 0);
            const p2 = setTimeout(triggerLight, 2000);
            const p3 = setTimeout(triggerLight, 4000);
            const p4 = setTimeout(triggerLight, 6000);
            hapticTimers.current.push(p1, p2, p3, p4);
        } else if (phaseType === "EXHALE") {
            // Release: Heavy -> Silence
            const t1 = setTimeout(triggerHeavy, 0);
            hapticTimers.current.push(t1);
        }
    };

    useEffect(() => {
        // Sync Ref for Animation Loop
        animState.current.phase = phase;
        animState.current.breathPhase = breathPhase;

        animState.current.phaseStartTime = Date.now();
        if (breathPhase === "INHALE") animState.current.phaseDuration = BREATH_CYCLE.INHALE;
        if (breathPhase === "HOLD") animState.current.phaseDuration = BREATH_CYCLE.HOLD;
        if (breathPhase === "EXHALE") animState.current.phaseDuration = BREATH_CYCLE.EXHALE;

        // Haptics Trigger
        if (phase === "PRACTICING") {
            playHapticPattern(breathPhase);
        }
    }, [breathPhase, phase]);

    const handleStart = () => {
        // 1. Trigger Transition (Particles Implode)
        setPhase("TRANSITION_TO_PRACTICE");
        animState.current.transitionStartTime = Date.now();
        triggerMedium();

        // 2. Wait for transition (2s) then start countdown
        setTimeout(() => {
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
        }, 2000); // 2s transition matches animState.transitionDuration
    };

    const startPractice = () => {
        setPhase("PRACTICING");
        setBreathPhase("INHALE");

        // Start Recursive Cycle
        runBreathingCycle("INHALE");

        // Timer
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
        animState.current.completionStartTime = Date.now(); // Start dispersion
        cleanup();
        triggerSuccess();
    };

    const cleanup = () => {
        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
        clearHapticTimers();
    };

    const handleExit = () => {
        cleanup();
        router.back();
    };


    return (
        <div className="fixed inset-0 z-[99999] bg-black text-white font-sans overflow-hidden animate-in fade-in duration-500">

            {/* Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 block touch-none" />

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



                {/* Center UI - Absolute Layer for Perfect Centering */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
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
                                initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                                transition={{ duration: 1 }}
                                className="text-center mix-blend-screen"
                            >
                                <span className="text-4xl md:text-5xl font-light tracking-[0.3em] uppercase text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                    {breathPhase === "INHALE" && "吸 气"}
                                    {breathPhase === "HOLD" && "屏 气"}
                                    {breathPhase === "EXHALE" && "呼 气"}
                                </span>
                            </motion.div>
                        )}

                        {phase === "COMPLETED" && (
                            <motion.div
                                key="done"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center gap-4 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12 }}
                                    className="p-4 rounded-full bg-green-500/20 text-green-400 mb-2"
                                >
                                    <CheckCircle2 size={48} />
                                </motion.div>
                                <h1 className="text-3xl font-light text-white tracking-widest">
                                    Session Complete
                                </h1>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer UI (Independent of Center UI) */}
                <div className="w-full flex flex-col items-center justify-end pointer-events-none z-40 flex-1">

                </div>

                {/* Footer */}
                <footer className="w-full max-w-sm pb-12 px-6 pointer-events-auto z-50">
                    <AnimatePresence>
                        {/* IDLE UI */}
                        {phase === "IDLE" && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                className="flex flex-col gap-10"
                            >
                                {/* Scale Selector */}
                                <RulerTimeSelector
                                    value={durationMinutes}
                                    onChange={setDurationMinutes}
                                />

                                {/* Start Button */}
                                <button
                                    onClick={handleStart}
                                    className="w-full py-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-xl font-light tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    <Play size={20} fill="currentColor" />
                                    <span>BEGIN</span>
                                </button>
                            </motion.div>
                        )}

                        {phase === "PRACTICING" && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full py-5 text-center"
                            >
                                <span className="text-2xl font-thin tracking-widest text-white/50 tabular-nums">
                                    {formatTime(timeLeft)}
                                </span>
                            </motion.div>
                        )}

                        {phase === "COMPLETED" && (
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setPhase("IDLE")}
                                className="w-full py-4 glass-panel rounded-full flex items-center justify-center gap-2 hover:bg-white/10 transition-colors pointer-events-auto"
                            >
                                <RefreshCw size={18} />
                                <span>Repeat Session</span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </footer>
            </div>

            <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        .p-safe {
             padding-top: env(safe-area-inset-top);
             padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
        </div >
    );
}
