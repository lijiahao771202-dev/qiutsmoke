"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Wind, CloudRain, Zap, Moon, Droplets, Settings, X, Activity, Shield, Trash2, Plus, Network } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import AuthGuard from "@/components/AuthGuard";

// IP Address from system check
const LAN_IP = "10.173.165.153:3001";

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
        id: "rain-exp",
        title: "RAIN 体会版",
        icon: CloudRain,
        color: "from-blue-400 to-blue-600",
        prompt: "创建一个RAIN旁观冥想引导脚本。R(Recognize)识别当下情绪，A(Allow)允许它的存在，I(Investigate)带着好奇心探究身体感受，N(Non-identification)不认同情绪即自我。请用中文回复。"
    },
    {
        id: "desensitization",
        title: "脱敏训练",
        icon: Shield,
        color: "from-rose-400 to-rose-600",
        prompt: "创建一个针对烟瘾的脱敏训练冥想引导脚本。引导用户想象诱发吸烟的场景，观察随之而来的冲动，但不付诸行动，像冲浪一样驾驭冲动直到它消退。请用中文回复。"
    },
    {
        id: "rain-quick",
        title: "RAIN 快速版",
        icon: Zap,
        color: "from-amber-400 to-amber-600",
        prompt: "创建一个快速版RAIN冥想引导脚本。适合在强烈冲动来袭时使用，快速通过识别、允许、探究、不认同四个步骤，找回内心的平静。请用中文回复。"
    },
    {
        id: "rain-full",
        title: "RAIN 完整版",
        icon: Droplets,
        color: "from-violet-400 to-violet-600",
        prompt: "创建一个完整的RAIN冥想引导脚本。详细引导用户进行识别(Recognize)、允许(Allow)、探究(Investigate)、不认同(Non-identification)的每一个步骤，给予充足的时间进行深度体验和转化。请用中文回复。"
    },
];

const ICONS_MAP: Record<string, any> = {
    wind: Wind,
    activity: Activity,
    cloudrain: CloudRain,
    shield: Shield,
    zap: Zap,
    droplets: Droplets,
    moon: Moon
};

const VOICES = [
    { id: "zh-CN-XiaoxiaoNeural", name: "晓晓 (女声-温暖)", style: "warm" },
    { id: "zh-CN-YunxiNeural", name: "云希 (男声-沉稳)", style: "calm" },
    { id: "zh-CN-XiaohanNeural", name: "晓涵 (女声-温柔)", style: "gentle" },
    { id: "zh-CN-YunyangNeural", name: "云野 (男声-专业)", style: "professional" },
];

