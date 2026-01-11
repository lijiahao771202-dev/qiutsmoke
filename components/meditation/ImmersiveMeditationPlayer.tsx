"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { cn } from "@/lib/utils";
import { SoundscapesContent } from "@/components/soundscapes/SoundscapesContent";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

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

    // Animation Variants
    const containerVariants = {
        hidden: { y: "100%" },
        visible: {
            y: 0,
            transition: {
                type: "spring" as const,
                stiffness: 300,
                damping: 30,
                mass: 1,
                staggerChildren: 0.1, // Faster stagger
                delayChildren: 0.2 // Wait for container to start sliding up
            }
        },
        exit: {
            y: "100%",
            transition: {
                type: "spring" as const,
                stiffness: 300,
                damping: 30,
                mass: 1
            }
        },
    };

    const cardContentVariants = {
        hidden: { scale: 0.8, opacity: 0, y: 30 },
        visible: {
            scale: 1,
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                stiffness: 200, // Reduced stiffness for slower, jellier feel
                damping: 12,    // Low damping for bounce
                mass: 1.2,      // Heavier mass for "jelly" inertia
                duration: 0.8
            }
        },
        exit: { scale: 0.9, opacity: 0, transition: { duration: 0.2 } }
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
                    {/* Background Blobs */}
                    <div className="absolute top-0 -left-4 w-96 h-96 bg-rosewater rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
                    <div className="absolute top-0 -right-4 w-96 h-96 bg-lemon-yellow rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob [animation-delay:2s]" />
                    <div className="absolute -bottom-8 left-20 w-96 h-96 bg-vibrant-rose-pink rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob [animation-delay:4s]" />

                    {/* Top Bar */}
                    <div className="relative z-20 flex items-center justify-between p-6 pt-safe">
                        <button
                            onClick={() => {
                                triggerMedium();
                                onClose();
                            }}
                            className="flex items-center justify-center w-10 h-10 rounded-full glass-panel hover:bg-white/20 transition-colors text-dusty-rose-brown"
                        >
                            <span className="material-symbols-outlined text-2xl">keyboard_arrow_down</span>
                        </button>

                        <div className="flex flex-col items-center">
                            <h2 className="text-dusty-rose-brown font-bold text-xs uppercase tracking-[0.2em] opacity-80">Now Meditating</h2>
                        </div>

                        <button
                            onClick={() => {
                                triggerMedium();
                                setShowSoundscapes(true);
                            }}
                            className="flex items-center justify-center w-10 h-10 rounded-full glass-panel hover:bg-white/20 transition-colors text-dusty-rose-brown"
                        >
                            <span className="material-symbols-outlined text-xl">tune</span>
                        </button>
                    </div>

                    {/* Main Content - No animation to prevent flash */}
                    <div
                        className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 pb-8"
                    >
                        <div className="relative w-full max-w-sm aspect-[3/4.5]">
                            {/* Deep Glass Layer */}
                            <div className="absolute top-4 left-4 right-4 -bottom-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] transform scale-95 opacity-60 shadow-2xl" />

                            {/* Main Glass Card */}
                            <div className="absolute inset-0 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-[2.5rem] flex flex-col p-6 items-center justify-between shadow-2xl ring-1 ring-white/40">

                                <motion.div
                                    variants={cardContentVariants}
                                    className="relative w-64 h-64 mt-4 group"
                                >
                                    <div className="absolute inset-4 bg-black/20 rounded-full blur-xl transform translate-y-4" />
                                    <div
                                        className={cn(
                                            "w-full h-full rounded-full bg-black p-1 shadow-2xl relative overflow-hidden border-4 border-gray-900/10 transition-all duration-[2s] ease-linear will-change-transform",
                                            isPlaying && !isBuffering ? "animate-[spin_10s_linear_infinite]" : ""
                                        )}
                                        style={{
                                            animationPlayState: isPlaying && !isBuffering ? "running" : "paused",
                                        }}
                                    >
                                        <div className="w-full h-full rounded-full overflow-hidden relative">
                                            {/* Vinyl Groove Texture - Exact from prototype */}
                                            <div
                                                className="absolute inset-0 z-10 pointer-events-none"
                                                style={{
                                                    background: `radial-gradient(
                                                        circle, 
                                                        transparent 45%, 
                                                        rgba(0,0,0,0.1) 46%, 
                                                        transparent 47%,
                                                        transparent 50%,
                                                        rgba(0,0,0,0.1) 51%,
                                                        transparent 52%,
                                                        transparent 55%,
                                                        rgba(0,0,0,0.1) 56%,
                                                        transparent 57%
                                                    )`
                                                }}
                                            />

                                            {/* Album Art (Using exact image from prototype) */}
                                            <img
                                                alt="Abstract colorful swirls representing the album cover"
                                                className="w-full h-full object-cover"
                                                src="/vinyl-cover.png"
                                            />

                                            {/* Center Label - Corrected Size w-16 h-16 */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-gray-800 to-black rounded-full border-4 border-gray-700 z-20 flex items-center justify-center shadow-lg">
                                                <div className="w-2 h-2 bg-black rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Title & Info */}
                                <motion.div
                                    variants={cardContentVariants}
                                    className="text-center w-full mt-6 mb-2"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <button className="text-dusty-rose-brown/40 hover:text-dusty-rose-brown transition-colors">
                                            <span className="material-symbols-outlined">add_circle</span>
                                        </button>

                                        <div className="flex-1 px-4 overflow-hidden">
                                            <h1 className="text-3xl font-bold text-dusty-rose-brown truncate leading-tight text-shadow-sm">
                                                {title || "Meditation"}
                                            </h1>
                                        </div>

                                        <button className="text-dusty-rose-brown hover:text-vibrant-rose-pink transition-colors">
                                            <span className="material-symbols-outlined font-variation-FILL-1">favorite</span>
                                        </button>
                                    </div>
                                    <p className="text-lg font-medium text-dusty-rose-brown/70">
                                        {isBuffering ? "Buffering..." : "Inner Peace"}
                                    </p>
                                </motion.div>

                                {/* Waveform Visualization (Static 17-bar Layout) */}
                                <div aria-label="Audio Waveform Visualization" className="h-8 flex items-end justify-center gap-[3px] w-full px-2 opacity-80 mb-4 cursor-pointer" onClick={() => {
                                    if (onToggleTrack && ambientSounds.length > 0) {
                                        onToggleTrack(ambientSounds[0].id);
                                    }
                                }}>
                                    {[
                                        { h: "h-3", op: 0.3 },
                                        { h: "h-5", op: 0.4 },
                                        { h: "h-4", op: 0.3 },
                                        { h: "h-6", op: 0.5 },
                                        { h: "h-3", op: 0.3 },
                                        { h: "h-5", op: 0.6 },
                                        { h: "h-7", op: 1.0 },
                                        { h: "h-4", op: 0.8 },
                                        { h: "h-6", op: 1.0 },
                                        { h: "h-8", op: 1.0 }, // Center
                                        { h: "h-5", op: 0.8 },
                                        { h: "h-7", op: 1.0 },
                                        { h: "h-4", op: 0.6 },
                                        { h: "h-3", op: 0.4 },
                                        { h: "h-5", op: 0.3 },
                                        { h: "h-2", op: 0.3 },
                                        { h: "h-4", op: 0.3 },
                                    ].map((bar, index) => (
                                        <motion.div
                                            key={index}
                                            className={cn("w-1.5 bg-dusty-rose-brown rounded-full", bar.h)}
                                            style={{ opacity: bar.op }}
                                            animate={isPlaying && !isBuffering ? {
                                                scaleY: [1, 1.2, 0.9, 1.1, 1],
                                            } : { scaleY: 1 }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 1.5 + (Math.random() * 0.5), // Slight random variation
                                                ease: "easeInOut",
                                                delay: index * 0.1,
                                                repeatType: "mirror"
                                            }}
                                        />
                                    ))}
                                </div>


                                {/* Fragment Progress Bar */}
                                <div className="w-full px-4 mb-2 mt-[-8px]">
                                    <div className="w-full h-1 bg-dusty-rose-brown/20 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-dusty-rose-brown/80 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{
                                                width: `${queueTotal > 0 ? (Math.min(queueCurrent, queueTotal) / Math.max(queueTotal, 1)) * 100 : 0}%`
                                            }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                        />
                                    </div>
                                </div>

                                {/* Time & Progress */}
                                <div className="w-full flex justify-between text-xs font-bold text-dusty-rose-brown/60 px-1 mb-4">
                                    <span>{formatTime(elapsedSeconds)}</span>
                                    <span>{queueTotal > 0 ? `${queueCurrent}/${queueTotal}` : formatTime(queueTotal * 30)}</span>
                                </div>

                                {/* Controls */}
                                <motion.div
                                    variants={cardContentVariants}
                                    className="flex items-center justify-between w-full px-4"
                                >
                                    <button className="text-dusty-rose-brown/60 hover:text-dusty-rose-brown transition-colors p-2">
                                        <span className="material-symbols-outlined text-[28px]">shuffle</span>
                                    </button>

                                    <div className="flex items-center gap-6">
                                        <button className="group relative flex items-center justify-center w-12 h-12 rounded-full glass-panel hover:bg-white/30 transition-all active:scale-95">
                                            <span className="material-symbols-outlined text-dusty-rose-brown text-[32px] ml-[-2px]">skip_previous</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                triggerSuccess();
                                                onPlayPause();
                                            }}
                                            className="relative flex items-center justify-center w-20 h-20 rounded-full bg-vibrant-rose-pink shadow-lg shadow-vibrant-rose-pink/30 hover:scale-105 active:scale-95 transition-all group"
                                        >
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-vibrant-rose-pink to-dusty-rose-brown opacity-100" />
                                            {isBuffering ? (
                                                <div className="relative w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <span className="relative material-symbols-outlined text-white text-[48px] font-variation-FILL-1">
                                                    {isPlaying ? "pause" : "play_arrow"}
                                                </span>
                                            )}
                                        </button>

                                        <button className="group relative flex items-center justify-center w-12 h-12 rounded-full glass-panel hover:bg-white/30 transition-all active:scale-95">
                                            <span className="material-symbols-outlined text-dusty-rose-brown text-[32px] mr-[-2px]">skip_next</span>
                                        </button>
                                    </div>

                                    <button className="text-dusty-rose-brown/60 hover:text-dusty-rose-brown transition-colors p-2">
                                        <span className="material-symbols-outlined text-[28px]">repeat</span>
                                    </button>
                                </motion.div>
                            </div>
                        </div>

                        {/* Lyrics/Script Button */}
                        <div className="mt-8">
                            <button
                                onClick={toggleFullText}
                                className="flex items-center gap-2 px-6 py-3 rounded-full glass-panel hover:bg-white/30 transition-all group shadow-lg shadow-dusty-rose-brown/10"
                            >
                                <span className="material-symbols-outlined text-dusty-rose-brown text-lg group-hover:scale-110 transition-transform">lyrics</span>
                                <span className="text-dusty-rose-brown font-bold text-sm tracking-wide">Script</span>
                            </button>
                        </div>

                        {/* Audio Output */}
                        <div className="mt-6 flex items-center gap-2 text-dusty-rose-brown/50">
                            <span className="material-symbols-outlined text-sm">speaker_group</span>
                            <span className="text-xs font-bold tracking-wide uppercase">AirPods Pro</span>
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
                                            className="w-8 h-8 flex items-center justify-center bg-dusty-rose-brown/10 rounded-full text-dusty-rose-brown hover:bg-dusty-rose-brown/20 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span>
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
