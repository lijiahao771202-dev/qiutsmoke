"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { Sparkles, Play, Square, Loader2, Brain, AudioLines, Wind, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAIMeditationGenerator } from "@/lib/hooks/useAIMeditationGenerator";
import { cn } from "@/lib/utils";

export default function AIRecommendationCard() {
    const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening">("morning");
    const { status, script, isPlaying, progress, generateAndPlay, stop } = useAIMeditationGenerator();
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) setTimeOfDay("morning");
        else if (hour >= 12 && hour < 18) setTimeOfDay("afternoon");
        else setTimeOfDay("evening");
    }, []);

    const config = useMemo(() => {
        switch (timeOfDay) {
            case "morning":
                return {
                    label: "MORNING RITUAL",
                    title: "First Light",
                    subtitle: "Awaken & Energize",
                    prompt: "创建一个3分钟的清晨唤醒冥想。引导用户感受阳光，唤醒身体能量，设定积极的一天意图。语速适中偏快，充满希望。",
                    // 晨曦：温暖的橙金渐变
                    bgClass: "bg-gradient-to-input from-[#FF9A9E] to-[#FECFEF]", // Peach/Pink
                    orbClass: "from-yellow-300 via-orange-400 to-red-400",
                    accent: "text-orange-100",
                    icon: Sun
                };
            case "afternoon":
                return {
                    label: "MIDDAY RESET",
                    title: "Flow State",
                    subtitle: "Recharge & Focus",
                    prompt: "创建一个3分钟的午间放松冥想。引导用户释放上午的压力，进行几次深呼吸，快速扫描身体放松肩颈，恢复专注力。",
                    // 午后：清新的蓝绿渐变
                    bgClass: "bg-gradient-to-tr from-[#84fab0] to-[#8fd3f4]", // Mint/Blue
                    orbClass: "from-cyan-300 via-emerald-400 to-teal-500",
                    accent: "text-cyan-100",
                    icon: Wind
                };
            case "evening":
                return {
                    label: "NIGHT SCAPE",
                    title: "Deep Drift",
                    subtitle: "Release & Sleep",
                    prompt: "创建一个5分钟的助眠冥想。引导用户放下白天的烦恼，进行深度身体扫描，感受床铺的支持，慢慢进入梦乡。语速非常缓慢，温柔。",
                    // 深夜：深邃的紫蓝渐变
                    bgClass: "bg-gradient-to-br from-[#24243e] via-[#302b63] to-[#0f0c29]", // Deep Purple/Black
                    orbClass: "from-indigo-400 via-purple-500 to-pink-500",
                    accent: "text-indigo-200",
                    icon: Moon
                };
        }
    }, [timeOfDay]);

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (status === "idle" || status === "completed" || status === "error") {
            generateAndPlay(config.prompt, timeOfDay === "evening" ? 5 : 3);
        } else {
            stop();
        }
    };

    return (
        <div
            className="w-full h-full relative rounded-[2.5rem] overflow-hidden group cursor-pointer isolate"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handlePlay}
        >
            {/* 1. Dynamic Atmopsheric Background */}
            <div className={cn("absolute inset-0 transition-opacity duration-1000", config.bgClass)} />

            {/* Noise Overlay for Texture */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            {/* Darken Overlay for Text Contrast */}
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />

            {/* 2. Content Container */}
            <div className="relative z-10 w-full h-full flex flex-col justify-between p-7">

                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-full bg-white/20 backdrop-blur-md">
                                <config.icon className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-[10px] font-bold tracking-[0.2em] text-white/90 uppercase font-mono">
                                {config.label}
                            </span>
                        </div>
                    </div>
                    {/* Generative Badge */}
                    <div className="px-2 py-0.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
                        <span className="text-[9px] text-white/80 font-medium tracking-wide uppercase flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI Gen
                        </span>
                    </div>
                </div>

                {/* Center: The Breathing Orb / Visualizer */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <AnimatePresence mode="wait">
                        {status === "idle" && (
                            <motion.div
                                className="relative"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                            >
                                {/* Core Orb (Glow) */}
                                <div className={cn(
                                    "w-32 h-32 rounded-full blur-[40px] opacity-60 animate-pulse-slow transition-colors duration-700 bg-gradient-to-tr",
                                    config.orbClass
                                )} />
                                {/* Sharp Ring */}
                                <div className={cn(
                                    "absolute inset-0 m-auto w-24 h-24 rounded-full border border-white/30 backdrop-blur-[2px] flex items-center justify-center transition-all duration-500",
                                    isHovered ? "scale-110 border-white/60" : "scale-100"
                                )}>
                                    <Play className="w-8 h-8 text-white fill-white shadow-xl opacity-90 ml-1" />
                                </div>
                            </motion.div>
                        )}

                        {(status === "generating" || status === "synthesizing") && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.2 }}
                                className="relative w-40 h-40 flex items-center justify-center"
                            >
                                {/* Neural Spinning Rings */}
                                <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-white/40 animate-spin duration-[2s]" />
                                <div className="absolute inset-2 rounded-full border-r-2 border-b-2 border-white/20 animate-spin-reverse duration-[3s]" />

                                {/* Center Brain/Chip */}
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    <Brain className="w-8 h-8 text-white/80 animate-pulse" />
                                    <span className="text-[10px] text-white/70 font-mono tracking-widest typing-cursor">
                                        THINKING...
                                    </span>
                                </div>

                                {/* Floating Code Stream Effect */}
                                <div className="absolute -bottom-16 w-48 text-center mask-image-gradient-b">
                                    <p className="text-[10px] text-white/40 font-mono leading-tight tracking-tight line-clamp-2">
                                        {script.slice(-60) || "Analyzing biometrics data..."}
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {status === "playing" && (
                            <motion.div
                                key="playing"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="relative w-48 h-48 flex items-center justify-center"
                            >
                                {/* Audio Visualizer Rings */}
                                {[1, 2, 3].map((i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute inset-0 m-auto rounded-full border border-white/10"
                                        style={{ width: `${i * 33}%`, height: `${i * 33}%` }}
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.3, 0.1, 0.3],
                                            borderWidth: ["1px", "2px", "1px"]
                                        }}
                                        transition={{
                                            duration: 2,
                                            delay: i * 0.2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    />
                                ))}

                                {/* Progress Ring */}
                                <svg className="absolute inset-0 w-full h-full -rotate-90">
                                    <circle
                                        cx="50%" cy="50%" r="38%"
                                        className="stroke-white/10 fill-none stroke-[2px]"
                                    />
                                    <motion.circle
                                        cx="50%" cy="50%" r="38%"
                                        className="stroke-white fill-none stroke-[3px] drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                        strokeDasharray="251.2" // 2 * PI * 40 (approx 38% of 96*2?) -> let's estimate r=36px -> 2*PI*36 = 226
                                        // Actually let's just use pathLength 1
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: progress / 100 }}
                                        transition={{ ease: "linear" }}
                                    />
                                </svg>

                                {/* Stop Button Center */}
                                <div className="relative z-10 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors border border-white/20">
                                    <Square className="w-5 h-5 text-white fill-white" />
                                </div>

                                <span className="absolute -bottom-8 text-xs text-white/50 font-mono tracking-widest">
                                    PLAYING
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Left */}
                <div className="flex flex-col gap-0.5 z-10  text-white drop-shadow-md">
                    <h2 className="text-3xl font-light tracking-tight font-serif italic opacity-90">
                        {config.title}
                    </h2>
                    <p className="text-sm text-white/70 font-medium tracking-wide">
                        {config.subtitle}
                    </p>
                </div>

                {/* Footer Right (Duration) */}
                <div className="absolute right-7 bottom-7 z-10">
                    <span className="text-xs font-bold text-white/40 font-mono border border-white/20 px-2 py-1 rounded-md">
                        {timeOfDay === "evening" ? "05:00" : "03:00"}
                    </span>
                </div>

            </div>
        </div>
    );
}
