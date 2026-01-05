"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

export interface RecommendationProps {
    id: string;
    title: string;
    duration: number; // minutes
    color: "cyan" | "indigo" | "rose" | "amber";
    reason?: string;
    onClick: () => void;
}

const colorMap = {
    cyan: "from-cyan-400 to-blue-500 shadow-cyan-500/30",
    indigo: "from-indigo-400 to-purple-500 shadow-indigo-500/30",
    rose: "from-rose-400 to-pink-500 shadow-rose-500/30",
    amber: "from-amber-400 to-orange-500 shadow-amber-500/30",
};

export function RecommendationCard({ title, duration, color, reason, onClick }: RecommendationProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-3 mb-1 w-full"
        >
            <div
                onClick={onClick}
                className="group relative overflow-hidden rounded-[1.25rem] p-5 cursor-pointer bg-[#FFF1E6] dark:bg-[#44403C] border border-[#FFE4C4] dark:border-[#57534E] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(255,183,77,0.15)] transition-all duration-300"
            >
                {/* 🌅 Subtle Warm Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50 dark:opacity-10 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            {/* Badge styled as a soft tag */}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/60 dark:bg-black/20 text-[11px] font-semibold uppercase tracking-wider text-[#D97706] dark:text-[#FCD34D]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB74D] animate-pulse" />
                                {duration} MIN
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-[#44403C] dark:text-[#E7E5E4] leading-tight mb-1 group-hover:text-[#D97706] transition-colors">
                            {title}
                        </h3>

                        {reason && (
                            <p className="text-sm text-[#78716C] dark:text-[#A8A29E] leading-relaxed line-clamp-2">
                                {reason}
                            </p>
                        )}
                    </div>

                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[#FFB74D] text-white flex items-center justify-center shadow-lg shadow-[#FFB74D]/30 group-hover:scale-110 group-hover:bg-[#F59E0B] transition-all duration-300">
                            <Play size={18} fill="currentColor" className="ml-0.5" />
                        </div>
                    </div>
                </div>

                {/* Progress Bar (Visual Hint) */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-[#FEEBC8] dark:bg-[#57534E]">
                    <div className="h-full w-0 group-hover:w-full bg-[#FFB74D] transition-all duration-[1.5s] ease-out" />
                </div>
            </div>
        </motion.div>
    );
}
