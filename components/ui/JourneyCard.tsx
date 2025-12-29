import React, { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Calendar, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// 🍎 苹果风格弹簧动画
const SPRING_BOUNCY = {
    type: "spring",
    stiffness: 300,
    damping: 20,
    mass: 1
} as const;

// 内容入场动画容器
const CONTENT_CONTAINER = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

// 单个元素入场动画
const CONTENT_ITEM = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: SPRING_BOUNCY
    }
};

interface JourneyCardProps {
    days: number;
    times: number;
    minutes?: number;
    todayMinutes?: number;
}

// 🎯 动画计数器 Hook
function useAnimatedNumber(value: number, duration: number = 1000) {
    const [displayValue, setDisplayValue] = React.useState(0);

    React.useEffect(() => {
        // 延迟启动动画，配合卡片入场
        const startDelay = setTimeout(() => {
            const startTime = Date.now();
            const startValue = 0;

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // easeOutQuart 缓动函数（更柔和优雅）
                const eased = 1 - Math.pow(1 - progress, 4);
                const current = Math.round(startValue + (value - startValue) * eased);

                setDisplayValue(current);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        }, 400); // 等待卡片入场后再开始数字动画

        return () => clearTimeout(startDelay);
    }, [value, duration]);

    return displayValue;
}