export default function MeditatePage() {
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

    // New Card State
    const [newCardTitle, setNewCardTitle] = useState("");
    const [newCardPrompt, setNewCardPrompt] = useState("");
    const [customTopics, setCustomTopics] = useState<any[]>([]);

    // Load settings from localStorage and fetch topics on mount
    useEffect(() => {
        const savedPrompt = localStorage.getItem("meditation_prompt");
        if (savedPrompt) setCustomPrompt(savedPrompt);

        // Fetch custom topics
        fetch('/api/meditation/cards')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCustomTopics(data.map(t => ({
                        ...t,
                        icon: ICONS_MAP[t.icon_name?.toLowerCase()] || Wind
                    })));
                }
            })
            .catch(err => console.error("Failed to load topics", err));

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

        (async () => {
            try {
                const res = await fetch('/api/prompts');
                if (res.ok) {
                    const serverObj = await res.json();
                    if (serverObj && typeof serverObj === 'object' && Object.keys(serverObj).length > 0) {
                        setEditedPrompts(serverObj);
                    }
                }
            } catch { }
            try {
                const res = await fetch('/api/system-prompt');
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
        | { type: 'audio', url?: string, buffer?: AudioBuffer, id: string }
        | { type: 'pause', duration: number, id: string };

    const [isPlaying, setIsPlaying] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [audioQueue, setAudioQueue] = useState<QueueItem[]>([]);
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [showAudioHint, setShowAudioHint] = useState(false);
    const [text, setText] = useState("");
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // Refs for processing
    const currentRate = useRef("0%");
    const processingBuffer = useRef("");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isPausingRef = useRef(false);
    const currentItemIdRef = useRef<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const ensureAudioContext = async () => {
        const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current && AC) {
            const ctx = new AC();
            audioContextRef.current = ctx;
            try {
                ctx.onstatechange = () => {
                    const st = ctx.state;
                    if (st === 'suspended') {
                        setShowAudioHint(true);
                    } else if (st === 'running') {
                        setShowAudioHint(false);
                    }
                };
            } catch { }
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
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
    const primeAudio = async () => {
        if (primeOnceRef.current) return;
        primeOnceRef.current = true;
        await playSilence(0.05);
    };

    // Play next item in queue
    useEffect(() => {
        // Handle global pause/play toggle
        if (!isPlaying) {
            if (currentAudio) currentAudio.pause();
            if (currentSourceRef.current) {
                try { currentSourceRef.current.stop(); } catch { }
                currentSourceRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
                isPausingRef.current = false;
                currentItemIdRef.current = null; // Reset so we can resume correctly
            }
            return;
        }

        // If currently playing audio, do nothing (wait for onended)
        if (currentAudio && !currentAudio.paused) return;

        // If currently pausing, do nothing (wait for timeout)
        if (isPausingRef.current) return;

        // If we have a current audio that is paused (and we are isPlaying=true), resume it
        if (currentAudio && currentAudio.paused) {
            currentAudio.play().catch(e => console.error("Resume failed", e));
            return;
        }

        // Process next item in queue
        if (audioQueue.length > 0) {
            const item = audioQueue[0];

            // Prevent double-processing the same item (Fix for skipping/jumping)
            if (currentItemIdRef.current === item.id) return;
            currentItemIdRef.current = item.id;

            if (item.type === 'pause') {
                isPausingRef.current = true;
                (async () => {
                    await playSilence(item.duration);
                    isPausingRef.current = false;
                    setAudioQueue(prev => prev.slice(1));
                    currentItemIdRef.current = null;
                })();
            } else {
                // Start audio
                if (item.buffer) {
                    (async () => {
                        await ensureAudioContext();
                        const ctx = audioContextRef.current;
                        if (!ctx) {
                            setAudioQueue(prev => prev.slice(1));
                            currentItemIdRef.current = null;
                            return;
                        }
                        const source = ctx.createBufferSource();
                        source.buffer = item.buffer || null;
                        source.connect(ctx.destination);
                        source.onended = () => {
                            setAudioQueue(prev => prev.slice(1));
                            currentSourceRef.current = null;
                            currentItemIdRef.current = null;
                        };
                        currentSourceRef.current = source;
                        try {
                            await ctx.resume();
                            source.start();
                        } catch (e) {
                            console.error('WebAudio play failed', e);
                            currentSourceRef.current = null;
                            setAudioQueue(prev => prev.slice(1));
                            currentItemIdRef.current = null;
                        }
                    })();
                } else if (item.url) {
                    const audio = new Audio(item.url);
                    (audio as any).playsInline = true;
                    audio.preload = 'auto';
                    try {
                        const nav: any = navigator as any;
                        if (nav && 'mediaSession' in nav) {
                            try {
                                nav.mediaSession.metadata = new (window as any).MediaMetadata({
                                    title: 'Rain 冥想',
                                    artist: 'Rain'
                                });
                                nav.mediaSession.setActionHandler('play', async () => { setIsPlaying(true); });
                                nav.mediaSession.setActionHandler('pause', async () => { setIsPlaying(false); });
                                nav.mediaSession.setActionHandler('seekforward', async () => { try { audio.currentTime += 30; } catch { } });
                                nav.mediaSession.setActionHandler('seekbackward', async () => { try { audio.currentTime -= 15; } catch { } });
                            } catch { }
                        }
                    } catch { }
                    audio.onended = () => {
                        if (item.url!.startsWith('blob:')) {
                            URL.revokeObjectURL(item.url!);
                        }
                        setAudioQueue(prev => prev.slice(1));
                        setCurrentAudio(null);
                        currentItemIdRef.current = null; // Reset for next item
                    };
                    audio.onerror = (e) => {
                        if (item.url!.startsWith('blob:')) {
                            URL.revokeObjectURL(item.url!);
                        }
                        console.error("Audio playback error", e);
                        setAudioQueue(prev => prev.slice(1));
                        setCurrentAudio(null);
                        currentItemIdRef.current = null;
                    };
                    (async () => {
                        try {
                            await ensureAudioContext();
                            await audio.play();
                        } catch (e) {
                            console.error("Playback failed", e);
                            try {
                                await ensureAudioContext();
                                await audio.play();
                            } catch (err) {
                                console.error('Retry play failed', err);
                            }
                        }
                    })();
                    setCurrentAudio(audio);
                } else {
                    setAudioQueue(prev => prev.slice(1));
                    currentItemIdRef.current = null;
                }
            }
        }
    }, [isPlaying, audioQueue, currentAudio]);


    const isProcessingRef = useRef(false);
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

    useEffect(() => {
        (async () => {
            if (isPlaying) {
                await requestWakeLock();
            } else {
                await releaseWakeLock();
            }
        })();
    }, [isPlaying]);

    // === P1: AudioContext 看门狗 - 自动恢复挂起的音频上下文 === //
    useEffect(() => {
        if (!isPlaying) return;

        const watchdog = setInterval(async () => {
            // 检查 AudioContext 状态
            if (audioContextRef.current?.state === 'suspended') {
                try {
                    await audioContextRef.current.resume();
                    console.log('[Watchdog] AudioContext resumed');
                } catch { }
            }

            // 检查队列是否停滞（有项目但没在播放）
            if (audioQueue.length > 0 && !currentAudio && !currentItemIdRef.current) {
                console.log('[Watchdog] Queue stalled, forcing refresh');
                setAudioQueue(prev => [...prev]);
            }
        }, 3000);

        return () => clearInterval(watchdog);
    }, [isPlaying, audioQueue, currentAudio]);

    // ...

    const generateMeditation = async (prompt: string) => {
        setIsGenerating(true);
        setText("");
        setAudioQueue([]);
        setCurrentAudio(null);
        processingBuffer.current = "";
        currentRate.current = "0%"; // Reset rate
        currentItemIdRef.current = null; // Reset processing tracker
        isProcessingRef.current = false; // Reset lock

        // Remove any existing listeners to avoid duplicates
        if (window.electron) {
            window.electron.removeMeditationListeners();
        }

        try {
            setIsPlaying(true);

            if (window.electron) {
                window.electron.onMeditationChunk(async (chunk) => {
                    setText((prev) => prev + chunk);
                    processingBuffer.current += chunk;
                    await processBuffer();
                });

                window.electron.onMeditationError((error) => {
                    console.error("Generation error:", error);
                    setIsGenerating(false);
                });

                window.electron.onMeditationDone(async () => {
                    // Process any remaining text in buffer
                    await processBuffer();
                    setIsGenerating(false);
                });

                window.electron.generateMeditation(prompt, apiKey);
            } else {
                const res = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, apiKey, systemPrompt: globalSystemPrompt })
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
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value);
                        setText((prev) => prev + chunk);
                        processingBuffer.current += chunk;
                        await processBuffer();
                    }
                    await processBuffer();
                    setIsGenerating(false);
                }
            }

        } catch (error) {
            console.error("Generation failed", error);
            setIsGenerating(false);
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
        for (let i = 0; i < samples; i++) {
            view.setInt16(dataOffset + i * 2, 0, true);
        }
        const blob = new Blob([view], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    };

    const processBuffer = async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        try {
            // Regex to find tags or sentence endings
            // Matches: [pause 5s], [pause:5s], [rate -10%], or sentence endings (.!?)
            const tokenRegex = /((?:\[(?:pause|rate)[^\]]*\])|(?:[.!?\n。！？，,]+))/;

            while (true) {
                const match = processingBuffer.current.match(tokenRegex);
                if (!match) break;

                const index = match.index!;
                const token = match[0];
                const textBefore = processingBuffer.current.substring(0, index);

                // Remove processed part from buffer immediately to prevent re-processing
                processingBuffer.current = processingBuffer.current.substring(index + token.length);

                if (token.startsWith("[")) {
                    // Tag found
                    if (textBefore.trim().length > 0) {
                        await generateAudio(textBefore.trim());
                    }

                    if (token.includes("pause")) {
                        // Match: pause 5s, pause:5s, etc.
                        const durationMatch = token.match(/pause\s*[:=]?\s*(\d+)/i);
                        if (durationMatch) {
                            const dur = parseInt(durationMatch[1]);
                            const url = createSilenceWavURL(dur);
                            setAudioQueue(prev => [...prev, {
                                type: 'audio',
                                url,
                                id: Math.random().toString(36).substr(2, 9)
                            }]);
                        }
                    } else if (token.includes("rate")) {
                        // Match: rate 10%, rate:-10%
                        const rateMatch = token.match(/rate\s*[:=]?\s*([+-]?\d+%)/i);
                        if (rateMatch) {
                            currentRate.current = rateMatch[1];
                        }
                    }
                } else {
                    // Punctuation found
                    // Include punctuation in the text
                    const textToGen = textBefore + token;
                    if (textToGen.trim().length > 0) {
                        await generateAudio(textToGen.trim());

                        // Add natural pause based on punctuation type
                        if (token.match(/[.!?。！？\n]+/)) {
                            const url = createSilenceWavURL(1.2);
                            setAudioQueue(prev => [...prev, {
                                type: 'audio',
                                url,
                                id: Math.random().toString(36).substr(2, 9)
                            }]);
                        } else if (token.match(/[,，]+/)) {
                            const url = createSilenceWavURL(0.4);
                            setAudioQueue(prev => [...prev, {
                                type: 'audio',
                                url,
                                id: Math.random().toString(36).substr(2, 9)
                            }]);
                        }
                    }
                }
            }
        } finally {
            isProcessingRef.current = false;
            // Check if more data arrived while we were processing
            // If so, trigger processing again
            const tokenRegex = /((?:\[(?:pause|rate)[^\]]*\])|(?:[.!?\n。！？，,]+))/;
            if (processingBuffer.current.match(tokenRegex)) {
                processBuffer();
            }
        }
    };

    // === P2: TTS API 重试工具 === //
    const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response | null> => {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok) return res;
                // 如果是 4xx 错误，不重试
                if (res.status >= 400 && res.status < 500) return null;
            } catch (e) {
                console.warn(`[TTS] Retry ${i + 1}/${retries}`, e);
                if (i === retries - 1) return null;
                await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 递增延迟
            }
        }
        return null;
    };

    const generateAudio = async (text: string) => {
        try {
            if (window.electron) {
                const url = await window.electron.generateTTS(text, selectedVoice, currentRate.current);
                setAudioQueue(prev => [...prev, {
                    type: 'audio',
                    url,
                    id: Math.random().toString(36).substr(2, 9)
                }]);
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
                        const isIOS = typeof navigator !== 'undefined' && ((/iPad|iPhone|iPod/.test(navigator.userAgent)) || ((navigator.platform === 'MacIntel') && (navigator.maxTouchPoints > 1)));
                        if (isIOS) {
                            const url = URL.createObjectURL(blob);
                            setAudioQueue(prev => [...prev, {
                                type: 'audio',
                                url,
                                id: Math.random().toString(36).substr(2, 9)
                            }]);
                        } else {
                            await ensureAudioContext();
                            const arr = await blob.arrayBuffer();
                            const ctx = audioContextRef.current;
                            if (ctx) {
                                const buf = await ctx.decodeAudioData(arr);
                                setAudioQueue(prev => [...prev, {
                                    type: 'audio',
                                    buffer: buf,
                                    id: Math.random().toString(36).substr(2, 9)
                                }]);
                            } else {
                                const url = URL.createObjectURL(blob);
                                setAudioQueue(prev => [...prev, {
                                    type: 'audio',
                                    url,
                                    id: Math.random().toString(36).substr(2, 9)
                                }]);
                            }
                        }
                    } catch {
                        // Fallback: use blob URL if decoding fails
                        const url = URL.createObjectURL(blob);
                        setAudioQueue(prev => [...prev, {
                            type: 'audio',
                            url,
                            id: Math.random().toString(36).substr(2, 9)
                        }]);
                    }
                } else {
                    console.error('[TTS] Failed after retries');
                }
            }
        } catch (e) {
            console.error("TTS failed", e);
        }
    };

    const handleCardClick = async (id: string) => {
        setActiveCard(id);
        const topic = DEFAULT_TOPICS.find(t => t.id === id) || customTopics.find(t => t.id === id);
        const promptToUse = (editedPrompts[id] ?? topic?.prompt ?? customPrompt);

        // Record Session Start
        try {
            fetch('/api/meditation/sessions', {
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
        await primeAudio();
        generateMeditation(promptToUse);
    };


    return (
        <AuthGuard>
            <>
                {/* Main Content */}
                <main className="flex-1 w-full max-w-4xl mx-auto z-10 overflow-y-auto pb-32 px-4 scrollbar-hide pt-24">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-8">
                        {/* Default Topics */}
                        {DEFAULT_TOPICS.map((topic) => (
                            <motion.button
                                key={topic.id}
                                layoutId={`card-${topic.id}`}
                                onClick={() => handleCardClick(topic.id)}
                                className={cn(
                                    "glass-card p-4 rounded-2xl flex flex-col items-start justify-between aspect-square text-left group relative overflow-hidden w-full transition-all hover:scale-[1.02]",
                                    activeCard === topic.id ? "opacity-0" : "opacity-100",
                                    "bg-gradient-to-br from-rose-500/[0.05] to-pink-500/[0.05] border-white/10"
                                )}
                            >
                                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity bg-gradient-to-br from-rose-400 to-pink-400")} />
                                <div className="absolute top-3 right-3 z-20">
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTopicId(topic.id);
                                            const base = editedPrompts[topic.id] ?? topic.prompt ?? DEFAULT_PROMPT;
                                            setDraftPrompt(base);
                                            setShowPromptEdit(true);
                                        }}
                                        className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                    >
                                        <Settings className="w-3.5 h-3.5 text-white" />
                                    </div>
                                </div>
                                <topic.icon className="w-6 h-6 mb-2 text-white/80" />
                                <span className="text-sm md:text-base font-medium leading-tight">{topic.title}</span>
                            </motion.button>
                        ))}

                        {/* Custom Topics */}
                        {customTopics.map((topic) => (
                            <motion.button
                                key={topic.id}
                                layoutId={`card-${topic.id}`}
                                onClick={() => handleCardClick(topic.id)}
                                className={cn(
                                    "glass-card p-4 rounded-2xl flex flex-col items-start justify-between aspect-square text-left group relative overflow-hidden w-full transition-all hover:scale-[1.02]",
                                    activeCard === topic.id ? "opacity-0" : "opacity-100",
                                    "bg-gradient-to-br from-rose-500/[0.05] to-pink-500/[0.05] border-white/10"
                                )}
                            >
                                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity bg-gradient-to-br from-rose-400 to-pink-400")} />
                                <div className="absolute top-3 right-3 z-20 flex gap-2">
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTopicId(topic.id);
                                            const base = topic.prompt ?? DEFAULT_PROMPT;
                                            setDraftPrompt(base);
                                            setShowPromptEdit(true);
                                        }}
                                        className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                    >
                                        <Settings className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (confirm("确定要删除这个卡片吗？")) {
                                                try {
                                                    await fetch(`/api/meditation/cards?id=${topic.id}`, { method: 'DELETE' });
                                                    setCustomTopics(prev => prev.filter(t => t.id !== topic.id));
                                                } catch (err) {
                                                    console.error("Failed to delete", err);
                                                }
                                            }
                                        }}
                                        className="p-1.5 bg-red-500/10 rounded-full hover:bg-red-500/20 transition-colors border border-red-500/20"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-red-300" />
                                    </div>
                                </div>

                                {topic.icon ? <topic.icon className="w-6 h-6 mb-2 text-white/80" /> : <Wind className="w-6 h-6 mb-2 text-white/80" />}
                                <span className="text-sm md:text-base font-medium leading-tight">{topic.title}</span>
                            </motion.button>
                        ))}

                        {/* Add New Card Button */}
                        <motion.button
                            layout
                            onClick={() => {
                                setNewCardTitle("");
                                setNewCardPrompt("");
                                setShowAddCard(true);
                            }}
                            className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center aspect-square text-center group border-2 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5 transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover:bg-white/10 transition-colors">
                                <Plus className="w-5 h-5 text-white/50 group-hover:text-white/80" />
                            </div>
                            <span className="text-sm text-white/40 group-hover:text-white/70">添加冥想</span>
                        </motion.button>
                    </div>
                </main>
                {/* Settings Modal (Prompt + Voice) */}
                <AnimatePresence>
                    {
                        showPromptEdit && (
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
                                    className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide"
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
                                    <div className="space-y-3">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider block">选择人声</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {VOICES.map(voice => (
                                                <button
                                                    key={voice.id}
                                                    onClick={() => setSelectedVoice(voice.id)}
                                                    className={cn(
                                                        "px-3 py-2 rounded-xl text-sm text-left transition-all border",
                                                        selectedVoice === voice.id
                                                            ? "bg-blue-600/20 border-blue-500 text-white"
                                                            : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10"
                                                    )}
                                                >
                                                    <div className="font-medium">{voice.name.split(" ")[0]}</div>
                                                    <div className="text-xs opacity-60">{voice.name.split(" ")[1]}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* API Key Setting */}
                                    <div className="space-y-3">
                                        <label className="text-xs text-slate-400 uppercase tracking-wider block">DeepSeek API Key</label>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="w-full bg-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="sk-..."
                                        />
                                    </div>

                                    {/* Global System Prompt (Always Visible) */}
                                    <div className="space-y-3 pt-4 border-t border-white/5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs text-slate-400 uppercase tracking-wider block">
                                                系统提示词 (System Prompt - Global)
                                            </label>
                                            <button
                                                onClick={() => { try { localStorage.setItem("global_system_prompt", globalSystemPrompt); fetch('/api/system-prompt', { method: 'POST', body: globalSystemPrompt }); } catch { } }}
                                                className="text-xs text-blue-400 hover:text-blue-300"
                                            >
                                                保存全局设置
                                            </button>
                                        </div>
                                        <textarea
                                            value={globalSystemPrompt}
                                            onChange={(e) => setGlobalSystemPrompt(e.target.value)}
                                            className="w-full h-32 bg-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                            placeholder="例如：你是一位温柔的冥想导师..."
                                        />
                                        <p className="text-xs text-slate-500">
                                            所有卡片的生成都会遵循此系统设定。
                                        </p>
                                    </div>

                                    {/* Card Specific Prompt (Only when editing a card) */}
                                    {editingTopicId && (
                                        <div className="space-y-3 pt-4 border-t border-white/5">
                                            <label className="text-xs text-emerald-400 uppercase tracking-wider block">
                                                当前卡片提示词 (Card Prompt)
                                            </label>
                                            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 mb-2">
                                                <p className="text-xs text-emerald-200">
                                                    最终发给 AI 的指令 = <b>系统提示词</b> + <b>卡片提示词</b>
                                                </p>
                                            </div>
                                            <textarea
                                                value={draftPrompt}
                                                onChange={(e) => setDraftPrompt(e.target.value)}
                                                className="w-full h-32 bg-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                                placeholder="输入当前卡片的冥想提示词..."
                                            />
                                            <div className="flex justify-end pt-2">
                                                <button
                                                    onClick={() => {
                                                        setEditedPrompts(prev => ({ ...prev, [editingTopicId]: draftPrompt }));
                                                        try { fetch('/api/prompts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingTopicId, prompt: draftPrompt }) }); } catch { }
                                                        setShowPromptEdit(false);
                                                        setEditingTopicId(null);
                                                    }}
                                                    className="px-4 py-2 bg-slate-700 rounded-full text-white hover:bg-slate-600 transition-colors font-medium text-xs"
                                                >
                                                    仅保存
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const id = editingTopicId;
                                                        setEditedPrompts(prev => ({ ...prev, [id]: draftPrompt }));
                                                        setShowPromptEdit(false);
                                                        setEditingTopicId(null);
                                                        try { fetch('/api/prompts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, prompt: draftPrompt }) }); } catch { }
                                                        handleCardClick(id);
                                                    }}
                                                    className="ml-3 px-6 py-2 bg-emerald-600 rounded-full text-white hover:bg-emerald-700 transition-colors font-medium text-sm"
                                                >
                                                    保存并生成
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* LAN IP Display */}
                                    <div className="pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                                <Network className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400">局域网访问地址</div>
                                                <div className="text-sm font-mono text-slate-200 select-all">
                                                    http://{LAN_IP}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence>

                {/* Add Card Modal */}
                <AnimatePresence>
                    {
                        showAddCard && (
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
                                        <h3 className="text-lg font-medium">添加新冥想卡片</h3>
                                        <button onClick={() => setShowAddCard(false)} className="p-2 hover:bg-white/10 rounded-full">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-400 uppercase tracking-wider">标题</label>
                                            <input
                                                value={newCardTitle}
                                                onChange={(e) => setNewCardTitle(e.target.value)}
                                                className="w-full bg-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-600"
                                                placeholder="例如：缓解焦虑"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-slate-400 uppercase tracking-wider">引导提示词</label>
                                            <textarea
                                                value={newCardPrompt}
                                                onChange={(e) => setNewCardPrompt(e.target.value)}
                                                className="w-full h-32 bg-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-600 resize-none"
                                                placeholder="输入生成冥想词的 Prompt..."
                                            />
                                        </div>

                                        <button
                                            onClick={async () => {
                                                if (!newCardTitle || !newCardPrompt) return;
                                                try {
                                                    const res = await fetch('/api/meditation/cards', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            title: newCardTitle,
                                                            prompt: newCardPrompt,
                                                            icon_name: 'wind', // Default icon for now
                                                            color_from: 'rose-400',
                                                            color_to: 'pink-600'
                                                        })
                                                    });
                                                    if (res.ok) {
                                                        const newCard = await res.json();
                                                        setCustomTopics(prev => [{ ...newCard, icon: Wind }, ...prev]);
                                                        setShowAddCard(false);
                                                    }
                                                } catch (e) {
                                                    console.error("Failed to create", e);
                                                }
                                            }}
                                            className="w-full py-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors"
                                        >
                                            创建卡片
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence>

                {/* Active Card Overlay */}
                <AnimatePresence>
                    {
                        activeCard && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                                style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                            >
                                <motion.div
                                    layoutId={`card-${activeCard}`}
                                    className="w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col h-[80vh]"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.25)',
                                        backdropFilter: 'blur(20px) saturate(180%) brightness(120%)',
                                        WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(120%)',
                                        border: '1px solid rgba(255, 255, 255, 0.4)',
                                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2), inset 0 1px 1px 0 rgba(255, 255, 255, 0.5)',
                                    }}
                                >
                                    {/* Glass edge refraction effect */}
                                    <div
                                        className="absolute inset-0 rounded-3xl pointer-events-none"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.15) 100%)',
                                        }}
                                    />

                                    <button
                                        onClick={() => {
                                            setActiveCard(null);
                                            // Stop audio when closing card
                                            setIsPlaying(false);
                                            setAudioQueue([]);
                                            if (currentSourceRef.current) {
                                                try { currentSourceRef.current.stop(); } catch { }
                                            }
                                            if (window.electron) {
                                                window.electron.stopMeditation();
                                            }

                                            // Record Session End
                                            if (currentSessionId) {
                                                fetch('/api/meditation/sessions', {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ id: currentSessionId })
                                                }).catch(e => console.error("Failed to specific session end", e));
                                                setCurrentSessionId(null);
                                            }
                                        }}
                                        className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors z-50"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            backdropFilter: 'blur(10px)',
                                            WebkitBackdropFilter: 'blur(10px)',
                                        }}
                                    >                                  <span className="sr-only">Close</span>
                                        ✕
                                    </button>

                                    <div className="flex-1 overflow-y-auto space-y-4 mt-8 custom-scrollbar relative">
                                        {text ? (
                                            <p className="text-lg leading-relaxed text-slate-200 whitespace-pre-wrap">{text}</p>
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="animate-pulse text-slate-500">吸气...</div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 flex justify-center">
                                        <button
                                            onClick={async () => { await ensureAudioContext(); await primeAudio(); setIsPlaying(!isPlaying); }}
                                            className="p-4 bg-white text-slate-900 rounded-full hover:scale-105 transition-transform"
                                        >
                                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >
            </>
        </AuthGuard>
    );
}
