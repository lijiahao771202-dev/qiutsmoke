"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Play, Trash2, Clock, Volume2, Sparkles, ChevronRight, Settings, Info, Save, X, Edit2, Check, ArrowRight, Music, RotateCcw, Download, Pencil, RotateCw, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import AuthGuard from "@/components/AuthGuard";
import { saveAudioCache, getAudioCache, hasAudioCache, deleteAudioCache } from "@/lib/audioCache";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTTSCards, type TTSCard } from "@/lib/hooks/useData";

// TTSCard interface moved to lib/hooks/useData.ts
// Re-export for backwards compatibility
export type { TTSCard } from "@/lib/hooks/useData";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const VOICES = [
    { id: "zh-CN-XiaoxiaoNeural", name: "晓晓 (女声-温暖)" },
    { id: "zh-CN-YunxiNeural", name: "云希 (男声-沉稳)" },
    { id: "zh-CN-XiaohanNeural", name: "晓涵 (女声-温柔)" },
    { id: "zh-CN-YunyangNeural", name: "云野 (男声-专业)" },
];

const GUIDANCE_BADGES: Record<string, { label: string; color: string }> = {
    light: { label: "🍃 轻引导", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" },
    medium: { label: "⚖️ 中引导", color: "bg-blue-500/20 text-blue-300 border-blue-500/20" },
    heavy: { label: "🧘 多引导", color: "bg-purple-500/20 text-purple-300 border-purple-500/20" }
};

// -----------------------------------------------------------------------------
// Component: Glass Input Card
// -----------------------------------------------------------------------------
function GlassInput({ onAdd }: { onAdd: () => void }) {
    const [text, setText] = useState("");
    const [title, setTitle] = useState("");
    const [voiceId, setVoiceId] = useState(VOICES[0].id);
    const [isLoading, setIsLoading] = useState(false);

    // AI 生成相关状态
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiDuration, setAiDuration] = useState<number>(5);
    const [guidanceLevel, setGuidanceLevel] = useState<'light' | 'medium' | 'heavy'>('medium');

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/tts/cards", {
                method: "POST",
                body: JSON.stringify({ title, content: text, voiceId, rate: "0%", guidanceLevel }),
            });
            if (res.ok) {
                setText("");
                setTitle("");
                setAiPrompt("");
                onAdd();
            }
        } finally {
            setIsLoading(false);
        }
    };

    // AI 生成冥想文本
    const handleAIGenerate = async () => {
        if (!aiPrompt.trim() || aiGenerating) return;

        setAiGenerating(true);
        setText(""); // 清空现有内容

        // 按 280 字/分钟计算
        // 动态计算目标字数和停顿时间
        const totalSeconds = aiDuration * 60;
        let textRatio = 0.5; // medium default

        if (guidanceLevel === 'light') textRatio = 0.1; // 10% text, 90% pause
        if (guidanceLevel === 'heavy') textRatio = 0.7; // 70% text, 30% pause

        const targetTextSeconds = Math.round(totalSeconds * textRatio);
        const targetPauseSeconds = Math.round(totalSeconds * (1 - textRatio));
        const estimatedWords = Math.round(targetTextSeconds * (260 / 60)); // 260 chars/min

        // Auto-fill title if empty
        if (!title.trim()) {
            setTitle(aiPrompt);
        }

        // 简化的统一 prompt
        // 根据引导强度调整 Prompt
        let densityRule = "";
        switch (guidanceLevel) {
            case 'light':
                densityRule = `
【核心策略：轻引导 (Silence Dominant)】
- **超级留白**：必须使用极长的停顿（如 [pause 120s], [pause 300s]）。让静默占据 90% 以上的时间。
- **仅保留防走神**：除了简短的开场和结束，中间只偶尔插入一句“如果你走神了，轻轻回来”。
- **目标**：像一个挂钟一样安静，只在整点轻轻提醒。`;
                break;
            case 'heavy':
                densityRule = `
【核心策略：多引导 (Heavy Guidance)】
- **全程陪伴**：留白比例约为 **0.5:1**（说话多于停顿）。
- **体验**：提供持续、详细的步骤指引和感官描绘，用连续的声音牵引用户的注意力，防止新手走神。`;
                break;
            case 'medium':
            default:
                densityRule = `
【核心策略：中引导 (Standard Guidance)】
- **标准平衡**：留白与文本时间比例约为 **1:1**。
- **体验**：在引导语和静默体验之间保持完美的平衡。`;
                break;
        }

        const systemPrompt = `你是一位专业的冥想引导师与资深“节奏导演”。你的任务是创作高质量、具有人性化关怀和强烈画面感的、适合 TTS 朗读的中文冥想引导脚本。

${densityRule}

【核心规则 1：节奏导演】
你必须自主控制脚本的节奏，营造真实的停顿感。
- **强制停顿**：
  - 在每个引导性指令后必须停顿（如：「深呼吸... [pause 4s] 慢慢呼出... [pause 5s]」）。
  - 在意境转换处必须停顿（如：「现在离开那片森林 [pause 6s] 来到溪水边...」）。
- **长停顿**：按照选定的留白策略，在关键体验时刻使用长停顿。
- **自由控制**：完全根据内容需要自主决定停顿位置。

【核心规则 2：疗愈文字与关怀】
- **语气**：温柔、包容、接纳。
- **画面感**：使用感官词汇（温暖、流淌、蔚蓝、沉静）。
- **正念引导**：脚本中必须包含对“走神”的温柔接纳引导。

【约束条件】
- 直接输出脚本内容，不要任何开场白或解释。
- 最终字数：约 ${estimatedWords} 字。
- 总时长控制：文本约 ${targetTextSeconds} 秒，停顿总时长必须约 ${targetPauseSeconds} 秒（总计 ${totalSeconds} 秒）。
- 严格执行：请确保 [pause Xs] 的总和接近 ${targetPauseSeconds} 秒。
- 开头用 [rate -10%] 设置舒缓的基础语速。`;

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: `${aiPrompt}（目标时长：${aiDuration}分钟）`,
                    systemPrompt
                }),
            });

            if (!response.ok) throw new Error("生成失败");

            const reader = response.body?.getReader();
            if (!reader) throw new Error("无法读取响应");

            const decoder = new TextDecoder();
            let fullContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                fullContent += chunk;
                setText(fullContent);
            }

            // 自动设置标题
            if (!title.trim()) {
                setTitle(aiPrompt.slice(0, 20) + (aiPrompt.length > 20 ? "..." : ""));
            }
        } catch (e) {
            console.error("AI 生成失败:", e);
            setText("生成失败，请重试...");
        } finally {
            setAiGenerating(false);
        }
    };

    return (
        <motion.div
            layout
            className="relative w-full max-w-2xl mx-auto mb-12"
        >
            <GlassCard className="p-1 rounded-[2rem] bg-gradient-to-br from-rose-500/[0.05] via-white/[0.05] to-rose-500/[0.02] border-rose-200/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                <div className="relative z-10 p-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-rose-200/80 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-rose-400" /> 新建语料卡片
                        </h2>
                    </div>

                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="给卡片起个标题..."
                        className="w-full bg-transparent text-xl font-bold text-white placeholder:text-white/40 mb-2 focus:outline-none"
                    />

                    {/* AI 生成区域 */}
                    <div className="rounded-2xl p-4 space-y-3 mb-4 bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                        <div className="flex items-center gap-2 text-xs text-rose-300/80 font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                            <span>AI 生成助手</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <input
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="flex-1 min-w-[200px] bg-white/5 backdrop-blur rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-rose-500/40 outline-none border border-white/10 transition-all"
                                placeholder="描述您想要的内容，如：正念呼吸练习、身体扫描、助眠引导..."
                                disabled={aiGenerating}
                            />
                            <select
                                title="选择引导强度"
                                value={guidanceLevel}
                                onChange={(e) => setGuidanceLevel(e.target.value as any)}
                                className="bg-white/5 backdrop-blur rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-rose-500/40 outline-none border border-white/10 cursor-pointer transition-all"
                                disabled={aiGenerating}
                            >
                                <option value="light" className="bg-zinc-800">🍃 轻引导</option>
                                <option value="medium" className="bg-zinc-800">⚖️ 中引导</option>
                                <option value="heavy" className="bg-zinc-800">🧘 多引导</option>
                            </select>
                            <select
                                value={aiDuration}
                                onChange={(e) => setAiDuration(Number(e.target.value))}
                                className="bg-white/5 backdrop-blur rounded-xl px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-rose-500/40 outline-none border border-white/10 cursor-pointer transition-all"
                                disabled={aiGenerating}
                                title="选择时长"
                            >
                                <option value={3} className="bg-zinc-800">3分钟</option>
                                <option value={5} className="bg-zinc-800">5分钟</option>
                                <option value={10} className="bg-zinc-800">10分钟</option>
                                <option value={15} className="bg-zinc-800">15分钟</option>
                                <option value={20} className="bg-zinc-800">20分钟</option>
                            </select>
                            <button
                                onClick={handleAIGenerate}
                                disabled={!aiPrompt.trim() || aiGenerating}
                                className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40 hover:scale-[1.02] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                            >
                                {aiGenerating ? (
                                    <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                <span>{aiGenerating ? "生成中" : "生成"}</span>
                            </button>
                        </div>
                    </div>


                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="输入您想朗读的文本... (支持 [pause 1s] 和 [rate -10%])"
                        aria-label="输入文本"
                        className="w-full h-32 bg-transparent text-rose-50/90 text-lg placeholder:text-rose-200/30 focus:outline-none resize-none leading-relaxed"
                    />

                    <div className="flex items-center justify-between pt-4 border-t border-rose-200/10">
                        <select
                            value={voiceId}
                            onChange={(e) => setVoiceId(e.target.value)}
                            title="选择语音"
                            className="bg-black/30 text-rose-100 text-sm py-2 px-4 rounded-xl border border-rose-200/10 hover:bg-black/50 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500/50 appearance-none cursor-pointer"
                        >
                            {VOICES.map(v => (
                                <option key={v.id} value={v.id} className="bg-zinc-900">{v.name}</option>
                            ))}
                        </select>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSubmit}
                            disabled={!text.trim() || isLoading}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg",
                                !text.trim()
                                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                                    : "bg-gradient-to-r from-rose-400/90 to-pink-500/90 hover:from-rose-400 hover:to-pink-400 text-white shadow-rose-500/20 backdrop-blur-md"
                            )}
                        >
                            {isLoading ? (
                                <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                            ) : (
                                <>创建卡片 <Plus className="w-4 h-4" /></>
                            )}
                        </motion.button>
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Component: TTS Card with Audio Logic
// -----------------------------------------------------------------------------

