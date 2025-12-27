"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, RefreshCw, CheckCircle2, Sparkles, Waves, Flower2, CircleDot, Flame, Gem, Orbit, Cherry, Star, Flower, Globe, Wind } from "lucide-react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useHeartRate } from "@/lib/hooks/useHeartRate";
import HeartRateIndicator from "@/components/HeartRateGraph";
import PracticeCompletionView from "@/components/PracticeCompletionView";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { getApiUrl } from "@/lib/config";
import { useBinauralBeats, BINAURAL_PRESETS } from "@/lib/hooks/useBinauralBeats";
import { useLocalNotifications } from "@/lib/hooks/useLocalNotifications";
import { unlockAudio, playCompletionSound } from "@/lib/audioUnlock";

// --- Types ---
type Phase = "IDLE" | "TRANSITION_TO_PRACTICE" | "PRACTICING" | "COMPLETED" | "SUMMARY";
type BreathPhase = "INHALE" | "HOLD" | "EXHALE";
type Theme = "SPHERE" | "LIQUID" | "ROSE" | "AURORA" | "ZEN" | "GALAXY" | "INFERNO" | "CRYSTAL" | "SAKURA" | "STARFALL" | "LOTUS" | "PRISM";
type BreathingPatternId = "478" | "box" | "focus" | "sigh" | "energy";

interface BreathingPattern {
    id: BreathingPatternId;
    name: string;
    description: string;
    inhale: number; // seconds
    hold: number;   // seconds (0 = skip hold phase)
    exhale: number; // seconds
}

const BREATHING_PATTERNS: BreathingPattern[] = [
    { id: "478", name: "4-7-8 放松", description: "经典深度放松", inhale: 4, hold: 7, exhale: 8 },
    { id: "box", name: "方形呼吸", description: "平衡与专注", inhale: 4, hold: 4, exhale: 4 },
    { id: "focus", name: "专注呼吸", description: "无屏息，简单有效", inhale: 5, hold: 0, exhale: 5 },
    { id: "sigh", name: "生理叹息", description: "模拟自然叹息", inhale: 4, hold: 0, exhale: 8 },
    { id: "energy", name: "能量呼吸", description: "快节奏提神", inhale: 2, hold: 2, exhale: 2 },
];

