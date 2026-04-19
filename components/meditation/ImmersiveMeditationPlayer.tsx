"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { cn } from "@/lib/utils";
import { SoundscapesContent } from "@/components/soundscapes/SoundscapesContent";

import {
    ChevronDown,
    SlidersHorizontal,
    PlusCircle,
    Heart,
    Shuffle,
    SkipBack,
    Play,
    Pause,
    SkipForward,
    Repeat,
    ScrollText,
    Headphones,
    X
} from "lucide-react";

interface ImmersiveMeditationPlayerProps {
    isOpen: boolean;
    title: string;
    text: string;
    fullText?: string;
    isPlaying: boolean;
    isBuffering: boolean;
    onPlayPause: () => void;
    onClose: () => void;
    cardId?: string;
    queueCurrent?: number;
    queueTotal?: number;
    elapsedSeconds?: number;
    activeTracks?: Set<string>;
    trackVolumes?: Record<string, number>;
    masterVolume?: number;
    onToggleTrack?: (id: string) => void;
    onSetTrackVolume?: (id: string, volume: number) => void;
    onSetMasterVolume?: (volume: number) => void;
    onStopAll?: () => void;
    ambientSounds?: { id: string; name: string; icon: string }[];
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ImmersiveMeditationPlayer({
    isOpen,
    title,
    text,
    fullText = "",
    isPlaying,
    isBuffering,
    onPlayPause,
    onClose,
    queueCurrent = 0,
    queueTotal = 0,
    elapsedSeconds = 0,
    activeTracks = new Set(),
    trackVolumes = {},
    masterVolume = 0.7,
    onToggleTrack = () => { },
    onSetTrackVolume = () => { },
    onSetMasterVolume = () => { },
    onStopAll = () => { },
    ambientSounds = [],
}: ImmersiveMeditationPlayerProps) {
    const { triggerLight, triggerMedium, triggerSuccess } = useHaptics();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [showFullText, setShowFullText] = useState(false);
    const [showSoundscapes, setShowSoundscapes] = useState(false);


    // Format time mm:ss
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleFullText = () => {
        triggerLight();
        setShowFullText(!showFullText);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!mounted) return null;

    // Animation Variants - Simplified for iOS performance
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1] as const
            }
        },
        exit: {
            opacity: 0,
            transition: {
                duration: 0.25,
                ease: [0.4, 0, 1, 1] as const
            }
        },
    };

    // Card content - simple fade + slight scale, no stagger
    const cardContentVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1] as const,
                delay: 0.1
            }
        },
        exit: { opacity: 0, transition: { duration: 0.15 } }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="player-portal"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed inset-0 z-[9999] flex flex-col font-display overflow-hidden bg-gradient-to-br from-rosewater to-lemon-yellow"
                >
                    {/* Background Blobs - Optimized for iOS (removed mix-blend-multiply, reduced blur) */}
                    <motion.div 
                        initial={{ opacity: 0.6, scale: 1 }}
                        animate={{ opacity: [0.6, 0.8, 0.6], scale: [1, 1.05, 1] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-10 -left-10 w-96 h-96 bg-rosewater/40 rounded-full filter blur-3xl will-change-transform" 
                    />
                    <motion.div 
                        initial={{ opacity: 0.5, scale: 1 }}
                        animate={{ opacity: [0.5, 0.7, 0.5], scale: [1, 1.08, 1] }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute top-10 -right-10 w-96 h-96 bg-lemon-yellow/40 rounded-full filter blur-3xl will-change-transform" 
                    />
                    <motion.div 
                        initial={{ opacity: 0.4, scale: 1 }}
                        animate={{ opacity: [0.4, 0.6, 0.4], scale: [1, 1.05, 1] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                        className="absolute -bottom-10 left-20 w-[30rem] h-[30rem] bg-vibrant-rose-pink/30 rounded-full filter blur-3xl will-change-transform" 
                    />

                    {/* Top Bar */}
                    <div className="relative z-20 flex items-center justify-between p-6 pt-safe">
                        <button
                            onClick={() => {
                                triggerMedium();
                                onClose();
                            }}
                            className="flex items-center justify-center w-10 h-10 rounded-full glass-panel hover:bg-white/20 transition-colors text-dusty-rose-brown focus:outline-none"
                        >
                            <ChevronDown className="w-6 h-6" />
                        </button>

                        <div className="flex flex-col items-center gap-1">
                            <h2 className="text-dusty-rose-brown font-bold text-xs uppercase tracking-[0.2em] opacity-80">Now Meditating</h2>
                            <div className="flex gap-1 items-center">
                                <span className="w-1 h-1 bg-vibrant-rose-pink rounded-full animate-pulse" />
                                <span className="w-1 h-1 bg-vibrant-rose-pink rounded-full animate-pulse delay-75" />
                                <span className="w-1 h-1 bg-vibrant-rose-pink rounded-full animate-pulse delay-150" />
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                triggerMedium();
                                setShowSoundscapes(true);
                            }}
                            className="flex items-center justify-center w-10 h-10 rounded-full glass-panel hover:bg-white/20 transition-colors text-dusty-rose-brown focus:outline-none"
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Main Content - Completely full-bleed premium redesign */}
                    <div className="flex-1 relative z-10 w-full max-w-xl mx-auto flex flex-col px-6 pb-10">
                        {/* Artwork Area (Top half) */}
                        <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[350px]">
                            <motion.div
                                variants={cardContentVariants}
                                className="relative w-72 h-72 md:w-80 md:h-80 xl:w-[400px] xl:h-[400px] group"
                            >
                                {/* Massive deep shadow for the record */}
                                <div className="absolute inset-4 bg-black/30 rounded-full blur-2xl transform translate-y-8 scale-90" />
                                <div className="absolute inset-4 bg-vibrant-rose-pink/20 rounded-full blur-3xl transform -translate-y-4 scale-105" />
                                
                                <div
                                    className={cn(
                                        "w-full h-full rounded-full bg-black p-1 shadow-2xl relative overflow-hidden ring-4 ring-white/10 transition-all duration-[2s] ease-linear will-change-transform border border-black/50",
                                        isPlaying && !isBuffering ? "animate-[spin_10s_linear_infinite]" : ""
                                    )}
                                    style={{
                                        animationPlayState: isPlaying && !isBuffering ? "running" : "paused",
                                    }}
                                >
                                    <div className="w-full h-full rounded-full overflow-hidden relative">
                                        {/* Vinyl Groove Texture */}
                                        <div
                                            className="absolute inset-0 z-10 pointer-events-none mix-blend-overlay"
                                            style={{
                                                background: `radial-gradient(
                                                    circle, 
                                                    transparent 45%, 
                                                    rgba(255,255,255,0.05) 46%, 
                                                    transparent 47%,
                                                    transparent 50%,
                                                    rgba(255,255,255,0.05) 51%,
                                                    transparent 52%,
                                                    transparent 55%,
                                                    rgba(255,255,255,0.05) 56%,
                                                    transparent 57%
                                                )`
                                            }}
                                        />

                                        {/* Album Art */}
                                        <img
                                            alt="Meditation Art"
                                            className="w-full h-full object-cover opacity-90 transition-opacity duration-700"
                                            src="/vinyl-cover.png"
                                        />

                                        {/* Center Label */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-neutral-800 to-black rounded-full border-[6px] border-[#1a1a1a] z-20 flex items-center justify-center shadow-inner">
                                            <div className="w-3 h-3 bg-white/10 rounded-full flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Player Information (Bottom half) */}
                        <div className="w-full flex flex-col justify-end">
                            {/* Title & Metadata */}
                            <motion.div variants={cardContentVariants} className="w-full mb-6 mt-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 flex flex-col min-w-0 pr-4">
                                        <h1 className="text-3xl md:text-[40px] font-extrabold text-dusty-rose-brown tracking-tight truncate leading-tight drop-shadow-sm pb-1">
                                            {title || "Meditation"}
                                        </h1>
                                        <p className="text-lg text-dusty-rose-brown/70 font-semibold truncate pt-1 tracking-wide">
                                            {isBuffering ? "Buffering..." : "Inner Peace"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <button className="p-3 rounded-full bg-white/30 hover:bg-white/50 active:scale-95 transition-all text-dusty-rose-brown/80 hover:text-dusty-rose-brown backdrop-blur-md shadow-sm border border-white/30">
                                            <PlusCircle className="w-6 h-6" strokeWidth={2} />
                                        </button>
                                        <button className="p-3 rounded-full bg-white/30 hover:bg-white/50 active:scale-95 transition-all text-dusty-rose-brown/80 hover:text-vibrant-rose-pink backdrop-blur-md shadow-sm border border-white/30">
                                            <Heart className="w-6 h-6 hover:fill-vibrant-rose-pink transition-colors" strokeWidth={2} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Scrubber Area */}
                            <motion.div variants={cardContentVariants} className="w-full mb-10">
                                {/* Waveform Header (Moved inside the scrubber logic seamlessly) */}
                                <div aria-label="Audio Waveform Visualization" className="h-10 flex items-end justify-start gap-[4px] w-full mb-3 cursor-pointer select-none" onClick={() => {
                                    if (onToggleTrack && ambientSounds.length > 0) {
                                        onToggleTrack(ambientSounds[0].id);
                                    }
                                }}>
                                    {[
                                        { h: "h-3", op: 0.3 }, { h: "h-5", op: 0.4 }, { h: "h-4", op: 0.3 },
                                        { h: "h-7", op: 0.6 }, { h: "h-4", op: 0.4 }, { h: "h-6", op: 0.7 },
                                        { h: "h-8", op: 0.9 }, { h: "h-5", op: 0.5 }, { h: "h-10", op: 1.0 },
                                        { h: "h-6", op: 0.6 }, { h: "h-8", op: 0.8 }, { h: "h-4", op: 0.4 },
                                        { h: "h-5", op: 0.5 }, { h: "h-3", op: 0.3 }
                                    ].map((bar, index) => (
                                        <motion.div
                                            key={index}
                                            className={cn("w-[6px] bg-dusty-rose-brown/80 rounded-full pointer-events-none", bar.h)}
                                            style={{ opacity: bar.op }}
                                            animate={isPlaying && !isBuffering ? {
                                                scaleY: [1, 1.3, 0.8, 1.1, 1],
                                            } : { scaleY: 1 }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 1.2 + (index * 0.1),
                                                ease: "easeInOut",
                                                repeatType: "mirror"
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="w-full h-[6px] bg-white/40 backdrop-blur-md rounded-full overflow-hidden shadow-inner ring-1 ring-white/30">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-rose-400 to-vibrant-rose-pink rounded-full shadow-[0_0_10px_rgba(251,113,133,0.8)]"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${queueTotal > 0 ? (Math.min(queueCurrent, queueTotal) / Math.max(queueTotal, 1)) * 100 : 0}%`
                                        }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                    />
                                </div>
                                <div className="w-full flex justify-between text-[13px] font-bold text-dusty-rose-brown/70 mt-3 tracking-widest px-1">
                                    <span>{formatTime(elapsedSeconds)}</span>
                                    <span>{queueTotal > 0 ? `${queueCurrent}/${queueTotal}` : formatTime(queueTotal * 30)}</span>
                                </div>
                            </motion.div>

                            {/* Core Controls */}
                            <motion.div variants={cardContentVariants} className="flex items-center justify-between w-full mb-8 px-2">
                                <button className="text-dusty-rose-brown/60 hover:text-dusty-rose-brown transition-all p-3 hover:scale-110 active:scale-95 hover:bg-white/20 rounded-full focus:outline-none">
                                    <Shuffle className="w-7 h-7 stroke-[2]" />
                                </button>

                                <div className="flex items-center gap-6 md:gap-10">
                                    <button className="group relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/30 backdrop-blur-xl border border-white/50 hover:bg-white/50 transition-all active:scale-95 shadow-lg focus:outline-none">
                                        <SkipBack className="w-7 h-7 md:w-8 md:h-8 text-dusty-rose-brown fill-dusty-rose-brown" />
                                    </button>

                                    <button
                                        onClick={() => {
                                            triggerSuccess();
                                            onPlayPause();
                                        }}
                                        className="relative flex items-center justify-center w-24 h-24 md:w-28 md:h-28 rounded-full bg-white/95 backdrop-blur-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] hover:scale-105 active:scale-95 transition-all focus:outline-none group border border-white/60"
                                    >
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-100 to-white/70 pointer-events-none opacity-50" />
                                        {isBuffering ? (
                                            <div className="relative w-8 h-8 md:w-10 md:h-10 border-t-4 border-r-4 border-dusty-rose-brown rounded-full animate-spin" />
                                        ) : (
                                            isPlaying ? (
                                                <Pause className="w-10 h-10 md:w-12 md:h-12 text-dusty-rose-brown fill-dusty-rose-brown stroke-[0]" />
                                            ) : (
                                                <Play className="w-10 h-10 md:w-12 md:h-12 text-dusty-rose-brown fill-dusty-rose-brown ml-2 stroke-[0]" />
                                            )
                                        )}
                                    </button>

                                    <button className="group relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/30 backdrop-blur-xl border border-white/50 hover:bg-white/50 transition-all active:scale-95 shadow-lg focus:outline-none">
                                        <SkipForward className="w-7 h-7 md:w-8 md:h-8 text-dusty-rose-brown fill-dusty-rose-brown" />
                                    </button>
                                </div>

                                <button className="text-dusty-rose-brown/60 hover:text-dusty-rose-brown transition-all p-3 hover:scale-110 active:scale-95 hover:bg-white/20 rounded-full focus:outline-none">
                                    <Repeat className="w-7 h-7 stroke-[2]" />
                                </button>
                            </motion.div>

                            {/* Footer Options */}
                            <motion.div variants={cardContentVariants} className="flex flex-row items-center justify-center gap-6 w-full pt-6 border-t border-dusty-rose-brown/10">
                                <button
                                    onClick={toggleFullText}
                                    className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/40 backdrop-blur-2xl border border-white/60 hover:bg-white/60 hover:shadow-xl transition-all group focus:outline-none active:scale-95 shadow-md"
                                >
                                    <ScrollText className="w-5 h-5 text-dusty-rose-brown group-hover:scale-110 transition-transform stroke-[2.5]" />
                                    <span className="text-dusty-rose-brown font-extrabold text-[13px] tracking-[0.25em] uppercase">Script</span>
                                </button>

                                <div className="flex items-center gap-2 px-6 py-4 rounded-full bg-dusty-rose-brown/10 backdrop-blur-xl border border-dusty-rose-brown/10">
                                    <Headphones className="w-5 h-5 text-dusty-rose-brown/80 stroke-[2.5]" />
                                    <span className="text-[12px] font-extrabold tracking-[0.3em] text-dusty-rose-brown/80 uppercase">AirPods Pro</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>



                    {/* Full Script Modal */}
                    <AnimatePresence>
                        {showFullText && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md"
                                onClick={() => setShowFullText(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full max-w-lg max-h-[80vh] flex flex-col bg-white/90 backdrop-blur-2xl rounded-[2rem] border border-white/60 shadow-2xl overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-6 py-5 border-b border-dusty-rose-brown/10">
                                        <h3 className="text-lg font-bold text-dusty-rose-brown">Meditation Script</h3>
                                        <button
                                            onClick={() => setShowFullText(false)}
                                            className="w-8 h-8 flex items-center justify-center bg-dusty-rose-brown/10 rounded-full text-dusty-rose-brown hover:bg-dusty-rose-brown/20 transition-colors focus:outline-none"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                        <p className="text-base text-dusty-rose-brown/80 leading-loose whitespace-pre-wrap font-medium">
                                            {fullText || "Preparing script..."}
                                        </p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Soundscapes Overlay */}
                    <AnimatePresence>
                        {showSoundscapes && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="fixed inset-0 z-[10000] bg-black"
                            >
                                <SoundscapesContent onClose={() => setShowSoundscapes(false)} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                </motion.div>
            )
            }
        </AnimatePresence >,
        document.body
    );
}
