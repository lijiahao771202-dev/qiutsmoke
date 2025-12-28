import React, { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Calendar, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface JourneyCardProps {
    days: number;
    times: number;
    minutes?: number;
    todayMinutes?: number;
}

// --- VISUAL ENGINE CONFIG ---
// Theme: "Imperial Jade" (High Translucency, Fluorescence, Emerald/Teal)
const JADE_STAGE = {
    min: 0, max: 100000,
    // Deep Emerald to Fluorescent Cyan Gradient
    bg: "from-[#134E5E]/90 via-[#71B280]/80 to-[#2BC0E4]/90",
    accent: "text-emerald-50",
    shadow: "shadow-[0_20px_40px_-12px_rgba(16,185,129,0.3)]",
    // Inner fluorescence + Outer glow
    glow: "shadow-[inset_0_0_40px_rgba(52,211,153,0.3),0_0_20px_rgba(52,211,153,0.2)]",
    baseColor: "bg-[#0f2027]/40" // Dark translucent base
};

export default function JourneyCard({ days, times, minutes = 0, todayMinutes = 0 }: JourneyCardProps) {
    // --- Daily Goal State (Persistent) ---
    const [dailyGoal, setDailyGoal] = React.useState(20);

    // Load from local storage on mount
    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const savedGoal = localStorage.getItem("dailyMeditationGoal");
            if (savedGoal) setDailyGoal(parseInt(savedGoal, 10));
        }
    }, []);

    // Dynamic Progress Calculation & Color
    const { progress, progressColor } = useMemo(() => {
        const p = Math.min(Math.max(todayMinutes / dailyGoal, 0.05), 1);

        // Jade-themed Progress Colors
        let color = "url(#jadeGradient-base)";
        if (p > 0.3) color = "url(#jadeGradient-mid)";
        if (p > 0.7) color = "url(#jadeGradient-full)";

        return { progress: p, progressColor: color };
    }, [todayMinutes, dailyGoal]);

    // Handle Native Select Change
    const handleNativeGoalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGoal = parseInt(e.target.value, 10);
        setDailyGoal(newGoal);
        localStorage.setItem("dailyMeditationGoal", newGoal.toString());
    };

    // Use Jade Theme
    const stage = JADE_STAGE;

    return (
        <div className="relative w-full h-full group isolate">
            {/* SVG Defs for Jade Gradient */}
            <svg className="absolute w-0 h-0">
                <defs>
                    {/* Level 1: Soft Mint */}
                    <linearGradient id="jadeGradient-base" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#A7F3D0" /> {/* emerald-200 */}
                        <stop offset="100%" stopColor="#34D399" /> {/* emerald-400 */}
                    </linearGradient>

                    {/* Level 2: Bright Teal */}
                    <linearGradient id="jadeGradient-mid" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#5EEAD4" /> {/* teal-300 */}
                        <stop offset="100%" stopColor="#2DD4BF" /> {/* teal-400 */}
                    </linearGradient>

                    {/* Level 3: Fluorescent Cyan/White */}
                    <linearGradient id="jadeGradient-full" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ECFEFF" /> {/* cyan-50 */}
                        <stop offset="50%" stopColor="#FFFFFF" />
                        <stop offset="100%" stopColor="#67E8F9" /> {/* cyan-300 */}
                    </linearGradient>

                    {/* Fluorescent Glow Filter */}
                    <filter id="jadeGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.4  0 1 0 0 0.9  0 0 1 0 0.8  0 0 0 1 0" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
            </svg>

            {/* 
                THE JADE STONE: Translucent, Glowing, Ethereal
            */}
            <div className={cn(
                "relative w-full h-full overflow-hidden rounded-[2.5rem] transition-all duration-700",
                "border border-white/20", // Polished edge
                "backdrop-blur-xl", // Glass effect
                stage.baseColor,
                stage.shadow,
                stage.glow // Inner fluorescence
            )}>

                {/* --- LAYER 1: THE JADE GRADIENT (Flowing) --- */}
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-br transition-all duration-700 ease-in-out opacity-80",
                    stage.bg
                )} />

                {/* --- LAYER 2: INTERNAL INCLUSIONS (Texture) --- */}
                {/* Subtle noise to simulate jade structure, not leather */}
                <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* --- LAYER 3: SURFACE REFLECTION (Glassy) --- */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/20 pointer-events-none mix-blend-soft-light" />

                {/* Moving Sheen */}
                <motion.div
                    animate={{ opacity: [0.1, 0.4, 0.1], rotate: [0, 5, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -inset-[50%] bg-gradient-to-tr from-transparent via-emerald-300/10 to-transparent pointer-events-none blur-3xl"
                />


                {/* --- CONTENT LAYER --- */}
                <div className="relative z-10 flex flex-col h-full p-6 justify-between text-white">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <h3 className="text-xs font-bold tracking-[0.2em] text-emerald-100/90 uppercase drop-shadow-sm font-sans">Journey</h3>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Minutes Capsule */}
                            <div className="bg-emerald-950/20 backdrop-blur-md pl-2 pr-3 py-1 rounded-full border border-emerald-200/20 shadow-sm flex items-center gap-1.5">
                                <div className="bg-white/20 p-1 rounded-full">
                                    <Clock className="w-2.5 h-2.5 text-emerald-50" />
                                </div>
                                <span className="text-[10px] font-bold text-emerald-50 tracking-wide">{minutes} <span className="text-emerald-200/70">MIN</span></span>
                            </div>

                            {/* Days Capsule */}
                            <div className="bg-emerald-950/20 backdrop-blur-md pl-2 pr-3 py-1 rounded-full border border-emerald-200/20 shadow-sm flex items-center gap-1.5">
                                <div className="bg-white/20 p-1 rounded-full">
                                    <Calendar className="w-2.5 h-2.5 text-emerald-50" />
                                </div>
                                <span className="text-[10px] font-bold text-emerald-50 tracking-wide">Day {days}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats - Balanced Layout */}
                    <div className="flex items-center justify-between mt-4 mb-6">
                        {/* Big Number - Resized for Balance */}
                        <div className="flex flex-col justify-center">
                            <span className="text-7xl font-bold tracking-tighter drop-shadow-lg text-white filter drop-shadow-[0_0_10px_rgba(52,211,153,0.5)] leading-none">
                                {times}
                            </span>
                            <span className="text-sm font-medium text-emerald-50/80 tracking-wide mt-1 pl-1">
                                Sessions
                            </span>
                        </div>

                        {/* Progress Ring - Tap to Open Native Picker */}
                        <div
                            className="relative w-24 h-24 flex items-center justify-center z-50 rounded-full overflow-hidden"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {/* Native Select - Invisible but triggers iOS picker */}
                            <select
                                value={dailyGoal}
                                onChange={handleNativeGoalChange}
                                className="absolute inset-0 w-full h-full cursor-pointer z-10 outline-none border-none appearance-none"
                                style={{
                                    opacity: 0,
                                    WebkitAppearance: "none",
                                    backgroundColor: "transparent",
                                    color: "transparent",
                                    WebkitTapHighlightColor: "transparent",
                                    outline: "none"
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((min) => (
                                    <option key={min} value={min}>{min} 分钟</option>
                                ))}
                            </select>

                            {/* Glass Base Track */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 filter drop-shadow-md pointer-events-none">
                                <circle
                                    cx="50%" cy="50%" r="40"
                                    stroke="currentColor" strokeWidth="6"
                                    fill="transparent"
                                    className="text-white/10"
                                />
                                /* Liquid Fill - Jade Glow */
                                <motion.circle
                                    cx="50%" cy="50%" r="40"
                                    stroke={progressColor}
                                    strokeWidth="6"
                                    fill="transparent"
                                    strokeLinecap="round"
                                    style={{ filter: "url(#jadeGlow)" }}
                                    strokeDasharray={251}
                                    initial={{ strokeDashoffset: 251 }}
                                    animate={{ strokeDashoffset: 251 - (251 * progress) }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                />
                            </svg>

                            {/* Center Metric */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className="flex items-baseline gap-0.5 translate-y-1">
                                    <span className="text-2xl font-bold text-white filter drop-shadow-md leading-none tracking-tight">
                                        {Math.round(todayMinutes)}
                                    </span>
                                    <span className="text-sm font-medium text-emerald-100/60 leading-none">
                                        / {dailyGoal}
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold text-emerald-100/50 uppercase tracking-widest mt-1">Today</span>
                            </div>
                        </div>
                    </div>

                    {/* 
                       THE BUTTON: Translucent Jade
                    */}
                    <Link href="/practice" className="w-full relative group/btn block isolate">
                        {/* Glow */}
                        <div className="absolute -inset-0.5 rounded-2xl blur-md opacity-40 group-hover/btn:opacity-100 transition-opacity duration-500 bg-teal-400" />

                        {/* Glass Body */}
                        <div className="relative h-16 overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] transition-transform duration-200 active:scale-[0.98]">
                            {/* Shine */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-20"
                                initial={{ x: "-150%" }}
                                animate={{ x: "150%" }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    repeatDelay: 2,
                                    ease: "easeInOut"
                                }}
                            />

                            <div className="relative h-full flex items-center justify-between px-6 z-10">
                                <div className="flex flex-col justify-center">
                                    <span className="text-white font-bold text-[15px] tracking-wide drop-shadow-sm flex items-center gap-2 group-hover/btn:translate-x-1 transition-transform">
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-100 fill-emerald-100" />
                                        Start Practice
                                    </span>
                                </div>
                                <div className="bg-white/10 p-2.5 rounded-full backdrop-blur-md border border-white/20 shadow-sm group-hover/btn:bg-white/20 transition-colors">
                                    <ChevronRight className="w-5 h-5 text-emerald-50" strokeWidth={3} />
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