// --- Theme Config ---
const THEMES: Record<Theme, { name: string; icon: any; color: string }> = {
    SPHERE: { name: "Sphere", icon: Globe, color: "text-blue-400" },
    LIQUID: { name: "Liquid", icon: Gem, color: "text-slate-200" },
    ROSE: { name: "Rose", icon: Flower2, color: "text-pink-400" },
    AURORA: { name: "Aurora", icon: Sparkles, color: "text-purple-400" },
    ZEN: { name: "Zen", icon: CircleDot, color: "text-stone-300" },
    GALAXY: { name: "Galaxy", icon: Orbit, color: "text-indigo-400" },
    INFERNO: { name: "Inferno", icon: Flame, color: "text-orange-500" },
    CRYSTAL: { name: "Crystal", icon: Gem, color: "text-emerald-400" },
    SAKURA: { name: "Sakura", icon: Cherry, color: "text-pink-300" },
    STARFALL: { name: "Starfall", icon: Star, color: "text-yellow-300" },
    LOTUS: { name: "Lotus", icon: Flower, color: "text-amber-200" },
    PRISM: { name: "Prism", icon: Gem, color: "text-cyan-300" },
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
const RulerTimeSelector = React.memo(({
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
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const { triggerLight } = useHaptics();

    // Local state for immediate UI feedback without waiting for parent
    const [localValue, setLocalValue] = useState(value);

    // Sync local state if parent updates externally (unlikely during scroll, but good practice)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Generate ticks: each minute is a tick.
    const TICK_WIDTH = 24;

    useEffect(() => {
        if (scrollRef.current) {
            // Initial scroll position alignment
            // value 5 -> index 0. value = min + index.
            const index = value - min;
            scrollRef.current.scrollLeft = index * TICK_WIDTH;
        }
    }, []); // Run once on mount

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;

        // Calculate raw value
        const rawIndex = scrollLeft / TICK_WIDTH;
        const index = Math.round(rawIndex);
        let newValue = min + index;

        // Clamp
        if (newValue < min) newValue = min;
        if (newValue > max) newValue = max;

        // Immediate Visual Feedback
        if (newValue !== localValue) {
            setLocalValue(newValue);
            triggerLight();

            // Debounce the parent update to avoid expensive re-renders on every frame.
            // The local value handles the UI feedback, so we only need to sync with parent
            // when the user pauses or stops scrolling.
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
                onChange(newValue);
            }, 100); // 100ms debounce
        }
    };

    return (
        <div className="w-full relative h-24 flex flex-col items-center justify-center">
            {/* Current Value Display - Uses fast local state */}
            <div className="text-4xl font-light mb-2 text-white tabular-nums tracking-widest">
                {localValue}<span className="text-base text-white/40 ml-1">min</span>
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
                        className="flex items-end h-full"
                        style={{
                            width: 'max-content',
                            paddingLeft: 'calc(50% - 12px)', // TICK_WIDTH / 2
                            paddingRight: 'calc(50% - 12px)'
                        }}
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

                {/* Remove black gradients as requested */}
            </div>
        </div>
    );
});


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
    const [durationMinutes, setDurationMinutes] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("practiceDuration");
            if (saved) return parseInt(saved, 10);
        }
        return 15;
    });

    // Save Duration Preference
    useEffect(() => {
        localStorage.setItem("practiceDuration", durationMinutes.toString());
    }, [durationMinutes]);

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
    const [selectedPattern, setSelectedPattern] = useState<BreathingPatternId>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("breathingPattern") as BreathingPatternId | null;
            if (saved && BREATHING_PATTERNS.find(p => p.id === saved)) return saved;
        }
        return "478";
    });
    const { triggerLight, triggerMedium, triggerHeavy, triggerSuccess } = useHaptics();

    // --- Time Selector Visibility ---
    const [isSelectorVisible, setIsSelectorVisible] = useState(false); // Default hidden
    const selectorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Show on Mount (optional, user said "defaults to hidden" if no operation, but usually better to show briefly?)
    // User said: "if no operation default to hidden". Let's default to false as requested.
    // However, if default is hidden, user doesn't know it's there. 
    // Maybe show briefly on mount then hide?
    useEffect(() => {
        setIsSelectorVisible(true);
        selectorTimeoutRef.current = setTimeout(() => setIsSelectorVisible(false), 3000);
        return () => {
            if (selectorTimeoutRef.current) clearTimeout(selectorTimeoutRef.current);
        };
    }, []);

    // 计算当前呼吸模式的毫秒值
    const currentPattern = useMemo(() => {
        const pattern = BREATHING_PATTERNS.find(p => p.id === selectedPattern) || BREATHING_PATTERNS[0];
        return {
            ...pattern,
            INHALE: pattern.inhale * 1000,
            HOLD: pattern.hold * 1000,
            EXHALE: pattern.exhale * 1000,
        };
    }, [selectedPattern]);

    // --- Heart Rate ---
    const {
        currentBPM,
        heartRateHistory,
        isMonitoring,
        isAuthorized,
        error: heartRateError,
        requestPermission,
        startMonitoring,
        stopMonitoring,
    } = useHeartRate();

    // --- Session Data for Summary ---
    const [sessionHeartRates, setSessionHeartRates] = useState<number[]>([]);
    const [sessionDuration, setSessionDuration] = useState<number>(0);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // --- Binaural Beats ---
    const [binauralEnabled, setBinauralEnabled] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("binauralEnabled") === "true";
        }
        return false;
    });
    const [selectedBinaural, setSelectedBinaural] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("binauralPreset") || "alpha";
        }
        return "alpha";
    });
    const { start: startBinaural, stop: stopBinaural, isPlaying: isBinauralPlaying } = useBinauralBeats();

    // --- Local Notifications (for auto habit reminder) ---
    const { scheduleBreakReminder } = useLocalNotifications();

    // playCompletionSound 已从 @/lib/audioUnlock 导入，使用共享 AudioContext

    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hapticTimers = useRef<NodeJS.Timeout[]>([]);
    const requestRef = useRef<number>(0);
    const practiceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const practiceStartTimeRef = useRef<number>(0);
    const breathTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Animation State
    // We add 'diffuse' properties for the idle cloud state
    const animState = useRef({
        particles: [] as any[],
        hue: 200,
        textTargets: [] as { x: number, y: number }[], // NEW: Text Particle Targets
        bpmParticleStartIndex: 0, // NEW: Index where BPM particles start
        morphStartTime: 0, // NEW: When morphing begins
        dropParticleStartIndex: 0, // NEW: Index where Drop particles start
        sessionHeartRates: [] as number[], // Heart rates for curve drawing

        // Sync State (for stale closure fix)
        phase: "IDLE" as Phase,
        breathPhase: "INHALE" as BreathPhase,
        theme: "ROSE" as Theme, // Sync theme

        // Transition
        transitionStartTime: 0,
        transitionDuration: 2000,
        transitionStartTime: 0,
        transitionDuration: 2000,
        completionStartTime: 0, // NEW
        themeStartTime: 0, // NEW: For theme intro animations

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
            // --- IDLE: PHYLLOTAXIS BLOOM ---
            if (transitionProgress < 1) {
                // Sacred 3D Geometry
                const time = timestamp * 0.00005; // Extremely slow "universal" rotation

                // Phyllotaxis (Golden Angle)
                const goldenAngle = Math.PI * (3 - Math.sqrt(5));
                const r = 30 * Math.sqrt(i) * 0.5; // Radius grows with sqrt(i)
                const theta = i * goldenAngle + time * 10; // Rotating spiral

                // 3D Dome Effect
                // Map radius to a spherical dome curvature
                const maxR = 250;
                const normalizeR = Math.min(1, r / maxR);
                const z = Math.sqrt(1 - normalizeR * normalizeR) * 100; // Hemisphere height

                // Project 3D to 2D with tilt
                const tiltX = Math.cos(time) * 0.2;
                const tiltY = Math.sin(time) * 0.2;

                const x = r * Math.cos(theta);
                const y = r * Math.sin(theta);

                // Minimal 3D projection
                p.diffuseX = centerX + x * (1 + z * 0.002);
                p.diffuseY = centerY + y * (1 + z * 0.002);

                // Gentle breathing of the structure
                const breath = Math.sin(timestamp * 0.001) * 10;
                p.diffuseX += Math.cos(theta) * breath;
                p.diffuseY += Math.sin(theta) * breath;

            }

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
            p.x = finalX; p.y = finalY;
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
            // --- IDLE: MAGNETIC FLUX ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.001;
                // Vertical High Velocity Flow
                p.diffuseY -= 2 + Math.random();
                if (p.diffuseY < -50) p.diffuseY = height + 50;

                // Horizontal Magnetic Bands
                const bandIndex = i % 5;
                const bandOffset = (bandIndex - 2) * 120;
                // Sine wave tracking
                const wave = Math.sin(p.diffuseY * 0.005 + time + bandIndex) * 80;
                const targetX = centerX + bandOffset + wave;

                // Smoothly pull particles into the magnetic bands
                p.diffuseX += (targetX - p.diffuseX) * 0.1;

                // Add "Spark" jitter
                p.diffuseX += (Math.random() - 0.5) * 5;
            }

            // Structured Orbit logic
            p.angle += p.speed * 0.3;

            // Aurora forms vertical bands that wave horizontally
            const waveOffset = Math.sin(timestamp * 0.001 + p.angle * 2) * 50 * breathScale;
            const curtainY = Math.sin(p.angle * 4 + timestamp * 0.002) * 30;

            let effectiveDist = (p.dist * 0.5 + 80) * breathScale;
            let effectiveAlpha = 0.4 + Math.sin(timestamp * 0.003 + i * 0.5) * 0.3;

            // Bloom: Solar Storm - Particles accelerate into vertical light pillars (Beaming Up)
            let yOffset = 0;
            let bloomScale = 1;
            if (bloomProgress > 0) {
                // Squeeze horizontally to form beams
                const squeeze = 1 - bloomProgress * 0.95; // 1 -> 0.05
                effectiveDist *= squeeze;

                // Accelerate upwards exponentially
                yOffset = -Math.pow(bloomProgress, 3) * height * 1.5;

                // Stretch vertically
                bloomScale = 1 + bloomProgress * 10;

                // Fade to white/cyan brightness
                effectiveAlpha = 1.0 - bloomProgress * 0.2;
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
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size * 1.2, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderZen = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Zen: Minimalist concentric rings
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: 3D GYROSCOPE ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.001;
                const r = 220; // Large mechanical rings
                const group = i % 3;

                let x = 0, y = 0, z = 0;

                // Ring assignment
                if (group === 0) { // Ring X
                    const theta = p.angle + time;
                    y = r * Math.cos(theta);
                    z = r * Math.sin(theta);
                } else if (group === 1) { // Ring Y
                    const theta = p.angle + time * 1.2;
                    x = r * Math.cos(theta);
                    z = r * Math.sin(theta);
                } else { // Ring Z
                    const theta = p.angle + time * 0.8;
                    x = r * Math.cos(theta);
                    y = r * Math.sin(theta);
                }

                // Global Rotation of the mechanism
                const rotX = time * 0.2;
                const rotY = time * 0.3;

                // Rotate around X
                let y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
                let z1 = y * Math.sin(rotX) + z * Math.cos(rotX);
                y = y1; z = z1;

                // Rotate around Y
                let x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
                let z2 = x * Math.sin(rotY) + z * Math.cos(rotY);
                x = x1; z = z2;

                // Perspective project
                const scale = 350 / (350 - z);
                p.diffuseX = centerX + x * scale;
                p.diffuseY = centerY + y * scale;
            } else {
                // Active: Smooth drift
                p.diffuseX += p.dx * 0.2;
                p.diffuseY += p.dy * 0.2;
            }
            p.angle += p.speed * 0.15;

            // Concentric rings logic
            const ringIndex = Math.floor(p.dist / 30);
            let ringDist = (ringIndex * 40 + 60) * breathScale;

            let effectiveAlpha = 0.3 + (ringIndex % 2) * 0.2;

            const ripple = Math.sin(timestamp * 0.002 - ringIndex * 0.5) * 5;

            // Bloom: Singularity - All rings align and implode to the center
            if (bloomProgress > 0) {
                // Stop rippling

                // Implode Radius to 0
                const implodeFactor = 1 - Math.pow(bloomProgress, 0.5); // Fast start
                ringDist *= implodeFactor;

                // Flatten 3D tilt to 2D perfect circle as it implodes
                // We do this by overriding the final projection in the next step, 
                // but here we just reduce the distances.

                // Fade out at the very end
                if (bloomProgress > 0.8) effectiveAlpha *= (1 - (bloomProgress - 0.8) * 5);
            }

            const effectiveDist = ringDist + ripple * (1 - bloomProgress); // Reduce ripple
            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist;

            let finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            let finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            // Singularity Override
            if (bloomProgress > 0) {
                // Interpolate from 3D projected position (finalX) to 2D center (centerX)
                // Actually orbitX/Y are 2D circle coords. 
                // We want to transition from "Mechanical Gyro" (p.diffuseX) to "Perfect 2D Circle" then "Zero"
                // But p.diffuseX is frozen in idle. 
                // Let's just pull everything to center.

                finalX = centerX + (finalX - centerX) * (1 - bloomProgress * 0.5); // Pull to center
                finalY = centerY + (finalY - centerY) * (1 - bloomProgress * 0.5);

                // Also pull z-depth?
                // Just shrink.
            }

            if (transitionProgress < 1) effectiveAlpha *= 0.3;

            // Zen colors
            let hue = 45 + ringIndex * 5;
            let lightness = 85 - ringIndex * 3;

            if (bloomProgress > 0) {
                // Turn to pure white light before vanishing
                lightness = 85 + bloomProgress * 15;
                hue = 45;
            }

            ctx.fillStyle = `hsla(${hue}, 15%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderGalaxy = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Galaxy: Celestial Clockwork (Refined)
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: CELESTIAL CLOCKWORK ---
            if (transitionProgress < 1) {
                // Flattened Accretion Disk
                // Strict orbital paths, slow rotation

                const time = timestamp * 0.0001; // VERY Slow time

                // Distribution: dense center, sparse edges
                const r = 40 + Math.pow(i / state.particles.length, 0.8) * 300;

                // Keplerian Orbit Speed: slower at edges
                const orbitSpeed = 400 / (r * r + 100);
                const theta = i + time * orbitSpeed * 50;

                // Tilt the galaxy
                const tilt = 0.6; // 60 degrees tilt

                const rx = Math.cos(theta) * r;
                const ry = Math.sin(theta) * r * tilt;

                p.diffuseX = centerX + rx;
                p.diffuseY = centerY + ry;

                // Stabilize Z-depth for sorting/size (simulated)
                // Particles in "back" are smaller/dimmer
                const z = Math.sin(theta) * r * tilt;
                p.z = z;

            } else {
                p.diffuseX += p.dx * 0.3;
                p.diffuseY += p.dy * 0.3;
            }

            // Simplifed Active Spiral rotation
            const spiralFactor = p.dist * 0.01;
            const spinAccel = bloomProgress > 0 ? bloomProgress * 0.5 : 0;
            p.angle += p.speed * 0.4 + spiralFactor * 0.001 + spinAccel;

            // Spiral arm effect
            const armPhase = (p.angle * 2 + p.dist * 0.02 + timestamp * 0.0005) % (Math.PI * 2);
            const armIntensity = (Math.sin(armPhase) + 1) * 0.5;

            let effectiveDist = p.dist * breathScale * (0.8 + armIntensity * 0.4);
            let effectiveAlpha = 0.2 + armIntensity * 0.6;

            // Bloom: Warp Drive - Hyper-stretch into Z-space streaks
            if (bloomProgress > 0) {
                // Exponential Z-stretch
                const warp = Math.pow(bloomProgress, 4) * 5000;

                // Visual Warp: stretch away from center
                effectiveDist += warp;

                // Reduce alpha rapidly as they stretch to infinity
                effectiveAlpha *= (1 - bloomProgress * 0.5);
            }

            // Flatter Y for more drama during warp
            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist * (bloomProgress > 0 ? 0.1 : 0.6); // Flatten during warp

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) {
                // Custom Idle Alpha/Size based on Z-depth
                effectiveAlpha = 0.5 + Math.sin(timestamp * 0.001 + i) * 0.2;
                // Dim backside
                if ((p.z || 0) < 0) effectiveAlpha *= 0.5;
            } else {
                if (transitionProgress < 1) effectiveAlpha *= 0.5;
            }

            // Galaxy colors
            const baseHue = 240 + Math.sin(p.angle) * 40;
            const isStarCore = i % 20 === 0;
            const lightness = isStarCore ? 90 + Math.random() * 10 : 50 + armIntensity * 20;

            ctx.fillStyle = `hsla(${baseHue}, ${isStarCore ? 20 : 70}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;

            let size = isStarCore ? p.size * 2 : p.size;
            if (transitionProgress < 1) {
                // Perspective scale
                size = Math.max(0.5, p.size * (1 + (p.z || 0) * 0.002));
            }

            ctx.arc(finalX, finalY, size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderInferno = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Inferno: Flames rising upward
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: FIRE TORNADO ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.001;

                // Rising motion (Y decreases)
                const loopHeight = height + 200;
                let y = (timestamp * 0.5 + i * 2) % loopHeight;
                y = height + 100 - y; // Rise up from bottom

                // Funnel Shape (Wider at top)
                const yNorm = 1 - (y / height); // 0 (bottom) to 1 (top)
                const funnelRadius = 50 + Math.pow(yNorm, 2) * 200;

                // Fast Rotation
                const theta = i * 0.05 + time * 8;

                const x = Math.cos(theta) * funnelRadius;
                const z = Math.sin(theta) * funnelRadius; // Depth

                const scale = 400 / (400 - z * 0.5);

                p.diffuseX = centerX + x * scale;
                p.diffuseY = y;

                // Violent Shake
                p.diffuseX += (Math.random() - 0.5) * 10;
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

            // Bloom: Phoenix Ascension - Turn Blue/White and spiral up rapidly
            let ashY = 0;
            let ashColor = false;

            if (bloomProgress > 0) {
                ashColor = true; // Use blue/white palette

                // Rapid vertical ascent
                ashY = -Math.pow(bloomProgress, 2) * height * 1.5;

                // Tighten the spiral (reduce radius)
                effectiveDist *= (1 - bloomProgress * 0.8);

                // Spin faster
                const spin = bloomProgress * 15;
                // Add spin to orbit calc
                // We do this by modifying p.angle effectively in the orbit calc below? 
                // No, p.angle is read-only here. We can add offset to orbitX/Y calculation.
                p.tempAngleOffset = spin;

                effectiveAlpha *= (1 - bloomProgress * 0.2);
            } else {
                p.tempAngleOffset = 0;
            }

            const orbitX = Math.cos(p.angle + (p.tempAngleOffset || 0)) * effectiveDist;
            const orbitY = Math.sin(p.angle + (p.tempAngleOffset || 0)) * effectiveDist - riseOffset + ashY;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.5;

            // Color Logic
            let hue = 0;
            let saturation = 100;
            let lightness = 50;

            if (ashColor) {
                // Phoenix Colors: Blue -> White
                // Hue: 200 (Blue) -> 60 (Yellow/White) ? No, Blue flames are 200-240.
                const distRatio = p.dist / 150;
                hue = 200 + distRatio * 30; // 200-230
                saturation = 100;
                lightness = 50 + bloomProgress * 50; // Go to white
            } else {
                const distRatio = p.dist / 150;
                hue = 0 + distRatio * 45;
                lightness = 50 + distRatio * 20;
            }

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size * (1 + (p.dist / 150) * 0.5), 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderCrystal = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Crystal: Rainbow prism effect
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: ROTATING MONOLITH ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.0005;

                // Cube Grid Mapping
                // Map particles to a structured 3D grid
                const side = 12; // 12x12x12 = 1728
                const ix = i % side;
                const iy = Math.floor(i / side) % side;
                const iz = Math.floor(i / (side * side)) % side;

                const spacing = 35;
                const offset = (side * spacing) / 2;

                // Start centered
                let x = ix * spacing - offset;
                let y = iy * spacing - offset;
                let z = iz * spacing - offset;

                // 3D Rotation (Euler)
                const rotX = time;
                const rotY = time * 0.7;

                // Rotate X
                let y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
                let z1 = y * Math.sin(rotX) + z * Math.cos(rotX);
                y = y1; z = z1;

                // Rotate Y
                let x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
                let z2 = x * Math.sin(rotY) + z * Math.cos(rotY);
                x = x1; z = z2;

                const fov = 400;
                const scale = fov / (fov - z);

                p.diffuseX = centerX + x * scale;
                p.diffuseY = centerY + y * scale;
            } else {
                p.diffuseX += p.dx * 0.2;
                p.diffuseY += p.dy * 0.2;
            }
            p.angle += p.speed * 0.2;

            const facetAngle = Math.floor(p.angle / (Math.PI / 3)) * (Math.PI / 3);
            const shimmer = Math.sin(timestamp * 0.003 + i * 0.5) * 10;

            let effectiveDist = p.dist * breathScale + shimmer;
            let effectiveAlpha = 0.3 + Math.abs(Math.sin(timestamp * 0.002 + p.angle * 2)) * 0.5;

            // Bloom: Sublimation - Dissolve into upward floating mist
            let riseY = 0;
            let mistX = 0;
            if (bloomProgress > 0) {
                // Float Upwards
                riseY = -bloomProgress * height * 0.8;

                // Jitter X (Dissolving)
                mistX = (Math.random() - 0.5) * bloomProgress * 100;

                // Shrink Size (Sublime)
                // Note: we can't change p.size permanently, but we can fake it by alpha
                // or drawing logic. Let's rely on Alpha fade.
                effectiveAlpha *= (1 - bloomProgress);
            }

            const orbitX = Math.cos(p.angle) * effectiveDist + mistX;
            const orbitY = Math.sin(p.angle) * effectiveDist * 0.5 + riseY; // Flattened hexagon

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.4;

            // Rainbow prism colors
            const hue = (p.angle * 180 / Math.PI + timestamp * 0.05) % 360;
            const saturation = 80 + Math.sin(timestamp * 0.002 + i) * 15;

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, 70%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderSakura = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Sakura: Cherry blossoms drifting
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: WIND RIVER ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.001;

                // Flow Field: Smooth, laminar flow
                // Particles move from left to right with sine wave modulated Y

                // Reset to left if off screen
                if (p.diffuseX > width + 50) {
                    p.diffuseX = -50;
                    p.diffuseY = height * Math.random();
                }

                // Laminar Speed based on Y (faster in middle)
                const flowSpeed = 1.0 + Math.sin(p.diffuseY / height * Math.PI) * 1.5;
                p.diffuseX += flowSpeed;

                // Gentle Waviness (River path)
                const riverCurve = Math.sin(p.diffuseX * 0.002 + time * 0.5) * 0.5;
                p.diffuseY += riverCurve;

                // Micro-turbulence (Flutter)
                p.diffuseX += Math.sin(time * 5 + i) * 0.2;
                p.diffuseY += Math.cos(time * 3 + i) * 0.2;

            } else {
                p.diffuseX += p.dx + Math.sin(timestamp * 0.002 + i * 0.5) * 0.3;
                p.diffuseY += p.dy + 0.3;
            }
            p.angle += p.speed * 0.1;

            const sway = Math.sin(timestamp * 0.003 + p.angle * 2) * 30 * breathScale;
            const flutter = Math.cos(timestamp * 0.005 + i) * 10;

            let effectiveDist = p.dist * breathScale * 0.8 + sway;
            let effectiveAlpha = 0.4 + Math.sin(timestamp * 0.002 + i * 0.3) * 0.3;

            // Bloom: Petal Spiral - Double Helix Ascension
            let spiralX = 0;
            let spiralY = 0;
            if (bloomProgress > 0) {
                // Rising Spiral
                const rise = bloomProgress * height;
                spiralY = -rise;

                // Spiral Radius expansion
                const spiralRadius = bloomProgress * 200;
                spiralX = Math.cos(rise * 0.05 + i) * spiralRadius;

                effectiveAlpha *= (1 - bloomProgress * 0.5);
            }

            const orbitX = Math.cos(p.angle) * effectiveDist + flutter + spiralX;
            const orbitY = Math.sin(p.angle) * effectiveDist * 0.7 + spiralY;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.6;

            // Sakura colors
            // More pastel, less neon
            const hue = 340 + Math.sin(i * 0.1) * 10;
            const lightness = 85 + Math.sin(timestamp * 0.002 + i) * 10;
            const saturation = 50 + Math.random() * 20;

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;

            // Soft petals
            ctx.arc(finalX, finalY, p.size * 1.2, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderStarfall = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Starfall: Shooting stars
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: STAR TRAILS ---
            if (transitionProgress < 1) {
                // Circular Long-Exposure
                const time = timestamp * 0.0001;

                // Dist: Distance from Celestial Pole (Offset center)
                // Pole is at top-left
                const cx = width * 0.3;
                const cy = height * 0.3;

                // Use i to define stable radius/angle
                const r = 200 + (i % 100) * 10;
                const startAngle = i * 0.1;

                // Very slow rotation
                const currentAngle = startAngle - time;

                p.diffuseX = cx + Math.cos(currentAngle) * r;
                p.diffuseY = cy + Math.sin(currentAngle) * r;

                // Trails logic is handled in draw phase
            } else {
                const speed = 0.5 + (i % 10) * 0.1;
                p.diffuseX += p.dx * speed;
                p.diffuseY += p.dy * speed + 0.2;
            }
            p.angle += p.speed * 0.6;

            const streakLength = 15 + Math.sin(timestamp * 0.01 + i) * 5;

            let effectiveDist = p.dist * breathScale;
            let effectiveAlpha = 0.3 + Math.random() * 0.4;

            // Bloom: Falling Up - Gravity reversal, stars ascend rapidly
            if (bloomProgress > 0) {
                // Inverse gravity acceleration
                const lift = Math.pow(bloomProgress, 2) * height * 1.5;

                // Add strict vertical lift to orbitY calculation (offset)
                p.bloomLift = -lift;

                // Stretch vertical streaks (Star Wars jump style but up)
                // We can simulate this by drawing lines, or just moving particles fast

                // Fade out
                effectiveAlpha *= (1 - bloomProgress * 0.2);
                lightness = 100; // Turn white hot
            } else {
                p.bloomLift = 0;
            }

            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist + (p.bloomLift || 0);

            // Re-calc final position here to ensure we capture the lift
            // Note: finalX/Y are calculated in next lines, so we just need to ensure orbitY feeds into it.


            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.4;

            // Star colors
            const hue = 220 + Math.sin(i * 0.2) * 20; // Blueish
            let lightness = 80 + Math.sin(timestamp * 0.003 + i) * 20;
            const isMainStar = i % 15 === 0;

            // Supernova whiteness
            if (bloomProgress > 0) {
                lightness = 100 - (bloomProgress * 20); // Start white, fade slightly
            }

            ctx.fillStyle = `hsla(${hue}, ${bloomProgress > 0 ? 0 : 60}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();

            // Draw Streak if Falling (Idle) or if Main Star (Active)
            // For Idle: Draw circular arc trail ? No, simple trail is enough or just dot for "Star Trails" photo effect
            // Actually "Star Trails" implies long streaks.
            // Let's draw arcs for idle

            const showStreak = (isMainStar && transitionProgress > 0.5 && bloomProgress === 0);

            if (showStreak) {
                // Active Trajectory: Orbit
                const trailX = finalX - Math.cos(p.angle) * streakLength;
                const trailY = finalY - Math.sin(p.angle) * streakLength;

                ctx.moveTo(trailX, trailY);
                ctx.lineTo(finalX, finalY);
                ctx.strokeStyle = `hsla(${hue}, 80%, ${lightness}%, ${effectiveAlpha * 0.5})`;
                ctx.lineWidth = p.size;
                ctx.stroke();
            } else if (transitionProgress < 1) {
                // Idle: Draw Arc Tail (approximate)
                const arcLen = 0.05 + Math.random() * 0.05;
                const cx = width * 0.3;
                const cy = height * 0.3;
                const r = Math.sqrt(Math.pow(finalX - cx, 2) + Math.pow(finalY - cy, 2));
                const angle = Math.atan2(finalY - cy, finalX - cx);

                ctx.beginPath();
                ctx.arc(cx, cy, r, angle, angle + arcLen);
                ctx.strokeStyle = `hsla(${hue}, 60%, ${lightness}%, ${effectiveAlpha * 0.5})`;
                ctx.lineWidth = p.size * 0.5;
                ctx.stroke();
            }

            p.x = finalX; p.y = finalY;

            // Draw star head
            ctx.beginPath();
            ctx.arc(finalX, finalY, isMainStar ? p.size * 2 : p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderLotus = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Lotus: Peaceful multi-layered petals
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: MANDALA GEOMETRY ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.0002;

                // Sacred 12-fold symmetry layout
                const petals = 12;
                const layers = 8;

                const layer = Math.floor(i / (PARTICLE_COUNT / layers));
                const petal = i % petals;

                const baseR = (layer + 1) * 35;
                const baseTheta = (petal / petals) * Math.PI * 2;

                // Complex rotation per layer (Alternating directions)
                const dir = layer % 2 === 0 ? 1 : -1;
                const theta = baseTheta + time * dir + layer * 0.1;

                // Breathing/Pulsing Effect
                const pulse = Math.sin(timestamp * 0.001 + layer) * 10;
                const r = baseR + pulse;

                p.diffuseX = centerX + Math.cos(theta) * r;
                p.diffuseY = centerY + Math.sin(theta) * r;
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

            // Bloom: Golden Enlightenment - Full radial expansion into pure gold light
            let expansion = 0;
            if (bloomProgress > 0) {
                // Expand Layers Outward significantly
                expansion = bloomProgress * 300;
                effectiveDist += expansion;

                // Fade? No, staying bright until end
                effectiveAlpha = Math.max(0, effectiveAlpha * (1 - bloomProgress * 0.1));
            }

            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist * 0.9;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.4;

            // Lotus colors
            let hue = 40 + layer * 5;
            let saturation = 20 + layer * 10;
            let lightness = 90 - layer * 5;

            // Bloom glow
            if (bloomProgress > 0) {
                // Transition to Pure Gold
                hue = 45; // Gold
                saturation = 80 + bloomProgress * 20; // Max saturation
                lightness = 70 + bloomProgress * 30; // Bright

                // Add "shine" (no implementation needed, just color)
            }

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size * (1 + layer * 0.2), 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderLiquid = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const now = timestamp * 0.001;

        state.particles.forEach((p: any, i: number) => {
            const fluidNoise = Math.sin(now * 0.4 + p.angle * 2) * Math.cos(now * 0.3 + p.dist * 0.01);

            // --- IDLE: SILK TIDES ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.0005;

                // 3D Sine Wave Grid (Silk Fabric)
                // Particles arranged in a loose grid that undulates

                const cols = 25;
                const row = Math.floor(i / cols);
                const col = i % cols;

                // Grid spacing
                const spacing = 30;
                const offsetX = (cols * spacing) / 2;
                const offsetY = (state.particles.length / cols * spacing) / 2;

                const baseX = col * spacing - offsetX + centerX;
                const baseY = row * spacing - offsetY + centerY;

                // Diagonal Wave flow
                const wave1 = Math.sin(col * 0.2 + row * 0.1 + time * 2) * 20;
                const wave2 = Math.cos(col * 0.1 - row * 0.2 + time * 3) * 20;

                // Viscous drifting
                p.diffuseX = baseX + wave1;
                p.diffuseY = baseY + wave2;

                // Add depth perspective (pseudo-3D)
                // Center is "higher" (closer)
                const distToCenter = Math.sqrt(Math.pow(p.diffuseX - centerX, 2) + Math.pow(p.diffuseY - centerY, 2));
                const z = Math.max(0, 100 - distToCenter * 0.2);
                const scale = 1 + z * 0.002;

                p.diffuseX = centerX + (p.diffuseX - centerX) * scale;
                p.diffuseY = centerY + (p.diffuseY - centerY) * scale;

            } else {
                // Active State: Organic rotation
                p.angle += 0.002 + Math.sin(now * 0.5 + i * 0.1) * 0.001;
            }

            const tension = 1 - (breathScale - 1);
            const displacement = fluidNoise * 20 * tension;
            const lensEffect = Math.sin(p.angle * 6 + now) * 12;
            let targetDist = (p.dist + displacement + lensEffect) * breathScale;

            // Bloom: Vaporize - Rise up as bubbles and pop
            let bubbleY = 0;
            if (bloomProgress > 0) {
                // Rise Up
                bubbleY = -bloomProgress * height * 0.8;

                // Jiggle (Boiling)
                const jiggle = Math.sin(timestamp * 0.05 + i) * 10 * bloomProgress;
                effectiveDist += jiggle;

                // Expand rings slightly
                targetDist += bloomProgress * 50;

                effectiveAlpha *= (1 - bloomProgress * 0.4);
            }

            const burstX = 0;
            const burstY = bubbleY;

            const orbitX = Math.cos(p.angle) * targetDist + burstX;
            const orbitY = Math.sin(p.angle) * targetDist + burstY;
            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            const dot = Math.abs(Math.sin(p.angle + now * 0.5));
            const fresnel = Math.pow(dot, 4);

            // Glass Color Strategy (Strict)
            // Mercury: Silver/Chrome
            const baseHue = 200; // Slight blue tint for metallic feel
            const h = baseHue;
            const s = 0 + fresnel * 10; // Very low saturation (Silver)
            const l = 40 + fresnel * 50; // High contrast metallic
            const alpha = 0.4 + fresnel * 0.6; // Opaque-ish

            // DRAW BODY - OPTIMIZED
            ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;

            ctx.beginPath();
            const bodySize = p.size * (0.9 + fresnel * 0.5);
            ctx.arc(finalX, finalY, bodySize, 0, Math.PI * 2);
            ctx.fill();

            // DRAW SPECULAR
            if (fresnel > 0.6 || Math.sin(now * 3 + i) > 0.9) {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + fresnel * 0.3})`;
                ctx.beginPath();
                ctx.arc(finalX - bodySize * 0.25, finalY - bodySize * 0.25, bodySize * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }

            // ctx.shadowBlur = 0; // Not needed as we didn't set it
            p.x = finalX; p.y = finalY;
        });
    };

    const renderPrism = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: LASER GRID ---
            if (transitionProgress < 1) {
                // Initialize Grid Direction if missing
                if (!p.gridDir) {
                    p.gridDir = Math.random() > 0.5 ? 'x' : 'y';
                    p.gridSpeed = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 5);
                }

                // Random 90 degree turn (Cybernetic randomness)
                if (Math.random() < 0.02) {
                    p.gridDir = p.gridDir === 'x' ? 'y' : 'x';
                    p.gridSpeed = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 5);
                }

                // Move
                if (p.gridDir === 'x') p.diffuseX += p.gridSpeed;
                else p.diffuseY += p.gridSpeed;

                // Wrap around edges
                if (p.diffuseX < 0) p.diffuseX = width;
                if (p.diffuseX > width) p.diffuseX = 0;
                if (p.diffuseY < 0) p.diffuseY = height;
                if (p.diffuseY > height) p.diffuseY = 0;
            } else {
                p.diffuseX += p.dx * 0.1;
                p.diffuseY += p.dy * 0.1;
            }
            p.angle += p.speed * 0.15;

            const numSides = 6;
            const angleOffset = (Math.PI * 2 / numSides) * (i % numSides);
            const baseAngle = p.angle + angleOffset;
            const shimmer = Math.sin(timestamp * 0.004 + i * 0.2) * 10;
            let effectiveDist = (p.dist * 0.8 + shimmer) * breathScale;
            let effectiveAlpha = 0.4 + Math.abs(Math.sin(timestamp * 0.002 + p.angle * 3)) * 0.4;

            // Bloom: Data Transmission - Particles snap to axes and shoot out at light speed
            let burstX = 0;
            let burstY = 0;

            if (bloomProgress > 0) {
                const speed = bloomProgress * 2000;
                // Determine Axis based on particle index
                // (simulating system bus transmission)
                if (i % 2 === 0) {
                    // Horizontal Move
                    const dir = (i % 4 === 0) ? 1 : -1;
                    burstX = dir * speed;
                } else {
                    // Vertical Move
                    const dir = (i % 4 === 1) ? 1 : -1;
                    burstY = dir * speed;
                }

                // Turn white/cyan
                effectiveAlpha *= (1 - bloomProgress * 0.1);
            }

            const orbitX = Math.cos(baseAngle) * effectiveDist + burstX;
            const orbitY = Math.sin(baseAngle) * effectiveDist + burstY;
            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.5;

            const hue = (timestamp * 0.02 + i * 0.5) % 360;
            const saturation = 70 + Math.sin(timestamp * 0.003 + i) * 20;
            const lightness = 70 + Math.cos(timestamp * 0.002 + i) * 10;

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size * 1.1, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderSphere = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const now = Date.now();
        const introElapsed = now - (state.themeStartTime || 0);

        // --- 1. INTRO: "Celestial Assembly" (Elegant Swirl) ---
        // 0s -> 2.4s: Particles gently spiral in from a nebula
        let introExpansion = 0;
        let introRotation = 0;
        let introAlpha = 1;

        if (transitionProgress < 1 && introElapsed < 2400) {
            const introDuration = 2400;
            const progress = Math.min(introElapsed / introDuration, 1);

            // "Elegant Arrival": Smooth easing (EaseOutCubic)
            const ease = 1 - Math.pow(1 - progress, 3);

            introExpansion = (1 - ease) * 1200; // Start moderately far
            introRotation = (1 - ease) * Math.PI * 1.5; // Soft spiral
            introAlpha = ease; // Fade in gracefully
        }

        state.particles.forEach((p: any, i: number) => {
            // --- IDLE STATE: "Quantum Cloud" ---
            // Instead of static rings, a vibrating, shifting swarm that roughly holds shape
            if (transitionProgress < 1) {
                // Chaotic "Electron" movement
                const time = timestamp * 0.001;
                const chaoticNoise = Math.sin(time + i * 0.1) + Math.cos(time * 0.5 + p.angle);

                // Target: Loose sphere distribution
                // We use the same sphere math but with added noise
                const phi = Math.acos(1 - (2 * i) / PARTICLE_COUNT);

                // Add Intro Spiral Rotation 
                const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi + time * 0.2 + introRotation;

                // Radius breathes heavily in idle
                const idlePulse = Math.sin(time * 2) * 20;
                let r = (160 + idlePulse) + chaoticNoise * 15;

                // 3D Coords
                let x = r * Math.sin(phi) * Math.cos(theta);
                let y = r * Math.sin(phi) * Math.sin(theta);
                let z = r * Math.cos(phi);

                // Add random orbit jitter
                x += Math.sin(time * 3 + i) * 10;
                y += Math.cos(time * 2 + i) * 10;

                // Project
                const fov = 350;
                const scale = fov / (fov - z);
                const targetIdleX = centerX + x * scale;
                const targetIdleY = centerY + y * scale;

                // Apply Implosion Offset (Radial + Spiral twisting visually achieved by theta rotation above)
                // We physically push them out radially for the "Diffusion" feel
                const dx = targetIdleX - centerX;
                const dy = targetIdleY - centerY;
                const distRaw = Math.sqrt(dx * dx + dy * dy) || 0.001;
                const nx = dx / distRaw;
                const ny = dy / distRaw;

                // Force "Diffusion" - if introExpansion is high, they are far away.
                // Also add some random Z-depth noise to the expansion so they don't look like a flat sheet expanding
                const expansionZ = introExpansion * (1 + Math.sin(i) * 0.5);

                const finalIntroX = targetIdleX + nx * expansionZ;
                const finalIntroY = targetIdleY + ny * expansionZ;

                p.diffuseX += (finalIntroX - p.diffuseX) * 0.1; // Softer spring for elegance
                p.diffuseY += (finalIntroY - p.diffuseY) * 0.1;
            }

            // --- ACTIVE STATE: Perfect Sphere ---
            // Sphere rotation angle (Y-axis)
            const rotY = timestamp * 0.0003;

            // Map to Sphere (Golden Spiral Distribution)
            const phi = Math.acos(1 - (2 * i) / PARTICLE_COUNT);
            const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi + rotY;

            let r = 130 * breathScale;

            // Bloom Expansion
            if (bloomProgress > 0) {
                r += bloomProgress * 400;
            }

            // 3D Cartesian Coordinates
            let x = r * Math.sin(phi) * Math.cos(theta);
            let y = r * Math.sin(phi) * Math.sin(theta);
            let z = r * Math.cos(phi);

            // Tilt Sphere (X-axis rotation)
            const tilt = 0.4;
            const y_t = y * Math.cos(tilt) - z * Math.sin(tilt);
            const z_t = y * Math.sin(tilt) + z * Math.cos(tilt);
            y = y_t;
            z = z_t;

            // Perspective Projection
            const fov = 350;
            const scale = fov / (fov - z);
            const projX = x * scale;
            const projY = y * scale;

            const targetX = centerX + projX;
            const targetY = centerY + projY;

            // Strict interpolation handles the transition from "Cloud" to "Sphere"
            const finalX = p.diffuseX + (targetX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (targetY - p.diffuseY) * transitionProgress;

            // Colors: Blue & Gold Interleaved
            const isGold = i % 15 === 0 || (i % 23 === 0);
            const hue = isGold ? 42 : 215;
            const sat = isGold ? 95 : 75;
            // Lighting based on depth (z)
            const lightness = isGold ? 60 + (z / r) * 20 : 55 + (z / r) * 25;
            let alpha = 0.5 + (z / r) * 0.5; // Fade back points

            if (transitionProgress < 1 && introElapsed < 2400) {
                alpha *= introAlpha; // Apply intro fade
            }
            if (bloomProgress > 0) alpha *= (1 - bloomProgress);

            ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lightness}%, ${Math.min(alpha, 1)})`;
            ctx.beginPath();
            const size = p.size * scale * (isGold ? 1.6 : 1.1);
            ctx.arc(finalX, finalY, Math.max(0, size), 0, Math.PI * 2);
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
        } else if (state.phase === "COMPLETED" || state.phase === "SUMMARY") {
            transitionProgress = 1;
            const elapsed = now - (state.completionStartTime || now);
            bloomProgress = Math.min(elapsed / 3000, 1);
            if (state.phase === "SUMMARY") bloomProgress = 1; // Keep fully bloomed
            else if (state.theme === "ROSE") bloomProgress = 1 - Math.pow(1 - bloomProgress, 3);
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

        if (state.phase === "SUMMARY" && state.textTargets && state.textTargets.length > 0) {
            renderTextMorph(ctx, state, width, height, now);
        } else if (state.theme === "LIQUID") {
            renderLiquid(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "AURORA") {
            renderAurora(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
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
        } else if (state.theme === "PRISM") {
            renderPrism(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "SPHERE") {
            renderSphere(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
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

            // Fix: Initialize themeStartTime so intro plays on reload
            animState.current.themeStartTime = Date.now();
            animState.current.theme = selectedTheme;

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
        if (animState.current.theme !== selectedTheme) {
            animState.current.theme = selectedTheme;
            animState.current.themeStartTime = Date.now(); // RESET INTRO TIMER
        }

        animState.current.phaseStartTime = Date.now();
        if (breathPhase === "INHALE") animState.current.phaseDuration = currentPattern.INHALE;
        if (breathPhase === "HOLD") animState.current.phaseDuration = currentPattern.HOLD;
        if (breathPhase === "EXHALE") animState.current.phaseDuration = currentPattern.EXHALE;

        // Haptics Trigger
        if (phase === "PRACTICING") {
            playHapticPattern(breathPhase);
        }
    }, [breathPhase, phase, selectedTheme]); // Added selectedTheme

    const handleStart = () => {
        // 🔥 CRITICAL: Unlock audio FIRST in the synchronous user click context
        // This must happen before any setTimeout/async breaks the interaction chain
        unlockAudio();

        // 1. Trigger Transition (Particles Implode)
        setPhase("TRANSITION_TO_PRACTICE");
        animState.current.transitionStartTime = Date.now();
        triggerMedium();

        // 2. Wait for transition (2s) then start countdown
        setTimeout(() => {
            setPhase("COUNTDOWN");
            setCountdown(3);
        }, 2000); // 2s transition matches animState.transitionDuration
    };

    const startPractice = async () => {
        // Safety Clear: Prevent multiple intervals from running
        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        setPhase("PRACTICING");
        setBreathPhase("INHALE");
        practiceStartTimeRef.current = Date.now();

        // 📊 Record Session Start to Database
        try {
            const themeName = THEMES[selectedTheme]?.name || "正式练习";
            fetch(getApiUrl('/api/meditation/sessions'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topicId: `practice-${selectedTheme.toLowerCase()}`,
                    topicName: `正式练习 - ${themeName}`
                })
            }).then(async res => {
                if (res.ok) {
                    const data = await res.json();
                    if (data?.id) setCurrentSessionId(data.id);
                }
            }).catch(e => console.error("Failed to start session recording", e));
        } catch (e) {
            console.error("Failed to start session recording", e);
        }

        // Start Heart Rate Monitoring (if authorized)
        if (!isAuthorized) {
            const granted = await requestPermission();
            if (granted) startMonitoring(true); // Pass true to bypass state timing issue
        } else {
            startMonitoring();
        }

        // 🎵 Start Binaural Beats if enabled
        if (binauralEnabled) {
            console.log('[Practice] Binaural enabled, looking for preset:', selectedBinaural);
            const preset = BINAURAL_PRESETS.find(p => p.id === selectedBinaural);
            if (preset) {
                console.log('[Practice] Starting binaural with preset:', preset);
                // Pass duration for frequency ramping
                startBinaural(preset, durationMinutes * 60);
            } else {
                console.warn('[Practice] Preset not found:', selectedBinaural);
            }
        } else {
            console.log('[Practice] Binaural is disabled');
        }

        // Start Recursive Cycle
        runBreathingCycle("INHALE");

        // Timer
        setTimeLeft(durationMinutes * 60);
        practiceTimerRef.current = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
    };

    const runBreathingCycle = (currentPhase: BreathPhase) => {
        // Use a ref-based check for the phase to avoid stale closure issues
        if (animState.current.phase === "COMPLETED" || animState.current.phase === "SUMMARY") return;

        let nextPhase: BreathPhase;
        let duration: number;

        switch (currentPhase) {
            case "INHALE":
                // Skip HOLD if duration is 0
                nextPhase = currentPattern.HOLD > 0 ? "HOLD" : "EXHALE";
                duration = currentPattern.INHALE;
                break;
            case "HOLD":
                nextPhase = "EXHALE";
                duration = currentPattern.HOLD;
                break;
            case "EXHALE":
                nextPhase = "INHALE";
                duration = currentPattern.EXHALE;
                break;
        }

        setBreathPhase(currentPhase);

        breathTimerRef.current = setTimeout(() => {
            runBreathingCycle(nextPhase);
        }, duration);
    };

    const completePractice = () => {
        if (phase === "COMPLETED" || phase === "SUMMARY") return; // Prevent double trigger

        setPhase("COMPLETED");
        animState.current.completionStartTime = Date.now(); // Start dispersion

        // 1. Capture Session Data IMMEDIATELY
        const elapsedSeconds = Math.round((Date.now() - practiceStartTimeRef.current) / 1000);
        const currentHRHistory = [...heartRateHistory];

        setSessionDuration(elapsedSeconds);
        setSessionHeartRates(currentHRHistory);

        // 📊 Record Session End to Database
        if (currentSessionId) {
            fetch(getApiUrl('/api/meditation/sessions'), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentSessionId,
                    durationSeconds: elapsedSeconds
                })
            }).then(() => {
                setCurrentSessionId(null); // Clear for next session

                // 🔔 Auto-refresh break reminder (reschedule for 3 days from now)
                scheduleBreakReminder(3).catch(e =>
                    console.log("[Practice] Break reminder refresh skipped:", e)
                );
            }).catch(e => console.error("Failed to end session recording", e));
        }

        // Stop Heart Rate Monitoring
        stopMonitoring();

        // 🎵 Stop Binaural Beats
        stopBinaural();

        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
        clearHapticTimers();

        // 🎊 完成反馈
        triggerHeavy();
        window.setTimeout(() => triggerHeavy(), 150);
        window.setTimeout(() => triggerHeavy(), 300);
        window.setTimeout(() => {
            triggerSuccess();
            playCompletionSound();
        }, 500);

        // Show summary after animation completes
        window.setTimeout(() => {
            setPhase("SUMMARY");

            // --- Generate Text Targets for Particles ---
            const durationText = formatTime(elapsedSeconds);

            // Calculate Stats
            const avgBpm = currentHRHistory.length > 0
                ? Math.round(currentHRHistory.reduce((a, b) => a + b, 0) / currentHRHistory.length)
                : 0;
            const bpmText = avgBpm > 0 ? avgBpm.toString() : "--"; // Just the number is cleaner

            // Calculate BPM Difference
            const startBpm = currentHRHistory[0] || 0;
            const endBpm = currentHRHistory[currentHRHistory.length - 1] || 0;
            const diff = endBpm - startBpm;
            const diffText = diff === 0 ? "±0" : (diff > 0 ? "+" + diff : diff.toString());

            const canvas = canvasRef.current;
            if (canvas) {
                animState.current.morphStartTime = Date.now() + 3000;
                animState.current.sessionHeartRates = currentHRHistory;

                const { points, bpmStartIndex, dropStartIndex } = getTextPoints(durationText, bpmText, diffText, canvas.width, canvas.height);
                animState.current.textTargets = points;
                animState.current.bpmParticleStartIndex = bpmStartIndex;
                animState.current.dropParticleStartIndex = dropStartIndex;
            }
        }, 5000);
    };

    // Monitor for completion
    useEffect(() => {
        if (phase === "PRACTICING" && timeLeft <= 0) {
            completePractice();
        }
    }, [timeLeft, phase]);

    // Countdown Logic
    useEffect(() => {
        if (phase === "COUNTDOWN") {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                // Countdown finished, start practice
                startPractice();
            }
        }
    }, [phase, countdown]);

    const cleanup = () => {
        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
        clearHapticTimers();
        stopBinaural(); // Ensure audio stops on exit
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

    // Ensure cleanup runs on unmount
    useEffect(() => {
        return () => cleanup();
    }, []);


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
                    {/* Right Side Controls - Only show in IDLE */}
                    {phase === "IDLE" && (
                        <div className="flex gap-2 items-center">
                            {/* Binaural Beats Toggle - Icon Only */}
                            <button
                                onClick={() => {
                                    const newValue = !binauralEnabled;
                                    setBinauralEnabled(newValue);
                                    localStorage.setItem("binauralEnabled", String(newValue));
                                    triggerLight();
                                }}
                                className={`w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-md transition-all border ${binauralEnabled ? 'bg-red-500/30 text-red-300 border-red-400/30' : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'}`}
                            >
                                <span className="text-xl">🎧</span>
                            </button>

                            {/* Breathing Pattern Button - Icon Only */}
                            <div className="relative">
                                <button className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/5 text-white/50 hover:bg-white/10 transition-all">
                                    <Wind size={20} />
                                </button>
                                <select
                                    value={selectedPattern}
                                    onChange={(e) => {
                                        setSelectedPattern(e.target.value as BreathingPatternId);
                                        localStorage.setItem("breathingPattern", e.target.value);
                                        triggerLight();
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
                                >
                                    {BREATHING_PATTERNS.map((pattern) => (
                                        <option key={pattern.id} value={pattern.id}>
                                            {pattern.name} ({pattern.inhale}-{pattern.hold > 0 ? `${pattern.hold}-` : ''}{pattern.exhale})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
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
                        error={heartRateError}
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
                <footer className="w-full max-w-sm pb-safe px-6 pointer-events-auto z-50">
                    <AnimatePresence>
                        {/* IDLE UI */}
                        {phase === "IDLE" && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                className="flex flex-col gap-10"
                            >
                                {/* Removed Ruler from Top */}

                                { /* Ruler Time Selector - Auto-hides on idle */}
                                <div className="w-full mb-2 flex flex-col items-center justify-center min-h-[40px]">
                                    <AnimatePresence mode="wait">
                                        {isSelectorVisible ? (
                                            <motion.div
                                                key="selector"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="w-full"
                                                onTouchStart={() => {
                                                    // Keep alive on interaction
                                                    if (selectorTimeoutRef.current) clearTimeout(selectorTimeoutRef.current);
                                                    selectorTimeoutRef.current = setTimeout(() => setIsSelectorVisible(false), 3000);
                                                }}
                                            >
                                                <RulerTimeSelector
                                                    value={durationMinutes}
                                                    onChange={(val) => {
                                                        setDurationMinutes(val);
                                                        // Keep alive while scrolling
                                                        if (selectorTimeoutRef.current) clearTimeout(selectorTimeoutRef.current);
                                                        selectorTimeoutRef.current = setTimeout(() => setIsSelectorVisible(false), 3000);
                                                    }}
                                                />
                                            </motion.div>
                                        ) : (
                                            <motion.button
                                                key="trigger"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                onClick={() => {
                                                    setIsSelectorVisible(true);
                                                    if (selectorTimeoutRef.current) clearTimeout(selectorTimeoutRef.current);
                                                    selectorTimeoutRef.current = setTimeout(() => setIsSelectorVisible(false), 3000);
                                                }}
                                                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs tracking-widest font-light hover:bg-white/10 transition-colors"
                                            >
                                                {durationMinutes} MIN
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Theme Selector - Scrollable (Bottom) */}
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

                                {/* Binaural section removed - toggle is now in header */}

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

            {/* Practice Summary - Immersive Overlay */}
            {phase === "SUMMARY" && (
                <PracticeCompletionView
                    duration={sessionDuration}
                    heartRateHistory={sessionHeartRates}
                    theme={selectedTheme}
                    onClose={() => {
                        setPhase("IDLE");
                        setBreathPhase("INHALE");
                        setCountdown(3);
                        setTimeLeft(durationMinutes * 60);
                    }}
                />
            )}



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

// --- Particle Text Morphing Helpers ---
const getTextPoints = (text1: string, text2: string, text3: string, width: number, height: number) => {
    if (typeof document === 'undefined') return { points: [], bpmStartIndex: 0, dropStartIndex: 0 }; // Server-side safety

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return { points: [], bpmStartIndex: 0, dropStartIndex: 0 };

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const points: { x: number, y: number }[] = [];
    const step = 4; // Denser particles for better clarity

    // 1. Scan Duration Text (Center Top)
    ctx.font = '500 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(text1, width / 2, height / 2 - 140);

    let imageData = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            if (imageData[index] > 128) points.push({ x, y });
        }
    }
    const bpmStartIndex = points.length;

    // 2. Scan BPM Text (Bottom Left)
    ctx.clearRect(0, 0, width, height);
    ctx.font = '500 80px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(text2, width / 2 - 140, height / 2 + 100);

    imageData = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            if (imageData[index] > 128) points.push({ x, y });
        }
    }
    const dropStartIndex = points.length;

    // 3. Scan Drop Text (Bottom Right)
    ctx.clearRect(0, 0, width, height);
    ctx.fillText(text3, width / 2 + 140, height / 2 + 100); // Same font as above

    imageData = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            if (imageData[index] > 128) points.push({ x, y });
        }
    }

    // Shuffle segments
    // 1
    for (let i = bpmStartIndex - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [points[i], points[j]] = [points[j], points[i]];
    }
    // 2
    for (let i = dropStartIndex - 1; i > bpmStartIndex; i--) {
        const j = Math.floor(Math.random() * (i - bpmStartIndex + 1)) + bpmStartIndex;
        [points[i], points[j]] = [points[j], points[i]];
    }
    // 3
    for (let i = points.length - 1; i > dropStartIndex; i--) {
        const j = Math.floor(Math.random() * (i - dropStartIndex + 1)) + dropStartIndex;
        [points[i], points[j]] = [points[j], points[i]];
    }

    return { points, bpmStartIndex, dropStartIndex };
};

const renderHeartRateCurve = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, progress: number) => {
    const history = state.sessionHeartRates;
    if (!history || history.length < 2) return;

    // Chart Area: Below Duration, Above Stats
    const chartWidth = width * 0.5;
    const chartHeight = 80;
    const startX = (width - chartWidth) / 2;
    const startY = height / 2 - 40;

    // Get bounds
    const minHR = Math.min(...history) - 5;
    const maxHR = Math.max(...history) + 5;
    const range = maxHR - minHR || 10;

    ctx.save();
    ctx.globalAlpha = Math.max(0, (progress - 0.5) * 2); // Fade in late in the morph
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Glassy Glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";

    for (let i = 0; i < history.length; i++) {
        const x = startX + (i / (history.length - 1)) * chartWidth;
        const y = startY + chartHeight - ((history[i] - minHR) / range) * chartHeight;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            const prevX = startX + ((i - 1) / (history.length - 1)) * chartWidth;
            const prevY = startY + chartHeight - ((history[i - 1] - minHR) / range) * chartHeight;
            // Control points for smooth spline
            const cp1x = prevX + (x - prevX) / 2;
            const cp2x = prevX + (x - prevX) / 2;
            ctx.bezierCurveTo(cp1x, prevY, cp2x, y, x, y);
        }
    }

    ctx.stroke();

    // Add endpoints dots
    [0, history.length - 1].forEach(idx => {
        const x = startX + (idx / (history.length - 1)) * chartWidth;
        const y = startY + chartHeight - ((history[idx] - minHR) / range) * chartHeight;
        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
};

const renderTextMorph = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, now: number) => {
    const particles = state.particles;
    const targets = state.textTargets;
    if (!targets || targets.length === 0) return;

    const morphStartTime = state.morphStartTime || 0;
    const morphElapsed = now - morphStartTime;

    // Phase 2: Drift (Wait until bloom finishes + buffer)
    if (morphElapsed < 0) {
        // Just drift loosely
        particles.forEach((p: any) => {
            p.x += (Math.random() - 0.5) * 0.5;
            p.y += (Math.random() - 0.5) * 0.5;
            // Use subtle white for drift
            ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        return;
    }

    // Phase 3: Morph to Text
    const morphDuration = 1500;
    // Assuming easeInOutCubic is defined elsewhere or will be added.
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const progress = Math.min(morphElapsed / morphDuration, 1);
    const easedProgress = easeInOutCubic(progress);

    // Draw Heart Rate Curve behind particles (fades in with morph)
    renderHeartRateCurve(ctx, state, width, height, progress);

    const lerp = 0.08;
    const beatSpeed = 0.008; // Heartbeat freq
    const beat = Math.pow(Math.sin(now * beatSpeed), 60); // Sharp spike for heartbeat

    // Theme Colors
    let baseHue = 0;
    let baseSat = 0; // 0 = white
    let dynamicColor = false;

    if (state.theme === "ROSE") { baseHue = 340; baseSat = 80; dynamicColor = true; }
    else if (state.theme === "LIQUID") { baseHue = 190; baseSat = 10; dynamicColor = true; }
    else if (state.theme === "AURORA") { baseHue = 160; baseSat = 70; dynamicColor = true; }
    else if (state.theme === "GALAXY") { baseHue = 260; baseSat = 80; dynamicColor = true; }
    else if (state.theme === "INFERNO") { baseHue = 20; baseSat = 90; dynamicColor = true; }
    else if (state.theme === "ZEN") { baseHue = 45; baseSat = 60; dynamicColor = true; }
    else if (state.theme === "PRISM") { baseHue = 180; baseSat = 20; dynamicColor = true; }
    else { baseHue = 0; baseSat = 0; }

    particles.forEach((p: any, i: number) => {
        let tx = p.x;
        let ty = p.y;
        let targetAlpha = 0;
        let sizeScale = 1;

        if (i < targets.length) {
            tx = targets[i].x;
            ty = targets[i].y;
            targetAlpha = 0.9;

            // 💓 BPM Heartbeat Effect (BPM segment only)
            if (i >= state.bpmParticleStartIndex && i < (state.dropParticleStartIndex || 999999)) {
                sizeScale = 1 + beat * 0.4;
                targetAlpha = 0.7 + beat * 0.3;
                tx += (tx - width / 2) * beat * 0.03;
                ty += (ty - height / 2) * beat * 0.03;
            }

            // Liquid Noise
            const noise = Math.sin(now * 0.002 + i) * 1.5;
            tx += Math.cos(i) * noise;
            ty += Math.sin(i) * noise;

        } else {
            // Excess particles drift and fade
            tx = p.x + (Math.random() - 0.5) * 5;
            ty = p.y + (Math.random() - 0.5) * 5;
            targetAlpha = 0;
        }

        // Interpolate
        p.x += (tx - p.x) * lerp;
        p.y += (ty - p.y) * lerp;

        // Draw
        if (dynamicColor && i < targets.length) {
            // Stats (BPM and Drop) - distinct colors
            if (state.bpmParticleStartIndex && i >= state.bpmParticleStartIndex) {
                // Determine if it's the Drop segment
                const isDrop = state.dropParticleStartIndex && i >= state.dropParticleStartIndex;

                if (isDrop) {
                    // Difference segment (White or Neutral)
                    ctx.fillStyle = `rgba(255, 255, 255, ${targetAlpha})`;
                } else {
                    // BPM segment (Themed)
                    ctx.fillStyle = `hsla(${baseHue}, ${baseSat}%, 70%, ${targetAlpha})`;
                }
            } else {
                // Duration segment (Brightest)
                ctx.fillStyle = `hsla(${baseHue}, ${baseSat}%, 90%, ${targetAlpha})`;
            }
        } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${targetAlpha})`;
        }

        if (targetAlpha > 0.01) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * sizeScale, 0, Math.PI * 2);
            ctx.fill();
        }
    });
};
