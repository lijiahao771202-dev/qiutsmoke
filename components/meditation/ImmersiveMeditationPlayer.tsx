"use client";

/**
 * 🧸 ImmersiveMeditationPlayer - 卡通粘土风格冥想播放器
 * 
 * 设计特点（Claymorphism）：
 * - 柔和 3D 效果 + 双阴影
 * - 粉彩色调（柔和桃色、薄荷绿、淡紫色）
 * - 厚边框 + 大圆角
 * - 当前朗读内容淡入淡出字幕
 * - 队列指示器 + 已播放时间
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, SkipBack, SkipForward, FileText, AlignLeft } from "lucide-react";
import { useHaptics } from "@/lib/hooks/useHaptics";

interface ImmersiveMeditationPlayerProps {
    /** 是否显示播放器 */
    isOpen: boolean;
    /** 冥想标题 */
    title: string;
    /** 当前显示的冥想引导文字 (字幕) */
    text: string;
    /** 全文内容 */
    fullText?: string;
    /** 是否正在播放 */
    isPlaying: boolean;
    /** 是否正在生成/缓冲 */
    isBuffering: boolean;
    /** 播放/暂停切换回调 */
    onPlayPause: () => void;
    /** 关闭回调 */
    onClose: () => void;
    /** 卡片 ID */
    cardId?: string;
    /** 当前播放的段落索引（从1开始） */
    queueCurrent?: number;
    /** 队列总段落数 */
    queueTotal?: number;
    /** 已播放的秒数 */
    elapsedSeconds?: number;
}

