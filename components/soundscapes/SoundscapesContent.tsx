"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Volume2, Play, Pause, RotateCcw } from "lucide-react";
import { useGlobalWhiteNoise } from "@/contexts/WhiteNoiseContext";
import { SOUND_DATA } from "@/lib/data/soundscapes";
import { GlassSoundCard } from "@/components/soundscapes/GlassSoundCard";
import { cn } from "@/lib/utils";

interface SoundscapesContentProps {
    onClose?: () => void;
}

export function SoundscapesContent({ onClose }: SoundscapesContentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        activeTracks,
        toggleTrack,
        setTrackVolume,
        masterVolume,
        setMasterVolume,
        isPlaying,
        togglePlayPause,
        stopAll
    } = useGlobalWhiteNoise();

    const [activeTab, setActiveTab] = useState(SOUND_DATA[0].id);

    const handleBack = () => {
        if (onClose) {
            onClose();
        } else {
            const returnTo = searchParams.get('returnTo') || '/practice';
            router.push(returnTo);
        }
    };

    // 1. Modal Fade Animation (Container) - 淡入淡出
    const modalVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1] as const  // easeOut cubic-bezier
            }
        },
        exit: {
            opacity: 0,
            transition: {
                duration: 0.4,
                ease: [0.4, 0, 1, 1] as const  // easeIn cubic-bezier
            }
        }
    };

    // 2. Content Stagger Animation (Inner Wrapper)
    const contentStaggerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2, // Increased stagger for "交错" feeling
                delayChildren: 0.3    // Wait for slide-up to partially complete
            }
        },
        exit: { opacity: 0 }
    };

    // 3. Item Jelly Animation (Individual Elements)
    const itemVariants = {
        hidden: { y: 40, opacity: 0, scale: 0.9 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring" as const,
                stiffness: 90,  // Very soft spring (was 200)
                damping: 14,    // Low damping for bounce
                mass: 1.5       // Heavy mass for "slow" jelly feel
            }
        }
    };

    return (
        <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative min-h-screen w-full overflow-hidden bg-[#1c1917] font-sans"
        >
            {/* 🌅 Warm Cozy Background (Sunset/Fireplace Theme) */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#451a03] via-[#292524] to-[#0c0a09]" />

                {/* Warm Light Orbs - Smoother Animation */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                        x: [0, 20, 0],
                        y: [0, -20, 0]
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-600/20 blur-[100px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.2, 0.4, 0.2],
                        x: [0, -30, 0],
                        y: [0, 30, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-700/10 blur-[120px]"
                />

                {/* 🌫️ Glass Overlay Texture */}
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
            </div>

            {/* Content Container - Handles Staggering */}
            <motion.div
                variants={contentStaggerVariants}
                className="relative z-10 w-full h-screen flex flex-col pt-[calc(env(safe-area-inset-top)+24px)]"
            >

                {/* Header */}
                <motion.div variants={itemVariants} className="flex items-center justify-between px-6 py-6 shrink-0">
                    <button
                        onClick={handleBack}
                        className="p-3 rounded-full bg-stone-800/40 backdrop-blur-md border border-white/5 text-stone-300 hover:bg-stone-700/50 hover:text-white transition-all active:scale-95 group"
                        aria-label="返回"
                        title="返回"
                    >
                        <ChevronDown className="w-6 h-6 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                    <h1 className="text-xl font-medium text-orange-50/90 tracking-wide font-serif">
                        环境音效
                    </h1>
                    <div className="w-12" /> {/* Spacer for centering */}
                </motion.div>

                {/* Categories Tabs */}
                <motion.div variants={itemVariants} className="px-6 pb-2 overflow-x-auto gap-4 no-scrollbar mask-gradient-x shrink-0">
                    <div className="flex gap-3 pb-2">
                        {SOUND_DATA.map((cat) => {
                            const isActive = activeTab === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap backdrop-blur-md border",
                                        isActive
                                            ? "bg-orange-500/20 border-orange-500/30 text-orange-100 shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)]"
                                            : "bg-stone-800/30 border-white/5 text-stone-400 hover:bg-stone-800/50 hover:text-stone-200"
                                    )}
                                    aria-label={`Switch to ${cat.title}`}
                                    title={cat.title}
                                >
                                    <span className={isActive ? "text-orange-200" : "opacity-70"}>
                                        {cat.icon}
                                    </span>
                                    <span>{cat.title}</span>
                                </button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Sounds Grid - Scrollable Area */}
                <motion.div variants={itemVariants} className="flex-1 overflow-y-auto min-h-0 px-6 pb-32 mask-gradient-y">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4"
                        >
                            {SOUND_DATA.find(cat => cat.id === activeTab)?.sounds.map((sound) => {
                                const activeTrack = activeTracks.get(sound.id);
                                return (
                                    <GlassSoundCard
                                        key={sound.id}
                                        id={sound.id}
                                        label={sound.label}
                                        description={sound.description}
                                        icon={sound.icon}
                                        isActive={!!activeTrack}
                                        volume={activeTrack?.volume ?? 0.5}
                                        onToggle={() => toggleTrack(sound.id)}
                                        onVolumeChange={(val) => setTrackVolume(sound.id, val)}
                                    />
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </motion.div>

            {/* Global Controls (Floating bottom) */}
            <AnimatePresence>
                {(activeTracks.size > 0 || isPlaying) && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{
                            delay: 0.5,
                            type: "spring",
                            stiffness: 100,
                            damping: 20
                        }}
                        className="fixed bottom-8 left-6 right-6 z-20"
                    >
                        <div className="bg-stone-900/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center gap-4">
                            {/* Play/Pause */}
                            <button
                                onClick={togglePlayPause}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 shrink-0 active:scale-95"
                            >
                                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                            </button>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-orange-50 truncate">
                                    {activeTracks.size} 个正在播放
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <Volume2 className="w-3.5 h-3.5 text-stone-400" />
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={masterVolume}
                                        onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400"
                                        aria-label="总音量"
                                        title="总音量"
                                    />
                                </div>
                            </div>

                            {/* Reset Button */}
                            <button
                                onClick={stopAll}
                                className="p-2.5 rounded-full hover:bg-white/10 text-stone-400 hover:text-white transition-colors active:scale-95"
                                title="停止全部"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