export default function JourneyCard({ days, times, minutes = 0, todayMinutes = 0 }: JourneyCardProps) {
    // --- Daily Goal State (Persistent) ---
    const [dailyGoal, setDailyGoal] = React.useState(20);

    // 🌟 动画状态：进度环从 0 开始填充
    const [animatedProgress, setAnimatedProgress] = React.useState(0);

    // Load from local storage on mount
    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const savedGoal = localStorage.getItem("dailyMeditationGoal");
            if (savedGoal) setDailyGoal(parseInt(savedGoal, 10));
        }
    }, []);

    // Dynamic Progress Calculation
    const progress = useMemo(() => {
        return Math.min(Math.max(todayMinutes / dailyGoal, 0.05), 1);
    }, [todayMinutes, dailyGoal]);

    // 🌟 进度环入场动画：延迟后从 0 填充到目标值
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedProgress(progress);
        }, 500); // 等待卡片入场
        return () => clearTimeout(timer);
    }, [progress]);

    // Progress ring circumference
    const circumference = 2 * Math.PI * 40; // r=40
    const strokeDashoffset = circumference - (circumference * animatedProgress);

    // 🎯 使用动画计数器（更慢速度，更优雅）
    const animatedTimes = useAnimatedNumber(times, 2800);
    const animatedMinutes = useAnimatedNumber(minutes, 3500);
    const animatedTodayMinutes = useAnimatedNumber(Math.round(todayMinutes), 2500);

    // Handle Native Select Change
    const handleNativeGoalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGoal = parseInt(e.target.value, 10);
        setDailyGoal(newGoal);
        localStorage.setItem("dailyMeditationGoal", newGoal.toString());
    };

    return (
        <div className="relative w-full h-full group isolate">
            {/* 
                ═══════════════════════════════════════════════════════════════════
                JADE STONE CARD - Pure CSS Implementation (No Framer Motion inside)
                ═══════════════════════════════════════════════════════════════════
            */}
            {/* SOLID OPAQUE BASE - Deep Jade w/ Noise Pattern */}
            <div
                className="absolute inset-0 rounded-[2.5rem]"
                style={{
                    backgroundColor: '#064E3B', // Darker base for contrast
                    backgroundImage: `
                        radial-gradient(at 100% 0%, rgba(52, 211, 153, 0.4) 0px, transparent 50%),
                        radial-gradient(at 0% 0%, rgba(6, 182, 212, 0.3) 0px, transparent 50%)
                    `
                }}
            />

            <div
                className={cn(
                    "relative w-full h-full overflow-hidden rounded-[2.5rem]",
                    "border border-white/20",
                )}
                style={{
                    // Main Gradient Body - Smoother, single layer logic
                    background: `
                        linear-gradient(180deg, 
                            rgba(255,255,255,0.1) 0%, 
                            rgba(20,184,166,0.2) 40%, 
                            rgba(13,148,136,0.3) 100%
                        )
                    `,
                    // Stronger Fluorescence - Neon Cyan/Teal glow
                    boxShadow: `
                        inset 0 0 40px rgba(45,212,191,0.3),     /* Cyan inner glow */
                        inset 0 0 20px rgba(255,255,255,0.1),    /* White rim highlight */
                        0 10px 40px -10px rgba(45,212,191,0.5),  /* Outer cyan glow */
                        0 0 20px rgba(20, 184, 166, 0.3)         /* Ambient teal aura */
                    `,
                }}
            >
                {/* --- LAYER 1: FLUID LIGHT (The "Soul" of the Jade) --- */}
                {/* Removed the fragmented radial gradients that caused splitting */}
                <div
                    className="absolute inset-0 pointer-events-none mix-blend-screen"
                    style={{
                        background: `
                            radial-gradient(circle at 50% -20%, rgba(94, 234, 212, 0.5), transparent 70%),
                            radial-gradient(circle at 80% 80%, rgba(45, 212, 191, 0.3), transparent 50%)
                        `,
                    }}
                />

                {/* --- LAYER 2: NOISE TEXTURE (Stone Feel) --- */}
                <div
                    className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* --- LAYER 3: GLASS REFLECTION --- */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `linear-gradient(
                            120deg, 
                            rgba(255,255,255,0.3) 0%, 
                            rgba(255,255,255,0.05) 30%, 
                            transparent 100%
                        )`,
                    }}
                />

                {/* --- LAYER 4: ANIMATED PULSE (Neon Heartbeat) --- */}
                <div
                    className="absolute inset-0 pointer-events-none animate-jade-pulse mix-blend-plus-lighter"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, rgba(52, 211, 153, 0.15), transparent 60%)`,
                    }}
                />

                {/* --- CONTENT LAYER with Stagger Animation --- */}
                <motion.div
                    variants={CONTENT_CONTAINER}
                    initial="hidden"
                    animate="show"
                    className="relative z-10 flex flex-col h-full p-6 justify-between text-white"
                >

                    {/* Header */}
                    <motion.div variants={CONTENT_ITEM} className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <h3 className="text-xs font-bold tracking-[0.2em] text-white/90 uppercase drop-shadow-sm font-sans">Journey</h3>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Minutes Capsule */}
                            <div className="bg-black/10 backdrop-blur-md pl-2 pr-3 py-1 rounded-full border border-white/20 shadow-sm flex items-center gap-1.5">
                                <div className="bg-white/20 p-1 rounded-full">
                                    <Clock className="w-2.5 h-2.5 text-white" />
                                </div>
                                <span className="text-[10px] font-bold text-white tracking-wide">{animatedMinutes} <span className="text-white/60">MIN</span></span>
                            </div>

                            {/* Days Capsule */}
                            <div className="bg-black/10 backdrop-blur-md pl-2 pr-3 py-1 rounded-full border border-white/20 shadow-sm flex items-center gap-1.5">
                                <div className="bg-white/20 p-1 rounded-full">
                                    <Calendar className="w-2.5 h-2.5 text-white" />
                                </div>
                                <span className="text-[10px] font-bold text-white tracking-wide">Day {days}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats - Balanced Layout */}
                    <motion.div variants={CONTENT_ITEM} className="flex items-center justify-between mt-4 mb-6">
                        {/* Big Number */}
                        <div className="flex flex-col justify-center">
                            <span
                                className="text-7xl font-bold tracking-tighter text-white leading-none"
                                style={{
                                    textShadow: `0 0 20px rgba(110,231,183,0.6), 0 0 40px rgba(52,211,153,0.4), 0 2px 4px rgba(0,0,0,0.2)`
                                }}
                            >
                                {animatedTimes}
                            </span>
                            <span className="text-sm font-medium text-white/70 tracking-wide mt-1 pl-1">
                                Sessions
                            </span>
                        </div>

                        {/* Progress Ring */}
                        <div
                            className="relative w-24 h-24 flex items-center justify-center z-50 rounded-full overflow-hidden"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {/* Native Select */}
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

                            {/* SVG Progress Ring - Pure CSS Animation */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                                {/* Glow Filter */}
                                <defs>
                                    <filter id="progressGlow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                                        <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.4  0 1 0 0 0.85  0 0 1 0 0.7  0 0 0 1 0" />
                                        <feMerge>
                                            <feMergeNode />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#A7F3D0" />
                                        <stop offset="50%" stopColor="#6EE7B7" />
                                        <stop offset="100%" stopColor="#5EEAD4" />
                                    </linearGradient>
                                </defs>

                                {/* Track */}
                                <circle
                                    cx="50%" cy="50%" r="40"
                                    stroke="currentColor" strokeWidth="6"
                                    fill="transparent"
                                    className="text-white/10"
                                />
                                {/* Progress - CSS transition instead of framer-motion */}
                                <circle
                                    cx="50%" cy="50%" r="40"
                                    stroke="url(#progressGradient)"
                                    strokeWidth="6"
                                    fill="transparent"
                                    strokeLinecap="round"
                                    style={{
                                        filter: "url(#progressGlow)",
                                        strokeDasharray: circumference,
                                        strokeDashoffset: strokeDashoffset,
                                        transition: "stroke-dashoffset 2.8s cubic-bezier(0.16, 1, 0.3, 1)"
                                    }}
                                />
                            </svg>

                            {/* Center Metric */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <div className="flex items-baseline gap-0.5 translate-y-1">
                                    <span className="text-2xl font-bold text-white leading-none tracking-tight" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                                        {animatedTodayMinutes}
                                    </span>
                                    <span className="text-sm font-medium text-white/50 leading-none">
                                        / {dailyGoal}
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">Today</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* CTA Button - With Animation */}
                    <motion.div variants={CONTENT_ITEM}>
                        <Link href="/practice" className="w-full relative group/btn block isolate">
                            {/* Glow */}
                            <div className="absolute -inset-0.5 rounded-2xl blur-md opacity-30 group-hover/btn:opacity-70 transition-opacity duration-500 bg-emerald-400" />

                            {/* Glass Body */}
                            <div
                                className="relative h-16 overflow-hidden rounded-2xl bg-white/15 backdrop-blur-xl border border-white/30 transition-transform duration-200 active:scale-[0.98]"
                                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)' }}
                            >
                                {/* Shine - Pure CSS Animation */}
                                <div
                                    className="absolute inset-0 -skew-x-20 animate-button-shine pointer-events-none"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
                                    }}
                                />

                                <div className="relative h-full flex items-center justify-between px-6 z-10">
                                    <div className="flex flex-col justify-center">
                                        <span className="text-white font-bold text-[15px] tracking-wide drop-shadow-sm flex items-center gap-2 group-hover/btn:translate-x-1 transition-transform">
                                            <Sparkles className="w-3.5 h-3.5 text-emerald-200 fill-emerald-200" />
                                            Start Practice
                                        </span>
                                    </div>
                                    <div className="bg-white/15 p-2.5 rounded-full backdrop-blur-md border border-white/25 shadow-sm group-hover/btn:bg-white/25 transition-colors">
                                        <ChevronRight className="w-5 h-5 text-white" strokeWidth={3} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                </motion.div>
            </div>

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes jade-pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.7; }
                }
                .animate-jade-pulse {
                    animation: jade-pulse 4s ease-in-out infinite;
                }
                @keyframes button-shine {
                    0% { transform: translateX(-200%) skewX(-20deg); }
                    100% { transform: translateX(400%) skewX(-20deg); }
                }
                .animate-button-shine {
                    animation: button-shine 6s ease-in-out infinite;
                }
            `}</style>
        </div >
    );
}
