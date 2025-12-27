import React, { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface JourneyCardProps {
    days: number;
    times: number;
}

// --- VISUAL ENGINE CONFIG ---
// Each stage defines the "Soul" of the card: Colors, Shadows, and Light.
// Updated to "Hermès Leather" Palette (Rich Orange/Amber/Red with Texture friendliness)
const STAGES = [
    // 0-5: Beginner (Natural Vachetta)
    {
        min: 0, max: 5,
        bg: "from-[#FAD961] via-[#F76B1C] to-[#E85D04]", // Warm Sunrise
        accent: "text-amber-50",
        shadow: "shadow-orange-400/40",
        glow: "shadow-orange-200/50",
        baseColor: "bg-[#F76B1C]" // For container border removal
    },
    // 6-20: Seedling (Camel / Gold)
    {
        min: 6, max: 20,
        bg: "from-[#F2994A] via-[#F2C94C] to-[#F2994A]",
        accent: "text-amber-50",
        shadow: "shadow-amber-500/40",
        glow: "shadow-yellow-400/50",
        baseColor: "bg-[#F2994A]"
    },
    // 21-50: Spark (Hermès Orange) - THE SIGNATURE
    {
        min: 21, max: 50,
        bg: "from-[#FFA751] via-[#FA4616] to-[#C72E00]", // True Hermès Orange -> Deep Red
        accent: "text-white",
        shadow: "shadow-orange-600/40",
        glow: "shadow-orange-500/50",
        baseColor: "bg-[#FA4616]"
    },
    // 51-100: Flow (Rouge H / Deep Red)
    {
        min: 51, max: 100,
        bg: "from-[#FF416C] via-[#FF4B2B] to-[#990000]",
        accent: "text-red-50",
        shadow: "shadow-red-600/40",
        glow: "shadow-red-500/50",
        baseColor: "bg-[#D31027]"
    },
    // 101-300: Orbit (Sunset Purple/Orange)
    {
        min: 101, max: 300,
        bg: "from-[#C33764] via-[#1D2671] to-[#C33764]", // Deep sunset
        accent: "text-rose-50",
        shadow: "shadow-rose-600/40",
        glow: "shadow-rose-500/50",
        baseColor: "bg-[#C33764]"
    },
    // 301-600: Galaxy (Deep Space) - Adjusted for Warmth
    {
        min: 301, max: 600,
        bg: "from-[#4568DC] via-[#B06AB3] to-[#4568DC]",
        accent: "text-indigo-50",
        shadow: "shadow-indigo-600/40",
        glow: "shadow-indigo-500/50",
        baseColor: "bg-[#4568DC]"
    },
    // 601-999: Nirvana (Ethereal Emerald)
    {
        min: 601, max: 999,
        bg: "from-[#11998e] via-[#38ef7d] to-[#11998e]",
        accent: "text-emerald-50",
        shadow: "shadow-emerald-600/40",
        glow: "shadow-emerald-400/50",
        baseColor: "bg-[#11998e]"
    },
    // 1000+: Infinite (Platinum Gold)
    {
        min: 1000, max: 100000,
        bg: "from-[#CAC531] via-[#F3F9A7] to-[#CAC531]",
        accent: "text-yellow-50",
        shadow: "shadow-yellow-600/40",
        glow: "shadow-yellow-400/50",
        baseColor: "bg-[#CAC531]"
    }
];

export default function JourneyCard({ days, times }: JourneyCardProps) {
    // Strategy: 8 Weeks Goal
    const GOAL_DAYS = 56;

    // Resolve State
    const stage = useMemo(() => {
        return STAGES.find(s => times >= s.min && times <= s.max) || STAGES[STAGES.length - 1];
    }, [times]);

    const progress = useMemo(() => {
        return Math.min(Math.max(days / GOAL_DAYS, 0.05), 1);
    }, [days]);

    return (
        <div className="relative w-full h-full group isolate">
            {/* 
                THE CHASSIS: Matches base color to prevent "Black Border"
                Dynamic Base Color based on stage
            */}
            {/* 
                THE CHASSIS: Matches base color to prevent "Black Border"
                Dynamic Base Color based on stage
            */}
            <div className={cn(
                "relative w-full h-full overflow-hidden rounded-[2.5rem] transition-colors duration-700 border border-white/5", // Added border to fix iOS blending, removed transform-gpu
                stage.baseColor,
                stage.shadow // Use colored shadow instead of black
            )}>

                {/* --- LAYER 1: THE LEATHER DYE (Gradient) --- */}
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-br transition-all duration-700 ease-in-out",
                    stage.bg
                )} />

                {/* --- LAYER 2: LYCHEE SKIN TEXTURE (The Physicality) --- */}
                {/* 
                    Using mix-blend-multiply on a light pattern creates darker "pits",
                    simulating the stamped grain of Togo/Clemence leather.
                */}
                {/* --- LAYER 2: LYCHEE SKIN TEXTURE (The Physicality) --- */}
                {/* 
                    Using mix-blend-multiply on a light pattern creates darker "pits",
                    simulating the stamped grain of Togo/Clemence leather.
                */}
                <div className="absolute inset-0 opacity-[0.3] mix-blend-multiply pointer-events-none filter contrast-[120%]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* --- LAYER 3: LEATHER SHEEN (The Finish) --- */}
                {/* Subtle highlight that moves, simulating light moving across the textured surface */}
                <motion.div
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/10 pointer-events-none mix-blend-overlay"
                />

                {/* --- LAYER 4: STITCHING VIGNETTE (The Edge) --- */}
                {/* Darkens edges slightly to focus attention inward */}
                <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.2)] pointer-events-none" />


                {/* --- CONTENT LAYER --- */}
                <div className="relative z-10 flex flex-col h-full p-6 justify-between text-white">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <h3 className="text-sm font-bold tracking-widest text-white/90 uppercase drop-shadow-sm font-sans">Journey</h3>
                        </div>

                        {/* Capsule Badge */}
                        <div className="bg-white/20 backdrop-blur-md pl-3 pr-4 py-1.5 rounded-full border border-white/30 shadow-sm flex items-center gap-2">
                            <div className="bg-white/30 p-1 rounded-full">
                                <Calendar className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-bold text-white tracking-wide">Day {days} <span className="text-white/50 mx-1">/</span> {GOAL_DAYS}</span>
                        </div>
                    </div>

                    {/* Stats - Balanced Layout */}
                    <div className="flex items-center justify-between mt-4 mb-6">
                        {/* Big Number - Resized for Balance */}
                        <div className="flex flex-col justify-center">
                            <span className="text-7xl font-bold tracking-tighter drop-shadow-lg text-white filter brightness-110 leading-none">
                                {times}
                            </span>
                            <span className="text-base font-medium text-white/90 shadow-black/10 tracking-wide mt-1 pl-1 opacity-90">
                                Sessions
                            </span>
                        </div>

                        {/* Progress Ring */}
                        <div className="relative w-20 h-20">
                            {/* Glass Base Track */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 filter drop-shadow-md">
                                <circle
                                    cx="50%" cy="50%" r="36"
                                    stroke="currentColor" strokeWidth="6"
                                    fill="transparent"
                                    className="text-white/20"
                                />
                                {/* Liquid Fill Path */}
                                <motion.circle
                                    cx="50%" cy="50%" r="36"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="transparent"
                                    strokeLinecap="round"
                                    strokeDasharray={226}
                                    initial={{ strokeDashoffset: 226 }}
                                    animate={{ strokeDashoffset: 226 - (226 * progress) }}
                                    transition={{ duration: 1.8, ease: "easeOut" }}
                                    className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                                />
                            </svg>
                            {/* Center Metric */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pt-0.5">
                                <span className="text-[8px] font-bold text-white/80 uppercase tracking-wider mb-px">Goal</span>
                                <span className="text-lg font-bold text-white filter drop-shadow-md leading-none">{Math.round(progress * 100)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* 
                       THE BUTTON: Translucent Glass on Leather
                    */}
                    <Link href="/practice" className="w-full relative group/btn block isolate">
                        {/* Glow */}
                        <div className={cn(
                            "absolute -inset-0.5 rounded-2xl blur-md opacity-40 group-hover/btn:opacity-100 transition-opacity duration-500",
                            stage.glow
                        )} />

                        {/* Glass Body */}
                        <div className="relative h-16 overflow-hidden rounded-2xl bg-white/20 backdrop-blur-xl border border-white/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] transition-transform duration-200 active:scale-[0.98]">
                            {/* Shine */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -skew-x-20"
                                initial={{ x: "-150%" }}
                                animate={{ x: "150%" }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatDelay: 1,
                                    ease: "easeInOut"
                                }}
                            />

                            <div className="relative h-full flex items-center justify-between px-6 z-10">
                                <div className="flex flex-col justify-center">
                                    <span className="text-white font-bold text-[15px] tracking-wide drop-shadow-sm flex items-center gap-2 group-hover/btn:translate-x-1 transition-transform">
                                        <Sparkles className="w-3.5 h-3.5 text-white/90 fill-white/90" />
                                        Start Practice
                                    </span>
                                </div>
                                <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-md border border-white/30 shadow-sm group-hover/btn:bg-white/30 transition-colors">
                                    <ChevronRight className="w-5 h-5 text-white" strokeWidth={3} />
                                </div>
                            </div>
                        </div>
                    </Link>

                </div>
            </div>
        </div>
    );
}
