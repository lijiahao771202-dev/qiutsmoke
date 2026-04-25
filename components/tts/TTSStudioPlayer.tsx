"use client";

/**
 * 🎵 TTSStudioPlayer - 声波工坊沉浸式播放器 v5 (Sun-kissed Glass + Ambient Mixer)
 * 
 * 设计语言：Sun-kissed Glass (日光暖阳)
 * - 核心：明亮、通透、活力、温暖
 * - 色彩：Off-White (#fffbf7) + Vibrant Orange (#f97316) + Coral (#fb7185)
 * - 材质：高通透磨砂玻璃、软阴影
 * - 视觉：Solar Ring (日环)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, SkipBack, SkipForward, FileText, ChevronDown, Shuffle, Repeat, Sparkles, Volume2 } from "lucide-react";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { cn } from "@/lib/utils";
import { type AmbientSound, type AmbientSoundType } from "@/hooks/useWhiteNoise";
import { useWakeLock } from "@/hooks/useWakeLock";
import { SoundscapesContent } from "@/components/soundscapes/SoundscapesContent";

// ============================================================================
// 类型定义
// ============================================================================

interface TTSStudioPlayerProps {
    isOpen: boolean;
    title: string;
    currentText: string;
    fullText: string;
    isPlaying: boolean;
    isLoading: boolean;
    currentTime: number;
    duration: number;
    onPlayPause: () => void;
    onClose: () => void;
    onPrev?: () => void;
    onNext?: () => void;
    onSeek: (time: number) => void;
    analyserNode?: AnalyserNode | null;

    // 白噪音 Props
    ambientSounds?: AmbientSound[];
    activeTracks?: Set<AmbientSoundType>;
    trackVolumes?: Record<AmbientSoundType, number>;
    masterVolume?: number;
    onToggleTrack?: (id: AmbientSoundType) => void;
    onSetTrackVolume?: (id: AmbientSoundType, volume: number) => void;
    onSetMasterVolume?: (volume: number) => void;
    onStopAllAmbient?: () => void;
}

// ============================================================================
// 组件：Solar Visualizer (日环可视化)
// ============================================================================

interface SolarVisualizerProps {
    analyserNode?: AnalyserNode | null;
    isPlaying: boolean;
}


// 线性插值辅助函数，用于平滑过渡
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

function SolarVisualizer({ analyserNode, isPlaying }: SolarVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    // 使用 Ref 存储动画状态，避免闭包陷阱并保持跨帧状态
    const visualStateRef = useRef({
        intensity: 0,
        time: 0,
        smoothedData: new Uint8Array(0)
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const size = 320;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;

        let dataArray: Uint8Array;
        let bufferLength = 0;

        if (analyserNode) {
            bufferLength = analyserNode.frequencyBinCount;
            // 使用更少的数据点来让波形更平滑
            dataArray = new Uint8Array(bufferLength);
        }

        // Initialize smoothedData buffer if needed
        const state = visualStateRef.current;
        if (bufferLength > 0 && state.smoothedData.length !== bufferLength) {
            state.smoothedData = new Uint8Array(bufferLength);
        }

        const center = size / 2;

        const render = () => {
            state.time += 0.005;
            const time = state.time;

            ctx.clearRect(0, 0, size, size);

            let rawAverage = 0;

            // 1. 获取数据与计算能量
            if (analyserNode && isPlaying && dataArray) {
                // @ts-ignore
                analyserNode.getByteFrequencyData(dataArray);
                let sum = 0;

                // 平滑处理频域数据
                for (let i = 0; i < bufferLength; i++) {
                    // 时域平滑 (Temporal Smoothing)
                    // 0.3 的系数：较快跟随但消除抖动
                    state.smoothedData[i] = lerp(state.smoothedData[i], dataArray[i], 0.3);
                    sum += state.smoothedData[i];
                }
                rawAverage = sum / bufferLength;
            } else if (isPlaying) {
                // 模拟播放
                rawAverage = 30 + Math.sin(Date.now() / 300) * 15;
            } else {
                // 暂停时缓慢归零
                rawAverage = 0;
                if (state.smoothedData.length > 0) {
                    for (let i = 0; i < state.smoothedData.length; i++) {
                        state.smoothedData[i] = lerp(state.smoothedData[i], 0, 0.1);
                    }
                }
            }

            // 平滑强度过渡 (Intensity Smoothing)
            // 原逻辑: average / 150. (0~255 / 150 => 0~1.7)
            const targetIntensity = Math.max(0, Math.min(1, rawAverage / 150));
            state.intensity = lerp(state.intensity, targetIntensity, 0.08); // 0.08 使得启停有呼吸感
            const intensity = state.intensity;

            const baseRadius = 80;
            const dynamicRadius = baseRadius + (intensity * 20); // 恢复原版系数 20

            // 2. 柔和的外部光晕 (Warm Glow) - 恢复原版颜色逻辑
            const glowGradient = ctx.createRadialGradient(center, center, baseRadius, center, center, size * 0.5);
            glowGradient.addColorStop(0, `rgba(251, 146, 60, ${0.1 + intensity * 0.2})`); // Orange-400
            glowGradient.addColorStop(0.6, `rgba(251, 113, 133, ${0.05 + intensity * 0.1})`); // Rose-400
            glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(center, center, size * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // 3. 动态波浪环 (Wave Ring) - **恢复原本的形状算法**
            ctx.beginPath();
            const points = 60; // 恢复为 60 点
            for (let i = 0; i <= points; i++) {
                const angle = (i / points) * Math.PI * 2;

                let audioMod = 0;
                if (analyserNode && bufferLength > 0) {
                    // 使用 smoothedData (它是 Uint8Array)
                    // 关键修复：使用对称映射 (0 -> 1 -> 0) 消除首尾撕裂
                    // i / points: 0 -> 1
                    // mapIndex: 0 -> 1 -> 0
                    let mapIndex = i / points;
                    if (mapIndex > 0.5) mapIndex = 1 - mapIndex;
                    mapIndex *= 2;

                    // 映射到频谱的前 40% (人声主要区域), 避免高频噪音
                    const dataIndex = Math.floor(mapIndex * (bufferLength * 0.4));

                    // 恢复原本的音频调制系数 * 30 * intensity
                    audioMod = (state.smoothedData[dataIndex] / 255) * 30 * intensity;
                } else if (isPlaying || intensity > 0.01) {
                    // 即使暂停，如果有残余强度，也显示一点模拟波
                    audioMod = Math.sin(angle * 5 + time * 5) * 5 * intensity;
                }

                // 恢复原本的正弦波叠加算法 (angle * 6)
                const wave = Math.sin(angle * 6 + time * 3) * (5 + intensity * 10) + audioMod;
                const r = dynamicRadius + wave;

                const x = center + Math.cos(angle) * r;
                const y = center + Math.sin(angle) * r;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();

            // 填充渐变色
            const sunGradient = ctx.createLinearGradient(0, 0, size, size);
            sunGradient.addColorStop(0, '#f97316'); // Orange-500
            sunGradient.addColorStop(1, '#fb7185'); // Rose-400
            ctx.fillStyle = sunGradient;
            ctx.fill();

            // 4. 内部高光 (Glass Reflection) - 恢复原版
            ctx.beginPath();
            // 原版是静止的 center-20, center-20
            ctx.ellipse(center - 20, center - 20, dynamicRadius * 0.3, dynamicRadius * 0.15, -Math.PI / 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();

            animationRef.current = requestAnimationFrame(render);
        };

        render();
        return () => {
            if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
        };
    }, [analyserNode, isPlaying]);

    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center pointer-events-none"
        >
            <canvas ref={canvasRef} className="w-[320px] h-[320px]" />
        </motion.div>
    );
}

// ============================================================================
// 辅助组件：磨砂按钮
// ============================================================================

function FrostButton({
    onClick,
    className,
    children,
    size = "md",
    active = false,
    variant = "default"
}: {
    onClick: () => void;
    className?: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
    active?: boolean;
    variant?: "default" | "primary";
}) {
    const sizeClasses = {
        sm: "w-10 h-10",
        md: "w-12 h-12",
        lg: "w-16 h-16",
        xl: "w-20 h-20"
    };

    const variants = {
        default: active
            ? "bg-orange-100/80 text-orange-600 shadow-sm border border-orange-200"
            : "bg-white/60 hover:bg-white text-slate-500 hover:text-slate-700 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-transparent",
        primary: "bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.4)]"
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95, y: 0 }}
            onClick={onClick}
            className={cn(
                "flex items-center justify-center rounded-2xl transition-all duration-300 backdrop-blur-sm",
                variants[variant],
                sizeClasses[size],
                className
            )}
        >
            {children}
        </motion.button>
    );
}

// ============================================================================
// 主组件
// ============================================================================

export default function TTSStudioPlayer({
    isOpen,
    title,
    currentText,
    fullText,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    onPlayPause,
    onClose,
    onPrev,
    onNext,
    onSeek,
    analyserNode,
    ambientSounds,
    activeTracks,
    trackVolumes,
    masterVolume,
    onToggleTrack,
    onSetTrackVolume,
    onSetMasterVolume,
    onStopAllAmbient,
}: TTSStudioPlayerProps) {
    const router = useRouter();
    const { triggerLight, triggerMedium } = useHaptics();
    const { requestWakeLock, releaseWakeLock } = useWakeLock();
    const [showFullText, setShowFullText] = useState(false);
    const [showSoundscapes, setShowSoundscapes] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragProgress, setDragProgress] = useState(0);
    const controlledAmbientSounds = useMemo(() => (
        ambientSounds?.map((sound) => ({
            id: sound.id,
            label: sound.name,
            icon: <span className="text-2xl leading-none">{sound.icon}</span>,
        })) ?? []
    ), [ambientSounds]);

    // 🔒 屏幕唤醒锁管理：播放时阻止熄屏
    useEffect(() => {
        if (isOpen && isPlaying) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }
    }, [isOpen, isPlaying, requestWakeLock, releaseWakeLock]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // if (!isOpen) return null; // Removed to allow exit animation

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const displayProgress = isDragging ? dragProgress : progress;

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        updateDrag(e);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging) updateDrag(e);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            setIsDragging(false);
            const rect = progressBarRef.current?.getBoundingClientRect();
            if (rect && duration > 0) {
                const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                const p = x / rect.width;
                onSeek(p * duration);
                triggerMedium();
            }
        }
    };

    const updateDrag = (e: React.PointerEvent) => {
        const rect = progressBarRef.current?.getBoundingClientRect();
        if (rect) {
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            setDragProgress((x / rect.width) * 100);
        }
    };


    // 🌟 核心动画配置 (Matching ImmersiveMeditationPlayer)
    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                // Remove "when: beforeChildren" to allow parallel animation
                delayChildren: 0.1, // Start items slightly after container starts
                staggerChildren: 0.1,
                // Jelly Pop Effect
                type: "spring" as const,
                damping: 12, // Low damping = more bounce
                stiffness: 200,
                mass: 1
            }
        },
        exit: {
            y: "100%", // Slide entire page down
            opacity: 1, // Keep opacity to look like a solid sheet exiting
            scale: 1,   // No scale down
            transition: {
                duration: 0.5,
                ease: [0.32, 0.72, 0, 1] as const
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 40, scale: 0.8 }, // Start smaller for pop
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            // Snappy Wobble
            transition: { type: "spring" as const, stiffness: 300, damping: 15 }
        },
        exit: {
            // Follow container, no specific exit needed or just fade out slightly
            opacity: 1,
            y: 0,
            transition: { duration: 0.2 }
        }
    };

    return createPortal(
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed inset-0 z-[9999] flex flex-col bg-[#fffbf7] text-slate-800 overflow-hidden"
                >
                    {/* 1. 动态背景 (Warm Atmosphere) */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {/* 顶部橙色光斑 */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            transition={{ duration: 1 }}
                            className="absolute -top-[10%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-orange-200/40 blur-[80px]"
                        />
                        {/* 底部玫瑰色光斑 */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className="absolute -bottom-[10%] -left-[10%] w-[80vw] h-[80vw] rounded-full bg-rose-200/40 blur-[80px]"
                        />
                    </div>

                    {/* 2. Header */}
                    <motion.div variants={itemVariants} className="relative z-10 px-6 pt-12 pb-4 flex items-center justify-between"
                        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
                        <button
                            onClick={onClose}
                            className="p-3 -ml-3 rounded-full hover:bg-black/5 transition-colors text-slate-500"
                            title="Close Player"
                            aria-label="Close Player"
                        >
                            <ChevronDown className="w-6 h-6" />
                        </button>

                        {/* Ambient Mixer Toggle */}
                        <button
                            onClick={() => setShowSoundscapes(true)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur border shadow-sm transition-all",
                                "bg-white/50 border-white/20 text-slate-600 hover:bg-white/70"
                            )}
                            title="Open Soundscapes Mixer"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="text-xs font-semibold tracking-wide uppercase">Mixer</span>
                            {(activeTracks?.size ?? 0) > 0 && (
                                <span className="flex h-2 w-2 rounded-full bg-orange-500" />
                            )}
                        </button>

                        <button
                            onClick={() => setShowFullText(true)}
                            className="p-3 -mr-3 rounded-full hover:bg-black/5 transition-colors text-slate-500"
                            title="View Full Text"
                            aria-label="View Full Text"
                        >
                            <FileText className="w-5 h-5" />
                        </button>
                    </motion.div>

                    {/* 3. Visualizer Area */}
                    <motion.div variants={itemVariants} className="flex-1 flex flex-col items-center justify-center relative z-10 -mt-10">
                        <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
                            <SolarVisualizer
                                analyserNode={analyserNode}
                                isPlaying={isPlaying && !isLoading}
                            />
                        </div>
                    </motion.div>

                    {/* 4. Controls Panel (Glass Morphism) */}
                    <motion.div variants={itemVariants} className="relative z-20 bg-white/30 backdrop-blur-xl border-t border-white/20 pb-8 pt-6 rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                        <div className="px-8 flex flex-col gap-8 max-w-lg mx-auto w-full"
                            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>

                            {/* Title Info */}
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-slate-800 truncate">
                                    {title || "Untitled"}
                                </h2>
                                {/* Karaoke Text */}
                                <div className="h-8 flex items-center justify-center overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={currentText}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="text-sm font-medium text-orange-600/80 truncate px-4"
                                        >
                                            {currentText || (isLoading ? "Synthesizing..." : "Ready")}
                                        </motion.p>
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div
                                    ref={progressBarRef}
                                    className="group relative h-6 flex items-center cursor-pointer touch-none"
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerLeave={handlePointerUp}
                                >
                                    {/* Track */}
                                    <div className="absolute inset-x-0 h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                                        {/* Buffered/Fill */}
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full"
                                            style={{ width: `${displayProgress}%` }}
                                        />
                                    </div>
                                    {/* Drag Knob */}
                                    <motion.div
                                        className="absolute w-5 h-5 bg-white border-2 border-orange-500 rounded-full shadow-md z-10"
                                        style={{
                                            left: `${displayProgress}%`,
                                            x: '-50%'
                                        }}
                                        animate={{ scale: isDragging ? 1.1 : 0 }}
                                        whileHover={{ scale: 1.1 }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs font-semibold text-slate-400">
                                    <span>{formatTime(isDragging ? (dragProgress / 100) * duration : currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center justify-between">
                                <button className="text-slate-400 hover:text-slate-600 transition-colors" title="Shuffle">
                                    <Shuffle className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-6">
                                    <FrostButton onClick={() => onPrev?.()} size="md">
                                        <SkipBack className="w-5 h-5 ml-[-2px] fill-current" />
                                        <span className="sr-only">Previous</span>
                                    </FrostButton>

                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            triggerMedium();
                                            onPlayPause();
                                        }}
                                        disabled={isLoading}
                                        title={isPlaying ? "Pause" : "Play"}
                                        className={cn(
                                            "w-20 h-20 flex items-center justify-center rounded-[28px] text-white shadow-xl transition-all relative overflow-hidden",
                                            "bg-gradient-to-tr from-orange-500 to-rose-500",
                                            isLoading ? "opacity-80" : "hover:shadow-orange-500/30 hover:-translate-y-1"
                                        )}
                                    >
                                        {/* Shine Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

                                        {isLoading ? (
                                            <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : isPlaying ? (
                                            <Pause className="w-8 h-8 fill-white" />
                                        ) : (
                                            <Play className="w-8 h-8 fill-white ml-1" />
                                        )}
                                    </motion.button>

                                    <FrostButton onClick={() => onNext?.()} size="md">
                                        <SkipForward className="w-5 h-5 mr-[-2px] fill-current" />
                                        <span className="sr-only">Next</span>
                                    </FrostButton>
                                </div>

                                <button className="text-slate-400 hover:text-slate-600 transition-colors" title="Repeat">
                                    <Repeat className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>



                    {/* Soundscapes Overlay */}
                    <AnimatePresence>
                        {showSoundscapes && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="absolute inset-0 z-[10000] bg-black"
                            >
                                <SoundscapesContent
                                    onClose={() => setShowSoundscapes(false)}
                                    controlledSounds={controlledAmbientSounds}
                                    controlledActiveTrackIds={activeTracks}
                                    controlledTrackVolumes={trackVolumes as Record<string, number> | undefined}
                                    controlledMasterVolume={masterVolume}
                                    controlledToggleTrack={onToggleTrack ? (trackId) => onToggleTrack(trackId as AmbientSoundType) : undefined}
                                    controlledSetTrackVolume={onSetTrackVolume ? (trackId, volume) => onSetTrackVolume(trackId as AmbientSoundType, volume) : undefined}
                                    controlledSetMasterVolume={onSetMasterVolume}
                                    controlledStopAll={onStopAllAmbient}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Full Text Sheet */}
                    <AnimatePresence>
                        {showFullText && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[10000] bg-slate-900/20 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6"
                                onClick={() => setShowFullText(false)}
                            >
                                <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full max-w-lg bg-[#fffbf7] rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
                                >
                                    <div className="px-8 py-5 border-b border-orange-100/50 flex items-center justify-between bg-white/50 backdrop-blur">
                                        <h3 className="text-slate-800 font-bold text-lg">完整文稿</h3>
                                        <button onClick={() => setShowFullText(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200" title="Close">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="p-8 overflow-y-auto flex-1">
                                        <p className="text-slate-600 leading-8 whitespace-pre-wrap text-lg font-light tracking-wide">
                                            {fullText || "暂无文稿内容。"}
                                        </p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

// 辅助格式化时间
function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}
