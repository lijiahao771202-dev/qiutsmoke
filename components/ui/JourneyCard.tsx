
import React, { useMemo } from "react";
import { motion, useMotionTemplate, useMotionValue, animate } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface JourneyCardProps {
    days: number;
    times: number;
}

// --- VISUAL ENGINE CONFIG ---
// Each stage defines the "Soul" of the card: Colors, Shadows, and Light.
const STAGES = [
    // 0-5: The Calm Start (Sky Blue)
    {
        min: 0, max: 5,
        bg: "from-sky-400 via-blue-400 to-indigo-500",
        accent: "text-blue-100",
        button: "from-blue-500/20 to-sky-400/20",
        glow: "shadow-blue-400/50",
        label: "Beginner"
    },
    // 6-20: Growth (Emerald Green)
    {
        min: 6, max: 20,
        bg: "from-emerald-400 via-teal-500 to-green-600",
        accent: "text-emerald-100",
        button: "from-emerald-500/20 to-teal-400/20",
        glow: "shadow-emerald-400/50",
        label: "Seedling"
    },
    // 21-50: Ignition (Amber Orange) - CURRENT
    {
        min: 21, max: 50,
        bg: "from-amber-300 via-orange-500 to-red-600",
        accent: "text-amber-100",
        button: "from-orange-500/20 to-amber-400/20",
        glow: "shadow-orange-400/50",
        label: "Spark"
    },
    // 51-100: Passion Flow (Rose Pink)
    {
        min: 51, max: 100,
        bg: "from-rose-400 via-pink-500 to-fuchsia-600",
        accent: "text-rose-100",
        button: "from-rose-500/20 to-pink-400/20",
        glow: "shadow-rose-400/50",
        label: "Flow"
    },
    // 101-300: Deep Orbit (Violet Purple)
    {
        min: 101, max: 300,
        bg: "from-violet-400 via-purple-600 to-indigo-800",
        accent: "text-violet-100",
        button: "from-violet-500/20 to-purple-400/20",
        glow: "shadow-violet-400/50",
        label: "Orbit"
    },
    // 301-600: Cosmic Galaxy (Deep Blue Space)
    {
        min: 301, max: 600,
        bg: "from-blue-600 via-indigo-800 to-slate-900",
        accent: "text-blue-100",
        button: "from-blue-500/20 to-indigo-400/20",
        glow: "shadow-blue-400/50",
        label: "Galaxy"
    },
    // 601-999: Enlightenment (Cyan Ethereal)
    {
        min: 601, max: 999,
        bg: "from-cyan-300 via-sky-400 to-blue-500",
        accent: "text-cyan-100",
        button: "from-cyan-500/20 to-sky-400/20",
        glow: "shadow-cyan-400/50",
        label: "Nirvana"
    },
    // 1000+: Golden Legend (Gold/Platinum)
    {
        min: 1000, max: 100000,
        bg: "from-yellow-200 via-amber-400 to-yellow-700",
        accent: "text-yellow-100",
        button: "from-yellow-500/20 to-amber-400/20",
        glow: "shadow-amber-400/50",
        label: "Infinite"
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
        <div className="relative w-full h-full group">

            {/* 
          1. THE VESSEL (Container)
          High-grade liquid glass container with deep refraction shadows.
       */}
            <div className="relative w-full h-full overflow-hidden rounded-[2.5rem] bg-[#1a1a1a] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transform-gpu border border-white/5">

                {/* 
             2. LAVALAMP ENGINE (Living Background)
             Multiple gradients moving in organic, fluid paths.
          */}
                {/* 
             2. LYCHEE SKIN TEXTURE (The Surface)
             A deep, pebbled leather texture using high-frequency noise and lighting.
          */}
                {/* Base Leather Color (Deep Charcoal/Black) */}
                <div className="absolute inset-0 bg-[#0F0F10]" />

                {/* The "Pebbles" - Created via high-contrast SVG Noise */}
                <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                        filter: 'contrast(150%) brightness(120%)'
                    }}
                />

                {/* Leather Sheen (Specular Highlight) - Subtle gradient washing over the texture */}
                <motion.div
                    animate={{ opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 pointer-events-none"
                />

                {/* Stitching / Indent Effect (Optional Vignette) */}
                <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] pointer-events-none" />



                {/* Inner Highlight for 3D Glass Effect */}
                {/* Inner Highlight Removed completely */}


                {/* 
             3. HYDRO-DYNAMIC CONTENT (Content Layer)
          */}
                <div className="relative z-10 flex flex-col h-full p-7 justify-between text-white">

                    {/* Header: Levitating Badge */}
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <h3 className="text-sm font-bold tracking-widest text-amber-500/80 uppercase drop-shadow-sm">Journey</h3>
                        </div>

                        {/* Review: Glass Capsule Badge */}
                        <div className="bg-white/10 backdrop-blur-md pl-3 pr-4 py-1.5 rounded-full border border-white/20 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] flex items-center gap-2">
                            <div className="bg-white/20 p-1 rounded-full">
                                <Calendar className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-bold text-amber-100/90 tracking-wide">Day {days} <span className="text-white/30 mx-1">/</span> {GOAL_DAYS}</span>
                        </div>
                    </div>

                    {/* Main Stats: The "Etched" Numbers */}
                    <div className="flex items-end justify-between mt-2 mb-4">

                        {/* Big Number: Liquid Type */}
                        <div className="flex flex-col relative">
                            <span className="text-[6.5rem] leading-[0.8] font-bold tracking-tighter drop-shadow-xl bg-gradient-to-b from-amber-100 to-amber-400/80 bg-clip-text text-transparent transform -ml-1">
                                {times}
                            </span>
                            <div className="flex items-center gap-2 mt-2 ml-1">
                                <div className="h-1 w-6 bg-white/50 rounded-full" />
                                <span className="text-lg font-medium text-white/90 shadow-black/10 tracking-wide">Sessions</span>
                            </div>
                        </div>

                        {/* Progress Ring: Liquid Droplet Style */}
                        <div className="relative w-24 h-24 mb-1">
                            {/* Glass Base Track */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 filter drop-shadow-md">
                                <circle
                                    cx="50%" cy="50%" r="40"
                                    stroke="currentColor" strokeWidth="8"
                                    fill="transparent"
                                    className="text-black/10"
                                />
                                {/* Liquid Fill Path */}
                                <motion.circle
                                    cx="50%" cy="50%" r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeLinecap="round" // Creates the droplet end
                                    strokeDasharray={251}
                                    initial={{ strokeDashoffset: 251 }}
                                    animate={{ strokeDashoffset: 251 - (251 * progress) }}
                                    transition={{ duration: 1.8, ease: "easeOut" }}
                                    transition={{ duration: 1.8, ease: "easeOut" }}
                                    className="text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                                />
                            </svg>
                            {/* Center Metric */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-0.5">Goal</span>
                                <span className="text-xl font-bold text-white filter drop-shadow-md">{Math.round(progress * 100)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* 
               4. THE PHOTON STREAM BUTTON (The Guidance)
               "Liquid Light that pushes you forward"
            */}
                    <Link href="/practice" className="w-full relative group/btn block isolate">

                        {/* 1. The Magnetic Field (Outer Glow) */}
                        <div className={cn(
                            "absolute -inset-0.5 rounded-2xl blur-md opacity-40 group-hover/btn:opacity-100 transition-opacity duration-500",
                            stage.glow
                        )} />

                        {/* 2. The Glass Tube (Button Body) */}
                        <div className="relative h-16 overflow-hidden rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] transition-transform duration-200 active:scale-[0.98]">

                            {/* 3. The Photon Stream (Light Animation) */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-20"
                                initial={{ x: "-150%" }}
                                animate={{ x: "150%" }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    repeatDelay: 0.5,
                                    ease: "easeInOut"
                                }}
                            />

                            {/* 4. Interactive Content */}
                            <div className="relative h-full flex items-center justify-between px-6 z-10">
                                {/* Text Group */}
                                <div className="flex flex-col justify-center">
                                    <span className="text-white font-bold text-[15px] tracking-wide drop-shadow-sm flex items-center gap-2 group-hover/btn:translate-x-1 transition-transform">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-200 fill-amber-200 opacity-80" />
                                        Start Practice
                                    </span>
                                </div>

                                {/* 5. The Accelerator (Arrow) */}
                                <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-md border border-white/20 shadow-sm group-hover/btn:bg-white/30 transition-colors">
                                    {/* Bouncing Arrow */}
                                    <motion.div
                                        animate={{ x: [0, 4, 0] }}
                                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <ChevronRight className="w-5 h-5 text-white" strokeWidth={3} />
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </Link>

                </div>
            </div>
        </div>
    );
}
