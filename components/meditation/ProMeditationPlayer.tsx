"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { cn } from "@/lib/utils";
import { SoundscapesContent } from "@/components/soundscapes/SoundscapesContent";

import {
    ChevronDown,
    SlidersHorizontal,
    PlusCircle,
    Shuffle,
    SkipBack,
    Play,
    Pause,
    SkipForward,
    Repeat,
    Menu,
    Airplay,
    X,
    Loader2
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

export default function ProMeditationPlayer({
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

    const containerVariants = {
        hidden: { opacity: 0, y: "100%" },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { type: "spring", damping: 25, stiffness: 200 }
        },
        exit: { 
            opacity: 0, 
            y: "100%", 
            transition: { type: "spring", damping: 25, stiffness: 200 } 
        },
    };

    const progress = queueTotal > 0 ? Math.min(queueCurrent / Math.max(queueTotal, 1), 1) : (elapsedSeconds > 0 ? 0.3 : 0);

    // Array of gorgeous Unsplash nature images for the album cover
    const natureImages = [
        "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=800&auto=format&fit=crop", // Sunrise lake
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop", // Beach twilight
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=800&auto=format&fit=crop", // Forest light
        "https://images.unsplash.com/photo-1531804055938-4bc2b7754b2d?q=80&w=800&auto=format&fit=crop", // Misty mountains
    ];
    // Hash the title to deterministically pick an image
    const imageIndex = title ? title.length % natureImages.length : 0;
    const currentImageUrl = natureImages[imageIndex];

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="player-portal"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    // High-end glassmorphism letting the theme bleed through
                    className="fixed inset-0 z-[9999] flex flex-col font-sans overflow-hidden bg-background/50 dark:bg-background/40 backdrop-blur-[80px] saturate-[1.5]"
                >
                    {/* Very subtle breathing light overlay to keep the space feeling alive without overriding the theme */}
                    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none mix-blend-overlay">
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.1, 1],
                                opacity: [0.1, 0.2, 0.1],
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] rounded-full bg-foreground/10 blur-[100px]"
                        />
                    </div>

                    {/* Top TopBar */}
                    <div className="relative z-20 flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top,44px),24px)] pb-2 text-foreground">
                        <button
                            onClick={() => {
                                triggerMedium();
                                onClose();
                            }}
                            className="p-2 -ml-2 rounded-full hover:bg-foreground/5 transition-colors focus:outline-none"
                        >
                            <ChevronDown className="w-8 h-8 opacity-90" strokeWidth={2} />
                        </button>

                        <div className="flex flex-col items-center">
                            <div className="w-10 h-1.5 bg-foreground/20 rounded-full mb-3" />
                            <h2 className="opacity-70 font-semibold text-[11px] tracking-[0.2em] uppercase">Now Playing</h2>
                        </div>

                        <button
                            onClick={() => {
                                triggerMedium();
                                setShowSoundscapes(true);
                            }}
                            className="p-2 -mr-2 rounded-full hover:bg-foreground/5 transition-colors focus:outline-none"
                        >
                            <SlidersHorizontal className="w-6 h-6 opacity-90" strokeWidth={2} />
                        </button>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 relative z-10 w-full max-w-[480px] mx-auto flex flex-col px-8 md:px-10 pb-[max(env(safe-area-inset-bottom,34px),32px)]">
                        
                        {/* Artwork */}
                        <div className="flex-1 w-full flex items-center justify-center min-h-[30vh]">
                            <motion.div
                                animate={{
                                    scale: isPlaying ? 1 : 0.85,
                                    boxShadow: isPlaying 
                                        ? "0 30px 60px -12px rgba(0,0,0,0.3)" 
                                        : "0 10px 30px -10px rgba(0,0,0,0.2)",
                                }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="relative w-full aspect-square max-w-[340px] rounded-[10%] overflow-hidden bg-foreground/5 border border-foreground/5"
                            >
                                {/* Automatically fetched gorgeous nature image from Unsplash */}
                                <img
                                    src={currentImageUrl}
                                    alt="Meditation Serenity"
                                    className="w-full h-full object-cover transition-opacity duration-1000"
                                />
                                {/* Soft inner shadow overlay to frame the image nicely */}
                                <div className="absolute inset-0 bg-black/5 ring-1 ring-inset ring-foreground/10 rounded-[10%] pointer-events-none" />
                            </motion.div>
                        </div>

                        {/* Title & Metadata */}
                        <div className="w-full mt-4 mb-8 text-foreground">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 flex flex-col min-w-0">
                                    <h1 className="text-[26px] font-bold tracking-tight truncate leading-tight drop-shadow-sm">
                                        {title || "Morning Clarity"}
                                    </h1>
                                    <p className="text-[17px] opacity-60 font-medium truncate mt-1">
                                        {isBuffering ? "Loading..." : "Inner Peace"}
                                    </p>
                                </div>
                                <button className="p-3 -mr-3 rounded-full hover:bg-foreground/5 active:scale-95 transition-all focus:outline-none">
                                    <PlusCircle className="w-7 h-7 opacity-80" strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>

                        {/* Scrubber Area */}
                        <div className="w-full mb-10 text-foreground">
                            {/* Segmented Apple-style Progress Bar */}
                            <div className="flex w-full gap-[4px] cursor-pointer">
                                {Array.from({ length: Math.max(queueTotal, 1) }).map((_, i) => {
                                    const isCompleted = i < queueCurrent;
                                    const isActive = i === queueCurrent;
                                    return (
                                        <div key={i} className="relative h-[6px] bg-foreground/10 flex-1 rounded-full overflow-hidden">
                                            <motion.div
                                                className={cn(
                                                    "absolute top-0 left-0 bottom-0 bg-foreground/80 rounded-full",
                                                    isActive && isPlaying && "animate-pulse"
                                                )}
                                                initial={{ width: "0%" }}
                                                animate={{ 
                                                    width: isCompleted ? "100%" : isActive ? (isPlaying ? "100%" : "30%") : "0%" 
                                                }}
                                                transition={{ 
                                                    // Make the active playing bar fill up very slowly (pseudo-progress), otherwise complete instantly
                                                    duration: isActive && isPlaying ? 20 : 0.3,
                                                    ease: isActive && isPlaying ? "linear" : "easeOut"
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="w-full flex justify-between text-[12px] font-medium opacity-50 px-1 mt-2 tracking-wide">
                                <span>{formatTime(elapsedSeconds)}</span>
                                <span>{queueCurrent} / {queueTotal} 段落</span>
                            </div>
                        </div>

                        {/* Playback Controls */}
                        <div className="flex items-center justify-between w-full mb-12 px-2 text-foreground">
                            <button className="opacity-50 hover:opacity-100 transition-opacity focus:outline-none p-2 -ml-2 rounded-full active:bg-foreground/5">
                                <Shuffle className="w-5 h-5" strokeWidth={2} />
                            </button>

                            <div className="flex items-center gap-10">
                                <button className="text-white hover:opacity-70 active:scale-90 transition-all focus:outline-none">
                                    <SkipBack className="w-10 h-10 fill-white/90" strokeWidth={0} />
                                </button>

                                <button
                                    onClick={() => {
                                        triggerSuccess();
                                        onPlayPause();
                                    }}
                                    className="relative flex items-center justify-center w-[72px] h-[72px] rounded-full bg-white active:scale-90 transition-all focus:outline-none shadow-lg"
                                >
                                    {isBuffering ? (
                                        <Loader2 className="w-8 h-8 text-black animate-spin" strokeWidth={2.5} />
                                    ) : (
                                        isPlaying ? (
                                            <Pause className="w-8 h-8 text-black fill-black" strokeWidth={0} />
                                        ) : (
                                            <Play className="w-8 h-8 text-black fill-black ml-1" strokeWidth={0} />
                                        )
                                    )}
                                </button>

                                <button className="text-white hover:opacity-70 active:scale-90 transition-all focus:outline-none">
                                    <SkipForward className="w-10 h-10 fill-white/90" strokeWidth={0} />
                                </button>
                            </div>

                            <button className="text-white/50 hover:text-white transition-colors focus:outline-none p-2 -mr-2 rounded-full active:bg-white/10">
                                <Repeat className="w-5 h-5" strokeWidth={2} />
                            </button>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex items-center justify-between w-full">
                            <button
                                onClick={toggleFullText}
                                className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors focus:outline-none"
                            >
                                <Menu className="w-6 h-6 text-white/70" strokeWidth={2} />
                            </button>
                            
                            <div className="flex items-center justify-center gap-2">
                                <Airplay className="w-4 h-4 text-white/50" />
                                <span className="text-[12px] font-medium text-white/50 tracking-wide uppercase">iPhone</span>
                            </div>

                            <button
                                onClick={() => {
                                    triggerMedium();
                                    setShowSoundscapes(true);
                                }}
                                className="p-2 -mr-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors focus:outline-none"
                            >
                                <SlidersHorizontal className="w-5 h-5 text-white/70" strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    {/* Scripts Modal (Slide Up) */}
                    <AnimatePresence>
                        {showFullText && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xl sm:p-6"
                                onClick={() => setShowFullText(false)}
                            >
                                <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full sm:max-w-lg h-[80vh] sm:h-auto sm:max-h-[80vh] flex flex-col bg-[#1c1c1e]/90 backdrop-blur-3xl sm:rounded-3xl rounded-t-3xl border border-white/5 shadow-2xl overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                                        <h3 className="text-[17px] font-semibold text-white">Transcript</h3>
                                        <button
                                            onClick={() => setShowFullText(false)}
                                            className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors focus:outline-none"
                                        >
                                            <X className="w-5 h-5" strokeWidth={2} />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                        <p className="text-[17px] text-white/80 leading-relaxed whitespace-pre-wrap font-medium">
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
                                transition={{ duration: 0.3 }}
                                className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md"
                            >
                                <SoundscapesContent onClose={() => setShowSoundscapes(false)} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
