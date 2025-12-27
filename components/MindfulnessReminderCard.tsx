"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionTemplate, useMotionValue, animate } from "framer-motion";
import { Bell, Sparkles, Wind, Zap, Waves, BrainCircuit } from "lucide-react";
import NotificationSettings from "@/components/NotificationSettings";

const SR_BREAKERS = [
    {
        title: "STOP",
        subtitle: "停下 · 呼吸 · 观察 · 继续",
        desc: "按下暂停键。就在此刻，退出自动驾驶模式。",
        icon: Wind,
        color: "from-rose-500/80 via-purple-500/80 to-indigo-500/80"
    },
    {
        title: "冲浪",
        subtitle: "Surf the Urge",
        desc: "渴望是波浪。不要对抗它，骑在它上面，直到它消散。",
        icon: Waves,
        color: "from-cyan-500/80 via-blue-500/80 to-teal-500/80"
    },
    {
        title: "间隙",
        subtitle: "The Gap",
        desc: "刺激和回应之间有一个空间。那里是你的自由。",
        icon: Zap,
        color: "from-amber-500/80 via-orange-500/80 to-red-500/80"
    },
    {
        title: "RAIN",
        subtitle: "识别 · 允许 · 探究 · 滋养",
        desc: "像雨水一样通过这一刻的情绪，不要被淋湿。",
        icon: Sparkles,
        color: "from-emerald-500/80 via-teal-500/80 to-cyan-500/80"
    }
];

export default function MindfulnessReminderCard() {
    const [showSettings, setShowSettings] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const activeTip = SR_BREAKERS[currentIndex];

    // Smooth gradient animation
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % SR_BREAKERS.length);
    };

    const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    };

    return (
        <div
            className="w-full h-full relative group rounded-[2.5rem] overflow-hidden bg-[#0A0A0A] shadow-2xl transition-all duration-500 hover:shadow-cyan-500/10"
            onClick={handleNext}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Dynamic Aurora Background */}
            <div className="absolute inset-0 opacity-60 transition-opacity duration-700">
                <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${activeTip.color} opacity-40 blur-[80px] transition-colors duration-1000 ease-in-out`}
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        repeatType: "reverse"
                    }}
                />
                {/* Secondary interactive blob */}
                <motion.div
                    className="absolute w-64 h-64 rounded-full bg-white/20 blur-[60px]"
                    style={{
                        left: mouseX,
                        top: mouseY,
                        translateX: "-50%",
                        translateY: "-50%",
                    }}
                />
            </div>

            {/* Noise Texture for 'Paper' feel */}
            <div className="absolute inset-0 opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none" />

            {/* Content Container */}
            <div className="relative h-full flex flex-col p-7 z-10">

                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 opacity-80">
                        <div className="p-1.5 rounded-full bg-white/10 backdrop-blur-md">
                            <BrainCircuit className="w-4 h-4 text-white/90" />
                        </div>
                        <span className="text-xs font-medium tracking-widest text-white/70 uppercase">Mindfulness</span>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSettings(true);
                        }}
                        className="p-2 -mr-2 -mt-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                    >
                        <Bell className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Text Area */}
                <div className="flex-1 flex flex-col justify-center">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="space-y-4"
                        >
                            <div className="space-y-1">
                                <h2 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                                    {activeTip.title}
                                    <activeTip.icon className="w-8 h-8 text-white/80 opacity-50" />
                                </h2>
                                <p className="text-lg font-medium text-white/80">{activeTip.subtitle}</p>
                            </div>

                            <div className="h-px w-12 bg-white/30" />

                            <p className="text-sm font-light text-white/70 leading-relaxed max-w-[85%]">
                                {activeTip.desc}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer / Call to Interaction */}
                <div className="flex justify-between items-end">
                    <span className="text-[10px] text-white/30 font-mono tracking-wider">
                        TAP TO SHIFT
                    </span>

                    <div className="flex gap-1">
                        {SR_BREAKERS.map((_, idx) => (
                            <motion.div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/20'}`}
                                layoutId={idx === currentIndex ? "activePill" : undefined}
                            />
                        ))}
                    </div>
                </div>

            </div>

            {/* Settings Overlay */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-xl flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 flex justify-end">
                            <button onClick={() => setShowSettings(false)} className="p-2 bg-white/10 rounded-full">
                                <span className="sr-only">Close</span>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
                            <NotificationSettings onClose={() => setShowSettings(false)} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
