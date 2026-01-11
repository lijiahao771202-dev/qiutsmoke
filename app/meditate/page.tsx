"use client";


import { useState, useRef, useEffect, useMemo } from "react";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useHapticBreathing } from "@/lib/hooks/useHapticBreathing";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Wind, CloudRain, Zap, Moon, Droplets, Settings, X, Activity, Shield, Trash2, Plus, Network, Sparkles, Edit2, Check, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import AuthGuard from "@/components/AuthGuard";
import { GlassCard } from "@/components/ui/GlassCard";
import { useMeditationTopics } from "@/lib/hooks/useData";
import { useBackgroundAudio } from "@/hooks/useBackgroundAudio";
import { useWhiteNoise } from "@/hooks/useWhiteNoise";
import { getApiUrl } from "@/lib/config";
import ImmersiveMeditationPlayer from "@/components/meditation/ImmersiveMeditationPlayer";

// 🚀 引导模式常量

// 🚀 引导模式常量
const GUIDANCE_LEVELS = {
    light: { label: "🍃 轻引导", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" },
    medium: { label: "⚖️ 中引导", color: "bg-blue-500/20 text-blue-300 border-blue-500/20" },
    heavy: { label: "🧘 多引导", color: "bg-purple-500/20 text-purple-300 border-purple-500/20" }
};

const DEFAULT_PROMPT = "创建一个关于坐在舒适的房间里听着温柔雨声的引导冥想脚本。请用中文回复。";

const DEFAULT_TOPICS = [
    {
        id: "breathing",
        title: "三分钟呼吸锚定",
        icon: Wind,
        color: "from-teal-400 to-teal-600",
        prompt: "创建一个3分钟的呼吸锚定冥想引导脚本。引导用户将注意力集中在呼吸上，当注意力游离时温柔地带回。适合快速平复心情。请用中文回复。"
    },
    {
        id: "body-scan",
        title: "身体扫描",
        icon: Activity,
        color: "from-indigo-400 to-indigo-600",
        prompt: "创建一个身体扫描冥想引导脚本。引导用户从脚趾开始，逐渐向上扫描全身，感受身体的每一个部位，释放紧张感。请用中文回复。"
    },
    {
        id: "loving-kindness",
        title: "慈悲冥想",
        icon: Sparkles,
        color: "from-rose-400 to-rose-600",
        prompt: "创建一个慈悲冥想（Loving-Kindness）引导脚本。引导用户先向自己发送慈悲与爱，然后逐渐扩展到亲人、朋友、陌生人，最后到所有生命。培养无条件的爱与善意。请用中文回复。"
    },
    {
        id: "mindful-walking",
        title: "正念行走",
        icon: Activity,
        color: "from-emerald-400 to-emerald-600",
        prompt: "创建一个正念行走冥想引导脚本。引导用户在缓慢行走中感受脚底与地面的接触，觉察身体的每一个微小动作，将注意力锚定在当下的步伐中。适合室内或安静的户外进行。请用中文回复。"
    },
    {
        id: "positive-mindfulness",
        title: "积极感受正念",
        icon: Moon,
        color: "from-amber-400 to-amber-600",
        prompt: "创建一个积极感受正念冥想引导脚本。引导用户回忆和感受生活中的美好时刻，培养感恩之心，增强积极情绪。帮助用户在日常生活中发现和珍惜简单的快乐。请用中文回复。"
    },
];

const ICONS_MAP: Record<string, any> = {
    wind: Wind,
    activity: Activity,
    cloudrain: CloudRain,
    shield: Shield,
    zap: Zap,
    droplets: Droplets,
    moon: Moon,
    sparkles: Sparkles,
    network: Network,
};

import { VOICES } from "@/lib/constants";

/**
 * 🧹 清洗 AI 生成的文本，移除所有不适合 TTS 朗读的内容
 * 解决问题：AI 生成的舞台指示如 "（轻柔地，语速缓慢）" 被 TTS 朗读
 */
const sanitizeForTTS = (text: string): string => {
    let cleaned = text;

    // 1. 移除中文括号内的舞台指示：（轻柔地，语速缓慢）
    cleaned = cleaned.replace(/（[^）]*）/g, '');

    // 2. 移除英文括号内的舞台指示：(softly, slowly)
    cleaned = cleaned.replace(/\([^)]*\)/g, '');

    // 3. 移除未闭合的方括号标记：[rate - （流式结束时可能出现）
    cleaned = cleaned.replace(/\[[^\]]*$/g, '');

    // 4. 移除 Markdown 格式符号：**bold**, *italic*, # headers
    cleaned = cleaned.replace(/[*_#`~]/g, '');

    // 5. 移除多余的空白和换行（合并为单空格）
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
};

export default function MeditatePage() {
    // 🌟 动画配置 - 采用统计页面模式
    // 🍎 Apple 经典贝塞尔曲线
    const APPLE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

    // 🌊 会呼吸的界面 (Organic Flow) 动画变体
    const breathingVariants: any = {
        idle: {
            scale: [1, 1.015, 1],
            transition: {
                duration: 6,
                ease: "easeInOut",
                repeat: Infinity,
            }
        },
        hover: {
            scale: 1.025,
            transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } // Apple Ease
        },
        tap: {
            scale: 0.96,
            transition: { type: "spring", stiffness: 300, damping: 15 }
        }
    };

    // 卡片内部内容动画变体生成器（根据索引计算延迟）
    const getCardContentVariants = (index: number): any => ({
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: index * 0.08  // 交错延迟
            }
        }
    });




    const [activeCard, setActiveCard] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
    const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
    const [apiKey, setApiKey] = useState("");
    const [showPromptEdit, setShowPromptEdit] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false); // New: Add Card Modal
    const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
    const [globalSystemPrompt, setGlobalSystemPrompt] = useState("");
    const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
    const [draftPrompt, setDraftPrompt] = useState("");

    // 🚀 State Tracking for Isolation
    const currentGenerationIdRef = useRef<number>(0);

    // 🚀 冥想时长控制（分钟）
    const [meditationDuration, setMeditationDuration] = useState(10);
    const DURATION_OPTIONS = [3, 5, 10, 15, 20, 30, 40];

    // 🚀 引导模式控制
    const [guidanceLevel, setGuidanceLevel] = useState<'light' | 'medium' | 'heavy'>('medium');

    // 🚀 每个卡片独立的设置（按卡片ID存储）
    const [cardSettings, setCardSettings] = useState<Record<string, { duration: number; guidanceLevel: 'light' | 'medium' | 'heavy' }>>({});

    // New Card State
    const [newCardTitle, setNewCardTitle] = useState("");
    const [newCardPrompt, setNewCardPrompt] = useState("");

    // Load settings from localStorage
    useEffect(() => {
        const savedPrompt = localStorage.getItem("meditation_prompt");
        if (savedPrompt) setCustomPrompt(savedPrompt);

        try {
            const savedPrompts = localStorage.getItem("meditation_prompts");
            if (savedPrompts) {
                const obj = JSON.parse(savedPrompts);
                if (obj && typeof obj === 'object') setEditedPrompts(obj);
            }
        } catch { }

        const savedKey = localStorage.getItem("deepseek_api_key");
        if (savedKey) setApiKey(savedKey);

        try {
            const g = localStorage.getItem("global_system_prompt");
            if (g) setGlobalSystemPrompt(g);
        } catch { }

        // 🚀 加载保存的冥想时长
        try {
            const savedDuration = localStorage.getItem("meditation_duration");
            if (savedDuration) setMeditationDuration(parseInt(savedDuration, 10));
        } catch { }

        // 🚀 加载保存的引导模式
        try {
            const savedGuidance = localStorage.getItem("meditation_guidance");
            if (savedGuidance && ['light', 'medium', 'heavy'].includes(savedGuidance)) {
                setGuidanceLevel(savedGuidance as 'light' | 'medium' | 'heavy');
            }
        } catch { }

        // 🚀 加载每个卡片的独立设置
        try {
            const savedCardSettings = localStorage.getItem("meditation_card_settings");
            if (savedCardSettings) {
                const parsed = JSON.parse(savedCardSettings);
                if (parsed && typeof parsed === 'object') {
                    setCardSettings(parsed);
                }
            }
        } catch { }

        (async () => {
            try {
                const res = await fetch(getApiUrl('/api/prompts'));
                if (res.ok) {
                    const serverObj = await res.json();
                    if (serverObj && typeof serverObj === 'object' && Object.keys(serverObj).length > 0) {
                        setEditedPrompts(serverObj);
                    }
                }
            } catch { }
            try {
                const res = await fetch(getApiUrl('/api/system-prompt'));
                if (res.ok) {
                    const text = await res.text();
                    if (text && text.trim().length > 0) {
                        setGlobalSystemPrompt(text);
                        try { localStorage.setItem("global_system_prompt", text); } catch { }
                    } else {
                        // Default system prompt
                        const DEFAULT_SYSTEM = `你是一位专业的冥想引导师与资深“节奏导演”。你的唯一任务是生成具有强烈的画面感和真实节奏感的中文冥想脚本。

## 核心规则 1：节奏导演 (Rhythm Director)
你不仅在写文字，还在指挥时间。
- **强制停顿**：
  - 在每个引导性指令后必须停顿（如：「深呼吸... [pause 4s] 慢慢呼出... [pause 5s]」）。
  - 在意境转换处必须停顿（如：「现在离开那片森林 [pause 6s]」）。
- **留白比例**：确保 [pause Xs] 的总时长与文本朗读时间大致相当（约 1:1）。
- **长停顿**：关键时刻使用 [pause 10s] 的深度留白。
- **取消频率限制**：自由控制停顿，无需刻意避开标点。

## 核心规则 2：疗愈文字 (Healer)
- **语气**：温柔、接纳、不评判。
- **画面感**：使用大量感官描绘（温暖、流动、轻柔）。
- **正念提醒**：包含 1-2 次对于“走神”的温柔接纳。

## 约束条件
- 使用指令：[pause Xs] 和 [rate +/-N%]。
- 严格只输出纯脚本文本，不要标题、不要前言、不要后缀解释。`;
                        setGlobalSystemPrompt(DEFAULT_SYSTEM);
                    }
                }
            } catch { }
        })();
    }, []);

    // 使用 SWR 缓存数据
    const { topics, addTopic: apiAddTopic, deleteTopic: apiDeleteTopic, isLoading: isLoadingTopics } = useMeditationTopics();

    // 当 topics 原型更新时同步到本地状态（如果需要额外处理）
    const customTopics = useMemo(() => {
        return topics.map(t => ({
            ...t,
            icon: ICONS_MAP[t.icon_name?.toLowerCase() as keyof typeof ICONS_MAP] || Wind
        }));
    }, [topics]);

    // Save settings to localStorage when changed
    useEffect(() => {
        localStorage.setItem("meditation_prompt", customPrompt);
        localStorage.setItem("deepseek_api_key", apiKey);
        try {
            localStorage.setItem("meditation_prompts", JSON.stringify(editedPrompts));
        } catch { }
        try {
            localStorage.setItem("global_system_prompt", globalSystemPrompt);
        } catch { }
    }, [customPrompt, apiKey, editedPrompts, globalSystemPrompt]);

    // Audio Queue Management
    type QueueItem =
        | { type: 'audio', url?: string, buffer?: AudioBuffer, id: string, status?: 'loading' | 'ready' | 'error', text?: string }
        | { type: 'pause', duration: number, id: string };

    const [isPlaying, setIsPlaying] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioQueue, setAudioQueue] = useState<QueueItem[]>([]);
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const { triggerSuccess, triggerLight, triggerHeavy } = useHaptics();
    const { triggerInhale, triggerExhale, triggerHold } = useHapticBreathing();
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [showAudioHint, setShowAudioHint] = useState(false);
    const { activeTracks, trackVolumes, masterVolume, setMasterVolume, toggleTrack, setTrackVolume, stopAll, AMBIENT_SOUNDS } = useWhiteNoise();
    const [text, setText] = useState("");
    const [currentSpokenText, setCurrentSpokenText] = useState(""); // 💬 当前正在朗读的句子
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    // ⏱️ 队列进度追踪
    const [playedCount, setPlayedCount] = useState(0); // 已播放的段落数
    const [totalSegments, setTotalSegments] = useState(0); // 总段落数
    const [elapsedSeconds, setElapsedSeconds] = useState(0); // 已播放时间（秒）
    const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Refs for processing
    const currentRate = useRef("0%");
    const processingBuffer = useRef("");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isPausingRef = useRef(false);
    const currentItemIdRef = useRef<string | null>(null);
    const isProcessingRef = useRef<boolean>(false); // 🔥 防止 useEffect 并发执行
    const audioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const scheduledIdsRef = useRef<Set<string>>(new Set());
    const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
    // 🔥 持久 Audio 对象：在用户手势中初始化后可复用，避免 iOS NotAllowedError
    const sharedAudioRef = useRef<HTMLAudioElement | null>(null);

    // 🔥 [iOS Fix] 初始化共享 Audio 对象
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio();
            (audio as any).playsInline = true;
            audio.preload = 'auto';
            sharedAudioRef.current = audio;
        }
    }, []);

    const ensureAudioContext = async () => {
        if (typeof window === 'undefined') return;
        const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current && AC) {
            const ctx = new AC();
            audioContextRef.current = ctx;

            ctx.onstatechange = () => {
                setShowAudioHint(ctx.state === 'suspended');
            };
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            try {
                await audioContextRef.current.resume();
            } catch (e) {
                console.warn('[Audio] Resume failed, needs user gesture', e);
            }
        }
    };

    const playSilence = async (seconds: number) => {
        const url = createSilenceWavURL(seconds);
        const audio = new Audio(url);
        (audio as any).playsInline = true;
        audio.preload = 'auto';
        return new Promise<void>((resolve) => {
            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            audio.onerror = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            audio.play().catch(() => resolve());
        });
    };

    const primeOnceRef = useRef(false);
    const primeAudio = () => {
        // 🔥 [iOS Fix] 即使已经 prime 过，也可以重新触发以保持活跃，但这里为了避免打断正在播放的，加个判断
        if (sharedAudioRef.current && !sharedAudioRef.current.paused) return;

        const url = createSilenceWavURL(0.1);
        // 🔥 优先使用已初始化的对象
        let audio = sharedAudioRef.current;
        if (!audio) {
            audio = new Audio();
            sharedAudioRef.current = audio;
        }

        (audio as any).playsInline = true;
        audio.preload = 'auto';
        audio.volume = 0.01; // 微小音量
        audio.loop = true;   // 🔥 [iOS Fix] 循环静音，保持 AudioContext 活跃，防止生成期间被系统挂起
        audio.src = url;

        // 不需要 onended，因为是 loop
        audio.onerror = () => URL.revokeObjectURL(url);

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => console.warn("Prime/Loop failed", err));
        }
    };

    // === 预加载音频项目（并行解码） ===
    // 🚨 用于跟踪正在请求中的项目，防止重复请求
    const fetchingIdsRef = useRef<Set<string>>(new Set());

    // 🚀 支持进度回调用于初始缓冲 UI
    const prefetchAudioItems = async (
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
            if (item.type === 'audio' && item.url && !item.buffer && !scheduledIdsRef.current.has(item.id) && !fetchingIdsRef.current.has(item.id)) {
                itemsToFetch.push(item);
            }
        }

        // 标记为正在获取
        itemsToFetch.forEach(item => fetchingIdsRef.current.add(item.id));

        let completedCount = 0;
        const totalToFetch = itemsToFetch.length;

        // 并行获取和解码
        await Promise.all(itemsToFetch.map(async (item) => {
            if (item.type !== 'audio' || !item.url) return;
            try {
                const res = await fetch(item.url);
                if (!res.ok) throw new Error('Fetch failed');
                const arrayBuffer = await res.arrayBuffer();
                const buffer = await ctx.decodeAudioData(arrayBuffer);
                setAudioQueue(prev => prev.map(q =>
                    q.id === item.id ? { ...q, buffer } : q
                ));

                completedCount++;
                if (onProgress) {
                    onProgress(completedCount, totalToFetch);
                }
            } catch (e) {
                console.warn('[Prefetch] Failed for', item.id, e);
                setAudioQueue(prev => prev.filter(q => q.id !== item.id));
            } finally {
                // ✅ 请求完成后移除标记
                fetchingIdsRef.current.delete(item.id);
            }
        }));
    };

    // 🔥 持续预加载轮询（回调为 1000ms，避免过多请求）
    const prefetchIntervalRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (isPlaying && audioQueue.length > 0) {
            // ✅ 加快轮询到 300ms，更积极地检查音频就绪状态，尽快调度
            prefetchIntervalRef.current = setInterval(() => {
                prefetchAudioItems(audioQueue, 2);
            }, 300);
        }
        return () => {
            if (prefetchIntervalRef.current) {
                clearInterval(prefetchIntervalRef.current);
                prefetchIntervalRef.current = null;
            }
        };
    }, [isPlaying, audioQueue.length]);

    // ... (rest of code)

    // === P2: TTS API 重试工具 === //
    const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response | null> => {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok) return res;

                // 🔥 详细记录错误信息
                const errorText = await res.text().catch(() => "No error details");
                console.warn(`[TTS Retry] Attempt ${i + 1}/${retries} failed: ${res.status} - ${errorText}`);

                // 如果是 4xx 错误（客户端错误），不重试
                if (res.status >= 400 && res.status < 500) return null;

                // 5xx 服务器错误，等待后重试
                if (res.status >= 500 && i < retries - 1) {
                    const delay = 1000 * Math.pow(2, i); // 指数退避: 1s, 2s, 4s
                    console.log(`[TTS Retry] Waiting ${delay}ms before retry...`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
            } catch (e) {
                console.warn(`[TTS Retry] Network error on attempt ${i + 1}/${retries}:`, e);
                if (i === retries - 1) return null;
                await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 递增延迟
            }
        }
        return null;
    };

    // === 简单顺序播放器 === //
    const [isBuffering, setIsBuffering] = useState(false);
    const isPlayingNextRef = useRef(false); // 防止重复触发
    const hasStartedRef = useRef(false); // 是否已开始播放（用于首次缓冲检查）
    const audioQueueRef = useRef(audioQueue);
    audioQueueRef.current = audioQueue;
    const MIN_BUFFER_COUNT = 3; // 🔥 至少 3 个音频就绪后才开始播放

    // 播放队列中的下一个项目
    const playNextInQueue = async () => {
        // 防止重复调用
        if (isPlayingNextRef.current) return;

        const queue = audioQueueRef.current;
        if (queue.length === 0) return;

        // 🔥 持续预加载
        prefetchAudioItems(queue);

        // 🔥 精确时间调度（复制自 TTS Studio）
        await ensureAudioContext();
        const ctx = audioContextRef.current;
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        // 🔥 首次播放前的预缓冲检查
        if (!hasStartedRef.current) {
            const readyCount = queue.filter(q => q.type === 'audio' && q.buffer).length;
            const hasLoading = queue.some(q => q.type === 'audio' && q.status === 'loading');

            if (readyCount < MIN_BUFFER_COUNT && hasLoading) {
                setIsBuffering(true);
                return;
            }
            hasStartedRef.current = true;
        }

        setIsBuffering(false);

        // 🔥 批量调度队列中的项目（精确时间调度）
        let scheduledCount = 0;
        const MAX_SCHEDULED = 3; // 最多同时调度 3 个

        for (let i = 0; i < queue.length && scheduledCount < MAX_SCHEDULED; i++) {
            const item = queue[i];

            // 跳过已调度的
            if (scheduledIdsRef.current.has(item.id)) continue;

            // 跳过错误的
            if (item.type === 'audio' && item.status === 'error') {
                setAudioQueue(prev => prev.filter(q => q.id !== item.id));
                continue;
            }

            const start = Math.max(ctx.currentTime, nextStartTimeRef.current);

            if (item.type === 'pause') {
                // 调度静默
                const pauseSeconds = item.duration / 1000;
                nextStartTimeRef.current = start + pauseSeconds;
                scheduledIdsRef.current.add(item.id);


                // 在暂停结束后移除
                setTimeout(() => {
                    setAudioQueue(prev => prev.filter(q => q.id !== item.id));
                    scheduledIdsRef.current.delete(item.id);
                }, (nextStartTimeRef.current - ctx.currentTime) * 1000 + 100);

                scheduledCount++;

            } else if (item.type === 'audio' && item.url) {
                // 🔥 使用 HTMLAudioElement - 支持后台播放
                // 重要：一次只播放一个音频，等待完成后再播放下一个

                // 🔥 立即锁定，防止轮询再次调用
                isPlayingNextRef.current = true;

                // 🌟 [Haptic Breathing] Analyze text for breathing cues
                if (item.text) {
                    if (/(吸气|吸入|inhal)/i.test(item.text)) {
                        triggerInhale();
                    } else if (/(呼气|呼出|吐气|exhal)/i.test(item.text)) {
                        triggerExhale();
                    } else if (/(屏住|屏息|保持|hold)/i.test(item.text)) {
                        triggerHold();
                    }
                }

                // 🔥 [iOS Critical Fix] 复用共享 Audio 对象，避免 iOS 阻止非用户手势触发的新 Audio 播放
                // iOS 只允许用户手势直接触发的 Audio.play()，onended 回调中创建新 Audio 会被静默拒绝
                let audio = sharedAudioRef.current;
                if (!audio) {
                    audio = new Audio();
                    sharedAudioRef.current = audio;
                }

                // 清理之前的事件监听（避免内存泄漏和重复触发）
                audio.onended = null;
                audio.onerror = null;
                audio.onpause = null;

                // 设置新的音频源
                (audio as any).playsInline = true;
                audio.preload = 'auto';
                audio.loop = false; // 确保不循环（之前可能用于静音保活）
                audio.volume = 1;
                audio.src = item.url;

                // 设置 Media Session（锁屏控制）
                try {
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.metadata = new MediaMetadata({
                            title: activeCard ? (customTopics.find(t => t.id === activeCard)?.title || 'Rain 冥想') : 'Rain 冥想',
                            artist: 'Rain Meditation',
                            artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }]
                        });
                        navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
                        navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
                    }
                } catch { }

                // 🔥 [iOS Debug] 添加诊断日志
                console.log(`[Meditate] 📢 Playing audio ${item.id}, queue length: ${queue.length}`);

                audio.onended = () => {
                    console.log(`[Meditate] ✅ Audio ended: ${item.id}`);
                    if (item.url!.startsWith('blob:')) URL.revokeObjectURL(item.url!);
                    setAudioQueue(prev => prev.filter(q => q.id !== item.id));
                    scheduledIdsRef.current.delete(item.id);
                    // 🔥 不要 setCurrentAudio(null)，保持 sharedAudioRef 可复用
                    // 🔥 播放完成后解锁，让 useEffect 触发下一个
                    isPlayingNextRef.current = false;
                };
                audio.onerror = (e) => {
                    console.error(`[Meditate] ❌ Audio error: ${item.id}`, e);
                    if (item.url!.startsWith('blob:')) URL.revokeObjectURL(item.url!);
                    setAudioQueue(prev => prev.filter(q => q.id !== item.id));
                    scheduledIdsRef.current.delete(item.id);
                    isPlayingNextRef.current = false;
                };

                // 🔥 [iOS Fix] 监听暂停事件，可能是系统暂停
                audio.onpause = () => {
                    console.log(`[Meditate] ⏸️ Audio paused by system: ${item.id}, isPlaying: ${isPlaying}`);
                };

                scheduledIdsRef.current.add(item.id);
                setCurrentAudio(audio);

                (async () => {
                    try {
                        await ensureAudioContext();
                        await audio.play();
                    } catch (e) {
                        console.error('[Meditate] HTMLAudio play failed', e);
                        // 播放失败时也要触发下一个
                        isPlayingNextRef.current = false;
                    }
                })();

                // 🔥 HTMLAudioElement 只调度一个，跳出循环
                break;

            } else if (item.type === 'audio' && item.buffer) {
                // WebAudio 作为 fallback（用于没有 URL 的情况）
                const source = ctx.createBufferSource();
                source.buffer = item.buffer;
                source.connect(ctx.destination);

                const duration = item.buffer.duration;

                const endTimeMs = ((start - ctx.currentTime) + duration) * 1000 + 1000;
                setTimeout(() => {
                    setAudioQueue(prev => prev.filter(q => q.id !== item.id));
                    scheduledIdsRef.current.delete(item.id);
                    sourceNodesRef.current.delete(item.id);
                }, endTimeMs);

                source.start(start);
                nextStartTimeRef.current = start + duration;
                scheduledIdsRef.current.add(item.id);
                sourceNodesRef.current.set(item.id, source);
                currentSourceRef.current = source;

                scheduledCount++;

            } else if (item.type === 'audio' && item.status === 'loading') {
                // 音频还在加载，停止调度等待
                setIsBuffering(true);
                break;
            }
        }

        isPlayingNextRef.current = false;
    };

    // 🔥 用 b1d4d20 的方式：useEffect 监听 audioQueue 变化，顺序播放
    useEffect(() => {
        // 停止播放时清理
        if (!isPlaying) {
            // 🔥 [Audio Fix] 平滑淡出，避免爆音
            if (currentAudio) {
                const audio = currentAudio;
                const fadeOutDuration = 100; // ms
                const steps = 10;
                const stepTime = fadeOutDuration / steps;
                const volumeStep = audio.volume / steps;

                let currentStep = 0;
                const fadeInterval = setInterval(() => {
                    currentStep++;
                    audio.volume = Math.max(0, audio.volume - volumeStep);

                    if (currentStep >= steps) {
                        clearInterval(fadeInterval);
                        audio.pause();
                        audio.volume = 1; // 恢复音量供下次使用
                    }
                }, stepTime);
            }
            if (currentSourceRef.current) {
                try { currentSourceRef.current.stop(); } catch { }
                currentSourceRef.current = null;
            }
            isPlayingNextRef.current = false;
            setIsBuffering(false);
            isProcessingRef.current = false; // 重置
            // currentItemIdRef 保持不变以支持断点续传
            return;
        }

        // 队列为空时停止
        if (audioQueue.length === 0) {
            if (isPlaying && !isGenerating) {
                console.log("[Meditate] ✅ Session Complete");
                triggerSuccess();
                setIsPlaying(false);
            }
            return;
        }

        // 🔥 锁：防止并发执行
        if (isProcessingRef.current) return;

        // 🔥 关键防护：如果有音频正在播放，不处理
        if (currentAudio && !currentAudio.paused) return;

        // 🔥 如果 currentAudio 存在但已暂停（可能是播放完毕），清理它
        // 不要尝试恢复，因为会触发 NotAllowedError

        // 处理队列第一个项目
        if (audioQueue.length > 0) {
            const item = audioQueue[0];

            // 🔥 Resume Logic: 如果 ID 匹配，说明是暂停后继续，恢复播放而不重新开始
            if (currentItemIdRef.current === item.id) {
                const audio = sharedAudioRef.current || currentAudio;
                if (audio && audio.paused) {
                    audio.play().catch(() => { });
                    // 恢复计时器
                    if (!elapsedTimerRef.current) {
                        elapsedTimerRef.current = setInterval(() => {
                            setElapsedSeconds(prev => prev + 1);
                        }, 1000);
                    }
                }
                return;
            }

            // 🔥 设置锁，防止并发处理
            isProcessingRef.current = true;
            currentItemIdRef.current = item.id;

            // 跳过错误的
            if (item.type === 'audio' && item.status === 'error') {
                setAudioQueue(prev => prev.slice(1));
                isProcessingRef.current = false;
                currentItemIdRef.current = null;
                return;
            }

            // 等待加载
            if (item.type === 'audio' && item.status === 'loading') {
                setIsBuffering(true);
                isProcessingRef.current = false;
                currentItemIdRef.current = null;
                return;
            }

            setIsBuffering(false);

            if (item.type === 'pause') {
                const silenceUrl = createSilenceWavURL(item.duration / 1000);

                // 🔥 [iOS Strict Fix] 强制复用 sharedAudioRef
                if (!sharedAudioRef.current) {
                    sharedAudioRef.current = new Audio();
                    (sharedAudioRef.current as any).playsInline = true;
                }
                const audio = sharedAudioRef.current;

                audio.volume = 1;
                audio.src = silenceUrl;

                const cleanup = () => {
                    if (sharedAudioRef.current === audio) {
                        audio.onended = null;
                        audio.onerror = null;
                    }
                    URL.revokeObjectURL(silenceUrl);
                    setAudioQueue(prev => prev.slice(1));
                    setCurrentAudio(null);
                    currentItemIdRef.current = null;
                    isProcessingRef.current = false;
                };

                audio.onended = cleanup;
                audio.onerror = cleanup;
                setCurrentAudio(audio);

                (async () => {
                    try {
                        await ensureAudioContext();
                        await audio.play();
                    } catch (e) {
                        console.error('[Meditate] Silence playback failed', e);
                        cleanup();
                    }
                })();
            } else if (item.type === 'audio' && item.url) {
                // 🔥 [iOS Strict Fix] 强制复用 sharedAudioRef
                let audio = sharedAudioRef.current;
                if (!audio) {
                    audio = new Audio();
                    sharedAudioRef.current = audio;
                    (audio as any).playsInline = true;
                }

                // 停止之前的静音循环（如果有）
                audio.loop = false;
                audio.volume = 1;
                audio.src = item.url;

                // 💬 设置当前正在朗读的句子
                if (item.text) {
                    setCurrentSpokenText(item.text);
                }

                // ⏱️ 更新已播放段落计数
                setPlayedCount(prev => prev + 1);

                // ⏱️ 启动计时器（如果尚未启动）
                if (!elapsedTimerRef.current) {
                    elapsedTimerRef.current = setInterval(() => {
                        setElapsedSeconds(prev => prev + 1);
                    }, 1000);
                }

                // 设置 Media Session
                try {
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.metadata = new MediaMetadata({
                            title: activeCard ? (customTopics.find(t => t.id === activeCard)?.title || 'Rain 冥想') : 'Rain 冥想',
                            artist: 'Rain Meditation',
                            artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }]
                        });
                        navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
                        navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
                    }
                } catch { }

                const cleanup = () => {
                    // 🔥 [BUG FIX] 移除 500ms 延迟，立即重置锁，防止队列卡住
                    console.log(`[Meditate] 🔄 Audio cleanup for item, resetting locks`);
                    if (sharedAudioRef.current === audio) {
                        audio.onended = null;
                        audio.onerror = null;
                    }
                    if (item.url && item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
                    setAudioQueue(prev => prev.slice(1));
                    setCurrentAudio(null);
                    currentItemIdRef.current = null;
                    isProcessingRef.current = false;
                };

                audio.onended = cleanup;
                audio.onerror = cleanup;
                setCurrentAudio(audio);

                (async () => {
                    try {
                        await ensureAudioContext();
                        await audio.play();
                    } catch (e) {
                        console.error('[Meditate] Audio playback failed', e);
                        cleanup();
                    }
                })();
            } else if (item.type === 'audio' && item.buffer) {
                // WebAudio fallback
                (async () => {
                    await ensureAudioContext();
                    const ctx = audioContextRef.current;
                    if (!ctx) {
                        setAudioQueue(prev => prev.slice(1));
                        // 🔥 [BUG FIX] 必须重置锁
                        currentItemIdRef.current = null;
                        isProcessingRef.current = false;
                        return;
                    }
                    const source = ctx.createBufferSource();
                    source.buffer = item.buffer || null;
                    source.connect(ctx.destination);
                    source.onended = () => {
                        setAudioQueue(prev => prev.slice(1));
                        currentSourceRef.current = null;
                        // 🔥 [BUG FIX] 必须重置锁
                        currentItemIdRef.current = null;
                        isProcessingRef.current = false;
                    };
                    currentSourceRef.current = source;
                    try {
                        await ctx.resume();
                        source.start();
                    } catch (e) {
                        console.error('[Meditate] WebAudio play failed', e);
                        setAudioQueue(prev => prev.slice(1));
                        // 🔥 [BUG FIX] 必须重置锁
                        currentItemIdRef.current = null;
                        isProcessingRef.current = false;
                    }
                })();
            } else {
                // 跳过无法播放的
                console.log('[Meditate] ⚠️ Skipping unplayable item:', item);
                setAudioQueue(prev => prev.slice(1));
                // 🔥 [BUG FIX] 必须重置锁
                currentItemIdRef.current = null;
                isProcessingRef.current = false;
            }
        }
    }, [isPlaying, audioQueue, currentAudio, isGenerating]);

    // Handle Stop / Reset
    // 🎵 后台音频 Hook
    const backgroundAudio = useBackgroundAudio();

    const stopAudio = async () => {
        setIsPlaying(false);
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
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
        processingBuffer.current = "";

        // 🎵 停用后台音频
        await backgroundAudio.deactivate();

        // Invalidate any running generation
        currentGenerationIdRef.current++;
    };



    const wakeLockRef = useRef<any>(null);
    const wakeLockActiveRef = useRef(false);


    const requestWakeLock = async () => {
        try {
            const nav: any = navigator as any;
            if (!nav || !('wakeLock' in nav)) return;
            const sent = await nav.wakeLock.request('screen');
            wakeLockRef.current = sent;
            wakeLockActiveRef.current = true;
            try {
                sent.addEventListener('release', () => {
                    wakeLockActiveRef.current = false;
                });
            } catch { }
        } catch {
            wakeLockActiveRef.current = false;
        }
    };

    const releaseWakeLock = async () => {
        try {
            if (wakeLockRef.current) {
                await wakeLockRef.current.release();
            }
        } catch {
        } finally {
            wakeLockRef.current = null;
            wakeLockActiveRef.current = false;
        }
    };

    useEffect(() => {
        const onVisibility = async () => {
            if (document.hidden) {
                if (!wakeLockActiveRef.current) {
                    try { await requestWakeLock(); } catch { }
                }
                setShowAudioHint(false);
            } else {
                // === P0: 增强队列恢复 === //
                setShowAudioHint(false);
                try { await ensureAudioContext(); } catch { }

                // 恢复当前暂停的音频
                if (currentAudio && isPlaying && currentAudio.paused) {
                    try { await currentAudio.play(); } catch { }
                }

                // 关键：如果队列有项目但没有在播放，强制触发下一个
                if (audioQueue.length > 0 && !currentItemIdRef.current && !currentAudio) {
                    // 强制刷新队列触发 useEffect
                    setAudioQueue(prev => [...prev]);
                }
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [currentAudio, isPlaying, audioQueue]);

    // 🎵 播放状态变化时更新后台音频状态
    useEffect(() => {
        if (isPlaying) {
            backgroundAudio.setPlaybackState('playing');
        } else {
            backgroundAudio.setPlaybackState('paused');
        }
    }, [isPlaying, backgroundAudio]);

    // === P1: AudioContext 看门狗 - 仅用于恢复挂起的音频上下文 === //
    useEffect(() => {
        if (!isPlaying) return;

        const watchdog = setInterval(async () => {
            // 只检查 AudioContext 状态，不再检查队列
            if (audioContextRef.current?.state === 'suspended') {
                try {
                    await audioContextRef.current.resume();
                } catch { }
            }

            // 🔥 移除了队列停滞检测，因为新的简单播放器会自动处理
        }, 3000);

        return () => clearInterval(watchdog);
    }, [isPlaying]);

    const generateMeditation = async (prompt: string) => {
        // 1. Start new generation session
        const generationId = ++currentGenerationIdRef.current;

        setIsGenerating(true);
        setText("");
        setAudioQueue([]);
        setCurrentAudio(null);
        processingBuffer.current = "";
        currentRate.current = "0%"; // Reset rate
        currentItemIdRef.current = null; // Reset processing tracker
        isProcessingRef.current = false; // Reset lock

        // Remove any existing listeners to avoid duplicates
        if (typeof window !== 'undefined' && (window as any).electron) {
            (window as any).electron.removeMeditationListeners();
        }

        try {
            // 🎵 激活后台音频（Media Session + Wake Lock）
            await backgroundAudio.activate({
                title: activeCard ? (customTopics.find(t => t.id === activeCard)?.title || '冥想') : '冥想',
                artist: 'Rain Meditation',
                album: '正念冥想',
                onPlay: () => setIsPlaying(true),
                onPause: () => setIsPlaying(false),
                onStop: () => stopAudio()
            });

            setIsPlaying(true);

            if (typeof window !== 'undefined' && (window as any).electron) {
                (window as any).electron.onMeditationChunk(async (chunk: string) => {
                    if (currentGenerationIdRef.current !== generationId) return; // 🛑 Stale check
                    setText((prev) => prev + chunk);
                    processingBuffer.current += chunk;
                    await processBuffer();
                });

                (window as any).electron.onMeditationError((error: any) => {
                    if (currentGenerationIdRef.current !== generationId) return; // 🛑 Stale check
                    console.error("Generation error:", error);
                    setIsGenerating(false);
                });

                (window as any).electron.onMeditationDone(async () => {
                    if (currentGenerationIdRef.current !== generationId) return; // 🛑 Stale check
                    // Process any remaining text in buffer - FLUSH all remaining
                    await processBuffer(true);
                    setIsGenerating(false);
                });

                (window as any).electron.generateMeditation(prompt, apiKey);
            } else {
                // 🚀 使用当前卡片的独立设置
                const currentCardSettings = cardSettings[activeCard || 'default'];
                const cardDuration = currentCardSettings?.duration ?? meditationDuration;
                const cardGuidance = currentCardSettings?.guidanceLevel ?? guidanceLevel;

                const res = await fetch(getApiUrl('/api/generate'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        apiKey,
                        systemPrompt: globalSystemPrompt,
                        duration: cardDuration,  // 🚀 使用该卡片的时长设置
                        guidanceLevel: cardGuidance  // 🚀 使用该卡片的引导模式
                    })
                });
                if (!res.ok) {
                    try {
                        const data = await res.json();
                        if (res.status === 401) {
                            setText("鉴权失败：API Key 无效或过期。\n请点击上方「设置」图标，输入有效的 DeepSeek API Key。");
                            setShowPromptEdit(true); // Auto open settings for convenience
                        } else {
                            setText(`生成失败：${data?.error || `HTTP ${res.status}`} `);
                        }
                    } catch (_) {
                        setText(`生成失败：HTTP ${res.status}`);
                    }
                    setIsGenerating(false);
                    return;
                }
                const reader = res.body?.getReader();
                if (!reader) {
                    setText('生成失败：服务器未开启流');
                    setIsGenerating(false);
                } else {
                    const decoder = new TextDecoder();
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            if (currentGenerationIdRef.current !== generationId) {
                                console.log("🛑 Generation abandoned (stale session)");
                                reader.cancel();
                                return;
                            }
                            const chunk = decoder.decode(value, { stream: true });
                            setText((prev) => prev + chunk);
                            processingBuffer.current += chunk;
                            await processBuffer();
                        }
                    } catch (readError) {
                        console.warn("Stream reading interrupted:", readError);
                    } finally {
                        // Check if we are still the active session before finalizing
                        if (currentGenerationIdRef.current === generationId) {
                            // 🛑 确保 stream 结束或出错时，强制刷新剩余缓冲区
                            if (processingBuffer.current.trim().length > 0) {
                                console.log("Flushing remaining buffer...", processingBuffer.current.length);
                                try {
                                    await processBuffer(true);
                                } catch (e) {
                                    console.error("Final flush failed:", e);
                                }
                            }
                            setIsGenerating(false);
                            triggerSuccess();
                        }
                    }
                }
            }

        } catch (error) {
            console.error("Generation failed", error);
            setIsGenerating(false);
            triggerHeavy();
        }
    };

    const isIOSPlatform = () => {
        try {
            return typeof navigator !== 'undefined' && ((/iPad|iPhone|iPod/.test(navigator.userAgent)) || ((navigator.platform === 'MacIntel') && (navigator.maxTouchPoints > 1)));
        } catch {
            return false;
        }
    };

    const createSilenceWavURL = (seconds: number) => {
        const sr = audioContextRef.current?.sampleRate || 44100;
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
        const dataOffset = 44;

        // 🔥 [iOS Fix] 抖动静音：微小随机噪声，防止 iOS 检测为纯静音
        // 纯静音 (view.setInt16(_, 0, true)) 会被 iOS 检测并暂停
        for (let i = 0; i < samples; i++) {
            const dither = (Math.random() - 0.5) * 6; // ±3 的极微小噪声（几乎听不到）
            view.setInt16(dataOffset + i * 2, Math.round(dither), true);
        }

        const blob = new Blob([view], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    };

    // === 简化版 processBuffer：按 pause 分段 === //
    const hasStartedSpeakingRef = useRef(false);
    const isParsingRef = useRef(false); // 🔥 独立的解析锁，避免与播放锁冲突

    const processBuffer = async (flushRemaining = false) => {
        if (isParsingRef.current) return;
        isParsingRef.current = true;

        try {
            // 匹配 [pause Xs] 或 [rate ±N%] 标签
            const tagRegex = /\[(pause|rate)\s*[:=]?\s*([^\]]+)\]/i;

            while (true) {
                const buffer = processingBuffer.current;
                if (!buffer || buffer.trim().length === 0) break;

                const tagMatch = buffer.match(tagRegex);

                if (tagMatch && tagMatch.index !== undefined) {
                    // 有标签，分段处理
                    const textBefore = buffer.substring(0, tagMatch.index).trim();
                    const tagType = tagMatch[1].toLowerCase();
                    const tagValue = tagMatch[2];
                    const tagFull = tagMatch[0];

                    // 1. 先处理标签前的文字（如果有）
                    if (textBefore.length > 0) {
                        const cleanedText = sanitizeForTTS(textBefore);

                        if (cleanedText.length > 0) {
                            const itemId = Math.random().toString(36).substr(2, 9);
                            setAudioQueue(prev => [...prev, {
                                type: 'audio',
                                id: itemId,
                                status: 'loading',
                                text: cleanedText
                            }]);
                            setTotalSegments(prev => prev + 1); // ➕ 更新总段落数
                            generateAudioWithRetry(cleanedText, itemId);
                            hasStartedSpeakingRef.current = true;
                        }
                    }

                    // 2. 处理标签
                    if (tagType === 'pause') {
                        // 解析 pause 时长
                        const durationMatch = tagValue.match(/(\d+(?:\.\d+)?)\s*(ms|s)?/i);
                        if (durationMatch) {
                            let val = parseFloat(durationMatch[1]);
                            const unit = (durationMatch[2] || '').toLowerCase();
                            let durMs = (unit === 's' || (!unit && val < 50)) ? val * 1000 : val;

                            setAudioQueue(prev => [...prev, {
                                type: 'pause',
                                duration: durMs,
                                id: Math.random().toString(36).substr(2, 9)
                            }]);
                        }
                    } else if (tagType === 'rate') {
                        // 更新语速
                        currentRate.current = tagValue.trim();
                    }

                    // 3. 移除已处理的内容（文字 + 标签）
                    processingBuffer.current = buffer.substring(tagMatch.index + tagFull.length);

                } else if (flushRemaining) {
                    // 没有标签，但需要刷新剩余内容
                    const cleanedText = sanitizeForTTS(buffer.trim());

                    if (cleanedText.length > 0) {
                        const itemId = Math.random().toString(36).substr(2, 9);
                        setAudioQueue(prev => [...prev, {
                            type: 'audio',
                            id: itemId,
                            status: 'loading',
                            text: cleanedText
                        }]);
                        setTotalSegments(prev => prev + 1); // ➕ 更新总段落数
                        generateAudioWithRetry(cleanedText, itemId);
                        hasStartedSpeakingRef.current = true;
                    }
                    processingBuffer.current = '';
                    break;

                } else {
                    // 没有标签，等待更多数据
                    break;
                }
            }
        } finally {
            isParsingRef.current = false;
        }
    };

    // 🚀 带重试的 TTS 生成函数
    const generateAudioWithRetry = async (text: string, itemId: string, retryCount = 0) => {

        try {
            if (typeof window !== 'undefined' && (window as any).electron) {
                const url = await (window as any).electron.generateTTS(text, selectedVoice, currentRate.current);
                setAudioQueue(prev => prev.map(item =>
                    item.id === itemId ? { ...item, url, status: 'ready' } : item
                ));
            } else {
                // 使用重试逻辑
                const resp = await fetchWithRetry('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, voice: selectedVoice, rate: currentRate.current })
                });

                if (resp && resp.ok) {
                    const blob = await resp.blob();
                    try {
                        await ensureAudioContext();
                        const ctx = audioContextRef.current;
                        if (ctx) {
                            const arr = await blob.arrayBuffer();
                            const buf = await ctx.decodeAudioData(arr);

                            // 🔍 检查音频时长是否匹配文本长度
                            const expectedDuration = text.length / 4; // 约 4 字/秒
                            const actualDuration = buf.duration;
                            const ratio = actualDuration / expectedDuration;

                            if (ratio < 0.5 && retryCount < 2) {
                                // 🔥 音频被截断，用更慢语速重试
                                const slowerRate = "-20%"; // 降低语速可能更稳定
                                await new Promise(r => setTimeout(r, 1000));
                                // 临时用慢速重试
                                const prevRate = currentRate.current;
                                currentRate.current = slowerRate;
                                await generateAudioWithRetry(text, itemId, retryCount + 1);
                                currentRate.current = prevRate;
                                return;
                            }

                            if (ratio < 0.5) {
                            } else {
                            }

                            // 更新队列中的 item 为 ready
                            // 🔥 同时设置 buffer 和 url，确保 HTMLAudioElement 可以使用
                            const blobUrl = URL.createObjectURL(blob);
                            setAudioQueue(prev => prev.map(item =>
                                item.id === itemId ? { ...item, buffer: buf, url: blobUrl, status: 'ready' } : item
                            ));

                        } else {
                            // Fallback
                            const url = URL.createObjectURL(blob);
                            setAudioQueue(prev => prev.map(item =>
                                item.id === itemId ? { ...item, url, status: 'ready' } : item
                            ));
                        }
                    } catch (e) {
                        console.error('[Audio] Decode failed', e);
                        const url = URL.createObjectURL(blob);
                        setAudioQueue(prev => prev.map(item =>
                            item.id === itemId ? { ...item, url, status: 'ready' } : item
                        ));
                    }
                }
                else {
                    // 标记为错误，避免 scheduler 卡死
                    setAudioQueue(prev => prev.map(item =>
                        item.id === itemId ? { ...item, status: 'error' } : item
                    ));
                }
            }
        } catch (e) {
            console.error("TTS failed", e);
            setAudioQueue(prev => prev.map(item =>
                item.id === itemId ? { ...item, status: 'error' } : item
            ));
        }
    };

    const handleCardClick = async (id: string) => {
        // 🔥 [iOS Critical] 必须在用户点击的第一个同步 tick 执行 play()
        // 不要 await 任何东西，先 prime
        primeAudio();

        triggerLight();

        // 🚀 Auto-play Logic
        try {
            // 这里可以 await，因为 primeAudio 已经触发了 audio 实例
            await ensureAudioContext();
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            setIsPlaying(true);
        } catch (e) {
            console.error("Auto-play setup failed", e);
        }

        setActiveCard(id);
        const topic = DEFAULT_TOPICS.find(t => t.id === id) || customTopics.find(t => t.id === id);
        const promptToUse = (editedPrompts[id] ?? topic?.prompt ?? customPrompt);

        // Record Session Start
        try {
            fetch(getApiUrl('/api/meditation/sessions'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topicId: id,
                    topicName: topic?.title || "未知冥想"
                })
            }).then(async res => {
                if (res.ok) {
                    const data = await res.json();
                    if (data?.id) setCurrentSessionId(data.id);
                }
            });
        } catch (e) {
            console.error("Failed to start session recording", e);
        }

        await ensureAudioContext();
        primeAudio();
        generateMeditation(promptToUse);
    };

    const handleDeleteCard = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("确定要删除这张冥想卡片吗？")) return;

        try {
            await apiDeleteTopic(id);
        } catch (err) {
            console.error("Failed to delete topic", err);
        }
    };

    const handleSaveAddCard = async () => {
        if (!newCardTitle.trim() || !newCardPrompt.trim()) return;

        try {
            const res = await apiAddTopic({
                title: newCardTitle,
                prompt: newCardPrompt,
                icon_name: 'wind'
            });

            if (res.ok) {
                setShowAddCard(false);
                setNewCardTitle("");
                setNewCardPrompt("");
            }
        } catch (err) {
            console.error("Add failed", err);
        }
    };

    const handleSaveDraftPrompt = async () => {
        if (!editingTopicId) return;

        // Optimistically update
        setEditedPrompts(prev => ({ ...prev, [editingTopicId]: draftPrompt }));

        try {
            await fetch(getApiUrl('/api/prompts'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [editingTopicId]: draftPrompt })
            });
            setShowPromptEdit(false);
        } catch (err) {
            console.error("Update prompt failed", err);
        }
    };

    return (
        <AuthGuard>
            <div className="min-h-screen text-slate-200">
                {/* Main Content */}

                <motion.div
                    initial={{ y: 20 }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.8, ease: APPLE_EASE }}
                    className="flex-1 w-full max-w-4xl mx-auto z-10 overflow-y-auto pb-48 px-4 scrollbar-hide pt-24 min-h-screen"
                >
                    {/* 页面标题 */}
                    <header className="mb-8">
                        <h1 className="text-3xl font-thin text-white/90">正念冥想</h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2, duration: 1 }}
                            className="text-white/40 mt-2 font-light"
                        >
                            选择一个主题，开始你的冥想之旅
                        </motion.p>
                    </header>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-8">
                        {/* Default Topics */}
                        {DEFAULT_TOPICS.map((topic, index) => (
                            <motion.button
                                key={topic.id}
                                onClick={() => handleCardClick(topic.id)}
                                onHoverStart={() => triggerLight()} // 轻微触感
                                onTapStart={() => triggerLight()}
                                variants={breathingVariants}
                                initial="idle"
                                animate="idle"
                                whileHover="hover"
                                whileTap="tap"
                                className="group relative w-full aspect-square text-left focus:outline-none rounded-[2rem] cursor-pointer"
                            >
                                <GlassCard
                                    hoverEffect={true}
                                    className="h-full p-6 flex flex-col justify-between bg-gradient-to-br from-rose-500/[0.1] to-pink-500/[0.1] border-white/10"
                                >
                                    {/* 设置按钮 - 不参与动画 */}
                                    <div className="absolute top-3 right-3 z-20">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingTopicId(topic.id);
                                                const base = editedPrompts[topic.id] ?? topic.prompt ?? DEFAULT_PROMPT;
                                                setDraftPrompt(base);
                                                setShowPromptEdit(true);
                                            }}
                                            className="p-1.5 hover:bg-white/10 rounded-full text-white/20 hover:text-white/60 transition-all"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </div>
                                    </div>

                                    {/* 🌟 卡片内部内容动画 - 采用统计页面模式 */}
                                    <motion.div
                                        variants={getCardContentVariants(index)}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        {topic.icon ? <topic.icon className="w-8 h-8 mb-2 text-white/80" /> : <Wind className="w-8 h-8 mb-2 text-white/80" />}
                                        <span className="text-lg font-medium leading-tight z-10 block">{topic.title}</span>

                                        {/* 时长 + 引导模式徽章 */}
                                        <div className="flex gap-1.5 mt-2 flex-wrap">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                                                {cardSettings[topic.id]?.duration ?? meditationDuration}分钟
                                            </span>
                                            <span className={cn(
                                                "text-[10px] px-2 py-0.5 rounded-full",
                                                GUIDANCE_LEVELS[cardSettings[topic.id]?.guidanceLevel ?? guidanceLevel].color
                                            )}>
                                                {GUIDANCE_LEVELS[cardSettings[topic.id]?.guidanceLevel ?? guidanceLevel].label}
                                            </span>
                                        </div>
                                    </motion.div>
                                </GlassCard>
                            </motion.button>
                        ))}

                        {/* Custom Topics from Supabase */}
                        {customTopics.map((topic, index) => (
                            <motion.button
                                key={topic.id}
                                onClick={() => handleCardClick(topic.id)}
                                onHoverStart={() => triggerLight()}
                                onTapStart={() => triggerLight()}
                                variants={breathingVariants}
                                initial="idle"
                                animate="idle"
                                whileHover="hover"
                                whileTap="tap"
                                className="group relative w-full aspect-square text-left focus:outline-none rounded-[2rem] cursor-pointer"
                            >
                                <GlassCard
                                    hoverEffect={true}
                                    className="h-full p-6 flex flex-col justify-between bg-gradient-to-br from-rose-500/[0.1] to-pink-500/[0.1] border-white/10"
                                >
                                    {/* 设置和删除按钮 - 不参与动画 */}
                                    <div className="absolute top-3 right-3 z-20 flex gap-2">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingTopicId(topic.id);
                                                const base = editedPrompts[topic.id] ?? topic.prompt ?? DEFAULT_PROMPT;
                                                setDraftPrompt(base);
                                                setShowPromptEdit(true);
                                            }}
                                            className="p-1.5 hover:bg-white/10 rounded-full text-white/20 hover:text-white/60 transition-all"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </div>
                                        <div
                                            onClick={(e) => handleDeleteCard(e, topic.id)}
                                            className="p-1.5 hover:bg-red-500/20 rounded-full text-white/20 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-red-300" />
                                        </div>
                                    </div>

                                    {/* 🌟 卡片内部内容动画 - 采用统计页面模式 */}
                                    <motion.div
                                        variants={getCardContentVariants(DEFAULT_TOPICS.length + index)}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        {topic.icon ? <topic.icon className="w-8 h-8 mb-2 text-white/80" /> : <Wind className="w-8 h-8 mb-2 text-white/80" />}
                                        <span className="text-lg font-medium leading-tight z-10 block">{topic.title}</span>

                                        {/* 时长 + 引导模式徽章 */}
                                        <div className="flex gap-1.5 mt-2 flex-wrap">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                                                {cardSettings[topic.id]?.duration ?? meditationDuration}分钟
                                            </span>
                                            <span className={cn(
                                                "text-[10px] px-2 py-0.5 rounded-full",
                                                GUIDANCE_LEVELS[cardSettings[topic.id]?.guidanceLevel ?? guidanceLevel].color
                                            )}>
                                                {GUIDANCE_LEVELS[cardSettings[topic.id]?.guidanceLevel ?? guidanceLevel].label}
                                            </span>
                                        </div>
                                    </motion.div>
                                </GlassCard>
                            </motion.button>
                        ))}

                        {/* Add New Card Button - 无入场动画 */}
                        <button
                            onClick={() => {
                                setNewCardTitle("");
                                setNewCardPrompt("");
                                setShowAddCard(true);
                            }}
                            className="group relative w-full aspect-square text-center transition-all hover:scale-[1.02] focus:outline-none rounded-[2rem] cursor-pointer"
                        >
                            <GlassCard className="h-full p-4 flex flex-col items-center justify-center border-dashed border-2 border-white/20 hover:border-white/40 bg-transparent">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                                    <Plus className="w-6 h-6 text-white/50 group-hover:text-white/80" />
                                </div>
                                <span className="text-sm text-white/40 group-hover:text-white/70">添加冥想</span>
                            </GlassCard>
                        </button>
                    </div>
                </motion.div>
                {/* 🌟 底部空白已由容器 padding-bottom 处理 */}

                {/* Settings Modal (Prompt + Voice) */}
                <AnimatePresence>
                    {showPromptEdit && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[80vh] overflow-y-auto scrollbar-hide pb-24"
                            >
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium">
                                        {editingTopicId ? "编辑冥想卡片" : "全局设置"}
                                    </h3>
                                    <button onClick={() => setShowPromptEdit(false)} className="p-2 hover:bg-white/10 rounded-full">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {showAudioHint && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
                                        <span className="text-xs text-amber-200">音频被系统暂停</span>
                                        <button
                                            onClick={async () => {
                                                await ensureAudioContext();
                                                setShowAudioHint(false);
                                                if (currentAudio && currentAudio.paused && isPlaying) {
                                                    try { await currentAudio.play(); } catch { }
                                                }
                                            }}
                                            className="px-2 py-1 bg-amber-500/20 rounded text-xs text-amber-100 hover:bg-amber-500/30"
                                        >
                                            恢复播放
                                        </button>
                                    </div>
                                )}

                                {/* Voice Selection */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                                            选择音色
                                        </label>
                                        <select
                                            value={selectedVoice}
                                            onChange={(e) => {
                                                setSelectedVoice(e.target.value);
                                                localStorage.setItem("meditation_voice", e.target.value);
                                            }}
                                            className="w-full bg-white/5 backdrop-blur rounded-xl px-4 py-3 text-sm text-white border border-white/10 outline-none focus:ring-2 focus:ring-rose-500/40 appearance-none cursor-pointer hover:bg-white/10 transition-all font-medium"
                                        >
                                            {VOICES.map((voice) => (
                                                <option key={voice.id} value={voice.id} className="bg-zinc-900 text-slate-200 py-2">
                                                    {voice.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="text-xs text-white/30 mt-2 px-1">
                                            * 部分方言音色可能在特定区域可用性有限
                                        </div>
                                    </div>

                                    {/* 🚀 时长选择器 */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                                            冥想时长
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {DURATION_OPTIONS.map((dur) => {
                                                const currentCardId = editingTopicId || 'default';
                                                const currentDuration = cardSettings[currentCardId]?.duration ?? meditationDuration;
                                                return (
                                                    <button
                                                        key={dur}
                                                        onClick={() => {
                                                            const newSettings = {
                                                                ...cardSettings,
                                                                [currentCardId]: {
                                                                    ...cardSettings[currentCardId],
                                                                    duration: dur,
                                                                    guidanceLevel: cardSettings[currentCardId]?.guidanceLevel ?? guidanceLevel
                                                                }
                                                            };
                                                            setCardSettings(newSettings);
                                                            localStorage.setItem("meditation_card_settings", JSON.stringify(newSettings));
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-xl border text-sm transition-all",
                                                            currentDuration === dur
                                                                ? "bg-rose-500 border-rose-400 text-white"
                                                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {dur}分钟
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">选择该卡片的冥想时长</p>
                                    </div>

                                    {/* 🚀 引导模式选择器 */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                                            引导强度
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(Object.entries(GUIDANCE_LEVELS) as [keyof typeof GUIDANCE_LEVELS, typeof GUIDANCE_LEVELS[keyof typeof GUIDANCE_LEVELS]][]).map(([key, { label, color }]) => {
                                                const currentCardId = editingTopicId || 'default';
                                                const currentGuidance = cardSettings[currentCardId]?.guidanceLevel ?? guidanceLevel;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => {
                                                            const newSettings = {
                                                                ...cardSettings,
                                                                [currentCardId]: {
                                                                    ...cardSettings[currentCardId],
                                                                    duration: cardSettings[currentCardId]?.duration ?? meditationDuration,
                                                                    guidanceLevel: key
                                                                }
                                                            };
                                                            setCardSettings(newSettings);
                                                            localStorage.setItem("meditation_card_settings", JSON.stringify(newSettings));
                                                        }}
                                                        className={cn(
                                                            "px-3 py-2 rounded-xl border text-sm transition-all",
                                                            currentGuidance === key ? color : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1">轻引导适合老手，多引导适合新手</p>
                                    </div>

                                    {/* Global System Prompt - 始终显示 */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm font-medium text-slate-300 block">
                                                全局编导角色 (AI System Prompt)
                                            </label>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await fetch(getApiUrl('/api/system-prompt'), {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ prompt: globalSystemPrompt })
                                                        });
                                                        if (res.ok) alert("已保存到服务器");
                                                    } catch (e) { alert("保存失败"); }
                                                }}
                                                className="text-xs text-rose-400 hover:text-rose-300"
                                            >
                                                保存到服务器
                                            </button>
                                        </div>
                                        <textarea
                                            value={globalSystemPrompt}
                                            onChange={(e) => setGlobalSystemPrompt(e.target.value)}
                                            className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-slate-300 focus:outline-none focus:border-rose-500/50 resize-none"
                                            placeholder="设置 AI 生成冥想脚本的全局指令..."
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">设置后将影响所有冥想内容的生成逻辑和节奏控制。</p>
                                    </div>

                                    {/* Per-card or Global Prompt Edit */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                                            {editingTopicId ? "当前卡片 Prompt" : "预设 Prompt"}
                                        </label>
                                        <textarea
                                            value={draftPrompt}
                                            onChange={(e) => setDraftPrompt(e.target.value)}
                                            className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-slate-300 focus:outline-none focus:border-rose-500/50"
                                            placeholder="设置 AI 生成该卡片脚本时的具体指令..."
                                        />
                                    </div>

                                    {/* DeepSeek API Key Input */}
                                    {!editingTopicId && (
                                        <div className="pt-2 border-t border-white/5">
                                            <label className="text-sm font-medium text-slate-300 mb-2 block">
                                                DeepSeek API Key
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="password"
                                                    value={apiKey}
                                                    onChange={(e) => setApiKey(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500/50"
                                                    placeholder="sk-..."
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1">
                                                Key 将加密存储在本地。不输入则默认使用服务器内置 Key。
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowPromptEdit(false)}
                                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-medium transition-colors"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSaveDraftPrompt}
                                            className="flex-1 py-3 bg-rose-500 hover:bg-rose-400 rounded-2xl text-sm font-medium transition-colors"
                                        >
                                            保存设置
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Add Card Modal */}
                <AnimatePresence>
                    {showAddCard && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6"
                            >
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium">添加新冥想</h3>
                                    <button onClick={() => setShowAddCard(false)} className="p-2 hover:bg-white/10 rounded-full">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                                            卡片标题
                                        </label>
                                        <input
                                            value={newCardTitle}
                                            onChange={(e) => setNewCardTitle(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-rose-500/50"
                                            placeholder="例如：睡前深度放松"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                                            AI 提示词 (Prompt)
                                        </label>
                                        <textarea
                                            value={newCardPrompt}
                                            onChange={(e) => setNewCardPrompt(e.target.value)}
                                            className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-slate-300 focus:outline-none focus:border-rose-500/50"
                                            placeholder="描述你想要的冥想引导内容..."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowAddCard(false)}
                                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-medium transition-colors"
                                        >
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSaveAddCard}
                                            className="flex-1 py-3 bg-rose-500 hover:bg-rose-400 rounded-2xl text-sm font-medium transition-colors"
                                        >
                                            创建卡片
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🧘 全屏沉浸式冥想播放器 */}
                <ImmersiveMeditationPlayer
                    isOpen={!!activeCard}
                    title={activeCard ? (DEFAULT_TOPICS.find(t => t.id === activeCard)?.title || customTopics.find(t => t.id === activeCard)?.title || '冥想') : ''}
                    text={currentSpokenText}
                    fullText={text}
                    isPlaying={isPlaying}
                    isBuffering={isBuffering}
                    queueCurrent={playedCount}
                    queueTotal={totalSegments}
                    elapsedSeconds={elapsedSeconds}
                    onPlayPause={async () => {
                        await ensureAudioContext();
                        primeAudio();
                        if (!isPlaying && audioContextRef.current?.state === 'suspended') {
                            await audioContextRef.current.resume();
                        }
                        setIsPlaying(!isPlaying);
                    }}
                    onClose={() => {
                        stopAudio();
                        setActiveCard(null);
                        setCurrentSpokenText("");
                        setPlayedCount(0);
                        setTotalSegments(0);
                        setElapsedSeconds(0);
                        if (elapsedTimerRef.current) {
                            clearInterval(elapsedTimerRef.current);
                            elapsedTimerRef.current = null;
                        }
                        hasStartedSpeakingRef.current = false;
                        // 关闭时停止所有环境音
                        stopAll();
                    }}
                    cardId={activeCard || undefined}
                    activeTracks={activeTracks as Set<string>}
                    trackVolumes={trackVolumes as Record<string, number>}
                    masterVolume={masterVolume}
                    onToggleTrack={(id) => toggleTrack(id as any)}
                    onSetTrackVolume={(id, vol) => setTrackVolume(id as any, vol)}
                    onSetMasterVolume={setMasterVolume}
                    onStopAll={stopAll}
                    ambientSounds={AMBIENT_SOUNDS}
                />
                <div className="fixed bottom-1 left-0 right-0 text-center pointer-events-none opacity-20 text-[10px] text-white z-50">
                    v0.1.2 (Release)
                </div>
            </div>
        </AuthGuard >
    );
}
