"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, RefreshCw, CheckCircle2, Sparkles, Waves, Flower2, CircleDot, Flame, Gem, Orbit, Cherry, Star, Flower } from "lucide-react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useHeartRate } from "@/lib/hooks/useHeartRate";
import HeartRateIndicator from "@/components/HeartRateGraph";
import { KeepAwake } from "@capacitor-community/keep-awake";

// --- Types ---
type Phase = "IDLE" | "TRANSITION_TO_PRACTICE" | "PRACTICING" | "COMPLETED";
type BreathPhase = "INHALE" | "HOLD" | "EXHALE";
type Theme = "ROSE" | "AURORA" | "TIDES" | "ZEN" | "GALAXY" | "INFERNO" | "CRYSTAL" | "SAKURA" | "STARFALL" | "LOTUS";

// --- Theme Config ---
const THEMES: Record<Theme, { name: string; icon: any; color: string }> = {
    ROSE: { name: "Rose", icon: Flower2, color: "text-pink-400" },
    AURORA: { name: "Aurora", icon: Sparkles, color: "text-purple-400" },
    TIDES: { name: "Tides", icon: Waves, color: "text-cyan-400" },
    ZEN: { name: "Zen", icon: CircleDot, color: "text-stone-300" },
    GALAXY: { name: "Galaxy", icon: Orbit, color: "text-indigo-400" },
    INFERNO: { name: "Inferno", icon: Flame, color: "text-orange-500" },
    CRYSTAL: { name: "Crystal", icon: Gem, color: "text-emerald-400" },
    SAKURA: { name: "Sakura", icon: Cherry, color: "text-pink-300" },
    STARFALL: { name: "Starfall", icon: Star, color: "text-yellow-300" },
    LOTUS: { name: "Lotus", icon: Flower, color: "text-amber-200" },
};

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
    min = 1,
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
    // --- State ---
    const [phase, setPhase] = useState<Phase>("IDLE");
    const [durationMinutes, setDurationMinutes] = useState(15);
    const [timeLeft, setTimeLeft] = useState(0);
    const [breathPhase, setBreathPhase] = useState<BreathPhase>("INHALE");
    const [countdown, setCountdown] = useState(3);
    const [selectedTheme, setSelectedTheme] = useState<Theme>(() => {
        // Load saved theme from localStorage
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("practiceTheme") as Theme | null;
            if (saved && THEMES[saved]) return saved;
        }
        return "ROSE";
    });
    const { triggerLight, triggerMedium, triggerHeavy, triggerSuccess } = useHaptics();

    // --- Heart Rate ---
    const {
        currentBPM,
        heartRateHistory,
        isMonitoring,
        isAuthorized,
        requestPermission,
        startMonitoring,
        stopMonitoring,
    } = useHeartRate();

    // --- 完成提示音 ---
    const playCompletionSound = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const masterGain = audioCtx.createGain();
            masterGain.connect(audioCtx.destination);
            masterGain.gain.value = 0.3;

            // 愉悦的大三和弦 C-E-G + 上行琶音
            const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
            const delays = [0, 0.08, 0.16, 0.24];

            frequencies.forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();

                osc.type = 'sine';
                osc.frequency.value = freq;
                osc.connect(gain);
                gain.connect(masterGain);

                const startTime = audioCtx.currentTime + delays[i];
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);

                osc.start(startTime);
                osc.stop(startTime + 0.85);
            });

            // 清理
            setTimeout(() => audioCtx.close(), 2000);
        } catch (e) {
            console.warn('[Sound] Completion sound failed:', e);
        }
    };

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
        theme: "ROSE" as Theme, // Sync theme

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

    // --- Theme Renderers ---

    const renderRose = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        state.particles.forEach((p: any, i: number) => {
            // Update Diffuse
            p.diffuseX += p.dx;
            p.diffuseY += p.dy;

            // Update Structured (Orbit)
            p.angle += p.speed;

            // Bloom Logic Overrides
            let effectiveDist = p.dist * breathScale;
            let effectiveAngle = p.angle;
            let effectiveHue = state.hue;
            let effectiveAlpha = 0.5 + Math.sin(timestamp * 0.002 + i) * 0.3;

            if (bloomProgress > 0) {
                const expansion = (width * 0.6) * bloomProgress;
                effectiveAngle += bloomProgress * Math.PI * 0.5;
                const petalFactor = Math.sin(effectiveAngle * 5 + i * 0.1) * (50 * bloomProgress);
                effectiveDist += expansion + petalFactor;

                const isPink = i % 3 !== 0;
                const targetHue = isPink ? 335 : 45;
                effectiveHue = state.hue + (targetHue - state.hue) * bloomProgress;
                effectiveAlpha = 0.6 + bloomProgress * 0.4;
            } else {
                effectiveDist += Math.sin(timestamp * 0.005 + p.wobble) * 5;
            }

            const orbitX = Math.cos(effectiveAngle) * effectiveDist;
            const orbitY = Math.sin(effectiveAngle) * effectiveDist;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.6;

            ctx.fillStyle = `hsla(${effectiveHue}, 80%, 70%, ${effectiveAlpha})`;
            ctx.beginPath();
            ctx.arc(finalX, finalY, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderAurora = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Aurora colors: Purple, Cyan, Green
        const baseHues = [280, 180, 120];

        state.particles.forEach((p: any, i: number) => {
            // Initial: Horizontal magnetic drift (bands)
            if (transitionProgress < 1) {
                p.diffuseX += p.dx + Math.sin(timestamp * 0.002 + p.dy) * 0.5; // Wavy horizontal
                p.diffuseY += p.dy * 0.1; // Slow vertical
            } else {
                p.diffuseX += p.dx * 0.5;
                p.diffuseY += p.dy * 0.3;
            }
            p.angle += p.speed * 0.3;

            // Aurora forms vertical bands that wave horizontally
            const waveOffset = Math.sin(timestamp * 0.001 + p.angle * 2) * 50 * breathScale;
            const curtainY = Math.sin(p.angle * 4 + timestamp * 0.002) * 30;

            let effectiveDist = (p.dist * 0.5 + 80) * breathScale;
            let effectiveAlpha = 0.4 + Math.sin(timestamp * 0.003 + i * 0.5) * 0.3;

            // Bloom: Flare up and dissolve (Magnetic Storm End)
            let yOffset = 0;
            let bloomScale = 1;
            if (bloomProgress > 0) {
                // Rise faster + intensify brightness then fade
                yOffset = -bloomProgress * height * 0.8;
                effectiveAlpha = (effectiveAlpha + 0.5) * (1 - bloomProgress); // Flash then fade
                bloomScale = 1 + bloomProgress * 2; // Stretch vertically
                effectiveDist *= (1 - bloomProgress * 0.5); // Narrow into beam
            }

            const orbitX = Math.cos(p.angle) * effectiveDist + waveOffset;
            const orbitY = (Math.sin(p.angle) * effectiveDist * 0.6 + curtainY) * bloomScale;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress + yOffset;

            if (transitionProgress < 1) effectiveAlpha *= 0.5;

            // Cycle through aurora colors
            const hueIndex = i % 3;
            const hue = baseHues[hueIndex] + Math.sin(timestamp * 0.001 + i * 0.1) * 20;

            ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${effectiveAlpha})`;
            ctx.beginPath();
            ctx.arc(finalX, finalY, p.size * 1.2, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderZen = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Zen: Minimalist concentric rings
        state.particles.forEach((p: any, i: number) => {
            // Initial: Perfect circular orbits even in idle
            if (transitionProgress < 1) {
                p.diffuseX = centerX + Math.cos(timestamp * 0.0005 + i) * (p.dist + 50);
                p.diffuseY = centerY + Math.sin(timestamp * 0.0005 + i) * (p.dist + 50);
            } else {
                p.diffuseX += p.dx * 0.2;
                p.diffuseY += p.dy * 0.2;
            }
            p.angle += p.speed * 0.15;

            // Concentric rings logic
            const ringIndex = Math.floor(p.dist / 30);
            const ringDist = (ringIndex * 40 + 60) * breathScale;

            let effectiveAlpha = 0.3 + (ringIndex % 2) * 0.2;

            const ripple = Math.sin(timestamp * 0.002 - ringIndex * 0.5) * 5;

            // Bloom: "Enso" Void - Expand slowly and fade to transparency (Return to Nothingness)
            let expansionOffset = 0;
            if (bloomProgress > 0) {
                expansionOffset = bloomProgress * width * 0.2; // Slow expansion
                // Fade out from center first
                const fadeThreshold = bloomProgress * 10;
                if (ringIndex < fadeThreshold) effectiveAlpha *= (1 - bloomProgress);
            }

            const effectiveDist = ringDist + ripple + expansionOffset;
            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.3;

            // Zen colors
            const hue = 45 + ringIndex * 5;
            const lightness = 85 - ringIndex * 3;

            ctx.fillStyle = `hsla(${hue}, 15%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            ctx.arc(finalX, finalY, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderGalaxy = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Galaxy: Deep space colors with spiral arms
        state.particles.forEach((p: any, i: number) => {
            // Initial: Slow gravitational pull (inward spiral)
            if (transitionProgress < 1) {
                const angle = timestamp * 0.0002 + i * 0.01;
                const radius = p.dist + Math.sin(timestamp * 0.001 + i) * 20;
                p.diffuseX = centerX + Math.cos(angle) * radius;
                p.diffuseY = centerY + Math.sin(angle) * radius;
            } else {
                p.diffuseX += p.dx * 0.3;
                p.diffuseY += p.dy * 0.3;
            }

            // Spiral rotation
            const spiralFactor = p.dist * 0.01;
            // Bloom: Rapid spin acceleration
            const spinAccel = bloomProgress > 0 ? bloomProgress * 0.5 : 0;
            p.angle += p.speed * 0.4 + spiralFactor * 0.001 + spinAccel;

            // Spiral arm effect
            const armPhase = (p.angle * 2 + p.dist * 0.02 + timestamp * 0.0005) % (Math.PI * 2);
            const armIntensity = (Math.sin(armPhase) + 1) * 0.5;

            let effectiveDist = p.dist * breathScale * (0.8 + armIntensity * 0.4);
            let effectiveAlpha = 0.2 + armIntensity * 0.6;

            // Bloom: Centrifugal Ejection - particles fly outward tangentially
            if (bloomProgress > 0) {
                // Fly out based on current angle
                effectiveDist += Math.pow(bloomProgress, 2) * 800; // Exponential flyout
                effectiveAlpha *= (1 - bloomProgress * 0.5); // Fade slower
            }

            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist * 0.6;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.5;

            // Galaxy colors
            const baseHue = 260 + Math.sin(p.angle) * 30;
            const isStarCore = i % 20 === 0;
            const lightness = isStarCore ? 90 + Math.random() * 10 : 50 + armIntensity * 20;

            ctx.fillStyle = `hsla(${baseHue}, ${isStarCore ? 20 : 70}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            ctx.arc(finalX, finalY, isStarCore ? p.size * 2 : p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderInferno = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Inferno: Flames rising upward
        state.particles.forEach((p: any, i: number) => {
            // Initial: Embers rising loosely
            if (transitionProgress < 1) {
                p.diffuseX += Math.sin(timestamp * 0.01 + i) * 1;
                p.diffuseY -= 1 + Math.random(); // Fast rise
                if (p.diffuseY < 0) p.diffuseY = height; // Loop for idle effect
            } else {
                p.diffuseX += p.dx + Math.sin(timestamp * 0.01 + i) * 0.5;
                p.diffuseY += p.dy - 0.5;
            }
            p.angle += p.speed * 0.5;

            const flickerSpeed = 0.008;
            const flicker = Math.sin(timestamp * flickerSpeed + p.angle * 3 + i * 0.1) * 15;

            let effectiveDist = p.dist * breathScale + flicker;
            let effectiveAlpha = 0.4 + Math.sin(timestamp * 0.005 + i) * 0.3;

            const riseOffset = Math.sin(p.angle) * 30 * breathScale;

            // Bloom: Burnt to Ash - Turn grey/black and float away rapidly
            let ashY = 0;
            let ashColor = false;
            if (bloomProgress > 0) {
                effectiveDist += bloomProgress * width * 0.2; // Minor expansion
                ashY = -bloomProgress * height * 0.8; // Fly up
                ashColor = true;
                effectiveAlpha *= (1 - bloomProgress * 0.3); // Fade slowly
            }

            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist - riseOffset + ashY;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.5;

            // Color Logic
            let hue = 0;
            let saturation = 100;
            let lightness = 50;

            if (ashColor) {
                // Transition from Fire to Ash Grey
                const distRatio = p.dist / 150;
                const fireHue = 0 + distRatio * 45;
                hue = fireHue; // Keep hue but desaturate
                saturation = 100 * (1 - bloomProgress); // 100 -> 0
                lightness = 50 + bloomProgress * 20; // 50 -> 70 (Grey smoke)
            } else {
                const distRatio = p.dist / 150;
                hue = 0 + distRatio * 45;
                lightness = 50 + distRatio * 20;
            }

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            ctx.arc(finalX, finalY, p.size * (1 + (p.dist / 150) * 0.5), 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderCrystal = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Crystal: Rainbow prism effect
        state.particles.forEach((p: any, i: number) => {
            // Initial: Jittery refraction noise (nervous energy before forming)
            if (transitionProgress < 1) {
                p.diffuseX += (Math.random() - 0.5) * 2;
                p.diffuseY += (Math.random() - 0.5) * 2;
            } else {
                p.diffuseX += p.dx * 0.2;
                p.diffuseY += p.dy * 0.2;
            }
            p.angle += p.speed * 0.2;

            // Crystal facets
            const facetAngle = Math.floor(p.angle / (Math.PI / 3)) * (Math.PI / 3);
            const shimmer = Math.sin(timestamp * 0.003 + i * 0.5) * 10;

            let effectiveDist = p.dist * breathScale + shimmer;
            let effectiveAlpha = 0.3 + Math.abs(Math.sin(timestamp * 0.002 + p.angle * 2)) * 0.5;

            // Bloom: Shatter - high velocity linear expansion
            let shatterX = 0;
            let shatterY = 0;
            if (bloomProgress > 0) {
                const shatterSpeed = 800 * bloomProgress; // Fast!
                shatterX = Math.cos(p.angle) * shatterSpeed;
                shatterY = Math.sin(p.angle) * shatterSpeed;

                // Spin while shattering
                p.angle += bloomProgress * 0.2;
                effectiveAlpha *= (1 - bloomProgress * 0.5);
            }

            const orbitX = Math.cos(p.angle) * effectiveDist + shatterX;
            const orbitY = Math.sin(p.angle) * effectiveDist * 0.5 + shatterY; // Flattened hexagon

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.4;

            // Rainbow prism colors
            const hue = (p.angle * 180 / Math.PI + timestamp * 0.05) % 360;
            const saturation = 80 + Math.sin(timestamp * 0.002 + i) * 15;

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, 70%, ${effectiveAlpha})`;
            ctx.beginPath();
            ctx.arc(finalX, finalY, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderSakura = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Sakura: Cherry blossoms drifting
        state.particles.forEach((p: any, i: number) => {
            // Initial: Falling petals even in idle
            if (transitionProgress < 1) {
                p.diffuseX += Math.sin(timestamp * 0.002 + i) * 0.5; // Sway
                p.diffuseY += 0.5; // Fall
                if (p.diffuseY > height) p.diffuseY = 0; // Loop
            } else {
                p.diffuseX += p.dx + Math.sin(timestamp * 0.002 + i * 0.5) * 0.3;
                p.diffuseY += p.dy + 0.3;
            }
            p.angle += p.speed * 0.1;

            const sway = Math.sin(timestamp * 0.003 + p.angle * 2) * 30 * breathScale;
            const flutter = Math.cos(timestamp * 0.005 + i) * 10;

            let effectiveDist = p.dist * breathScale * 0.8 + sway;
            let effectiveAlpha = 0.4 + Math.sin(timestamp * 0.002 + i * 0.3) * 0.3;

            // Bloom: Wind Gust - Blow away to top-right
            let windX = 0;
            let windY = 0;
            if (bloomProgress > 0) {
                const windSpeed = bloomProgress * 600;
                windX = windSpeed;
                windY = -windSpeed * 0.5;
                effectiveAlpha *= (1 - bloomProgress * 0.6);
                p.angle += 0.1; // Rotate faster in wind
            }

            const orbitX = Math.cos(p.angle) * effectiveDist + flutter + windX;
            const orbitY = Math.sin(p.angle) * effectiveDist * 0.7 + windY;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.5;

            // Sakura colors
            const hue = 340 + Math.sin(i * 0.1) * 15;
            const lightness = 80 + Math.sin(timestamp * 0.002 + i) * 10;

            ctx.fillStyle = `hsla(${hue}, 60%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            ctx.arc(finalX, finalY, p.size * 1.3, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderStarfall = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Starfall: Shooting stars
        state.particles.forEach((p: any, i: number) => {
            // Initial: Slowly drifting stars (Night sky)
            if (transitionProgress < 1) {
                p.diffuseX += p.dx * 0.1; // Very slow
                p.diffuseY += p.dy * 0.1;
                // Occasional shooting star in background?
            } else {
                const speed = 0.5 + (i % 10) * 0.1;
                p.diffuseX += p.dx * speed;
                p.diffuseY += p.dy * speed + 0.2;
            }
            p.angle += p.speed * 0.6;

            const streakLength = 15 + Math.sin(timestamp * 0.01 + i) * 5;

            let effectiveDist = p.dist * breathScale;
            let effectiveAlpha = 0.3 + Math.random() * 0.4;

            // Bloom: Supernova - Massive expansion and blinding white flash
            if (bloomProgress > 0) {
                effectiveDist += bloomProgress * width; // Rapid expansion
                // Flash white at start of bloom
                effectiveAlpha = (1 - bloomProgress) * 1.0;
            }

            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.4;

            // Star colors
            const hue = 45 + Math.sin(i * 0.2) * 15;
            let lightness = 70 + Math.sin(timestamp * 0.003 + i) * 20;
            const isMainStar = i % 15 === 0;

            // Supernova whiteness
            if (bloomProgress > 0) {
                lightness = 100 - (bloomProgress * 20); // Start white, fade slightly
            }

            ctx.fillStyle = `hsla(${hue}, ${bloomProgress > 0 ? 0 : 80}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();

            if (isMainStar && transitionProgress > 0.5 && bloomProgress === 0) {
                const trailX = finalX - Math.cos(p.angle) * streakLength;
                const trailY = finalY - Math.sin(p.angle) * streakLength;
                ctx.moveTo(trailX, trailY);
                ctx.lineTo(finalX, finalY);
                ctx.strokeStyle = `hsla(${hue}, 80%, ${lightness}%, ${effectiveAlpha * 0.5})`;
                ctx.lineWidth = p.size;
                ctx.stroke();
            }

            ctx.arc(finalX, finalY, isMainStar ? p.size * 2 : p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderLotus = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Lotus: Peaceful multi-layered petals
        state.particles.forEach((p: any, i: number) => {
            // Initial: Bobbing on water (vertical sine wave)
            if (transitionProgress < 1) {
                p.diffuseX += p.dx * 0.1;
                p.diffuseY = centerY + Math.sin(timestamp * 0.002 + p.diffuseX * 0.01) * 10;
            } else {
                p.diffuseX += p.dx * 0.1;
                p.diffuseY += p.dy * 0.1;
            }
            p.angle += p.speed * 0.08;

            const layer = Math.floor(p.dist / 40);

            const openAmount = breathScale * (1 + layer * 0.3);
            let effectiveDist = (layer * 45 + 50) * openAmount;

            const float = Math.sin(timestamp * 0.001 + layer) * 3;
            effectiveDist += float;

            let effectiveAlpha = 0.4 + (1 - layer * 0.1);

            // Bloom: Ascension - Petals glow and float UPwards like lanterns
            let ascendY = 0;
            if (bloomProgress > 0) {
                ascendY = -bloomProgress * height * 0.6; // Float up
                effectiveDist += bloomProgress * 20; // Slight expansion
                effectiveAlpha *= (1 - bloomProgress * 0.5);
            }

            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist * 0.9 + ascendY;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.4;

            // Lotus colors
            const hue = 40 + layer * 5;
            const saturation = 20 + layer * 10;
            let lightness = 90 - layer * 5;

            // Bloom glow
            if (bloomProgress > 0) lightness = Math.min(100, lightness + bloomProgress * 20);

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            ctx.arc(finalX, finalY, p.size * (1 + layer * 0.2), 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderTides = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const oceanHue = 190; // Cyan/Teal

        state.particles.forEach((p: any, i: number) => {
            // Initial: Rocking boat motion
            if (transitionProgress < 1) {
                p.diffuseX += Math.sin(timestamp * 0.001) * 0.5;
                p.diffuseY += Math.cos(timestamp * 0.001) * 0.5;
            } else {
                p.diffuseX += p.dx * 2;
                p.diffuseY += p.dy;
            }

            // Tides Logic: Wavy dual rings
            const wave1 = Math.sin(p.angle * 3 + timestamp * 0.002) * 20;
            const wave2 = Math.cos(p.angle * 5 - timestamp * 0.003) * 15;

            let effectiveDist = p.dist * breathScale + wave1 + wave2;
            let effectiveAlpha = 0.5 + Math.sin(timestamp * 0.003 + i) * 0.3;

            // Bloom: Tsunami Crash - Surge forward (down-right) then foam dissipates
            let surgeX = 0;
            let surgeY = 0;
            if (bloomProgress > 0) {
                const surgeAmount = bloomProgress * 200;
                surgeX = surgeAmount;
                surgeY = surgeAmount * 0.5;
                effectiveDist += bloomProgress * 100;
                effectiveAlpha *= (1 - bloomProgress); // Foam fades
            }

            const orbitX = Math.cos(p.angle) * effectiveDist + surgeX;
            const orbitY = Math.sin(p.angle) * effectiveDist + surgeY;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.5;

            // Color shift to white foam on bloom
            let saturation = 70;
            let lightness = 60;
            if (bloomProgress > 0) {
                saturation *= (1 - bloomProgress);
                lightness = 60 + bloomProgress * 40; // Turn white
            }

            ctx.fillStyle = `hsla(${oceanHue + Math.sin(i) * 20}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            ctx.arc(finalX, finalY, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const updateParticles = (timestamp: number, width: number, height: number, ctx: CanvasRenderingContext2D) => {
        const state = animState.current;
        const widthHalf = width / 2;
        const heightHalf = height / 2;

        // --- 1. Transition Logic ---
        const now = Date.now();
        let transitionProgress = 0;
        let bloomProgress = 0;

        if (state.phase === "TRANSITION_TO_PRACTICE") {
            const elapsed = now - state.transitionStartTime;
            transitionProgress = Math.min(elapsed / state.transitionDuration, 1);
            transitionProgress = easeInOutCubic(transitionProgress);
        } else if (state.phase === "PRACTICING" || state.phase === "COUNTDOWN") {
            transitionProgress = 1;
        } else if (state.phase === "COMPLETED") {
            transitionProgress = 1;
            const elapsed = now - (state.completionStartTime || now);
            bloomProgress = Math.min(elapsed / 3000, 1);
            if (state.theme === "ROSE") bloomProgress = 1 - Math.pow(1 - bloomProgress, 3);
            else bloomProgress = elapsed / 3000; // Linear for others or custom
        }

        // --- 2. Breath Logic ---
        let breathScale = 1;
        if (state.phase === "PRACTICING" || state.phase === "COMPLETED") {
            const elapsed = now - state.phaseStartTime;
            if (state.phase === "PRACTICING") {
                const breathProg = Math.min(elapsed / state.phaseDuration, 1);
                const smoothedBreath = easeInOutCubic(breathProg);

                if (state.breathPhase === "INHALE") {
                    state.currentRadius = BASE_RADIUS + (EXPAND_RADIUS - BASE_RADIUS) * smoothedBreath;
                    state.hue = 200 + (20 * smoothedBreath);
                } else if (state.breathPhase === "HOLD") {
                    state.currentRadius = EXPAND_RADIUS + Math.sin(timestamp * 0.003) * 5;
                    state.hue = 220;
                } else if (state.breathPhase === "EXHALE") {
                    state.currentRadius = EXPAND_RADIUS - (EXPAND_RADIUS - BASE_RADIUS) * smoothedBreath;
                    state.hue = 220 - (20 * smoothedBreath);
                }
            }
            breathScale = state.currentRadius / BASE_RADIUS;
        } else {
            state.currentRadius = BASE_RADIUS + Math.sin(timestamp * 0.001) * 10;
            breathScale = state.currentRadius / BASE_RADIUS;
        }

        // --- 3. Draw & Dispatch ---
        // Clear with Fade
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        ctx.fillRect(0, 0, width, height);

        if (state.theme === "AURORA") {
            renderAurora(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "TIDES") {
            renderTides(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "ZEN") {
            renderZen(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "GALAXY") {
            renderGalaxy(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "INFERNO") {
            renderInferno(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "CRYSTAL") {
            renderCrystal(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "SAKURA") {
            renderSakura(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "STARFALL") {
            renderStarfall(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "LOTUS") {
            renderLotus(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else {
            renderRose(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale); // Default
        }
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

    // --- Save Theme Preference ---
    useEffect(() => {
        localStorage.setItem("practiceTheme", selectedTheme);
    }, [selectedTheme]);

    // --- Logic ---
    const clearHapticTimers = () => {
        hapticTimers.current.forEach(t => clearTimeout(t));
        hapticTimers.current = [];
    };

    const playHapticPattern = (phaseType: BreathPhase) => {
        clearHapticTimers();

        if (phaseType === "INHALE") {
            // 🌬️ 连续感：70次震动，每57ms一次，从轻到重
            // Light×23 → Medium×23 → Heavy×24
            for (let i = 0; i < 70; i++) {
                const delay = i * 57; // 0, 57, 114, ... 3933
                let trigger: () => void;
                if (i < 23) {
                    trigger = triggerLight;
                } else if (i < 46) {
                    trigger = triggerMedium;
                } else {
                    trigger = triggerHeavy;
                }
                hapticTimers.current.push(setTimeout(trigger, delay));
            }
        } else if (phaseType === "HOLD") {
            // 💓 心跳感：双击节奏 (thump-thump... thump-thump...)
            // 每对心跳间隔约2秒
            const heartbeat = (delay: number) => {
                hapticTimers.current.push(
                    setTimeout(triggerMedium, delay),
                    setTimeout(triggerLight, delay + 150),
                );
            };
            heartbeat(0);
            heartbeat(2000);
            heartbeat(4000);
            heartbeat(6000);
        } else if (phaseType === "EXHALE") {
            // 🍃 连续释放感：32次震动，每250ms一次，从重到轻
            // Heavy×11 → Medium×11 → Light×10
            for (let i = 0; i < 32; i++) {
                const delay = i * 250; // 0, 250, 500, ... 7750
                let trigger: () => void;
                if (i < 11) {
                    trigger = triggerHeavy;
                } else if (i < 22) {
                    trigger = triggerMedium;
                } else {
                    trigger = triggerLight;
                }
                hapticTimers.current.push(setTimeout(trigger, delay));
            }
        }
    };

    // --- Keep Awake ---
    useEffect(() => {
        const isPracticing = phase === "PRACTICING" || phase === "TRANSITION_TO_PRACTICE" || phase === "COUNTDOWN";

        if (isPracticing) {
            KeepAwake.keepAwake().catch(console.error);
        } else {
            KeepAwake.allowSleep().catch(console.error);
        }

        return () => {
            KeepAwake.allowSleep().catch(console.error);
        };
    }, [phase]);

    useEffect(() => {
        // Sync Ref for Animation Loop
        animState.current.phase = phase;
        animState.current.breathPhase = breathPhase;
        animState.current.theme = selectedTheme; // Update theme in ref

        animState.current.phaseStartTime = Date.now();
        if (breathPhase === "INHALE") animState.current.phaseDuration = BREATH_CYCLE.INHALE;
        if (breathPhase === "HOLD") animState.current.phaseDuration = BREATH_CYCLE.HOLD;
        if (breathPhase === "EXHALE") animState.current.phaseDuration = BREATH_CYCLE.EXHALE;

        // Haptics Trigger
        if (phase === "PRACTICING") {
            playHapticPattern(breathPhase);
        }
    }, [breathPhase, phase, selectedTheme]); // Added selectedTheme

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

    const startPractice = async () => {
        setPhase("PRACTICING");
        setBreathPhase("INHALE");

        // Start Heart Rate Monitoring (if authorized)
        if (!isAuthorized) {
            const granted = await requestPermission();
            if (granted) startMonitoring();
        } else {
            startMonitoring();
        }

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

        // Stop Heart Rate Monitoring
        stopMonitoring();

        // 先清理呼吸相关的定时器
        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
        clearHapticTimers();

        // 🎊 完成反馈：震动 + 提示音（使用 window.setTimeout 独立于组件生命周期）
        console.log('[Practice] 🎊 Triggering completion feedback...');
        triggerHeavy();
        window.setTimeout(() => {
            console.log('[Practice] Heavy 2');
            triggerHeavy();
        }, 150);
        window.setTimeout(() => {
            console.log('[Practice] Heavy 3');
            triggerHeavy();
        }, 300);
        window.setTimeout(() => {
            console.log('[Practice] Success + Sound');
            triggerSuccess();
            playCompletionSound();
        }, 500);
    };

    const cleanup = () => {
        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
        clearHapticTimers();
    };

    const handleExit = () => {
        cleanup();
        if (phase === "IDLE") {
            // If already in IDLE, go back to home
            router.back();
        } else {
            // Otherwise, return to IDLE state (not home)
            setPhase("IDLE");
            setBreathPhase("INHALE");
            setCountdown(3);
        }
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
                    </AnimatePresence>
                </div>

                {/* Heart Rate Indicator - Top Right */}
                {phase === "PRACTICING" && (
                    <HeartRateIndicator
                        currentBPM={currentBPM}
                        isMonitoring={isMonitoring}
                        error={error}
                    />
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

                                {/* Theme Selector - Scrollable */}
                                <div className="w-full overflow-x-auto scrollbar-hide py-4 -mx-4 px-4">
                                    <div className="flex gap-3 w-max snap-x snap-mandatory">
                                        {(Object.keys(THEMES) as Theme[]).map((themeKey) => {
                                            const theme = THEMES[themeKey];
                                            const isSelected = selectedTheme === themeKey;
                                            const Icon = theme.icon;

                                            return (
                                                <button
                                                    key={themeKey}
                                                    onClick={() => {
                                                        setSelectedTheme(themeKey);
                                                        triggerLight();
                                                    }}
                                                    className={`
                                                        snap-center flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all min-w-[70px]
                                                        ${isSelected ? "bg-white/15 scale-105 border-white/30" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"}
                                                        border ${isSelected ? "border-white/30" : "border-transparent"}
                                                    `}
                                                >
                                                    <div className={`p-1.5 rounded-full ${isSelected ? theme.color : "text-current"}`}>
                                                        <Icon size={22} />
                                                    </div>
                                                    <span className="text-[9px] font-medium tracking-wider uppercase whitespace-nowrap">
                                                        {theme.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

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
            </div >

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