// Helper: Generate Silence WAV Blob
const createSilenceWavURL = (seconds: number) => {
    const sr = 44100;
    const sec = Math.max(0.05, seconds);
    const samples = Math.max(1, Math.floor(sr * sec));
    const channels = 1;
    const bps = 16;
    const blockAlign = (channels * bps) >> 3;
    const byteRate = sr * blockAlign;
    const dataSize = samples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeStr = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sr, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bps, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);
    const blob = new Blob([view], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
};

// Helper: Get Duration from Blob
const getBlobDuration = async (blob: Blob): Promise<number> => {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(audio.duration);
        };
        audio.onerror = () => resolve(0);
    });
};

// -----------------------------------------------------------------------------
// Component: TTS Card with Audio Logic
// -----------------------------------------------------------------------------

function TTSCardItem({ card, onDelete, onEdit }: { card: TTSCard; onDelete: (id: string) => void; onEdit: (card: TTSCard) => void }) {
    // Queue State
    type QueueItem =
        | { type: 'pause', duration: number, id: string }
        | { type: 'text', content: string, rate: string, voiceId: string, id: string, url?: string, buffer?: AudioBuffer };

    const [audioQueue, setAudioQueue] = useState<QueueItem[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false); // For spinning indicator
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

    // 合成状态
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [synthesizeProgress, setSynthesizeProgress] = useState({ current: 0, total: 0 });

    // 缓存状态
    const [hasCachedAudio, setHasCachedAudio] = useState(false);
    const [cachedAudioUrl, setCachedAudioUrl] = useState<string | null>(null);
    const [audioDuration, setAudioDuration] = useState<number | null>(null); // 音频总时长
    const [showCardMenu, setShowCardMenu] = useState(false);
    const [useCachedPlayback, setUseCachedPlayback] = useState(true); // 默认使用缓存播放

    // 播放进度状态 (用于缓存音频)
    const [playbackProgress, setPlaybackProgress] = useState({ currentTime: 0, duration: 0 });

    // 🚀 流式优化：初始缓冲状态
    const [isBuffering, setIsBuffering] = useState(false);
    const [bufferProgress, setBufferProgress] = useState({ loaded: 0, total: 0 });
    const INITIAL_BUFFER_COUNT = 3; // 初始缓冲数量
    const MIN_BUFFER_COUNT = 2; // 最小安全缓冲

    // 检查缓存状态
    useEffect(() => {
        hasAudioCache(card.id).then(async (exists) => {
            setHasCachedAudio(exists);
            if (exists) {
                try {
                    const blob = await getAudioCache(card.id);
                    if (blob) {
                        const duration = await getBlobDuration(blob);
                        setAudioDuration(duration);
                    }
                } catch (e) {
                    console.error("Failed to get audio duration via cache", e);
                }
            }
        });
    }, [card.id]);

    // Refs
    const currentItemIdRef = useRef<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const cachedSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const cachedAudioBufferRef = useRef<AudioBuffer | null>(null); // 保存解码后的 AudioBuffer
    const wakeLockRef = useRef<any>(null);
    const playbackStartTimeRef = useRef<number>(0);
    const pausedAtRef = useRef<number>(0); // 暂停位置（秒）
    const isPausedRef = useRef<boolean>(false); // 是否处于暂停状态
    const isPlayingRef = useRef<boolean>(false); // 同步跟踪播放状态
    const nextStartTimeRef = useRef<number>(0);
    const scheduledIdsRef = useRef<Set<string>>(new Set());
    const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    // 格式化时间为 mm:ss
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const ensureAudioContext = async () => {
        if (typeof window === 'undefined') return;
        const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current && AC) {
            const ctx = new AC();
            audioContextRef.current = ctx;
            console.log('[Studio] AudioContext created');
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume().catch(() => { });
        }
    };

    const requestWakeLock = async () => {
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
            try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch (err) { }
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLockRef.current) {
            try { await wakeLockRef.current.release(); wakeLockRef.current = null; } catch (err) { }
        }
    };

    // Effect: WakeLock
    useEffect(() => {
        if (isPlaying) requestWakeLock();
        else releaseWakeLock();
        return () => { releaseWakeLock(); };
    }, [isPlaying]);

    const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response | null> => {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok) return res;
                // 如果是 4xx 错误（除 408/429 外），不重试
                if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) return null;
            } catch (e) {
                console.warn(`[TTS] Retry ${i + 1}/${retries}`, e);
                if (i === retries - 1) return null;
                await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 递增延迟
            }
        }
        return null;
    };

    // Cleanup
    useEffect(() => {
        return () => {
            stopLivePlayback();
            if (currentAudio) currentAudio.pause();
            if (cachedSourceRef.current) {
                try { cachedSourceRef.current.stop(); } catch (e) { }
            }
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);


    // -------------------------------------------------------------------------
    // Audio Playback Engine (Promise Wrapper)
    // -------------------------------------------------------------------------
    const playAudioElement = (url: string): Promise<void> => {
        return new Promise((resolve) => {
            const audio = new Audio(url);
            setCurrentAudio(audio); // Capture ref

            audio.preload = 'auto';
            // @ts-ignore
            audio.playsInline = true;

            // MediaSession
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: card.title || "TTS Playback",
                    artist: "Rain App",
                });
                navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
                navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
            }

            audio.onended = () => {
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                resolve();
            };
            audio.onerror = (e) => {
                console.error("Audio error", e);
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                resolve(); // Resolve anyway to proceed
            };

            const start = async () => {
                try {
                    await ensureAudioContext();
                    await audio.play();
                } catch (e) {
                    console.error("Play failed", e);
                    resolve();
                }
            };
            start();
        });
    };

    const playSilence = async (seconds: number) => {
        const url = createSilenceWavURL(seconds);
        // Use playAudioElement for silence too, to keep consistent event loop
        return playAudioElement(url);
    };


    // -------------------------------------------------------------------------
    // Queue Consumer with PREFETCH (预加载机制)
    // -------------------------------------------------------------------------

    // === 预加载音频项目（并行解码） ===
    // 🚨 用于跟踪正在请求中的项目，防止重复请求
    const fetchingIdsRef = useRef<Set<string>>(new Set());

    // 预加载多个 text 项（并行）并解码为 Buffer
    // 🚀 支持进度回调用于初始缓冲 UI
    const prefetchNextTextItems = async (
        queue: QueueItem[],
        maxConcurrent: number = 2,
        onProgress?: (loaded: number, total: number) => void
    ) => {
        await ensureAudioContext();
        const ctx = audioContextRef.current;
        if (!ctx) return;

        // 收集需要获取的项目
        const itemsToFetch: QueueItem[] = [];
        for (let i = 0; i < queue.length && itemsToFetch.length < maxConcurrent; i++) {
            const item = queue[i];
            // ✅ 检查是否已在请求中，避免重复发起
            if (item.type === 'text' && !item.buffer && !scheduledIdsRef.current.has(item.id) && !fetchingIdsRef.current.has(item.id)) {
                itemsToFetch.push(item);
            }
        }

        // 标记为正在获取
        itemsToFetch.forEach(item => fetchingIdsRef.current.add(item.id));

        let completedCount = 0;
        const totalToFetch = itemsToFetch.length;

        // 并行获取和解码
        await Promise.all(itemsToFetch.map(async (item) => {
            if (item.type !== 'text') return;
            try {
                const res = await fetchWithRetry("/api/tts", {
                    method: "POST",
                    body: JSON.stringify({
                        text: item.content,
                        voice: item.voiceId,
                        rate: item.rate
                    }),
                });
                if (res && res.ok) {
                    const blob = await res.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    const buffer = await ctx.decodeAudioData(arrayBuffer);

                    setAudioQueue(prev => prev.map(q =>
                        q.id === item.id ? { ...q, buffer } : q
                    ));

                    completedCount++;
                    if (onProgress) {
                        onProgress(completedCount, totalToFetch);
                    }
                }
            } catch (e) {
                console.warn("[Prefetch] Failed", e);
            } finally {
                // ✅ 请求完成后移除标记
                fetchingIdsRef.current.delete(item.id);
            }
        }));
    };

    // 🔥 持续预加载轮询（防止队列饥饿）
    const prefetchIntervalRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (isPlaying && audioQueue.length > 0) {
            // ✅ 回调到 1000ms 检查一次
            prefetchIntervalRef.current = setInterval(() => {
                prefetchNextTextItems(audioQueue);
            }, 1000);
        }
        return () => {
            if (prefetchIntervalRef.current) {
                clearInterval(prefetchIntervalRef.current);
                prefetchIntervalRef.current = null;
            }
        };
    }, [isPlaying, audioQueue.length]);

    // Gapless Scheduler Effect
    useEffect(() => {
        if (!isPlaying) {
            if (audioContextRef.current?.state === 'running') {
                audioContextRef.current.suspend();
            }
            return;
        }

        if (audioQueue.length === 0 && scheduledIdsRef.current.size === 0) {
            setIsPlaying(false);
            return;
        }

        const runScheduler = async () => {
            await ensureAudioContext();
            const ctx = audioContextRef.current;
            if (!ctx) return;

            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            // Start prefetching
            prefetchNextTextItems(audioQueue);

            for (let i = 0; i < audioQueue.length; i++) {
                const item = audioQueue[i];
                if (scheduledIdsRef.current.has(item.id)) continue;

                const start = Math.max(ctx.currentTime, nextStartTimeRef.current);

                if (item.type === 'pause') {
                    nextStartTimeRef.current = start + (item.duration / 1000);
                    scheduledIdsRef.current.add(item.id);

                    setTimeout(() => {
                        setAudioQueue(prev => prev.filter(q => q.id !== item.id));
                        scheduledIdsRef.current.delete(item.id);
                    }, (nextStartTimeRef.current - ctx.currentTime) * 1000 + 100);
                } else if (item.type === 'text' && item.buffer) {
                    const source = ctx.createBufferSource();
                    source.buffer = item.buffer;
                    source.connect(ctx.destination);

                    source.onended = () => {
                        setAudioQueue(prev => prev.filter(q => q.id !== item.id));
                        scheduledIdsRef.current.delete(item.id);
                        sourceNodesRef.current.delete(item.id);
                    };

                    source.start(start);
                    nextStartTimeRef.current = start + item.buffer.duration;
                    scheduledIdsRef.current.add(item.id);
                    sourceNodesRef.current.set(item.id, source);

                    // ✅ 回调为 3 个项目的调度缓冲
                    if (scheduledIdsRef.current.size > 3) break;
                } else if (item.type === 'text' && !item.buffer) {
                    // Item not ready, let prefetch handle it or fetch it now if it's the first one
                    if (i === 0) {
                        setIsLoadingAudio(true);
                        try {
                            const res = await fetchWithRetry("/api/tts", {
                                method: "POST",
                                body: JSON.stringify({ text: item.content, voice: item.voiceId, rate: item.rate }),
                            });
                            if (res && res.ok) {
                                const blob = await res.blob();
                                const ab = await blob.arrayBuffer();
                                const buffer = await ctx.decodeAudioData(ab);
                                setAudioQueue(prev => prev.map(q => q.id === item.id ? { ...q, buffer } : q));
                            }
                        } catch (e) { console.error(e); }
                        setIsLoadingAudio(false);
                    }
                    break;
                }
            }
        };

        runScheduler();
    }, [isPlaying, audioQueue]);


    // -------------------------------------------------------------------------
    // 一键合成完整音频
    // -------------------------------------------------------------------------
    const synthesizeAndDownload = async () => {
        if (isSynthesizing) return;
        setIsSynthesizing(true);
        setSynthesizeProgress({ current: 0, total: 0 });

        try {
            // 1. 解析内容为片段
            type SynthSegment =
                | { type: 'pause', duration: number }
                | { type: 'text', content: string, rate: string, voiceId: string };

            const segments: SynthSegment[] = [];
            let currentRate = card.rate || "0%";
            const regex = /(\[(?:pause|rate)[^\]]+\])/g;
            const parts = card.content.split(regex);

            for (const part of parts) {
                if (!part.trim()) continue;
                if (part.startsWith("[")) {
                    if (part.includes("pause")) {
                        const match = part.match(/pause\s*[:=]?\s*(\d+)/i);
                        if (match) {
                            segments.push({ type: 'pause', duration: parseInt(match[1]) });
                        }
                    } else if (part.includes("rate")) {
                        const match = part.match(/rate\s*[:=]?\s*([+-]?\d+%)/i);
                        if (match) currentRate = match[1];
                    }
                } else {
                    segments.push({ type: 'text', content: part, rate: currentRate, voiceId: card.voice_id });
                }
            }

            const textSegments = segments.filter(s => s.type === 'text');
            setSynthesizeProgress({ current: 0, total: textSegments.length });

            // 2. 创建 AudioContext
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            const ctx = new AC();

            // 3. 获取所有音频 ArrayBuffer
            const audioBuffers: AudioBuffer[] = [];
            let textIndex = 0;
            let actualSampleRate = 24000; // TTS 默认采样率，会在第一个解码后更新

            for (const seg of segments) {
                if (seg.type === 'pause') {
                    // 静音会在拼接时根据实际采样率生成
                    audioBuffers.push({ type: 'pause', duration: seg.duration } as any);
                } else {
                    // 请求 TTS
                    try {
                        const res = await fetchWithRetry("/api/tts", {
                            method: "POST",
                            body: JSON.stringify({
                                text: seg.content,
                                voice: seg.voiceId,
                                rate: seg.rate
                            }),
                        });
                        if (res && res.ok) {
                            const arrayBuffer = await res.arrayBuffer();
                            const decoded = await ctx.decodeAudioData(arrayBuffer);
                            // 使用第一个 TTS 的采样率
                            if (textIndex === 0) {
                                actualSampleRate = decoded.sampleRate;
                                console.log("[Synthesize] 实际采样率:", actualSampleRate);
                            }
                            audioBuffers.push(decoded);
                        }
                    } catch (e) {
                        console.error("[Synthesize] TTS fetch failed", e);
                    }
                    textIndex++;
                    setSynthesizeProgress({ current: textIndex, total: textSegments.length });
                }
            }

            // 4. 处理静音并计算总长度
            const finalBuffers: AudioBuffer[] = [];
            let numberOfChannels = 1; // 默认单声道

            // 先检测实际声道数
            for (const buf of audioBuffers) {
                if ((buf as any).type !== 'pause' && buf.numberOfChannels) {
                    numberOfChannels = Math.max(numberOfChannels, buf.numberOfChannels);
                }
            }
            console.log("[Synthesize] 声道数:", numberOfChannels);

            for (const buf of audioBuffers) {
                if ((buf as any).type === 'pause') {
                    // 生成与实际采样率和声道数匹配的静音
                    const samples = Math.floor(actualSampleRate * (buf as any).duration);
                    const silenceBuffer = ctx.createBuffer(numberOfChannels, samples, actualSampleRate);
                    finalBuffers.push(silenceBuffer);
                } else {
                    finalBuffers.push(buf);
                }
            }

            const totalLength = finalBuffers.reduce((sum, buf) => sum + buf.length, 0);
            const mergedBuffer = ctx.createBuffer(numberOfChannels, totalLength, actualSampleRate);

            // 逐声道拼接
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const channelData = mergedBuffer.getChannelData(channel);
                let offset = 0;

                for (const buf of finalBuffers) {
                    // 如果源音频声道数少于目标，使用第一个声道
                    const sourceChannel = Math.min(channel, buf.numberOfChannels - 1);
                    const data = buf.getChannelData(sourceChannel);
                    channelData.set(data, offset);
                    offset += buf.length;
                }
            }

            // 5. 手动编码为 WAV 格式（比 toWav 库更可靠）
            const encodeWAV = (audioBuffer: AudioBuffer): ArrayBuffer => {
                const numChannels = audioBuffer.numberOfChannels;
                const sampleRate = audioBuffer.sampleRate;
                const format = 1; // PCM
                const bitDepth = 16;

                const bytesPerSample = bitDepth / 8;
                const blockAlign = numChannels * bytesPerSample;

                // 获取交错的音频数据
                const length = audioBuffer.length;
                const buffer = new ArrayBuffer(44 + length * blockAlign);
                const view = new DataView(buffer);

                // WAV 文件头
                const writeString = (offset: number, str: string) => {
                    for (let i = 0; i < str.length; i++) {
                        view.setUint8(offset + i, str.charCodeAt(i));
                    }
                };

                writeString(0, 'RIFF');
                view.setUint32(4, 36 + length * blockAlign, true);
                writeString(8, 'WAVE');
                writeString(12, 'fmt ');
                view.setUint32(16, 16, true); // fmt chunk size
                view.setUint16(20, format, true);
                view.setUint16(22, numChannels, true);
                view.setUint32(24, sampleRate, true);
                view.setUint32(28, sampleRate * blockAlign, true);
                view.setUint16(32, blockAlign, true);
                view.setUint16(34, bitDepth, true);
                writeString(36, 'data');
                view.setUint32(40, length * blockAlign, true);

                // 写入音频数据（交错格式）
                let offset = 44;
                const channels: Float32Array[] = [];
                for (let i = 0; i < numChannels; i++) {
                    channels.push(audioBuffer.getChannelData(i));
                }

                for (let i = 0; i < length; i++) {
                    for (let ch = 0; ch < numChannels; ch++) {
                        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
                        const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                        view.setInt16(offset, int16, true);
                        offset += 2;
                    }
                }

                return buffer;
            };

            const wavArrayBuffer = encodeWAV(mergedBuffer);
            const blob = new Blob([wavArrayBuffer], { type: 'audio/wav' });

            console.log("[Synthesize] WAV 大小:", (wavArrayBuffer.byteLength / 1024).toFixed(1), "KB");

            // 保存到 IndexedDB
            await saveAudioCache(card.id, blob);
            setHasCachedAudio(true);

            // 创建可播放的 URL
            const url = URL.createObjectURL(blob);
            setCachedAudioUrl(url);

            console.log("[Synthesize] ✅ 合成完成并已缓存");
        } catch (err) {
            console.error("[Synthesize] Error", err);
        } finally {
            setIsSynthesizing(false);
            setSynthesizeProgress({ current: 0, total: 0 });
            setShowCardMenu(false);
        }
    };


    // -------------------------------------------------------------------------
    // Controls
    // -------------------------------------------------------------------------

    const stopLivePlayback = () => {
        setIsPlaying(false);
        isPlayingRef.current = false;

        if (currentAudio) {
            currentAudio.pause();
            setCurrentAudio(null);
        }

        // Stop all WebAudio nodes
        sourceNodesRef.current.forEach(node => {
            try { node.stop(); } catch { }
        });
        sourceNodesRef.current.clear();
        scheduledIdsRef.current.clear();
        nextStartTimeRef.current = 0;

        setAudioQueue([]);
        currentItemIdRef.current = null;
    };

    const startNewPlayback = async () => {
        // Clean up any existing playback
        stopLivePlayback();
        if (cachedSourceRef.current) {
            try { cachedSourceRef.current.stop(); } catch { }
            cachedSourceRef.current = null;
        }

        const segments: QueueItem[] = [];
        let currentRate = card.rate || "0%";
        // Flexible Regex
        const regex = /(\[(?:pause|rate)[^\]]+\])/g;
        const parts = card.content.split(regex);

        for (const part of parts) {
            if (!part.trim()) continue;
            if (part.startsWith("[")) {
                if (part.includes("pause")) {
                    const match = part.match(/pause\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(ms|s)?/i);
                    if (match) {
                        let val = parseFloat(match[1]);
                        const unit = (match[2] || '').toLowerCase();
                        let durMs = val;
                        if (unit === 's' || (unit === '' && val < 50)) {
                            durMs = val * 1000;
                        }

                        segments.push({
                            type: 'pause',
                            duration: durMs,
                            id: Math.random().toString(36).substr(2, 9)
                        });
                    }
                } else if (part.includes("rate")) {
                    const match = part.match(/rate\s*[:=]?\s*([+-]?\d+%)/i);
                    if (match) currentRate = match[1];
                }
            } else {
                segments.push({
                    type: 'text',
                    content: part,
                    rate: currentRate,
                    id: Math.random().toString(36).substr(2, 9),
                    voiceId: card.voice_id
                });
            }
        }

        // 🚀 初始缓冲：在设置 state 之前先获取前 N 个音频
        const textSegments = segments.filter(s => s.type === 'text') as Extract<QueueItem, { type: 'text' }>[];
        const bufferTarget = Math.min(INITIAL_BUFFER_COUNT, textSegments.length);

        if (bufferTarget > 0) {
            setIsBuffering(true);
            setBufferProgress({ loaded: 0, total: bufferTarget });
            console.log(`[TTS] 🚀 开始初始缓冲，目标: ${bufferTarget} 个片段`);

            await ensureAudioContext();
            const ctx = audioContextRef.current;

            if (ctx) {
                let loaded = 0;
                // 🔥 关键修复：直接修改 segments 数组中的对象，而不是通过 setState
                await Promise.all(textSegments.slice(0, bufferTarget).map(async (item) => {
                    try {
                        fetchingIdsRef.current.add(item.id);
                        const res = await fetchWithRetry("/api/tts", {
                            method: "POST",
                            body: JSON.stringify({
                                text: item.content,
                                voice: item.voiceId,
                                rate: item.rate
                            }),
                        });
                        if (res && res.ok) {
                            const blob = await res.blob();
                            const arrayBuffer = await blob.arrayBuffer();
                            const buffer = await ctx.decodeAudioData(arrayBuffer);
                            // 直接修改原始对象
                            (item as any).buffer = buffer;
                            loaded++;
                            setBufferProgress({ loaded, total: bufferTarget });
                            console.log(`[TTS] 缓冲进度: ${loaded}/${bufferTarget}`);
                        }
                    } catch (e) {
                        console.warn("[Initial Buffer] Failed", e);
                    } finally {
                        fetchingIdsRef.current.delete(item.id);
                    }
                }));
            }

            setIsBuffering(false);
            console.log('[TTS] ✅ 初始缓冲完成，开始播放');
        }

        // 🔥 现在设置 state 时，segments 中的前 N 个项目已经有 buffer 了
        setAudioQueue(segments);
        setIsPlaying(true);
        isPlayingRef.current = true;
    };

    // 从指定位置开始播放缓存音频
    const playFromPosition = async (startTime: number = 0) => {
        if (!cachedAudioBufferRef.current || !audioContextRef.current) {
            console.warn("[Play] AudioBuffer 未加载");
            return;
        }

        // 停止当前播放 - 先设置 isPausedRef 防止旧 onended 干扰
        if (cachedSourceRef.current) {
            isPausedRef.current = true; // 临时设置，防止旧 onended 清除新 interval
            try { cachedSourceRef.current.stop(); } catch (e) { /* ignore */ }
            cachedSourceRef.current = null;
        }

        const ctx = audioContextRef.current;
        const audioBuffer = cachedAudioBufferRef.current;

        // 恢复 AudioContext
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        // 清除之前的进度定时器
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        const remainingDuration = audioBuffer.duration - startTime;

        source.onended = () => {
            // 如果是手动暂停 或 这个 source 已经不是当前播放的 source（说明是旧的被 stop）
            if (isPausedRef.current || cachedSourceRef.current !== source) {
                console.log("[Play] 忽略 onended（手动暂停或已切换 source）");
                return; // 不清除 interval，让新的 source 继续使用
            }

            // 使用 AudioContext 实际时间判断是否真正播放完成
            const actualElapsed = audioContextRef.current
                ? audioContextRef.current.currentTime - playbackStartTimeRef.current
                : 0;
            console.log(`[Play] onended 触发, 实际播放时长: ${actualElapsed.toFixed(1)}s, 总时长: ${audioBuffer.duration.toFixed(1)}s`);

            // 只有播放了至少 95% 才认为是真正播放完成
            if (actualElapsed >= audioBuffer.duration * 0.95) {
                isPlayingRef.current = false; // 同步更新
                setIsPlaying(false);
                cachedSourceRef.current = null;
                pausedAtRef.current = 0;
                isPausedRef.current = false;
                setPlaybackProgress({ currentTime: audioBuffer.duration, duration: audioBuffer.duration });
                console.log("[Play] ✅ 播放完成");

                // 只有真正完成时才清除 interval
                if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                    progressIntervalRef.current = null;
                }
            }
        };

        cachedSourceRef.current = source;
        isPlayingRef.current = true; // 同步更新
        console.log("[Play] 设置 isPlaying = true");
        setIsPlaying(true);

        // 记录开始时间并启动进度更新
        playbackStartTimeRef.current = ctx.currentTime - startTime;
        progressIntervalRef.current = setInterval(() => {
            if (audioContextRef.current && cachedSourceRef.current) {
                const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
                setPlaybackProgress(prev => ({
                    ...prev,
                    currentTime: Math.min(elapsed, prev.duration)
                }));
            }
        }, 100);

        // 从指定位置开始播放
        isPausedRef.current = false; // 重置暂停标志
        console.log(`[Play] source.start 参数: startTime=${startTime.toFixed(2)}, remainingDuration=${remainingDuration.toFixed(2)}, bufferDuration=${audioBuffer.duration.toFixed(2)}`);
        source.start(0, startTime, remainingDuration);
        console.log(`[Play] ▶️ 从 ${startTime.toFixed(1)}s 开始播放`);
    };

    // 跳转到指定位置
    const seekTo = async (time: number) => {
        if (!cachedAudioBufferRef.current) return;

        pausedAtRef.current = time;
        setPlaybackProgress(prev => ({ ...prev, currentTime: time }));

        // 使用 ref 判断是否正在播放
        if (isPlayingRef.current) {
            console.log("[Play] 播放中拖动进度条到:", time.toFixed(1), "s");
            await playFromPosition(time);
        }
    };

    // 播放缓存音频 - 使用 Web Audio API
    const playCachedAudio = async () => {
        // 先停止任何正在播放的音频
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            setCurrentAudio(null);
        }
        // 停止 AudioBufferSourceNode
        if (cachedSourceRef.current) {
            try {
                cachedSourceRef.current.stop();
            } catch (e) { /* ignore */ }
            cachedSourceRef.current = null;
        }
        setAudioQueue([]); // 清空流式队列
        currentItemIdRef.current = null;

        // 如果已有缓存的 AudioBuffer 且处于暂停状态，从该位置恢复
        if (cachedAudioBufferRef.current && isPausedRef.current) {
            console.log("[Play] 从暂停位置恢复:", pausedAtRef.current.toFixed(1), "s");
            isPausedRef.current = false;
            await playFromPosition(pausedAtRef.current);
            return;
        }

        setIsLoadingAudio(true);
        try {
            // 从 IndexedDB 获取缓存
            const cachedBlob = await getAudioCache(card.id);
            if (!cachedBlob) {
                console.warn("[Play] 缓存不存在，回退到流式播放");
                setIsLoadingAudio(false);
                await startNewPlayback();
                return;
            }

            // 使用 Web Audio API 播放
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new AC();
            }
            const ctx = audioContextRef.current!;

            // 恢复 AudioContext（iOS 需要用户交互后恢复）
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            const arrayBuffer = await cachedBlob.arrayBuffer();
            console.log("[Play] 解码 WAV, 大小:", (arrayBuffer.byteLength / 1024).toFixed(1), "KB");

            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            const totalDuration = audioBuffer.duration;
            console.log("[Play] 解码成功, 时长:", totalDuration.toFixed(1), "秒");

            // 保存 AudioBuffer 引用
            cachedAudioBufferRef.current = audioBuffer;
            pausedAtRef.current = 0;

            // 设置时长
            setPlaybackProgress({ currentTime: 0, duration: totalDuration });
            setIsLoadingAudio(false);

            // 从头开始播放
            await playFromPosition(0);
        } catch (e) {
            console.error("[Play] 播放错误", e);
            setIsPlaying(false);
            setIsLoadingAudio(false);
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        }
    };

    const togglePlay = async () => {
        await ensureAudioContext();
        console.log("[Play] togglePlay 调用, isPlayingRef:", isPlayingRef.current, "isPlaying:", isPlaying);

        if (isPlayingRef.current) {
            // PAUSE
            console.log("[Play] 点击暂停, hasCachedAudio:", hasCachedAudio, "useCachedPlayback:", useCachedPlayback);

            // 如果是缓存播放模式，保存当前位置
            if (hasCachedAudio && useCachedPlayback && playbackProgress.duration > 0) {
                pausedAtRef.current = playbackProgress.currentTime;
                isPausedRef.current = true;
            }

            isPlayingRef.current = false;
            setIsPlaying(false);

            if (currentAudio) currentAudio.pause();

            // 停止缓存音频播放
            if (cachedSourceRef.current) {
                try {
                    cachedSourceRef.current.stop();
                } catch (e) { /* ignore */ }
                cachedSourceRef.current = null;
            }

            // Web Audio Scheduler handled by useEffect observing isPlaying=false

            // 清理进度定时器（但不重置进度）
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        } else {
            // 如果有缓存且选择使用缓存播放
            if (hasCachedAudio && useCachedPlayback) {
                await playCachedAudio();
                return;
            }

            // RESUME or START (流式播放)
            if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            if (audioQueue.length > 0) {
                setIsPlaying(true);
                isPlayingRef.current = true;
                if (currentAudio && currentAudio.paused) {
                    currentAudio.play();
                }
            } else {
                await startNewPlayback();
            }
        }
    };

    // Resume Fix: If we just toggle `isPlaying`, execute Effect. 
    // If `currentAudio` exists, we need to `play()` it.
    // I added logic in `togglePlay` to `currentAudio.play()`.
    // But `useEffect` will also run.
    // If logic: `if (currentItemIdRef.current === item.id) return;`
    // This prevents re-fetch. Good.
    // So `currentAudio.play()` in `togglePlay` resumes the audio.
    // `onended` eventually fires.
    // Promise resolves.
    // `setAudioQueue` called.
    // Effect runs for NEXT item.
    // This seems correct for "Resume".

    // One caveat: `isLoadingAudio` spinner.
    // If fetching, currentAudio is null.
    // We toggle pause. `isPlaying=false`.
    // fetch finishes. `playAudioElement` starts. `setIsPlaying` is false...
    // The promise resolves. `setAudioQueue` happens.
    // Next item... Effect runs.. `isPlaying` is false -> returns.
    // So it stops correctly at end of current fetch.

    return (
        <motion.div
            layout
            layoutId={`tts-card-${card.id}`}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="group relative"
        >
            <GlassCard
                className={cn(
                    "h-full p-6 transition-all bg-gradient-to-br from-rose-500/[0.05] to-pink-500/[0.05]",
                    "hover:bg-rose-500/10 hover:shadow-rose-500/10"
                )}
                hoverEffect={true}
            >
                {/* Visualizer Background */}
                {(isPlaying && !currentAudio?.paused) && (
                    <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-32 flex items-center justify-center gap-1">
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-1.5 bg-rose-400 rounded-full"
                                    animate={{ height: [12, 32, 12] }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: i * 0.1,
                                        ease: "easeInOut"
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="relative z-10 flex flex-col h-full gap-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-white/90 leading-tight">
                                    {card.title || "未命名卡片"}
                                </h3>
                                {/* Guidance Badge */}
                                {card.guidance_level && GUIDANCE_BADGES[card.guidance_level] && (
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded border text-[10px]",
                                        GUIDANCE_BADGES[card.guidance_level].color
                                    )}>
                                        {GUIDANCE_BADGES[card.guidance_level].label}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                    {card.voice_id}
                                </span>
                                <span>{card.rate || "Default"}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* 已合成标记 */}
                            {hasCachedAudio && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs">
                                    <Music className="w-3 h-3" />
                                    <span>已合成</span>
                                </div>
                            )}

                            {/* 菜单按钮 */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowCardMenu(!showCardMenu)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>

                                {/* 下拉菜单 */}
                                <AnimatePresence>
                                    {showCardMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                            className="absolute right-0 top-full mt-1 w-40 py-1 rounded-xl bg-zinc-900/95 border border-white/10 shadow-xl z-50"
                                        >
                                            {/* 合成音频 */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); synthesizeAndDownload(); }}
                                                disabled={isSynthesizing}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                                            >
                                                {isSynthesizing ? (
                                                    <>
                                                        <span className="animate-spin w-4 h-4 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full" />
                                                        <span>{synthesizeProgress.current}/{synthesizeProgress.total}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Music className="w-4 h-4 text-emerald-400" />
                                                        <span>{hasCachedAudio ? '重新合成' : '合成音频'}</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* 删除缓存 */}
                                            {hasCachedAudio && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await deleteAudioCache(card.id);
                                                        setHasCachedAudio(false);
                                                        setCachedAudioUrl(null);
                                                        setShowCardMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-400 hover:bg-white/10 transition-colors"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    <span>删除缓存</span>
                                                </button>
                                            )}

                                            {/* 下载音频 */}
                                            {hasCachedAudio && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const blob = await getAudioCache(card.id);
                                                        if (blob) {
                                                            const url = URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            a.download = `${card.title || '未命名'}_合成音频.wav`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            document.body.removeChild(a);
                                                            URL.revokeObjectURL(url);
                                                        }
                                                        setShowCardMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sky-400 hover:bg-white/10 transition-colors"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    <span>下载音频</span>
                                                </button>
                                            )}

                                            <div className="my-1 border-t border-white/10" />

                                            {/* 编辑 */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowCardMenu(false); onEdit(card); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                                <span>编辑卡片</span>
                                            </button>

                                            {/* 删除 */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowCardMenu(false); onDelete(card.id); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                <span>删除卡片</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* Content Preview */}
                    <div className="flex-1 min-h-[60px] max-h-[120px] overflow-y-auto custom-scrollbar my-2">
                        <p className="text-sm text-white/70 leading-relaxed font-light whitespace-pre-wrap">
                            {card.content}
                        </p>
                    </div>

                    {/* Control Bar */}
                    <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/5">
                        <button
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            disabled={isBuffering}
                            className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-full transition-all border",
                                isBuffering
                                    ? "bg-amber-500/20 border-amber-400/50 text-amber-300 cursor-wait"
                                    : isPlaying
                                        ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/30"
                                        : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20"
                            )}
                        >
                            {isBuffering ? (
                                <span className="animate-spin w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full" />
                            ) : isLoadingAudio ? (
                                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                            ) : isPlaying ? (
                                <Pause className="w-4 h-4 fill-current" />
                            ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                        </button>

                        {/* 🚀 缓冲进度显示 */}
                        {isBuffering && (
                            <div className="flex items-center gap-2 text-xs text-amber-300/80 animate-pulse">
                                <span className="font-medium">准备中...</span>
                                <span className="font-mono">{bufferProgress.loaded}/{bufferProgress.total}</span>
                            </div>
                        )}

                        <div className="flex-1 space-y-1.5">
                            <div className="flex justify-between text-xs text-white/40 font-mono">
                                {hasCachedAudio ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setUseCachedPlayback(!useCachedPlayback); }}
                                        className={cn(
                                            "px-1.5 py-0.5 rounded transition-colors text-left",
                                            useCachedPlayback
                                                ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                                : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                                        )}
                                        title="点击切换播放模式"
                                    >
                                        {isPlaying
                                            ? (useCachedPlayback ? "CACHED ▶" : "STREAM ▶")
                                            : (useCachedPlayback ? "CACHED" : "STREAM")}
                                    </button>
                                ) : (
                                    <span>{isPlaying ? "STREAMING" : "READY"}</span>
                                )}
                                {/* 时间显示 */}
                                {playbackProgress.duration > 0 ? (
                                    <span>
                                        {formatTime(playbackProgress.currentTime)} / {formatTime(playbackProgress.duration)}
                                    </span>
                                ) : (
                                    <span>
                                        {audioDuration && hasCachedAudio ? formatTime(audioDuration) : (audioQueue.length > 0 ? `${audioQueue.length} SEGS` : "00:00")}
                                    </span>
                                )}
                            </div>
                            {/* Progress Bar - 可拖动 */}
                            {playbackProgress.duration > 0 ? (
                                <div className="relative h-6 flex items-center group">
                                    {/* 背景轨道 */}
                                    <div className="absolute left-0 right-0 h-1.5 bg-white/10 rounded-full" />
                                    {/* 已播放部分 */}
                                    <div
                                        className="absolute left-0 h-1.5 bg-gradient-to-r from-rose-500 to-amber-500 rounded-full pointer-events-none"
                                        style={{ width: `${(playbackProgress.currentTime / playbackProgress.duration) * 100}%` }}
                                    />
                                    {/* 拖动滑块 */}
                                    <input
                                        type="range"
                                        min={0}
                                        max={playbackProgress.duration}
                                        step={0.1}
                                        value={playbackProgress.currentTime}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            const time = parseFloat(e.target.value);
                                            seekTo(time);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute left-0 right-0 h-6 opacity-0 cursor-pointer z-10"
                                        title="拖动调整播放位置"
                                    />
                                    {/* 拖动手柄 */}
                                    <div
                                        className="absolute w-3 h-3 bg-white rounded-full shadow-lg transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                        style={{ left: `${(playbackProgress.currentTime / playbackProgress.duration) * 100}%` }}
                                    />
                                </div>
                            ) : (
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500"
                                        layout
                                        transition={{ duration: 0.1 }}
                                        style={{ width: `${audioQueue.length > 0 ? 100 : 0}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPlaying(false);
                                if (currentAudio) currentAudio.pause();
                                setAudioQueue([]);
                            }}
                            className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                        >
                            <RotateCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------
export default function TTSStudioPage() {
    // 使用 SWR 缓存数据
    const { cards: ttsCards, addCard: apiAddCard, deleteCard: apiDeleteCard, isLoading: isLoadingCards } = useTTSCards();

    const [editingCard, setEditingCard] = useState<TTSCard | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editVoiceId, setEditVoiceId] = useState(VOICES[0].id);
    const [isSaving, setIsSaving] = useState(false);

    // AI 生成相关状态 (for edit modal)
    const [aiPromptEdit, setAiPromptEdit] = useState("");
    const [aiGeneratingEdit, setAiGeneratingEdit] = useState(false);
    const [aiDurationEdit, setAiDurationEdit] = useState<number>(5); // 目标时长（分钟）
    const [guidanceLevelEdit, setGuidanceLevelEdit] = useState<'light' | 'medium' | 'heavy'>('medium');

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这张卡片吗？')) return;
        await apiDeleteCard(id);
    };

    const handleEdit = (card: TTSCard) => {
        setEditingCard(card);
        setEditTitle(card.title || "");
        setEditContent(card.content);
        setEditVoiceId(card.voice_id);
        setAiPromptEdit(""); // Clear AI prompt when opening edit modal
        setAiDurationEdit(5); // Reset AI duration

        // Ensure guidanceLevel is one of the allowed literal types
        const level = card.guidance_level as 'light' | 'medium' | 'heavy';
        setGuidanceLevelEdit(level || 'medium');
    };

    // AI 生成冥想文本 (for edit modal)
    const handleAIGenerateEdit = async () => {
        if (!aiPromptEdit.trim() || aiGeneratingEdit) return;

        setAiGeneratingEdit(true);
        setEditContent(""); // 清空现有内容

        // 按 280 字/分钟计算
        // 动态计算目标字数和停顿时间
        const totalSeconds = aiDurationEdit * 60;
        let textRatio = 0.5; // medium default

        if (guidanceLevelEdit === 'light') textRatio = 0.1; // 10% text, 90% pause
        if (guidanceLevelEdit === 'heavy') textRatio = 0.7; // 70% text, 30% pause

        const targetTextSeconds = Math.round(totalSeconds * textRatio);
        const targetPauseSeconds = Math.round(totalSeconds * (1 - textRatio));
        const estimatedWords = Math.round(targetTextSeconds * (260 / 60)); // 260 chars/min

        // Auto-fill title if empty
        if (!editTitle.trim()) {
            setEditTitle(aiPromptEdit);
        }

        // 简化的统一 prompt
        // 根据引导强度调整 Prompt
        let densityRule = "";
        switch (guidanceLevelEdit) {
            case 'light':
                densityRule = `
【核心策略：轻引导 (Silence Dominant)】
- **超级留白**：必须使用极长的停顿（如 [pause 120s], [pause 300s]）。让静默占据 90% 以上的时间。
- **仅保留防走神**：除了简短的开场和结束，中间只偶尔插入一句“如果你走神了，轻轻回来”。
- **目标**：像一个挂钟一样安静，只在整点轻轻提醒。`;
                break;
            case 'heavy':
                densityRule = `
【核心策略：多引导 (Heavy Guidance)】
- **全程陪伴**：留白比例约为 **0.5:1**（说话多于停顿）。
- **体验**：提供持续、详细的步骤指引和感官描绘，用连续的声音牵引用户的注意力，防止新手走神。`;
                break;
            case 'medium':
            default:
                densityRule = `
【核心策略：中引导 (Standard Guidance)】
- **标准平衡**：留白与文本时间比例约为 **1:1**。
- **体验**：在引导语和静默体验之间保持完美的平衡。`;
                break;
        }

        const systemPrompt = `你是一位专业的冥想引导师与资深“节奏导演”。你的任务是创作高质量、具有人性化关怀和强烈画面感的、适合 TTS 朗读的中文冥想引导脚本。

${densityRule}

【核心规则 1：节奏导演】
你必须自主控制脚本的节奏，营造真实的停顿感。
- **强制停顿**：
  - 在每个引导性指令后必须停顿（如：「深呼吸... [pause 4s] 慢慢呼出... [pause 5s]」）。
  - 在意境转换处必须停顿（如：「现在离开那片森林 [pause 6s] 来到溪水边...」）。
- **长停顿**：按照选定的留白策略，在关键体验时刻使用长停顿。
- **自由控制**：完全根据内容需要自主决定停顿位置。

【核心规则 2：疗愈文字与关怀】
- **语气**：温柔、包容、接纳。
- **画面感**：使用感官词汇（温暖、流淌、蔚蓝、沉静）。
- **正念引导**：脚本中必须包含对“走神”的温柔接纳引导。

【约束条件】
- 直接输出脚本内容，不要任何开场白或解释。
- 最终字数：约 ${estimatedWords} 字。
- 总时长控制：文本约 ${targetTextSeconds} 秒，停顿总时长必须约 ${targetPauseSeconds} 秒（总计 ${totalSeconds} 秒）。
- 严格执行：请确保 [pause Xs] 的总和接近 ${targetPauseSeconds} 秒。
- 开头用 [rate -10%] 设置舒缓的基础语速。`;

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: `${aiPromptEdit}（目标时长：${aiDurationEdit}分钟）`,
                    systemPrompt
                }),
            });

            if (!response.ok) throw new Error("生成失败");

            const reader = response.body?.getReader();
            if (!reader) throw new Error("无法读取响应");

            const decoder = new TextDecoder();
            let fullContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                fullContent += chunk;
                setEditContent(fullContent);
            }
        } catch (e) {
            console.error("AI 生成失败:", e);
            setEditContent("生成失败，请重试...");
        } finally {
            setAiGeneratingEdit(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingCard) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/tts/cards", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editingCard.id,
                    title: editTitle,
                    content: editContent,
                    voiceId: editVoiceId,
                    guidanceLevel: guidanceLevelEdit, // Save guidance level
                })
            });
            if (res.ok) {
                setEditingCard(null);
            }
        } catch (e) {
            console.error("Update failed", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AuthGuard>
            <div className="min-h-screen text-white">
                <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 pt-24 pb-32 min-h-screen">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-medium tracking-tight text-white/90">声波工坊</h1>
                        <p className="text-rose-200/60 text-sm mt-1">Text to Speech Studio</p>
                    </div>
                    <GlassInput onAdd={() => { }} />

                    <div className="mt-16">
                        <div className="flex items-center gap-4 mb-8">
                            <h3 className="text-xl font-medium text-white/90">我的语料库</h3>
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-200 text-xs border border-rose-500/10">
                                {ttsCards.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {isLoadingCards ? (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-white/20">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500 mb-4" />
                                        <p className="text-sm font-light">正在加载语料库...</p>
                                    </div>
                                ) : ttsCards.length === 0 ? (
                                    <div className="col-span-full text-center py-20 text-white/20 border border-dashed border-rose-200/10 rounded-3xl">
                                        <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                        <p className="text-sm font-light">这里空空如也，试着创建一个新的语音卡片吧。</p>
                                    </div>
                                ) : (
                                    ttsCards.map((card: TTSCard) => (
                                        <TTSCardItem key={card.id} card={card} onDelete={handleDelete} onEdit={handleEdit} />
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Edit Modal */}
                <AnimatePresence>
                    {editingCard && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                            onClick={() => setEditingCard(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-lg bg-zinc-900/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Close Button */}
                                <button
                                    onClick={() => setEditingCard(null)}
                                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
                                    title="关闭"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <h2 className="text-lg font-medium text-white mb-6">编辑卡片</h2>

                                <div className="space-y-4">
                                    {/* Title */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider">标题</label>
                                        <input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full bg-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-rose-500 outline-none"
                                            placeholder="卡片标题..."
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider">内容</label>

                                        {/* AI 生成区域 */}
                                        <div className="bg-slate-700/50 rounded-xl p-3 space-y-3 mb-3">
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span className="text-rose-400">✨</span>
                                                <span>AI 生成助手</span>
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                <input
                                                    value={aiPromptEdit}
                                                    onChange={(e) => setAiPromptEdit(e.target.value)}
                                                    className="flex-1 min-w-[200px] bg-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-rose-500 outline-none"
                                                    placeholder="描述您想要的内容，如：正念呼吸练习、身体扫描、助眠引导..."
                                                    disabled={aiGeneratingEdit}
                                                />
                                                <select
                                                    value={guidanceLevelEdit}
                                                    onChange={(e) => setGuidanceLevelEdit(e.target.value as any)}
                                                    className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-rose-500 outline-none cursor-pointer"
                                                    disabled={aiGeneratingEdit}
                                                    title="选择引导强度"
                                                >
                                                    <option value="light" className="bg-zinc-800">🍃 轻引导</option>
                                                    <option value="medium" className="bg-zinc-800">⚖️ 中引导</option>
                                                    <option value="heavy" className="bg-zinc-800">🧘 多引导</option>
                                                </select>
                                                <select
                                                    value={aiDurationEdit}
                                                    onChange={(e) => setAiDurationEdit(Number(e.target.value))}
                                                    className="bg-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-rose-500 outline-none"
                                                    disabled={aiGeneratingEdit}
                                                    title="选择目标时长"
                                                >
                                                    <option value={3} className="bg-zinc-800">3分钟</option>
                                                    <option value={5} className="bg-zinc-800">5分钟</option>
                                                    <option value={10} className="bg-zinc-800">10分钟</option>
                                                    <option value={15} className="bg-zinc-800">15分钟</option>
                                                    <option value={20} className="bg-zinc-800">20分钟</option>
                                                    <option value={30} className="bg-zinc-800">30分钟</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={handleAIGenerateEdit}
                                                disabled={!aiPromptEdit.trim() || aiGeneratingEdit}
                                                className="w-full py-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-sm rounded-lg hover:from-rose-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {aiGeneratingEdit ? (
                                                    <>
                                                        <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                                        <span>生成中...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>✨</span>
                                                        <span>AI 生成</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="w-full h-40 bg-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                                            placeholder="语料内容... (支持 [pause 1s] 和 [rate -10%])"
                                        />
                                    </div>

                                    {/* Voice */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider">语音</label>
                                        <select
                                            title="选择语音"
                                            value={editVoiceId}
                                            onChange={(e) => setEditVoiceId(e.target.value)}
                                            className="w-full bg-slate-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-rose-500 outline-none appearance-none cursor-pointer"
                                        >
                                            {VOICES.map(v => (
                                                <option key={v.id} value={v.id} className="bg-zinc-900">{v.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            onClick={() => setEditingCard(null)}
                                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={isSaving}
                                            className="px-6 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-400 transition-colors disabled:opacity-50"
                                        >
                                            {isSaving ? "保存中..." : "保存"}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AuthGuard>
    );
}