// 格式化时间为 mm:ss
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function ImmersiveMeditationPlayer({
    isOpen,
    title,
    text,
    fullText = "",
    isPlaying,
    isBuffering,
    onPlayPause,
    onClose,
    cardId,
    queueCurrent = 0,
    queueTotal = 0,
    elapsedSeconds = 0,
}: ImmersiveMeditationPlayerProps) {
    const { triggerLight, triggerMedium, triggerHeavy } = useHaptics();
    const [showFullText, setShowFullText] = useState(false);

    // 用于字幕淡入淡出的 key
    const [textKey, setTextKey] = useState(0);
    const prevTextRef = useRef(text);

    // 当文字变化时更新 key 触发淡入淡出动画
    useEffect(() => {
        if (text !== prevTextRef.current) {
            prevTextRef.current = text;
            setTextKey(k => k + 1);
        }
    }, [text]);

    // 锁定背景滚动
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // 计算队列进度百分比
    const queueProgress = queueTotal > 0 ? (queueCurrent / queueTotal) * 100 : 0;

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    // 🌟 核心动画配置
    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: {
                when: "beforeChildren",
                staggerChildren: 0.1, // 错落感：每个子元素间隔 0.1s 出现
                duration: 0.4,
                ease: "easeOut"
            }
        },
        exit: {
            opacity: 0,
            scale: 0.95,
            transition: {
                when: "afterChildren",
                staggerChildren: 0.05,
                staggerDirection: -1,
                duration: 0.3
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 }, // 初始状态：透明且下移
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 100, // 柔和弹簧
                damping: 20,
                mass: 1
            }
        },
        exit: { opacity: 0, y: 10, transition: { duration: 0.2 } }
    };

    return createPortal(
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="fixed inset-0 z-[9999] flex flex-col font-nunito"
                    style={{
                        // 柔和渐变背景 (Dreamy Gradient) - 确保不透明以遮挡底部内容
                        background: 'linear-gradient(180deg, #fff1f2 0%, #e0e7ff 50%, #ccfbf1 100%)'
                    }}
                >
                    {/* ============================================
                        ❌ 关闭按钮 - 粘土风格
                        ============================================ */}
                    {/* ============================================
                        ❌ 关闭按钮 - 粘土风格
                        ============================================ */}
                    <motion.button
                        variants={itemVariants}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            triggerMedium();
                            onClose();
                        }}
                        className="absolute left-6 z-20 w-12 h-12 
                            flex items-center justify-center
                            bg-white/80 backdrop-blur-xl rounded-2xl
                            border-4 border-white/40
                            transition-colors duration-200"
                        style={{
                            top: 'calc(env(safe-area-inset-top) + 24px)', // 适配 iOS 安全区域
                            boxShadow: '4px 4px 12px rgba(253, 164, 175, 0.4), inset 0 2px 4px rgba(255,255,255,0.9)'
                        }}
                        aria-label="关闭冥想"
                    >
                        <X className="w-5 h-5 text-rose-400" />
                    </motion.button>

                    {/* ============================================
                        🏷️ 标题 - 粘土风格卡片
                        ============================================ */}
                    {/* ============================================
                        🏷️ 标题 - 粘土风格卡片
                        ============================================ */}
                    <motion.div
                        variants={itemVariants}
                        className="mt-24 mx-auto"
                    >
                        <div
                            className="px-6 py-3 bg-white/80 backdrop-blur-xl rounded-2xl border-4 border-white/40"
                            style={{
                                boxShadow: '4px 4px 12px rgba(196, 181, 253, 0.4), inset 0 2px 4px rgba(255,255,255,0.9)'
                            }}
                        >
                            <h2 className="text-lg font-bold text-violet-600/90 tracking-wide">
                                {title || '冥想'}
                            </h2>
                        </div>
                    </motion.div>

                    {/* ============================================
                        📜 全文按钮 (Top Right)
                        ============================================ */}
                    {/* ============================================
                        📜 全文按钮 (Top Right)
                        ============================================ */}
                    <motion.button
                        variants={itemVariants}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            triggerLight();
                            setShowFullText(true);
                        }}
                        className="absolute right-6 z-20 w-12 h-12 
                            flex items-center justify-center
                            bg-white/80 backdrop-blur-xl rounded-2xl
                            border-4 border-white/40
                            transition-colors duration-200"
                        style={{
                            top: 'calc(env(safe-area-inset-top) + 24px)',
                            boxShadow: '4px 4px 12px rgba(167, 139, 250, 0.4), inset 0 2px 4px rgba(255,255,255,0.9)'
                        }}
                        aria-label="查看全文"
                    >
                        <AlignLeft className="w-5 h-5 text-violet-500" />
                    </motion.button>

                    {/* ============================================
                        🎵 中央唱片 - 粘土风格
                        ============================================ */}
                    <motion.div variants={itemVariants} className="flex-1 flex items-center justify-center px-8">
                        <div className="relative w-64 h-64 md:w-72 md:h-72">

                            {/* 🌬️ 呼吸光环 - Breathing Aura */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.15, 1],
                                    opacity: [0.3, 0.6, 0.3],
                                }}
                                transition={{
                                    duration: 8, // 4s 吸 + 4s 呼
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="absolute inset-[-20px] rounded-full blur-2xl"
                                style={{
                                    background: 'radial-gradient(circle, rgba(167,139,250,0.4) 0%, rgba(244,114,182,0.2) 70%, transparent 100%)',
                                }}
                            />

                            {/* 外圈装饰 */}
                            <div
                                className="absolute inset-0 rounded-full border-4 border-white/30"
                                style={{
                                    background: 'linear-gradient(145deg, rgba(165, 180, 252, 0.2), rgba(240, 171, 252, 0.2))',
                                    backdropFilter: 'blur(4px)'
                                }}
                            />

                            {/* 唱片主体 - 旋转 */}
                            <div
                                className="absolute inset-3 rounded-full animate-[spin_6s_linear_infinite]"
                                style={{
                                    // 梦幻宝石渐变
                                    background: 'linear-gradient(135deg, #fcd34d 0%, #fda4af 50%, #c4b5fd 100%)',
                                    boxShadow: 'inset 4px 4px 12px rgba(255,255,255,0.5), inset -4px -4px 12px rgba(0,0,0,0.1), 8px 16px 32px rgba(124, 58, 237, 0.25)',
                                    animationPlayState: isPlaying ? 'running' : 'paused'
                                }}
                            >
                                {/* 唱片纹路 */}
                                <div
                                    className="absolute inset-4 rounded-full opacity-20"
                                    style={{
                                        background: `repeating-radial-gradient(
                                            circle at center,
                                            transparent 0px,
                                            transparent 4px,
                                            rgba(0,0,0,0.1) 4px,
                                            rgba(0,0,0,0.1) 6px
                                        )`
                                    }}
                                />

                                {/* 中心标签 */}
                                <div
                                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                                        w-20 h-20 rounded-full flex items-center justify-center
                                        border-4 border-white/50"
                                    style={{
                                        background: 'linear-gradient(145deg, #fef3c7, #fde68a)',
                                        boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.6)'
                                    }}
                                >
                                    {/* 中心孔 */}
                                    <div
                                        className="w-6 h-6 rounded-full bg-amber-700 border-4 border-amber-600"
                                        style={{
                                            boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* 高光装饰 */}
                            <div
                                className="absolute top-6 left-10 w-12 h-6 rounded-full bg-white/40 rotate-[-30deg] blur-sm"
                            />
                        </div>
                    </motion.div>

                    {/* ============================================
                        📝 字幕区 - 淡入淡出
                        ============================================ */}
                    <div className="px-8 pb-4 min-h-[100px] flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={textKey}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="text-center"
                            >
                                {text ? (
                                    <p
                                        className="text-lg md:text-xl font-bold text-violet-800/90 leading-relaxed max-w-md mx-auto"
                                        style={{ textShadow: '0 2px 4px rgba(139, 92, 246, 0.1)' }}
                                    >
                                        {text}
                                    </p>
                                ) : (
                                    <p className="text-base text-violet-400">
                                        {isBuffering ? '✨ 正在生成冥想引导...' : '🧘 准备开始冥想之旅'}
                                    </p>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* ============================================
                        ⏱️ 进度区 - 时间 + 队列指示
                        ============================================ */}
                    <div className="px-8 pb-6">
                        {/* 时间和队列信息 */}
                        <div className="flex items-center justify-between mb-3">
                            {/* 已播放时间 */}
                            <div
                                className="px-4 py-2 bg-white/80 backdrop-blur-xl rounded-xl border-2 border-white/50"
                                style={{
                                    boxShadow: '2px 4px 12px rgba(196, 181, 253, 0.3)'
                                }}
                            >
                                <span className="text-sm font-bold text-violet-600">
                                    ⏱️ {formatTime(elapsedSeconds)}
                                </span>
                            </div>

                            {/* 队列指示器 */}
                            <div
                                className="px-4 py-2 bg-white/80 backdrop-blur-xl rounded-xl border-2 border-white/50"
                                style={{
                                    boxShadow: '2px 4px 12px rgba(153, 246, 228, 0.3)'
                                }}
                            >
                                <span className="text-sm font-bold text-teal-600">
                                    📍 第 {queueCurrent || '-'} / {queueTotal || '-'} 段
                                </span>
                            </div>
                        </div>

                        {/* 队列进度条 */}
                        <div
                            className="h-3 bg-white rounded-full overflow-hidden border-2 border-violet-200"
                            style={{
                                boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            <motion.div
                                className="h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${queueProgress}%` }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                style={{
                                    background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                                    boxShadow: '2px 0 4px rgba(168, 85, 247, 0.3)'
                                }}
                            />
                        </div>
                    </div>

                    {/* ============================================
                        🎛️ 底部控制栏 - 粘土风格
                        ============================================ */}
                    {/* ============================================
                        🎛️ 底部控制栏 - 粘土风格
                        ============================================ */}
                    <motion.div
                        variants={itemVariants}
                        className="pb-safe px-8 pb-8"
                    >
                        <div className="flex items-center justify-center gap-4">
                            {/* 上一首 */}
                            <button
                                className="w-14 h-14 flex items-center justify-center
                                    bg-white/80 backdrop-blur-xl rounded-2xl border-4 border-white/40
                                    hover:scale-105 active:scale-95 transition-transform"
                                style={{
                                    boxShadow: '4px 4px 12px rgba(153, 246, 228, 0.4), inset 0 2px 4px rgba(255,255,255,0.9)'
                                }}
                                aria-label="上一首"
                            >
                                <SkipBack className="w-5 h-5 text-teal-500 fill-current" />
                            </button>

                            {/* 播放/暂停按钮 */}
                            <button
                                onClick={() => {
                                    triggerLight();
                                    onPlayPause();
                                }}
                                disabled={isBuffering && !isPlaying}
                                className="w-20 h-20 flex items-center justify-center
                                    bg-white/80 backdrop-blur-xl rounded-3xl border-4 border-violet-200/50
                                    hover:scale-105 active:scale-95 transition-transform
                                    disabled:opacity-50"
                                style={{
                                    boxShadow: '6px 6px 16px rgba(196, 181, 253, 0.5), inset 0 2px 6px rgba(255,255,255,0.8)'
                                }}
                                aria-label={isPlaying ? "暂停" : "播放"}
                            >
                                {isBuffering && !isPlaying ? (
                                    <div className="w-6 h-6 border-3 border-violet-400 border-t-transparent rounded-full animate-spin" />
                                ) : isPlaying ? (
                                    <Pause className="w-8 h-8 text-violet-500 fill-current" />
                                ) : (
                                    <Play className="w-8 h-8 text-violet-500 fill-current ml-1" />
                                )}
                            </button>

                            {/* 下一首 */}
                            <button
                                className="w-14 h-14 flex items-center justify-center
                                    bg-white/80 backdrop-blur-xl rounded-2xl border-4 border-white/40
                                    hover:scale-105 active:scale-95 transition-transform"
                                style={{
                                    boxShadow: '4px 4px 12px rgba(253, 205, 211, 0.4), inset 0 2px 4px rgba(255,255,255,0.9)'
                                }}
                                aria-label="下一首"
                            >
                                <SkipForward className="w-5 h-5 text-rose-400 fill-current" />
                            </button>
                        </div>
                    </motion.div>

                    {/* ============================================
                        📜 全文阅读 Modal
                        ============================================ */}
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
                                    className="w-full max-w-lg max-h-[80vh] flex flex-col
                                        bg-white/90 backdrop-blur-xl rounded-3xl border-4 border-white/60
                                        shadow-2xl overflow-hidden"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-violet-100">
                                        <h3 className="text-lg font-bold text-violet-700">📜 冥想文稿</h3>
                                        <button
                                            onClick={() => {
                                                triggerLight();
                                                setShowFullText(false);
                                            }}
                                            className="p-2 bg-violet-100 rounded-full hover:bg-violet-200 transition-colors"
                                        >
                                            <X className="w-4 h-4 text-violet-600" />
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                        {fullText ? (
                                            <p className="text-base text-slate-700 leading-loose whitespace-pre-wrap font-medium">
                                                {fullText}
                                            </p>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                                <p>⏳ 正在生成文稿...</p>
                                            </div>
                                        )}
                                        {/* Bottom Spacer */}
                                        <div className="h-6" />
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
