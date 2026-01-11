"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { Volume2, VolumeX } from "lucide-react";
import React from "react";

interface GlassSoundCardProps {
    id: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
    isActive: boolean;
    volume?: number;
    onToggle: () => void;
    onVolumeChange: (val: number) => void;
}

export function GlassSoundCard({
    id,
    label,
    description,
    icon,
    isActive,
    volume = 0.5,
    onToggle,
    onVolumeChange
}: GlassSoundCardProps) {
    const { triggerLight, triggerMedium } = useHaptics();

    return (
        <motion.div
            layout // Smooth layout transitions when sizes change? (Maybe expensive for grids)
            initial={false}
            animate={{
                backgroundColor: isActive ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
                borderColor: isActive ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.05)",
                scale: isActive ? 1.02 : 1
            }}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "relative flex flex-col items-center justify-center p-4 rounded-3xl border transition-all cursor-pointer backdrop-blur-md overflow-hidden aspect-square",
                "shadow-[0_4px_24px_-1px_rgba(0,0,0,0.1)]",
                isActive ? "shadow-[0_8px_32px_-4px_rgba(251,146,60,0.2)]" : "hover:shadow-[0_8px_32px_-4px_rgba(255,255,255,0.1)]"
            )}
            onClick={() => {
                triggerMedium();
                onToggle();
            }}
        >
            {/* Background Glow for Active State */}
            {isActive && (
                <motion.div
                    layoutId={`glow-${id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-rose-500/10 pointer-events-none"
                />
            )}

            {/* Icon */}
            <motion.div
                animate={{
                    scale: isActive ? 1.1 : 1,
                    color: isActive ? "#fb923c" : "#94a3b8" // Orange-400 vs Slate-400
                }}
                className="mb-3 text-3xl"
            >
                {icon}
            </motion.div>

            {/* Label */}
            <span className={cn(
                "text-xs font-medium tracking-wide transition-colors text-center",
                isActive ? "text-orange-100" : "text-slate-400"
            )}>
                {label}
            </span>

            {/* Description (Optional) */}
            {description && (
                <span className={cn(
                    "text-[10px] sm:text-[9px] mt-1 text-center leading-tight opacity-70",
                    isActive ? "text-orange-200" : "text-slate-500"
                )}>
                    {description}
                </span>
            )}

            {/* Volume Slider (Only visible when active) */}
            {isActive && (
                <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    className="w-full flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()} // Prevent card toggle when clicking slider
                >
                    <Volume2 className="w-3 h-3 text-white/50" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(e) => {
                            onVolumeChange(parseFloat(e.target.value));
                        }}
                        className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-orange-400"
                        aria-label={`Volume for ${label}`}
                        title={`Volume for ${label}`}
                    />
                </motion.div>
            )}
        </motion.div>
    );
}
