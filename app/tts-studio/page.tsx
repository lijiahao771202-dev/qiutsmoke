"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Play, Trash2, Clock, Volume2, Sparkles, ChevronRight, ChevronDown, Settings, Info, Save, X, Edit2, Check, ArrowRight, Music, RotateCcw, Download, Pencil, RotateCw, Pause, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { shouldBypassWebAudioForBackgroundPlayback } from "@/lib/audio-platform";
import AuthGuard from "@/components/AuthGuard";
import { saveAudioCache, getAudioCache, deleteAudioCache } from "@/lib/audioCache";
import { getCloudTTSAudioCache, saveCloudTTSAudioCache } from "@/lib/cloudTTSAudioCache";
import { GlassCard } from "@/components/ui/GlassCard";
import { completeMeditationSession, createMeditationSession, useTTSCards, type TTSCard } from "@/lib/hooks/useData";
import { getApiUrl } from "@/lib/config";
import { buildCosyVoiceCardSSMLChunks } from "@/lib/cosyvoice-card-ssml";
import {
    buildAIGenerationTargets,
    estimateMeditationScriptDurationSeconds,
    formatDurationMinutes,
} from "@/lib/meditation-script-duration";
import {
    appendGenerateStreamChunk,
    createGenerateStreamState,
} from "@/lib/generate-stream-protocol";
import { estimateTTSCardPrice, type TTSPriceBadgeTone } from "@/lib/tts-pricing";
import {
    applySynthSnapshotToSettings,
    buildSynthSnapshot,
    buildTTSCardAudioCacheKey,
    getSynthModelBadgeLabel,
    getTTSSettingsModelBadgeLabel,
    type TTSCardSynthSnapshot,
} from "@/lib/tts-card-synth";
import {
    deleteTTSCardSynthSnapshot,
    saveTTSCardSynthSnapshot,
} from "@/lib/tts-card-synth-store";
import {
    deleteLocalTTSCardSynthVersion,
    deleteLocalTTSCardSynthVersionsForCard,
    formatLocalSynthVersionTime,
    getLocalLegacyTTSCardSynthSnapshot,
    listLocalTTSCardSynthVersions,
    resolveLocalTTSCardVersion,
    saveLocalTTSCardSynthVersion,
    type TTSCardLocalSynthVersion,
} from "@/lib/tts-card-synth-local";
import {
    COSYVOICE_PROFILE,
    DEFAULT_COSYVOICE_35_FLASH_VOICE_ID,
    DEFAULT_COSYVOICE_35_PLUS_INSTRUCTION,
    DEFAULT_COSYVOICE_35_PLUS_LANGUAGE_HINT,
    DEFAULT_COSYVOICE_35_PLUS_MODEL,
    DEFAULT_COSYVOICE_35_PLUS_SPEED,
    DEFAULT_COSYVOICE_35_PLUS_VOICE_ID,
    DEFAULT_COSYVOICE_35_PLUS_VOICE_PROFILE_ID,
    DEFAULT_COSYVOICE_VOICE_ID,
    DEFAULT_MIMO_TTS_CLONE_VOICE_URL,
    DEFAULT_MIMO_TTS_INSTRUCTION,
    DEFAULT_MIMO_TTS_MODEL,
    DEFAULT_MIMO_TTS_VOICE,
    DEFAULT_MIMO_TTS_VOICE_DESIGN_PROMPT,
    DEFAULT_TTS_PROVIDER,
    isCosyVoice35Model,
    isCosyVoice35PlusLanguageHint,
    isMimoTTSModel,
    isMimoTTSVoice,
    isTTSProvider,
    normalizeTTSSettings,
    type CosyVoiceVoiceId,
    type MimoTTSModel,
    type MimoTTSVoice,
    type TTSProvider,
    type TTSSettings,
} from "@/lib/tts-settings";

// TTSCard interface moved to lib/hooks/useData.ts
// Re-export for backwards compatibility
export type { TTSCard } from "@/lib/hooks/useData";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useWhiteNoise, AMBIENT_SOUNDS, type AmbientSoundType } from "@/hooks/useWhiteNoise";
import { getDefaultTTSStudioAmbientPreset } from "@/lib/tts-studio-ambient";
import {
    getLocalSingleton,
    saveLocalSingleton,
    LOCAL_TTS_SETTINGS_ID,
    LOCAL_TTS_STUDIO_CATEGORIES_ID,
} from "@/lib/local-settings";
import {
    addTTSStudioCategory,
    addTTSStudioSubcategory,
    buildCreateCardCategoryAssignment,
    filterTTSStudioCardsBySelection,
    getTTSStudioCategories,
    normalizeTTSStudioCategoryConfig,
    TTS_STUDIO_ALL_CATEGORY_ID,
    type NormalizedTTSStudioCategoryConfig,
    type TTSStudioCategory,
} from "@/lib/tts-studio-taxonomy";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
import { VOICES } from "@/lib/constants";
import { RAIN_CARDS } from "./rainCards";
import { DESIRE_GAME_CARDS } from "./desireGameCards";
import { RAIN_ADVANCED_CARDS } from "./rainAdvancedCards";
import { EMOTION_ANXIETY_CARDS } from "./emotionAnxietyCards";
import { EMOTION_BODY_SCAN_CARDS } from "./bodyScanCards";

const TTSStudioPlayer = dynamic(() => import("@/components/tts/TTSStudioPlayer"), {
    ssr: false,
    loading: () => null,
});

const GUIDANCE_BADGES: Record<string, { label: string; color: string }> = {
    light: { label: "🍃 轻引导", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" },
    medium: { label: "⚖️ 中引导", color: "bg-blue-500/20 text-blue-300 border-blue-500/20" },
    heavy: { label: "🧘 多引导", color: "bg-purple-500/20 text-purple-300 border-purple-500/20" }
};

const PRICE_BADGE_STYLES: Record<TTSPriceBadgeTone, string> = {
    free: "bg-sky-500/15 text-sky-200 border-sky-400/20",
    metered: "bg-amber-500/15 text-amber-200 border-amber-400/20",
    neutral: "bg-white/10 text-white/70 border-white/10",
};

const COSYVOICE_SSML_CHUNK_CONCURRENCY = 4;
const AI_DURATION_OPTIONS = [3, 5, 10, 15, 20, 25, 30, 35, 40] as const;
const TTS_STUDIO_CATEGORY_TONE_CLASSES: Record<TTSStudioCategory["tone"], { active: string; idle: string; subActive: string; subIdle: string }> = {
    neutral: {
        active: "bg-white text-black shadow-lg",
        idle: "bg-white/5 text-white/60 hover:bg-white/10",
        subActive: "bg-white text-black shadow-md",
        subIdle: "bg-white/5 text-white/55 hover:bg-white/10",
    },
    amber: {
        active: "bg-amber-500 text-white shadow-lg shadow-amber-500/20",
        idle: "bg-amber-500/10 text-amber-300/80 hover:bg-amber-500/20",
        subActive: "bg-amber-500 text-white shadow-md shadow-amber-500/20",
        subIdle: "bg-amber-500/10 text-amber-300/80 hover:bg-amber-500/20",
    },
    rose: {
        active: "bg-rose-500 text-white shadow-lg shadow-rose-500/20",
        idle: "bg-rose-500/10 text-rose-300/80 hover:bg-rose-500/20",
        subActive: "bg-rose-500 text-white shadow-md shadow-rose-500/20",
        subIdle: "bg-rose-500/10 text-rose-300/80 hover:bg-rose-500/20",
    },
    purple: {
        active: "bg-purple-500 text-white shadow-lg shadow-purple-500/20",
        idle: "bg-purple-500/10 text-purple-300/80 hover:bg-purple-500/20",
        subActive: "bg-purple-500 text-white shadow-md shadow-purple-500/20",
        subIdle: "bg-purple-500/10 text-purple-300/80 hover:bg-purple-500/20",
    },
    teal: {
        active: "bg-teal-500 text-white shadow-lg shadow-teal-500/20",
        idle: "bg-teal-500/10 text-teal-300/80 hover:bg-teal-500/20",
        subActive: "bg-teal-500 text-white shadow-md shadow-teal-500/20",
        subIdle: "bg-teal-500/10 text-teal-300/80 hover:bg-teal-500/20",
    },
    indigo: {
        active: "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20",
        idle: "bg-indigo-500/10 text-indigo-300/80 hover:bg-indigo-500/20",
        subActive: "bg-indigo-500 text-white shadow-md shadow-indigo-500/20",
        subIdle: "bg-indigo-500/10 text-indigo-300/80 hover:bg-indigo-500/20",
    },
    cyan: {
        active: "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20",
        idle: "bg-cyan-500/10 text-cyan-300/80 hover:bg-cyan-500/20",
        subActive: "bg-cyan-500 text-white shadow-md shadow-cyan-500/20",
        subIdle: "bg-cyan-500/10 text-cyan-300/80 hover:bg-cyan-500/20",
    },
};

type FetchResponseError = Error & {
    status?: number;
    details?: string;
};

type RetrievalDebugReference = {
    id: string;
    title: string;
    content: string;
    excerpt: string;
    reason: string;
    score: number;
    stage: string;
    chunkKind: string;
    durationMinutes: number;
    guidanceLevel: string;
    sceneTags: string[];
    emotionTags: string[];
    techniques: string[];
    practiceModes: string[];
    silenceStyle?: string;
};

type RetrievalDebugPayload = {
    query?: {
        topic: string;
        durationMinutes: number;
        guidanceLevel: string;
    };
    promptReferenceCount?: number;
    references: RetrievalDebugReference[];
};

type AIGenerationContext = {
    topic: string;
    details: string;
    duration: number;
    guidanceLevel: 'light' | 'medium' | 'heavy';
};

async function readGenerateResponseStream(
    response: Response,
    callbacks: {
        onText: (text: string) => void;
        onRagDebug?: (debug: RetrievalDebugPayload) => void;
    }
) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取响应");

    const decoder = new TextDecoder();
    let streamState = createGenerateStreamState<RetrievalDebugPayload>();
    let emittedRagDebug = false;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamState = appendGenerateStreamChunk(
            streamState,
            decoder.decode(value, { stream: true })
        );

        if (!emittedRagDebug && streamState.ragDebug) {
            callbacks.onRagDebug?.(streamState.ragDebug);
            emittedRagDebug = true;
        }

        callbacks.onText(streamState.text);
    }

    const trailingText = decoder.decode();
    if (trailingText) {
        streamState = appendGenerateStreamChunk(streamState, trailingText);
        callbacks.onText(streamState.text);
    }

    if (streamState.error) {
        throw new Error(streamState.error);
    }

    return streamState;
}

const RAG_STAGE_LABELS: Record<string, string> = {
    arrival: "安顿进入",
    breath: "呼吸锚定",
    body_scan: "身体扫描",
    emotion: "情绪容纳",
    open_awareness: "开放觉察",
    compassion: "慈心陪伴",
    closing: "收束结束",
    general: "通用片段",
};

const RAG_KIND_LABELS: Record<string, string> = {
    stage: "阶段切片",
    window: "滑窗切片",
};

function isMeteredTTSProvider(provider: TTSProvider) {
    return provider === "cosyvoice35plus" || provider === "qwentts";
}

function buildAudioChunkCacheKey(audioCacheKey: string, chunkIndex: number) {
    return `${audioCacheKey}::chunk::${chunkIndex}`;
}

const DEFAULT_TEXT_SEGMENT_CONCURRENCY = 3;
const MIMO_TEXT_SEGMENT_CONCURRENCY = 12;
const MIMO_CLONE_TEXT_SEGMENT_CONCURRENCY = 12;
const LOCAL_COSYVOICE_TEXT_SEGMENT_CONCURRENCY = 2;

function getTextSegmentConcurrency(settings: TTSSettings) {
    if (settings.provider === "mimotts") {
        return settings.mimoTTSModel === "mimo-v2.5-tts-voiceclone"
            ? MIMO_CLONE_TEXT_SEGMENT_CONCURRENCY
            : MIMO_TEXT_SEGMENT_CONCURRENCY;
    }
    if (settings.provider === "cosyvoice") return LOCAL_COSYVOICE_TEXT_SEGMENT_CONCURRENCY;
    return DEFAULT_TEXT_SEGMENT_CONCURRENCY;
}

function getTTSFetchRetryCount(settings: TTSSettings) {
    if (settings.provider === "mimotts") return 5;
    return 3;
}

function getTTSFetchTimeoutMs(settings: TTSSettings) {
    if (settings.provider === "mimotts") return 150000;
    return 60000;
}

function countCardTextSegments(content: string) {
    let total = 0;
    const regex = /(\[(?:pause|rate)[^\]]+\])/g;
    const parts = content.split(regex);

    for (const part of parts) {
        if (!part.trim()) continue;
        if (part.startsWith("[")) continue;
        total += 1;
    }

    return total;
}

function extractErrorDetails(raw: string) {
    if (!raw) return "";

    try {
        const data = JSON.parse(raw) as { details?: unknown; error?: unknown; message?: unknown };
        if (typeof data.details === "string" && data.details.trim()) return data.details.trim();
        if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
        if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
    } catch {
        // ignore non-json bodies
    }

    return raw.trim();
}

function createFetchResponseError(status: number, rawDetails = "") {
    const details = extractErrorDetails(rawDetails);
    const suffix = details ? ` ${details}` : "";
    const error = new Error(`Request failed: ${status}${suffix}`) as FetchResponseError;
    error.status = status;
    error.details = details;
    return error;
}

function getErrorDetails(error: unknown) {
    if (error instanceof Error) {
        const details = (error as FetchResponseError).details;
        return typeof details === "string" && details.trim() ? details.trim() : error.message;
    }
    return typeof error === "string" ? error : "未知错误";
}

function isRetryableTTSFailure(error: unknown) {
    const status = error instanceof Error ? (error as FetchResponseError).status : undefined;
    if (status === 408 || status === 409 || status === 425 || status === 429) return true;
    if (typeof status === "number" && status >= 500) return true;

    const details = getErrorDetails(error);
    return /Empty reply from server|curl: \((52|56|28)\)|Connection reset|ECONNRESET|timed out|timeout|aborted|JSON parse failed|Bad gateway|Gateway|HTTP 5\d\d|upstream|overloaded|rate limit|中途断开|云端波动/i.test(details);
}

function shouldSurfaceSSMLFailure(error: unknown) {
    const details = getErrorDetails(error);
    return /AllocationQuota\.|DASHSCOPE_API_KEY|api key|unauthorized|forbidden|quota|余额|exhausted/i.test(details);
}

function toHumanReadableSynthesisError(error: unknown) {
    const details = getErrorDetails(error);
    const resumeHint = details.match(/（已保留[^）]+）/)?.[0] || "";

    if (/AllocationQuota\.FreeTierOnly/i.test(details)) {
        return "CosyVoice 3.5 Flash 免费额度已用完，不是文本太长。去 DashScope 关闭“仅使用免费额度”，或切到 Plus / 其他 TTS 后再试。";
    }

    if (/DASHSCOPE_API_KEY/i.test(details)) {
        return "当前缺少 DashScope API Key，CosyVoice 3.5 现在无法合成。";
    }

    if (/Empty reply from server/i.test(details)) {
        return `MiMo 官方接口中途断开了这次合成请求，系统已经自动重试过。常见原因是云端波动，或者当前这段文本 / 声音描述组合触发了接口不稳定。${resumeHint || "已成功的分段会保留；再次点击合成会继续补缺失段。"}`;
    }

    return details || "合成失败，请稍后再试。";
}

function getShortGenerationMessage(content: string, targetSeconds: number) {
    const estimatedSeconds = estimateMeditationScriptDurationSeconds(content);
    if (estimatedSeconds >= targetSeconds * 0.95) {
        return null;
    }

    return `这次生成预计约 ${formatDurationMinutes(estimatedSeconds)} 分钟，仍低于目标 ${formatDurationMinutes(targetSeconds)} 分钟。系统已经会优先尝试自动纠偏；如果你仍觉得偏短，可以再生成一次。`;
}

async function deleteAudioChunkCaches(audioCacheKey: string, content: string) {
    const genericTextSegmentCount = countCardTextSegments(content);
    await Promise.all(
        Array.from({ length: genericTextSegmentCount }, async (_, index) => {
            try {
                await deleteAudioCache(buildAudioChunkCacheKey(audioCacheKey, index));
            } catch (error) {
                console.warn(`[AudioCache] 删除逐段缓存失败: ${index}`, error);
            }
        })
    );

    const chunks = buildCosyVoiceCardSSMLChunks(content);
    const chunkIndexes = chunks
        .map((chunk, index) => (chunk.type === "ssml" ? index : null))
        .filter((index): index is number => index !== null);

    await Promise.all(
        chunkIndexes.map(async (index) => {
            try {
                await deleteAudioCache(buildAudioChunkCacheKey(audioCacheKey, index));
            } catch (error) {
                console.warn(`[AudioCache] 删除分块缓存失败: ${index}`, error);
            }
        })
    );
}

async function getLocalAudioCache(audioCacheKey: string) {
    const localBlob = await getAudioCache(audioCacheKey);
    if (localBlob) {
        return localBlob;
    }

    const cloudBlob = await getCloudTTSAudioCache(audioCacheKey);
    if (cloudBlob) {
        await saveAudioCache(audioCacheKey, cloudBlob);
        return cloudBlob;
    }

    return null;
}

async function saveLocalAudioCache(audioCacheKey: string, blob: Blob) {
    await saveAudioCache(audioCacheKey, blob);
}

async function deleteLocalAudioCache(audioCacheKey: string) {
    await deleteAudioCache(audioCacheKey);
}

// -----------------------------------------------------------------------------
// Animation Constants (Apple Spring Physics - Premium Edition)
// -----------------------------------------------------------------------------

// 🍎 苹果经典弹簧：高刚度 + 适中阻尼 = 灵敏而不弹跳
const SPRING_SNAPPY = {
    type: "spring",
    stiffness: 500,
    damping: 35,
    mass: 0.8
} as const;

// 🍎 柔和弹簧：低刚度 = 优雅缓慢
const SPRING_GENTLE = {
    type: "spring",
    stiffness: 200,
    damping: 25,
    mass: 1
} as const;

// 🍎 流体弹簧：高阻尼 = 如液态般丝滑，无多余回弹
const SPRING_FLUID = {
    type: "spring",
    stiffness: 400,
    damping: 30, // 增加阻尼，减少回弹
    mass: 1
} as const;

// 页面整体入场：无透明度变化
const PAGE_VARIANTS = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
            when: "beforeChildren"
        }
    }
};

// 容器动画：卡片网格逐个入场（大stagger）
const CONTAINER_VARIANTS = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.25, // 🐌 更慢的stagger让逐个入场更明显
            delayChildren: 0.3     // 入场前等待
        }
    }
};

// 🎯 卡片外层动画：丝滑入场，无透明度变化（防止闪烁）
const CARD_WRAPPER_VARIANTS = {
    hidden: {
        y: 50,    // 从下方滑入
        scale: 0.96
        // 🔥 完全不设置 opacity，卡片始终完全不透明
    },
    show: {
        y: 0,
        scale: 1,
        transition: {
            // 🍎 丝滑非线性贝塞尔曲线
            duration: 0.7,
            ease: [0.23, 1, 0.32, 1]
        }
    },
    exit: {
        y: -10,
        opacity: 0,
        transition: { duration: 0.2, ease: "easeOut" }
    }
};

// 🌟 卡片内容入场动画 - 无任何透明度变化
const CARD_CONTENT_VARIANTS = {
    hidden: {
        scale: 0.96,
        filter: "blur(4px)"
        // 🔥 完全移除 opacity，防止透明闪烁
    },
    show: {
        scale: 1,
        filter: "blur(0px)",
        transition: { ...SPRING_FLUID, delay: 0.05 }
    }
};

// 🎯 通用列表项动画 (Header, Input 等)
const ITEM_VARIANTS = {
    hidden: { opacity: 0, y: 15 },
    show: {
        opacity: 1,
        y: 0,
        transition: SPRING_FLUID
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: { duration: 0.2 }
    }
};

// -----------------------------------------------------------------------------
// Component: Glass Input Card
// -----------------------------------------------------------------------------

function GlassInput({ onAddCard }: { onAddCard: (card: Partial<TTSCard>) => Promise<any> }) {
    const [title, setTitle] = useState("");
    const [text, setText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { triggerLight, triggerMedium, triggerSuccess, triggerHeavy } = useHaptics();

    // 折叠状态 - 默认折叠
    const [isCollapsed, setIsCollapsed] = useState(true);

    // AI 生成相关状态
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiGenerating, setAiGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [aiDuration, setAiDuration] = useState<number>(5);
    const [guidanceLevel, setGuidanceLevel] = useState<'light' | 'medium' | 'heavy'>('medium');
    const [ragDebug, setRagDebug] = useState<RetrievalDebugPayload | null>(null);
    const [showRag, setShowRag] = useState(false);
    const isGenerationBusy = aiGenerating;

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        try {
            await onAddCard({
                title: title.trim() || undefined,
                content: text,
                voice_id: VOICES[0].id,
                rate: "10%",
                guidance_level: guidanceLevel
            } as any);

            setText("");
            setTitle("");
            setAiPrompt("");
            setIsCollapsed(true);
            triggerSuccess();
        } catch (e) {
            console.error("Add failed", e);
            triggerHeavy();
        } finally {
            setIsLoading(false);
        }
    };

    // AI 扩展提示词
    const handleEnhancePrompt = async () => {
        const sourcePrompt = aiPrompt.trim() || title.trim();
        if (!sourcePrompt || isEnhancing || isGenerationBusy) {
            if (!sourcePrompt) {
                window.alert("请先输入标题，或直接在扩写提示词里写一点想法");
            }
            return;
        }

        setIsEnhancing(true);
        setAiPrompt("");
        try {
            const response = await fetch("/api/enhance-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: sourcePrompt }),
            });

            if (!response.ok) throw new Error("扩展失败");

            const reader = response.body?.getReader();
            if (!reader) throw new Error("无法读取响应");

            const decoder = new TextDecoder();
            let fullContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                fullContent += chunk;
                setAiPrompt(fullContent);
            }
            triggerSuccess();
        } catch (e) {
            console.error("扩展失败:", e);
            triggerHeavy();
            window.alert("扩展失败，请重试");
        } finally {
            setIsEnhancing(false);
        }
    };

    // AI 生成冥想文本
    const handleAIGenerate = async () => {
        const topic = title.trim() || aiPrompt.trim();
        if (!topic || isGenerationBusy) {
            if (!topic) window.alert("请先输入标题，或直接填写扩写提示词");
            return;
        }

        setAiGenerating(true);
        setText("");
        setRagDebug(null);
        setShowRag(false);
        const { totalSeconds } = buildAIGenerationTargets(aiDuration, guidanceLevel);

        try {
            const finalPrompt = aiPrompt.trim();
            const generationContext: AIGenerationContext = {
                topic,
                details: title.trim() ? finalPrompt : "",
                duration: aiDuration,
                guidanceLevel,
            };

            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: generationContext.topic,
                    details: generationContext.details,
                    duration: generationContext.duration,
                    guidanceLevel: generationContext.guidanceLevel,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => "");
                let errorMessage = `生成失败：HTTP ${response.status}`;
                try {
                    const payload = JSON.parse(errorText);
                    errorMessage =
                        payload?.details ||
                        payload?.error ||
                        payload?.message ||
                        errorMessage;
                } catch {
                    if (errorText.trim()) {
                        errorMessage = errorText.trim().slice(0, 300);
                    }
                }
                throw new Error(errorMessage);
            }

            const streamState = await readGenerateResponseStream(response, {
                onText: setText,
                onRagDebug: (debug) => {
                    if (Array.isArray(debug?.references) && debug.references.length > 0) {
                        setRagDebug(debug);
                    }
                },
            });

            const shortGenerationMessage = getShortGenerationMessage(streamState.text, totalSeconds);
            if (shortGenerationMessage) {
                window.alert(shortGenerationMessage);
            }
            triggerSuccess(); 
        } catch (e) {
            console.error("AI 生成失败:", e);
            triggerHeavy(); 
            window.alert(e instanceof Error ? e.message : "生成失败，请重试...");
        } finally {
            setAiGenerating(false);
        }
    };

    return (
        // 移除 layout 动画，避免展开/折叠时的弹跳效果
        <div className="relative w-full max-w-2xl mx-auto mb-8 z-20">
            <GlassCard className="p-1 rounded-[2rem] bg-gradient-to-br from-rose-500/[0.05] via-white/[0.05] to-rose-500/[0.02] border-rose-200/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                <div className="relative z-10 p-4">
                    {/* 可折叠的标题区域 */}
                    <motion.div
                        className="flex items-center justify-between cursor-pointer select-none"
                        onClick={() => {
                            setIsCollapsed(!isCollapsed);
                            triggerLight();
                        }}
                        whileTap={{ scale: 0.98 }}
                        onTapStart={triggerLight}
                    >
                        <h2 className="text-rose-200/80 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-rose-400" /> 新建语料卡片
                        </h2>
                        <motion.div
                            animate={{ rotate: isCollapsed ? 0 : 180 }}
                            transition={SPRING_SNAPPY}
                            className="text-rose-300/60 hover:text-rose-300/90 transition-colors"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </motion.div>
                    </motion.div>

                    {/* 折叠时的简要提示 - 无入场动画，直接显示 */}
                    <AnimatePresence>
                        {isCollapsed && (
                            <motion.p
                                initial={false}
                                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="text-rose-200/40 text-xs overflow-hidden"
                            >
                                点击展开以创建新的语料卡片
                            </motion.p>
                        )}
                    </AnimatePresence>

                    {/* 可折叠的内容区域 */}
                    <AnimatePresence initial={false}>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ ...SPRING_GENTLE, opacity: { duration: 0.2 } }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-3 pt-3">
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="给卡片起个标题..."
                                        className="w-full bg-transparent text-xl font-bold text-white placeholder:text-white/40 mb-1 focus:outline-none focus:text-rose-100 transition-colors"
                                    />

                                    <div className="relative space-y-3">
                                        
                                        {/* 自动扩展提示词区域 */}
                                        <div className="relative">
                                            <textarea
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                placeholder="可以自己输入扩写要求，也可以先写标题后点右侧自动扩展..."
                                                className="w-full h-20 bg-black/20 rounded-xl px-4 py-3 pr-24 text-sm text-white/80 placeholder:text-white/30 resize-none outline-none border border-white/5 scrollbar-thin scrollbar-thumb-white/10"
                                            />
                                            <button 
                                                onClick={handleEnhancePrompt}
                                                disabled={isGenerationBusy || isEnhancing || (!title.trim() && !aiPrompt.trim())}
                                                title="根据标题或已输入的想法自动扩展提示词"
                                                className="absolute right-2 top-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-rose-200 transition-colors disabled:opacity-30 flex items-center gap-1"
                                            >
                                                {isEnhancing ? (
                                                    <span className="animate-spin w-3 h-3 border-2 border-rose-200/30 border-t-rose-200 rounded-full" />
                                                ) : "✨ 扩展提示词"}
                                            </button>
                                        </div>

                                        {/* 生成操作区 */}
                                        <div className="flex gap-2 flex-wrap items-center">
                                            <select
                                                title="选择引导强度"
                                                value={guidanceLevel}
                                                onChange={(e) => setGuidanceLevel(e.target.value as any)}
                                                className="bg-black/20 backdrop-blur rounded-lg px-2 py-1.5 text-xs text-white/90 focus:ring-1 focus:ring-rose-500/40 outline-none border border-white/5 cursor-pointer transition-all"
                                                disabled={isGenerationBusy || isEnhancing}
                                            >
                                                <option value="light" className="bg-zinc-800">🍃 轻引导</option>
                                                <option value="medium" className="bg-zinc-800">⚖️ 中引导</option>
                                                <option value="heavy" className="bg-zinc-800">🧘 多引导</option>
                                            </select>
                                            <select
                                                value={aiDuration}
                                                onChange={(e) => setAiDuration(Number(e.target.value))}
                                                className="bg-black/20 backdrop-blur rounded-lg px-2 py-1.5 text-xs text-white/90 focus:ring-1 focus:ring-rose-500/40 outline-none border border-white/5 cursor-pointer transition-all"
                                                disabled={isGenerationBusy || isEnhancing}
                                                title="选择时长"
                                            >
                                                {AI_DURATION_OPTIONS.map((duration) => (
                                                    <option key={duration} value={duration} className="bg-zinc-800">
                                                        {duration}分钟
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="flex-1" />
                                            
                                            {/* RAG Preview Toggle Button */}
                                            {ragDebug && ragDebug.references.length > 0 && (
                                                <button
                                                    onClick={() => setShowRag(!showRag)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
                                                    title="查看检索调试信息"
                                                >
                                                    <Info className="w-3.5 h-3.5" />
                                                    {showRag ? "隐藏检索" : `检索 ${ragDebug.references.length} 段 / 喂给模型 ${ragDebug.promptReferenceCount ?? ragDebug.references.length} 段`}
                                                </button>
                                            )}

                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.96 }}
                                                onTapStart={triggerMedium}
                                                onClick={handleAIGenerate}
                                                disabled={(!title.trim() && !aiPrompt.trim()) || isGenerationBusy}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-medium text-xs transition-all shadow-lg",
                                                    (!title.trim() && !aiPrompt.trim()) || isGenerationBusy
                                                        ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
                                                        : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                                                )}
                                            >
                                                {isGenerationBusy ? (
                                                    <span className="animate-spin w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                                                ) : (
                                                    <Sparkles className="w-3.5 h-3.5 text-rose-300" />
                                                )}
                                                <span className={isGenerationBusy ? "text-white/80" : "text-rose-100"}>{aiGenerating ? "创作中..." : "✨ AI 创作正文"}</span>
                                            </motion.button>
                                        </div>

                                        {/* RAG Content Dropdown */}
                                        <AnimatePresence>
                                            {showRag && ragDebug && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-3 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <div className="text-xs font-medium text-indigo-300 mb-1 flex items-center gap-1">
                                                                    <Info className="w-3.5 h-3.5" /> 检索调试面板
                                                                </div>
                                                                <div className="text-[11px] text-white/45 leading-relaxed">
                                                                    召回 {ragDebug.references.length} 段候选片段，其中前 {ragDebug.promptReferenceCount ?? ragDebug.references.length} 段会真正拼进生成提示词。
                                                                </div>
                                                            </div>
                                                            {ragDebug.query && (
                                                                <div className="shrink-0 text-[11px] text-white/45 text-right">
                                                                    <div>{ragDebug.query.durationMinutes} 分钟</div>
                                                                    <div>{ragDebug.query.guidanceLevel}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {ragDebug.references.map((ref, idx) => (
                                                            <div key={ref.id || idx} className="bg-white/5 rounded-xl p-3 text-xs text-white/70 border border-white/5 space-y-2">
                                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                                    <div>
                                                                        <div className="font-semibold text-white/90">{idx + 1}. {ref.title}</div>
                                                                        <div className="text-[11px] text-white/45 mt-1">
                                                                            {RAG_STAGE_LABELS[ref.stage] || ref.stage} · {RAG_KIND_LABELS[ref.chunkKind] || ref.chunkKind} · {ref.durationMinutes} 分钟 · score {typeof ref.score === "number" ? ref.score.toFixed(4) : "--"}
                                                                        </div>
                                                                    </div>
                                                                    <div className={cn(
                                                                        "px-2 py-1 rounded-full border text-[10px]",
                                                                        idx < (ragDebug.promptReferenceCount ?? ragDebug.references.length)
                                                                            ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/20"
                                                                            : "bg-white/5 text-white/45 border-white/10"
                                                                    )}>
                                                                        {idx < (ragDebug.promptReferenceCount ?? ragDebug.references.length) ? "已喂给模型" : "仅调试显示"}
                                                                    </div>
                                                                </div>
                                                                <div className="text-[11px] text-indigo-200/90 leading-relaxed">
                                                                    命中原因：{ref.reason}
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {ref.sceneTags?.slice(0, 3).map((tag) => (
                                                                        <span key={`${ref.id}-scene-${tag}`} className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-200 border border-sky-400/15 text-[10px]">
                                                                            场景·{tag}
                                                                        </span>
                                                                    ))}
                                                                    {ref.emotionTags?.slice(0, 3).map((tag) => (
                                                                        <span key={`${ref.id}-emotion-${tag}`} className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-200 border border-rose-400/15 text-[10px]">
                                                                            情绪·{tag}
                                                                        </span>
                                                                    ))}
                                                                    {ref.techniques?.slice(0, 3).map((tag) => (
                                                                        <span key={`${ref.id}-technique-${tag}`} className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-200 border border-violet-400/15 text-[10px]">
                                                                            技法·{tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <div className="rounded-lg bg-black/20 border border-white/5 p-2 whitespace-pre-wrap leading-relaxed text-white/75">
                                                                    {ref.content || ref.excerpt}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* 文本输入/展示区 */}
                                        <div className="pt-1">
                                            <div className="flex items-center justify-between gap-3 mb-1 pl-1">
                                                <div className="text-xs text-rose-200/50 font-medium">正文内容 (AI 创作后可在此检查与修改)</div>
                                            </div>
                                            <textarea
                                                value={text}
                                                onChange={(e) => setText(e.target.value)}
                                                placeholder="正文内容将在这里生成..."
                                                aria-label="正文内容"
                                                disabled={isGenerationBusy}
                                                className="w-full h-32 bg-black/20 text-rose-50/90 text-sm p-3 rounded-xl placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-rose-500/40 border border-white/5 resize-none leading-relaxed scrollbar-thin scrollbar-thumb-white/10"
                                            />
                                        </div>

                                        {/* 创建卡片按钮 */}
                                        <div className="flex items-center justify-end pt-1">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.96 }}
                                                onClick={handleSubmit}
                                                onTapStart={triggerLight}
                                                disabled={!text.trim() || isLoading || isGenerationBusy}
                                                className={cn(
                                                    "flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-sm transition-all shadow-lg",
                                                    !text.trim() || isGenerationBusy
                                                        ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
                                                        : "bg-gradient-to-r from-rose-400/90 to-pink-500/90 hover:from-rose-400 hover:to-pink-400 text-white shadow-rose-500/20 backdrop-blur-md border border-white/10"
                                                )}
                                            >
                                                {isLoading ? (
                                                    <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                                                ) : (
                                                    <>保存并创建卡片 <Plus className="w-4 h-4" /></>
                                                )}
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </GlassCard>

        </div>
    );
}

// -----------------------------------------------------------------------------
// Component: TTS Card with Audio Logic
// -----------------------------------------------------------------------------

// Helper: Generate Silence WAV Blob (with dithering for iOS)
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

    // 🔥 [iOS Fix] 抖动静音：微小随机噪声，防止 iOS 检测为纯静音并暂停
    const dataOffset = 44;
    for (let i = 0; i < samples; i++) {
        const dither = (Math.random() - 0.5) * 6; // ±3 的极微小噪声（几乎听不到）
        view.setInt16(dataOffset + i * 2, Math.round(dither), true);
    }

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

// Helper: 对 AudioBuffer 应用淡入（开头），让 TTS 自然结束（不淡出）
const applyFadeIn = (audioBuffer: AudioBuffer, fadeDurationMs: number = 30) => {
    const sampleRate = audioBuffer.sampleRate;
    const fadeSamples = Math.floor(sampleRate * fadeDurationMs / 1000);

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const data = audioBuffer.getChannelData(channel);
        // 只淡入（开头），不淡出
        for (let i = 0; i < fadeSamples && i < data.length; i++) {
            data[i] *= i / fadeSamples;
        }
    }
};

const encodeWAV = (audioBuffer: AudioBuffer): ArrayBuffer => {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const length = audioBuffer.length;
    const buffer = new ArrayBuffer(44 + length * blockAlign);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * blockAlign, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, length * blockAlign, true);

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

const mergeAudioBuffersToWavBlob = (
    ctx: AudioContext,
    buffers: AudioBuffer[],
    numberOfChannels: number,
    sampleRate: number
) => {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const mergedBuffer = ctx.createBuffer(numberOfChannels, totalLength, sampleRate);

    for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = mergedBuffer.getChannelData(channel);
        let offset = 0;

        for (const buf of buffers) {
            const sourceChannel = Math.min(channel, buf.numberOfChannels - 1);
            const data = buf.getChannelData(sourceChannel);
            channelData.set(data, offset);
            offset += buf.length;
        }
    }

    return new Blob([encodeWAV(mergedBuffer)], { type: 'audio/wav' });
};

const runLimitedConcurrency = async <T,>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<void>
) => {
    const workerCount = Math.min(Math.max(1, limit), items.length);
    let nextIndex = 0;

    await Promise.all(
        Array.from({ length: workerCount }, async () => {
            while (nextIndex < items.length) {
                const currentIndex = nextIndex;
                nextIndex++;
                await worker(items[currentIndex], currentIndex);
            }
        })
    );
};

const runLimitedConcurrencyCollectingErrors = async <T,>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<void>,
    shouldKeepGoing: (error: unknown) => boolean = isRetryableTTSFailure
) => {
    const workerCount = Math.min(Math.max(1, limit), items.length);
    let nextIndex = 0;
    let stopScheduling = false;
    const errors: unknown[] = [];

    await Promise.all(
        Array.from({ length: workerCount }, async () => {
            while (true) {
                if (stopScheduling) return;
                const currentIndex = nextIndex;
                nextIndex++;
                if (currentIndex >= items.length) return;

                try {
                    await worker(items[currentIndex], currentIndex);
                } catch (error) {
                    errors.push(error);
                    if (!shouldKeepGoing(error)) {
                        stopScheduling = true;
                    }
                }
            }
        })
    );

    return errors;
};

// -----------------------------------------------------------------------------
// Component: TTS Card with Audio Logic
// -----------------------------------------------------------------------------

// 🔒 全局 Set 跟踪正在合成的卡片，防止页面切换后重复合成
const synthesizingCardsSet = new Set<string>();

// 🌟 全局进度存储 - 支持后台合成和页面切换恢复
type SynthesisProgress = {
    current: number;
    total: number;
    phase?: "checking" | "synthesizing";
};
const synthesizingProgressMap = new Map<string, SynthesisProgress>();
const synthesizingSubscribers = new Map<string, Set<(progress: SynthesisProgress) => void>>();

// 更新进度并通知所有订阅者
function updateSynthesisProgress(cardId: string, progress: SynthesisProgress) {
    synthesizingProgressMap.set(cardId, progress);
    const subscribers = synthesizingSubscribers.get(cardId);
    if (subscribers) {
        subscribers.forEach(callback => callback(progress));
    }
}

function formatSynthesisProgress(progress: SynthesisProgress) {
    if (progress.phase === "checking" || progress.total <= 0) {
        return "检查中…";
    }
    return `${progress.current}/${progress.total}`;
}

// 订阅进度更新
function subscribeSynthesisProgress(cardId: string, callback: (progress: SynthesisProgress) => void) {
    if (!synthesizingSubscribers.has(cardId)) {
        synthesizingSubscribers.set(cardId, new Set());
    }
    synthesizingSubscribers.get(cardId)!.add(callback);

    // 立即返回当前进度（如果有）
    const currentProgress = synthesizingProgressMap.get(cardId);
    if (currentProgress) {
        callback(currentProgress);
    }
}

// 取消订阅
function unsubscribeSynthesisProgress(cardId: string, callback: (progress: SynthesisProgress) => void) {
    const subscribers = synthesizingSubscribers.get(cardId);
    if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
            synthesizingSubscribers.delete(cardId);
        }
    }
}

// 清理完成的合成
function clearSynthesisProgress(cardId: string) {
    synthesizingProgressMap.delete(cardId);
    synthesizingSubscribers.delete(cardId);
}

// Apple Ease
const APPLE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const JELLY_VARIANTS = {
    hover: {
        scale: 1.025,
        transition: { duration: 0.4, ease: APPLE_EASE }
    },
    tap: {
        scale: 0.96,
        transition: { type: "spring" as const, stiffness: 300, damping: 15 }
    }
};

function TTSCardItem({
    card,
    onDelete,
    onEdit,
    onMove,
    onView,
    ttsSettings,
    index = 0,
    canMove = true,
}: {
    card: TTSCard;
    onDelete: (id: string) => void;
    onEdit: (card: TTSCard) => void;
    onMove?: (card: TTSCard) => void;
    onView: (card: TTSCard, preferredCacheKey?: string) => void;
    ttsSettings: TTSSettings;
    index?: number;
    canMove?: boolean;
}) {
    // ... (keep existing state declarations)
    // Queue State
    type QueueItem =
        | { type: 'pause', duration: number, id: string }
        | { type: 'text', content: string, rate: string, voiceId: string, id: string, url?: string, buffer?: AudioBuffer };

    const [audioQueue, setAudioQueue] = useState<QueueItem[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false); // For spinning indicator
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

    const { triggerLight, triggerMedium, triggerHeavy, triggerSuccess, triggerError } = useHaptics();
    const [localSynthVersions, setLocalSynthVersions] = useState<TTSCardLocalSynthVersion[] | undefined>(undefined);
    const [legacySynthSnapshot, setLegacySynthSnapshot] = useState<TTSCardSynthSnapshot | null | undefined>(undefined);
    const [selectedVersionCacheKey, setSelectedVersionCacheKey] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            listLocalTTSCardSynthVersions(card.id),
            getLocalLegacyTTSCardSynthSnapshot(card.id),
        ])
            .then(([versions, snapshot]) => {
                if (cancelled) return;
                setLocalSynthVersions(versions);
                setLegacySynthSnapshot(snapshot ?? null);
            })
            .catch((error) => {
                console.warn(`[TTSCard] 读取本地合成版本失败: ${card.id}`, error);
                if (!cancelled) {
                    setLocalSynthVersions([]);
                    setLegacySynthSnapshot(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [card.id]);



    // 合成状态 - 从全局状态初始化
    const [isSynthesizing, setIsSynthesizing] = useState(() => synthesizingCardsSet.has(card.id));
    const [synthesizeProgress, setSynthesizeProgress] = useState(() =>
        synthesizingProgressMap.get(card.id) || { current: 0, total: 0 }
    );

    // 🌟 订阅全局合成进度更新 - 支持后台合成和页面切换恢复
    useEffect(() => {
        const handleProgressUpdate = (progress: SynthesisProgress) => {
            setSynthesizeProgress(progress);
            setIsSynthesizing(true);
        };

        subscribeSynthesisProgress(card.id, handleProgressUpdate);

        return () => {
            unsubscribeSynthesisProgress(card.id, handleProgressUpdate);
        };
    }, [card.id]);

    // 缓存状态
    const [hasCachedAudio, setHasCachedAudio] = useState(false);
    const [cachedAudioUrl, setCachedAudioUrl] = useState<string | null>(null);
    const [audioDuration, setAudioDuration] = useState<number | null>(null); // 音频总时长
    const [showCardMenu, setShowCardMenu] = useState(false);
    const [showVersionPicker, setShowVersionPicker] = useState(false);
    const [deleteCacheConfirm, setDeleteCacheConfirm] = useState(false); // iOS的确认弹窗
    const [useCachedPlayback, setUseCachedPlayback] = useState(true); // 默认使用缓存播放
    const versionResolution = useMemo(
        () => resolveLocalTTSCardVersion({
            card,
            settings: ttsSettings,
            localVersions: localSynthVersions ?? [],
            selectedVersionCacheKey,
            legacySnapshot: legacySynthSnapshot ?? null,
        }),
        [card, legacySynthSnapshot, localSynthVersions, selectedVersionCacheKey, ttsSettings]
    );
    const synthSnapshot = versionResolution.snapshot;
    const effectiveCardSettings = useMemo(
        () => applySynthSnapshotToSettings(ttsSettings, synthSnapshot),
        [ttsSettings, synthSnapshot]
    );
    const audioCacheKey = versionResolution.cacheKey;
    const synthModelBadge = useMemo(
        () => getSynthModelBadgeLabel(synthSnapshot) || getTTSSettingsModelBadgeLabel(effectiveCardSettings),
        [effectiveCardSettings, synthSnapshot]
    );
    const currentSettingsModelBadge = useMemo(
        () => getTTSSettingsModelBadgeLabel(ttsSettings),
        [ttsSettings]
    );
    const priceEstimate = useMemo(
        () => estimateTTSCardPrice(card, effectiveCardSettings),
        [card, effectiveCardSettings]
    );
    const compatibleLocalVersions = versionResolution.compatibleVersions;
    const isVersionStateReady = localSynthVersions !== undefined && legacySynthSnapshot !== undefined;
    const currentSettingsCacheKey = versionResolution.desiredCacheKey;
    const hasCurrentSettingsVersion =
        versionResolution.source === "matched" ||
        versionResolution.source === "legacy" ||
        compatibleLocalVersions.some((version) => version.cacheKey === currentSettingsCacheKey);
    const latestVersionByLabel = useMemo(() => {
        const map = new Map<string, TTSCardLocalSynthVersion>();
        for (const version of compatibleLocalVersions) {
            if (!map.has(version.modelLabel)) {
                map.set(version.modelLabel, version);
            }
        }
        return map;
    }, [compatibleLocalVersions]);
    const versionPickerOptions = useMemo(() => {
        const baseOptions = [
            { key: "edgetts", label: "edgetts" },
            { key: "3.0local", label: "3.0local" },
            { key: "cy3.5-flash", label: "cy3.5-flash" },
            { key: "3.5plus", label: "3.5plus" },
            { key: "qwen-flash", label: "qwen-flash" },
            { key: "qwen-instruct", label: "qwen-instruct" },
            { key: "qwen-vc", label: "qwen-vc" },
        ];

        return baseOptions.map((option) => {
            const version = latestVersionByLabel.get(option.label) ?? null;
            const isCurrentSettings = option.label === currentSettingsModelBadge;
            const isSelected = version
                ? selectedVersionCacheKey === version.cacheKey
                : isCurrentSettings && selectedVersionCacheKey === null;

            return {
                ...option,
                version,
                isCurrentSettings,
                isSelected,
                synthesized: Boolean(version) || (isCurrentSettings && hasCurrentSettingsVersion),
            };
        }).sort((left, right) => {
            const leftRank = left.isCurrentSettings ? 0 : left.synthesized ? 1 : 2;
            const rightRank = right.isCurrentSettings ? 0 : right.synthesized ? 1 : 2;
            if (leftRank !== rightRank) return leftRank - rightRank;
            return left.key.localeCompare(right.key);
        });
    }, [currentSettingsModelBadge, hasCurrentSettingsVersion, latestVersionByLabel, selectedVersionCacheKey]);

    useEffect(() => {
        if (selectedVersionCacheKey && !compatibleLocalVersions.some((version) => version.cacheKey === selectedVersionCacheKey)) {
            setSelectedVersionCacheKey(null);
        }
    }, [compatibleLocalVersions, selectedVersionCacheKey]);

    // 播放进度状态 (用于缓存音频)
    const [playbackProgress, setPlaybackProgress] = useState({ currentTime: 0, duration: 0 });

    // 📊 统计记录: 当前播放的 session ID
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // 🚀 流式优化：初始缓冲状态
    const [isBuffering, setIsBuffering] = useState(false);
    const [bufferProgress, setBufferProgress] = useState({ loaded: 0, total: 0 });
    const INITIAL_BUFFER_COUNT = 3; // 初始缓冲数量
    const MIN_BUFFER_COUNT = 2; // 最小安全缓冲

    // 检查缓存状态 - 如果没有缓存则自动后台合成
    const hasCheckedCacheRef = useRef(false);
    useEffect(() => {
        if (!isVersionStateReady) return;
        hasCheckedCacheRef.current = false;
        setHasCachedAudio(false);
        setCachedAudioUrl(null);
        setAudioDuration(null);
    }, [audioCacheKey, isVersionStateReady]);

    useEffect(() => {
        // 防止重复检测
        if (!isVersionStateReady) return;
        if (hasCheckedCacheRef.current) return;
        hasCheckedCacheRef.current = true;
        let cancelled = false;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;

        getLocalAudioCache(audioCacheKey).then(async (blob) => {
            if (cancelled) return;
            const exists = Boolean(blob);
            setHasCachedAudio(exists);
            if (blob) {
                try {
                    const duration = await getBlobDuration(blob);
                    if (!cancelled) setAudioDuration(duration);
                } catch (e) {
                    console.error("Failed to get audio duration via cache", e);
                }
            } else {
                // ✨ 统一等待手动点击合成，不再自动合成
                if (synthesizingCardsSet.has(card.id)) {
                    setIsSynthesizing(true); // 显示合成状态
                } else {
                    console.log(`[TTSCard] 卡片 "${card.title || card.id}" 无缓存，等待手动合成。`);
                }
            }
        }).catch((error) => {
            console.warn(`[TTSCard] 读取音频缓存失败: ${audioCacheKey}`, error);
            if (!cancelled) {
                setHasCachedAudio(false);
            }
        });

        return () => {
            cancelled = true;
            if (retryTimer) clearTimeout(retryTimer);
        };
    }, [audioCacheKey, card.id, isVersionStateReady]);

    // Refs
    const currentItemIdRef = useRef<string | null>(null);
    const isProcessingRef = useRef<boolean>(false); // 🔥 防止 useEffect 并发执行
    const audioContextRef = useRef<AudioContext | null>(null);
    const versionPickerRef = useRef<HTMLDivElement | null>(null);
    const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null); // 🔥 当前活跃的源节点
    const mainGainNodeRef = useRef<GainNode | null>(null); // 🔥 全局增益节点

    const cachedSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const cachedAudioBufferRef = useRef<AudioBuffer | null>(null); // 保存解码后的 AudioBuffer
    const wakeLockRef = useRef<any>(null);
    const playbackStartTimeRef = useRef<number>(0);
    const pausedAtRef = useRef<number>(0); // 暂停位置（秒）
    const isPausedRef = useRef<boolean>(false); // 暂停状态

    // ... (helper functions omitted for brevity, keeping existing logic structure)

    // Helper: Format time
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // ... (Omitting large block of logic implementation to focus on return statement change. Wait, replace_file_content needs context. I should target the return statement mostly, or use multi_replace if logic is scattered. But logic is contiguous.)
    // Actually, I can just update the beginning of the function and the return statement.
    // However, replace_file_content replaces a contiguous block.
    // Use multi_replace to insert JELLY_VARIANTS and update the return block.

    // Let's switch to multi_replace because I need to add the constant OUTSIDE the component (or inside) and update the JSX.
    // Adding it outside is better.
    // 是否处于暂停状态
    const isPlayingRef = useRef<boolean>(false); // 同步跟踪播放状态
    const nextStartTimeRef = useRef<number>(0);
    const scheduledIdsRef = useRef<Set<string>>(new Set());
    const sourceNodesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    // 🔥 持久 Audio 对象：在用户手势中初始化后可复用，避免 iOS NotAllowedError
    const sharedAudioRef = useRef<HTMLAudioElement | null>(null);
    const primeOnceRef = useRef(false);
    const isTogglingRef = useRef(false); // 🔥 防止快速点击产生的竞态

    // 🔥 [iOS Fix] 初始化共享 Audio 对象
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audio = new Audio();
            (audio as any).playsInline = true; // iOS 关键
            audio.preload = 'auto';
            sharedAudioRef.current = audio;
        }
        return () => {
            if (sharedAudioRef.current) {
                const audio = sharedAudioRef.current;
                audio.pause();
                audio.src = '';
                audio.onended = null;
                audio.onerror = null;
            }
            if (activeSourceNodeRef.current) {
                try { activeSourceNodeRef.current.stop(); } catch (e) { }
            }
        };
    }, []);

    useEffect(() => {
        if (!showVersionPicker) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!versionPickerRef.current?.contains(event.target as Node)) {
                setShowVersionPicker(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
        };
    }, [showVersionPicker]);

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------



    const initAudioContext = () => {
        if (typeof window === 'undefined') return null;
        const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current && AC) {
            const ctx = new AC();
            audioContextRef.current = ctx;
            console.log('[Studio] AudioContext created');
        }
        return audioContextRef.current;
    }

    const resumeAudioContext = async () => {
        const ctx = initAudioContext();
        if (ctx && ctx.state === 'suspended') {
            await ctx.resume().catch(() => { });
        }
    };

    // Keep for backward compatibility if needed, but prefer explicit calls
    const ensureAudioContext = resumeAudioContext;

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
            // 🔥 [iOS Critical Fix] 复用共享 Audio 对象，避免 iOS 阻止非用户手势触发的新 Audio 播放
            let audio = sharedAudioRef.current;
            if (!audio) {
                audio = new Audio();
                sharedAudioRef.current = audio;
            }

            // 清理之前的事件监听
            audio.onended = null;
            audio.onerror = null;
            audio.onpause = null;

            // 设置新的音频源
            audio.preload = 'auto';
            // @ts-ignore
            audio.playsInline = true;
            audio.loop = false;
            audio.volume = 1;
            audio.src = url;

            setCurrentAudio(audio); // 保持 ref 引用

            // MediaSession（锁屏控制）
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: card.title || "TTS Playback",
                    artist: "Rain App",
                });
                navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
                navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
            }

            // 🔥 [iOS Debug] 诊断日志
            console.log(`[TTS Studio] 📢 Playing audio: ${url.substring(0, 50)}...`);

            audio.onended = () => {
                console.log(`[TTS Studio] ✅ Audio ended`);
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                resolve();
            };
            audio.onerror = (e) => {
                console.error("[TTS Studio] ❌ Audio error", e);
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                resolve(); // Resolve anyway to proceed
            };

            // 🔥 [iOS Fix] 监听暂停事件，可能是系统暂停
            audio.onpause = () => {
                console.log(`[TTS Studio] ⏸️ Audio paused by system`);
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

    // 🔥 在用户手势中初始化 sharedAudioRef，解锁 iOS 音频播放
    const primeAudio = () => {
        if (primeOnceRef.current) return;
        primeOnceRef.current = true;
        // iOS 要求 audio.play() 必须在用户手势的同步调用链中执行
        const url = createSilenceWavURL(0.05);
        const audio = new Audio(url);
        (audio as any).playsInline = true;
        audio.volume = 0.01;
        audio.onended = () => URL.revokeObjectURL(url);
        audio.onerror = () => URL.revokeObjectURL(url);
        audio.play().catch(() => { });
        // 保存到 ref，后续复用
        sharedAudioRef.current = audio;
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
        if (isMeteredTTSProvider(ttsSettings.provider)) {
            return;
        }

        const ctx = initAudioContext(); // Use init, DO NOT resume here to avoid unpausing
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
                    body: JSON.stringify(buildTTSRequestPayload(item.content, item.voiceId, item.rate)),
                });
                if (res && res.ok) {
                    const blob = await res.blob();
                    const arrayBuffer = await blob.arrayBuffer();
                    const buffer = await ctx.decodeAudioData(arrayBuffer);
                    // 🔥 同时设置 url 和 buffer，确保 HTMLAudioElement 可以使用
                    const url = URL.createObjectURL(blob);

                    setAudioQueue(prev => prev.map(q =>
                        q.id === item.id ? { ...q, buffer, url } : q
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

    // 🔥 用 b1d4d20 风格：Web Audio API 顺序播放 (Fix for premature stops)
    useEffect(() => {
        // 停止播放时清理
        if (!isPlaying) {
            // Pause/Stop logic
            if (audioContextRef.current?.state === 'running') {
                audioContextRef.current.suspend();
            }
            // If using <audio> element fallback
            if (currentAudio && !currentAudio.paused) {
                currentAudio.pause();
            }
            isProcessingRef.current = false; // 重置
            currentItemIdRef.current = null; // 重置
            return;
        } else {
            // Resume logic
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
        }

        // 队列为空时停止
        if (audioQueue.length === 0) {
            // 🔥 如果正在使用缓存播放且有缓存，不要停止
            if (useCachedPlayback && hasCachedAudio) return;

            setIsPlaying(false);
            return;
        }

        // 🔥 锁：防止并发执行
        if (isProcessingRef.current) return;

        // 🔥 关键防护：如果有音频正在播放，不处理
        // Web Audio check: currentItemIdRef tracks if we are working on an item
        if (currentItemIdRef.current === audioQueue[0].id) {
            // Already playing this item
            return;
        }

        // 持续预加载
        prefetchNextTextItems(audioQueue);

        // 处理队列第一个项目
        const item = audioQueue[0];

        // 🔥 设置锁，防止并发处理
        isProcessingRef.current = true;
        currentItemIdRef.current = item.id;

        const cleanup = () => {
            // Clear listeners
            if (activeSourceNodeRef.current) {
                activeSourceNodeRef.current.onended = null;
                activeSourceNodeRef.current = null;
            }
            if (currentAudio) {
                currentAudio.onended = null;
                currentAudio.onerror = null;
                setCurrentAudio(null);
            }

            if (item.type === 'text' && item.url && item.url.startsWith('blob:')) {
                // Defer revoke to avoid cutting tail if using Audio element
                setTimeout(() => URL.revokeObjectURL(item.url!), 1000);
            }

            setAudioQueue(prev => prev.slice(1));
            currentItemIdRef.current = null;
            isProcessingRef.current = false;
        };

        const ctx = initAudioContext();
        if (!ctx) { isProcessingRef.current = false; return; }

        if (item.type === 'pause' || (item.type === 'text' && item.buffer)) {
            // Use Web Audio API
            setIsLoadingAudio(false);

            try {
                // Ensure context is running if we are supposed to be playing
                if (ctx.state === 'suspended') ctx.resume();

                const source = ctx.createBufferSource();
                const gainNode = ctx.createGain();
                gainNode.gain.value = 1.0;

                if (item.type === 'pause') {
                    // Create silent buffer
                    const frameCount = (item.duration / 1000) * ctx.sampleRate;
                    const silentBuffer = ctx.createBuffer(1, frameCount || 1, ctx.sampleRate);
                    source.buffer = silentBuffer;
                } else {
                    source.buffer = item.buffer!;
                }

                source.connect(gainNode);
                gainNode.connect(ctx.destination);

                source.onended = () => {
                    console.log(`[TTS WebAudio] Item ended: ${item.id}`);
                    cleanup();
                };

                activeSourceNodeRef.current = source;
                mainGainNodeRef.current = gainNode;

                source.start(0);

                // Still set currentAudio to null to indicate we are not using HTMLAudioElement
                setCurrentAudio(null);

            } catch (e) {
                console.error("[TTS WebAudio] Play failed", e);
                cleanup();
            }

        } else if (item.type === 'text' && item.url) {
            // Fallback to HTMLAudioElement if buffer missing (should be rare with prefetch)
            console.log("[TTS] Fallback to HTMLAudioElement for", item.id);

            // 🔥 [iOS Critical Fix] 确保复用 sharedAudioRef，不要 fallback 创建新的
            let audio = sharedAudioRef.current;
            if (!audio) {
                audio = new Audio();
                sharedAudioRef.current = audio;
            }

            // 清理之前的事件监听
            audio.onended = null;
            audio.onerror = null;
            audio.onpause = null;

            (audio as any).playsInline = true;
            audio.loop = false;
            audio.volume = 1;
            audio.src = item.url;

            audio.onended = () => {
                setTimeout(cleanup, 500);
            };
            audio.onerror = (e) => {
                console.error("[TTS HTMLAudio] Error", e);
                cleanup();
            };

            setCurrentAudio(audio);
            audio.play().catch(e => {
                console.error("Play failed", e);
                cleanup();
            });
            setIsLoadingAudio(false);

        } else {
            // Still loading or invalid
            if (item.type === 'text' && !item.buffer && !item.url) {
                setIsLoadingAudio(true);
                // Allow re-check
                isProcessingRef.current = false;
                currentItemIdRef.current = null;
            } else {
                // Invalid
                cleanup();
            }
        }
    }, [isPlaying, audioQueue]);


    // -------------------------------------------------------------------------
    // 一键合成完整音频
    // -------------------------------------------------------------------------
    const buildTTSRequestPayload = (
        text: string,
        voice: string,
        rate: string,
        options: { enableSSML?: boolean } = {}
    ) => ({
        text,
        voice,
        rate,
        enableSSML: options.enableSSML,
        provider: ttsSettings.provider,
        cosyvoiceSpeed: ttsSettings.cosyvoiceSpeed,
        cosyvoiceInstruction: ttsSettings.cosyvoiceInstruction,
        cosyvoiceSeed: ttsSettings.cosyvoiceSeed,
        cosyvoiceVoiceId: ttsSettings.cosyvoiceVoiceId,
        mimoTTSModel: ttsSettings.mimoTTSModel,
        mimoTTSVoice: ttsSettings.mimoTTSVoice,
        mimoTTSInstruction: ttsSettings.mimoTTSInstruction,
        mimoTTSVoiceDesignPrompt: ttsSettings.mimoTTSVoiceDesignPrompt,
        mimoTTSCloneVoiceUrl: ttsSettings.mimoTTSCloneVoiceUrl,
        qwenTTSModel: ttsSettings.qwenTTSModel,
        qwenTTSVoice: ttsSettings.qwenTTSVoice,
        qwenTTSVoiceMode: ttsSettings.qwenTTSVoiceMode,
        qwenTTSCloneVoiceId: ttsSettings.qwenTTSCloneVoiceId,
        qwenTTSCloneVoiceCloudId: ttsSettings.qwenTTSCloneVoiceCloudId,
        qwenTTSSpeed: ttsSettings.qwenTTSSpeed,
        qwenTTSLanguageType: ttsSettings.qwenTTSLanguageType,
        qwenTTSInstructions: ttsSettings.qwenTTSInstructions,
        cosyvoice35PlusModel: ttsSettings.cosyvoice35PlusModel,
        cosyvoice35PlusVoiceId: ttsSettings.cosyvoice35PlusVoiceId,
        cosyvoice35FlashVoiceId: ttsSettings.cosyvoice35FlashVoiceId,
        cosyvoice35PlusVoiceProfileId: ttsSettings.cosyvoice35PlusVoiceProfileId,
        cosyvoice35PlusSpeed: ttsSettings.cosyvoice35PlusSpeed,
        cosyvoice35PlusInstruction: ttsSettings.cosyvoice35PlusInstruction,
        cosyvoice35PlusLanguageHint: ttsSettings.cosyvoice35PlusLanguageHint,
    });

    const preflightCurrentTTS = async () => {
        if (ttsSettings.provider === "edge") return;

        if (ttsSettings.provider === "mimotts") {
            return;
        }

        const res = await fetch(getApiUrl("/api/tts-settings/test"), {
            method: "POST",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                provider: ttsSettings.provider,
                cosyvoiceSpeed: ttsSettings.cosyvoiceSpeed,
                cosyvoiceInstruction: ttsSettings.cosyvoiceInstruction,
                cosyvoiceSeed: ttsSettings.cosyvoiceSeed,
                cosyvoiceVoiceId: ttsSettings.cosyvoiceVoiceId,
                mimoTTSModel: ttsSettings.mimoTTSModel,
                mimoTTSVoice: ttsSettings.mimoTTSVoice,
                mimoTTSInstruction: ttsSettings.mimoTTSInstruction,
                mimoTTSVoiceDesignPrompt: ttsSettings.mimoTTSVoiceDesignPrompt,
                mimoTTSCloneVoiceUrl: ttsSettings.mimoTTSCloneVoiceUrl,
                qwenTTSModel: ttsSettings.qwenTTSModel,
                qwenTTSVoice: ttsSettings.qwenTTSVoice,
                qwenTTSVoiceMode: ttsSettings.qwenTTSVoiceMode,
                qwenTTSCloneVoiceId: ttsSettings.qwenTTSCloneVoiceId,
                qwenTTSCloneVoiceCloudId: ttsSettings.qwenTTSCloneVoiceCloudId,
                qwenTTSSpeed: ttsSettings.qwenTTSSpeed,
                qwenTTSLanguageType: ttsSettings.qwenTTSLanguageType,
                qwenTTSInstructions: ttsSettings.qwenTTSInstructions,
                cosyvoice35PlusModel: ttsSettings.cosyvoice35PlusModel,
                cosyvoice35PlusVoiceId: ttsSettings.cosyvoice35PlusVoiceId,
                cosyvoice35FlashVoiceId: ttsSettings.cosyvoice35FlashVoiceId,
                cosyvoice35PlusVoiceProfileId: ttsSettings.cosyvoice35PlusVoiceProfileId,
                cosyvoice35PlusSpeed: ttsSettings.cosyvoice35PlusSpeed,
                cosyvoice35PlusInstruction: ttsSettings.cosyvoice35PlusInstruction,
                cosyvoice35PlusLanguageHint: ttsSettings.cosyvoice35PlusLanguageHint,
            }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
            const modelHint = typeof data?.model === "string" ? `模型 ${data.model} · ` : "";
            const detail = typeof data?.error === "string" && data.error.trim()
                ? data.error.trim()
                : `HTTP ${res.status}`;
            throw new Error(`合成前检查失败：${modelHint}${detail}`);
        }
    };

    const synthesizeAndDownload = async () => {
        if (isSynthesizing) return;
        // 🔒 标记全局合成状态
        if (synthesizingCardsSet.has(card.id)) return;
        synthesizingCardsSet.add(card.id);

        setIsSynthesizing(true);
        updateSynthesisProgress(card.id, { current: 0, total: 0, phase: "checking" });

        try {
            const nextSynthSnapshot = buildSynthSnapshot(card.id, ttsSettings);
            const targetAudioCacheKey = buildTTSCardAudioCacheKey(card, ttsSettings, nextSynthSnapshot);
            await preflightCurrentTTS();

            if (ttsSettings.provider === "cosyvoice35plus") {
                const ssmlChunks = buildCosyVoiceCardSSMLChunks(card.content);
                const ssmlAudioChunks = ssmlChunks.filter((chunk) => chunk.type === "ssml");
                updateSynthesisProgress(card.id, { current: 0, total: ssmlAudioChunks.length, phase: "synthesizing" });

                try {
                    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
                    const ctx = new AC();
                    type AudioOrPause = AudioBuffer | { type: "pause"; duration: number };
                    const isPauseChunk = (buf: AudioOrPause): buf is { type: "pause"; duration: number } =>
                        "type" in buf && buf.type === "pause";
                    const audioBuffers: AudioOrPause[] = new Array(ssmlChunks.length);
                    let completedAudioChunks = 0;
                    const ssmlWork = ssmlChunks
                        .map((chunk, index) => ({ chunk, index }))
                        .filter((item): item is { chunk: { type: "ssml"; ssml: string }; index: number } => item.chunk.type === "ssml");

                    ssmlChunks.forEach((chunk, index) => {
                        if (chunk.type === "pause") {
                            audioBuffers[index] = { type: "pause", duration: chunk.durationSeconds };
                        }
                    });

                    console.log(
                        `[Synthesize] CosyVoice SSML 分块: ${ssmlAudioChunks.length} 段音频 + ${ssmlChunks.length - ssmlAudioChunks.length} 段本地静音，并发 ${COSYVOICE_SSML_CHUNK_CONCURRENCY}`
                    );

                    await runLimitedConcurrency(ssmlWork, COSYVOICE_SSML_CHUNK_CONCURRENCY, async ({ chunk, index }) => {
                        const startedAt = performance.now();
                        const chunkCacheKey = buildAudioChunkCacheKey(targetAudioCacheKey, index);
                        const cachedChunkBlob = await getAudioCache(chunkCacheKey);
                        if (cachedChunkBlob) {
                            try {
                                const arrayBuffer = await cachedChunkBlob.arrayBuffer();
                                const decoded = await ctx.decodeAudioData(arrayBuffer);
                                audioBuffers[index] = decoded;
                                completedAudioChunks++;
                                console.log(`[Synthesize] SSML chunk ${completedAudioChunks}/${ssmlAudioChunks.length} 命中分块缓存`);
                                updateSynthesisProgress(card.id, {
                                    current: completedAudioChunks,
                                    total: ssmlAudioChunks.length,
                                    phase: "synthesizing",
                                });
                                return;
                            } catch (error) {
                                console.warn(`[Synthesize] SSML chunk ${index} 分块缓存损坏，删除后重新合成`, error);
                                await deleteAudioCache(chunkCacheKey).catch(() => undefined);
                            }
                        }

                        const res = await fetchWithRetry("/api/tts", {
                            method: "POST",
                            body: JSON.stringify(
                                buildTTSRequestPayload(chunk.ssml, card.voice_id, card.rate || "0%", { enableSSML: true })
                            ),
                        });

                        if (!res || !res.ok) {
                            const details = res ? await res.text().catch(() => "") : "";
                            throw new Error(
                                `SSML synth failed: ${res?.status || "no-response"} ${details}`.trim()
                            );
                        }

                        const arrayBuffer = await res.arrayBuffer();
                        const chunkBlob = new Blob([arrayBuffer], { type: "audio/wav" });
                        const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
                        applyFadeIn(decoded, 30);
                        await saveAudioCache(chunkCacheKey, chunkBlob);
                        audioBuffers[index] = decoded;
                        completedAudioChunks++;
                        console.log(
                            `[Synthesize] SSML chunk ${completedAudioChunks}/${ssmlAudioChunks.length} 完成，用时 ${Math.round(performance.now() - startedAt)}ms`
                        );
                        updateSynthesisProgress(card.id, {
                            current: completedAudioChunks,
                            total: ssmlAudioChunks.length,
                            phase: "synthesizing",
                        });
                    });

                    const firstAudioBuffer = audioBuffers.find((buf): buf is AudioBuffer => Boolean(buf && (buf as AudioBuffer).sampleRate));
                    const actualSampleRate = firstAudioBuffer?.sampleRate || 24000;
                    const numberOfChannels = audioBuffers.reduce((maxChannels, buf) => {
                        if (!buf || isPauseChunk(buf)) return maxChannels;
                        return Math.max(maxChannels, (buf as AudioBuffer).numberOfChannels);
                    }, 1);

                    const finalBuffers: AudioBuffer[] = [];
                    for (const buf of audioBuffers) {
                        if (!buf) continue;
                        if (isPauseChunk(buf)) {
                            const samples = Math.floor(actualSampleRate * buf.duration);
                            finalBuffers.push(ctx.createBuffer(numberOfChannels, samples, actualSampleRate));
                        } else {
                            finalBuffers.push(buf);
                        }
                    }

                    const mergedBlob = await mergeAudioBuffersToWavBlob(ctx, finalBuffers, numberOfChannels, actualSampleRate);
                    await saveLocalAudioCache(targetAudioCacheKey, mergedBlob);
                    void saveCloudTTSAudioCache(targetAudioCacheKey, mergedBlob);
                    setHasCachedAudio(true);
                    setCachedAudioUrl((prev) => {
                        if (prev?.startsWith("blob:")) {
                            URL.revokeObjectURL(prev);
                        }
                        return URL.createObjectURL(mergedBlob);
                    });
                    await saveTTSCardSynthSnapshot(nextSynthSnapshot);
                    const nextLocalVersion = await saveLocalTTSCardSynthVersion(card.id, targetAudioCacheKey, nextSynthSnapshot);
                    setLocalSynthVersions((prev) => {
                        const current = prev ?? [];
                        return [nextLocalVersion, ...current.filter((version) => version.cacheKey !== nextLocalVersion.cacheKey)];
                    });
                    setLegacySynthSnapshot(nextSynthSnapshot);
                    setSelectedVersionCacheKey(targetAudioCacheKey);
                    updateSynthesisProgress(card.id, { current: ssmlAudioChunks.length, total: ssmlAudioChunks.length, phase: "synthesizing" });
                    console.log(`[Synthesize] ✅ ${ttsSettings.cosyvoice35PlusModel} SSML 分块合成完成并已缓存`);
                    triggerSuccess();
                    return;
                } catch (ssmlError) {
                    if (shouldSurfaceSSMLFailure(ssmlError)) {
                        throw ssmlError;
                    }
                    console.warn("[Synthesize] CosyVoice 3.5 SSML 快路径失败，回退逐段模式", ssmlError);
                }
            }

            // 1. 解析内容为片段
            type SynthSegment =
                | { type: 'pause', duration: number }
                | { type: 'text', content: string, rate: string, voiceId: string, textIndex: number };

            const segments: SynthSegment[] = [];
            let currentRate = card.rate || "0%";
            let nextTextIndex = 0;
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
                    segments.push({
                        type: 'text',
                        content: part,
                        rate: currentRate,
                        voiceId: card.voice_id,
                        textIndex: nextTextIndex,
                    });
                    nextTextIndex++;
                }
            }

            const textSegments = segments.filter(s => s.type === 'text');
            updateSynthesisProgress(card.id, { current: 0, total: textSegments.length, phase: "synthesizing" });

            // 2. 创建 AudioContext
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            const ctx = new AC();

            // 3. 并发获取所有文本段音频。每段都会单独落盘缓存，失败后下次只补缺失段。
            const textAudioBuffers: AudioBuffer[] = new Array(textSegments.length);
            let completedTextSegments = 0;
            const textConcurrency = getTextSegmentConcurrency(ttsSettings);
            const textFetchRetries = getTTSFetchRetryCount(ttsSettings);
            const textFetchTimeoutMs = getTTSFetchTimeoutMs(ttsSettings);
            console.log(
                `[Synthesize] 文本分段并发合成: ${textSegments.length} 段，并发 ${textConcurrency}，每段最多重试 ${textFetchRetries} 次`
            );

            const markTextSegmentCompleted = () => {
                completedTextSegments++;
                updateSynthesisProgress(card.id, {
                    current: completedTextSegments,
                    total: textSegments.length,
                    phase: "synthesizing",
                });
            };

            const textSegmentErrors = await runLimitedConcurrencyCollectingErrors(
                textSegments,
                textConcurrency,
                async (seg) => {
                    const currentTextIndex = seg.textIndex + 1;
                    const chunkCacheKey = buildAudioChunkCacheKey(targetAudioCacheKey, seg.textIndex);
                    try {
                        const cachedChunkBlob = await getAudioCache(chunkCacheKey);
                        if (cachedChunkBlob) {
                            try {
                                const cachedArrayBuffer = await cachedChunkBlob.arrayBuffer();
                                const cachedDecoded = await ctx.decodeAudioData(cachedArrayBuffer.slice(0));
                                textAudioBuffers[seg.textIndex] = cachedDecoded;
                                markTextSegmentCompleted();
                                console.log(`[Synthesize] 文本段 ${currentTextIndex}/${textSegments.length} 命中分段缓存`);
                                return;
                            } catch (error) {
                                console.warn(`[Synthesize] 逐段缓存损坏，删除后重新合成: ${currentTextIndex}`, error);
                                await deleteAudioCache(chunkCacheKey).catch(() => undefined);
                            }
                        }

                        const res = await fetchWithRetry("/api/tts", {
                            method: "POST",
                            body: JSON.stringify(buildTTSRequestPayload(seg.content, seg.voiceId, seg.rate)),
                        }, textFetchRetries, textFetchTimeoutMs);
                        if (res && res.ok) {
                            const arrayBuffer = await res.arrayBuffer();
                            const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
                            // 🎵 应用 50ms 淡入淡出，避免拼接顿挫感
                            applyFadeIn(decoded, 30);
                            await saveAudioCache(
                                chunkCacheKey,
                                new Blob([arrayBuffer], { type: res.headers.get("content-type") || "audio/wav" })
                            );
                            textAudioBuffers[seg.textIndex] = decoded;
                            markTextSegmentCompleted();
                        } else {
                            const details = res ? await res.text().catch(() => "") : "";
                            throw createFetchResponseError(res?.status || 500, details);
                        }
                    } catch (e) {
                        console.error("[Synthesize] TTS fetch failed", e);
                        const preview = seg.content.replace(/\s+/g, " ").trim().slice(0, 32);
                        const suffix = preview ? `（第 ${currentTextIndex}/${textSegments.length} 段：${preview}${seg.content.trim().length > 32 ? "…" : ""}）` : "";
                        throw new Error(`${getErrorDetails(e)}${suffix}`);
                    }
                }
            );

            if (textSegmentErrors.length > 0) {
                const completed = textAudioBuffers.filter(Boolean).length;
                const firstError = textSegmentErrors[0];
                throw new Error(
                    `${getErrorDetails(firstError)}（已保留 ${completed}/${textSegments.length} 段分段缓存；再次点击合成会从缺失段继续，不会从头重来）`
                );
            }

            // 4. 处理静音并计算总长度
            const finalBuffers: AudioBuffer[] = [];
            let numberOfChannels = 1; // 默认单声道
            const firstTextAudioBuffer = textAudioBuffers.find(Boolean);
            let actualSampleRate = firstTextAudioBuffer?.sampleRate || 24000; // TTS 默认采样率，会在第一个解码后更新
            console.log("[Synthesize] 实际采样率:", actualSampleRate);

            // 先检测实际声道数
            for (const buf of textAudioBuffers) {
                if (buf?.numberOfChannels) {
                    numberOfChannels = Math.max(numberOfChannels, buf.numberOfChannels);
                }
            }
            console.log("[Synthesize] 声道数:", numberOfChannels);

            for (const seg of segments) {
                if (seg.type === 'pause') {
                    // 生成与实际采样率和声道数匹配的静音（带微小抖动，避免完全静音不自然）
                    const samples = Math.floor(actualSampleRate * seg.duration);
                    const silenceBuffer = ctx.createBuffer(numberOfChannels, samples, actualSampleRate);

                    // 🎵 添加极微小的抖动噪声，让过渡更自然
                    for (let channel = 0; channel < numberOfChannels; channel++) {
                        const data = silenceBuffer.getChannelData(channel);
                        for (let i = 0; i < data.length; i++) {
                            // 极微小的随机噪声（-0.0001 到 0.0001），几乎听不到但能保持连续性
                            data[i] = (Math.random() - 0.5) * 0.0002;
                        }
                    }

                    finalBuffers.push(silenceBuffer);
                } else {
                    const buf = textAudioBuffers[seg.textIndex];
                    if (!buf) {
                        throw new Error(`第 ${seg.textIndex + 1}/${textSegments.length} 段音频缺失；再次点击合成会继续补齐。`);
                    }
                    finalBuffers.push(buf);
                }
            }

            // ✅ 移除结尾静音 - 使用 crossfade 代替

            const blob = mergeAudioBuffersToWavBlob(ctx, finalBuffers, numberOfChannels, actualSampleRate);

            console.log("[Synthesize] WAV 大小:", (blob.size / 1024).toFixed(1), "KB");

            // 保存到 IndexedDB
            await saveLocalAudioCache(targetAudioCacheKey, blob);
            void saveCloudTTSAudioCache(targetAudioCacheKey, blob);
            setHasCachedAudio(true);

            // 创建可播放的 URL
            const url = URL.createObjectURL(blob);
            setCachedAudioUrl(url);

            console.log("[Synthesize] ✅ 合成完成并已缓存");
            await saveTTSCardSynthSnapshot(nextSynthSnapshot);
            const nextLocalVersion = await saveLocalTTSCardSynthVersion(card.id, targetAudioCacheKey, nextSynthSnapshot);
            setLocalSynthVersions((prev) => {
                const current = prev ?? [];
                return [nextLocalVersion, ...current.filter((version) => version.cacheKey !== nextLocalVersion.cacheKey)];
            });
            setLegacySynthSnapshot(nextSynthSnapshot);
            setSelectedVersionCacheKey(targetAudioCacheKey);
            triggerSuccess(); // Synthesis Complete
        } catch (err) {
            console.error("[Synthesize] Error", err);
            triggerError();
            window.alert(toHumanReadableSynthesisError(err));
        } finally {
            // 🔓 移除全局合成状态
            synthesizingCardsSet.delete(card.id);
            clearSynthesisProgress(card.id);
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

        // 🪷 记录冥想会话（声波工坊也计入）
        try {
            createMeditationSession({
                topicId: `tts-${card.id}`,
                topicName: card.title || "声波工坊",
            }).catch(e => console.error("Failed to record TTS session", e));
        } catch (e) {
            console.error("Failed to record session", e);
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

        if (bufferTarget > 0 && !isMeteredTTSProvider(ttsSettings.provider)) {
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
                            body: JSON.stringify(buildTTSRequestPayload(item.content, item.voiceId, item.rate)),
                        });
                        if (res && res.ok) {
                            const blob = await res.blob();
                            const arrayBuffer = await blob.arrayBuffer();
                            const buffer = await ctx.decodeAudioData(arrayBuffer);
                            // 直接修改原始对象
                            (item as any).buffer = buffer;
                            // 🔥 关键 fix: 必须同时生成 URL，否则 useEffect 中的 play logic 会跳过它
                            const url = URL.createObjectURL(blob);
                            (item as any).url = url;
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
        primeAudio(); // 🔥 初始化 sharedAudioRef
        setIsPlaying(true);
        isPlayingRef.current = true;


    };

    // 从指定位置开始播放缓存音频
    // 从指定位置开始播放缓存音频
    const playFromPosition = async (startTime: number = 0) => {
        if (!currentAudio) return;
        try {
            await ensureAudioContext();
            currentAudio.currentTime = startTime;
            await currentAudio.play();
            setIsPlaying(true);
            isPlayingRef.current = true;
        } catch (e) {
            console.error("[Play] Seek/Play failed", e);
        }
    };

    // Retry wrapper for fetch
    const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, timeout = 60000) => {
        for (let i = 0; i < retries; i++) {
            try {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(getApiUrl(url), {
                    ...options,
                    signal: controller.signal
                });

                clearTimeout(id);

                if (response.status === 504) {
                    const details = await response.clone().text().catch(() => "");
                    throw createFetchResponseError(response.status, details);
                }

                if (response.status === 502) {
                    const details = await response.clone().text().catch(() => "");
                    const contentType = response.headers.get("content-type") || "";
                    const looksLikeAppJson = contentType.includes("application/json") && details.includes("\"error\"");

                    if (looksLikeAppJson) {
                        const extracted = extractErrorDetails(details);
                        if (isRetryableTTSFailure(createFetchResponseError(response.status, extracted))) {
                            throw createFetchResponseError(response.status, details);
                        }
                        return response;
                    }

                    throw createFetchResponseError(response.status, details);
                }

                if (!response.ok) {
                    // Don't retry client errors (4xx) except 429
                    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                        return response;
                    }
                    const details = await response.clone().text().catch(() => "");
                    throw createFetchResponseError(response.status, details);
                }

                return response;
            } catch (err: any) {
                const isLastAttempt = i === retries - 1;
                console.warn(`[Fetch Retry] Attempt ${i + 1}/${retries} failed:`, err);

                if (isLastAttempt) throw err;

                // Exponential backoff: 1s, 2s, 4s
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
            }
        }
        throw new Error("Max retries exceeded");
    };

    // 跳转到指定位置
    const seekTo = async (time: number) => {
        if (!currentAudio) return;

        // 更新进度条 UI
        setPlaybackProgress(prev => ({ ...prev, currentTime: time }));

        // 操作音频元素
        currentAudio.currentTime = time;

        // 如果当时是暂停状态，不需要自动播放
        // 如果是播放状态，因为 currentTime 改变不会影响 play 状态，通常会自动继续
        // 但安全起见，如果是暂停但我们希望拖动即播放（或者保持状态），这里保留原样即可
    };

    // 播放缓存音频 - 改用 HTMLAudioElement (sharedAudioRef)
    const playCachedAudio = async () => {
        // 先停止任何正在播放的音频
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.src = '';
            setCurrentAudio(null);
        }

        setAudioQueue([]); // 清空流式队列
        currentItemIdRef.current = null;

        // 如果已经有 currentAudio 且是暂停状态，直接恢复
        if (currentAudio && currentAudio.paused && useCachedPlayback) {
            try {
                await ensureAudioContext();
                await currentAudio.play();
                setIsPlaying(true);
                return;
            } catch (e) { console.warn("Resume failed", e); }
        }

        setIsLoadingAudio(true);
        try {
            // 从 IndexedDB 获取缓存
            const cachedBlob = await getLocalAudioCache(audioCacheKey);
            if (!cachedBlob) {
                console.warn("[Play] 缓存不存在，回退到流式播放");
                setIsLoadingAudio(false);
                await startNewPlayback();
                return;
            }

            // 🔥 使用 sharedAudioRef 播放
            const audio = sharedAudioRef.current || new Audio();
            (audio as any).playsInline = true;
            audio.volume = 1;

            const url = URL.createObjectURL(cachedBlob);
            audio.src = url;

            // 重要：设置当前音频引用
            setCurrentAudio(audio);

            // 设置时长和事件监听
            audio.onloadedmetadata = () => {
                const duration = audio.duration;
                setPlaybackProgress({ currentTime: 0, duration: isFinite(duration) ? duration : 0 });
                console.log("[Play] 缓存音频加载完成, 时长:", duration);
                setIsLoadingAudio(false);
            };

            audio.ontimeupdate = () => {
                setPlaybackProgress(prev => ({
                    ...prev,
                    currentTime: audio.currentTime
                }));
            };

            // 📊 统计记录: 创建新的 session
            const sessionIdRef = { current: null as string | null };
            try {
                const data = await createMeditationSession({
                    topicId: `tts-${card.id}`,
                    topicName: `声波工坊 - ${card.title || '未命名'}`,
                });
                if (data?.id) {
                    sessionIdRef.current = data.id;
                    setCurrentSessionId(data.id);
                    console.log('[TTS] Session 开始:', data.id);
                }
            } catch (e) {
                console.error('[TTS] 创建 session 失败', e);
            }

            const cleanup = () => {
                console.log("[Play] 缓存播放结束");
                setIsPlaying(false);
                isPlayingRef.current = false;
                audio.onended = null;
                audio.onerror = null;
                audio.ontimeupdate = null;
                // 不 revoke URL，以便重播
            };

            audio.onended = () => {
                // 🔥 [Safety Margin] Wait 1s before updating UI
                setTimeout(() => {
                    cleanup();
                    setPlaybackProgress(prev => ({ ...prev, currentTime: prev.duration }));

                    // 📊 统计记录: 更新 session 时长
                    const sessionId = sessionIdRef.current;
                    if (sessionId && audio.duration) {
                        const durationSeconds = Math.round(audio.duration);
                        completeMeditationSession(sessionId, durationSeconds).then(() => {
                            console.log('[TTS] Session 结束:', sessionId, `, ${durationSeconds}秒`);
                            setCurrentSessionId(null);
                        }).catch(e => console.error('[TTS] 更新 session 失败', e));
                    }
                }, 1000);
            };

            audio.onerror = (e) => {
                console.error("[Play] 缓存播放错误", e);
                cleanup();
                setIsLoadingAudio(false);
            };

            // 播放
            await ensureAudioContext();
            if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            try {
                // 🔥 等待音频准备好，防 AbortError
                if (audio.readyState < 3) { // HAVE_FUTURE_DATA
                    await new Promise((resolve) => {
                        const onCanPlay = () => {
                            audio.removeEventListener('canplay', onCanPlay);
                            resolve(true);
                        };
                        audio.addEventListener('canplay', onCanPlay);
                    });
                }

                await audio.play();
                setIsPlaying(true);
                isPlayingRef.current = true;
            } catch (e: any) {
                // Ignore AbortError if we are just switching tracks quickly
                if (e.name === 'AbortError') {
                    console.log("[Play] Play aborted (expected during rapid switching)");
                } else {
                    console.error("[Play] 最终播放调用失败", e);
                    setIsPlaying(false);
                }
            }

        } catch (e) {
            console.error("[Play] 准备播放错误", e);
            setIsPlaying(false);
            setIsLoadingAudio(false);
        }
    };

    const togglePlay = async () => {
        if (isTogglingRef.current) return;
        isTogglingRef.current = true;
        triggerLight();

        try {
            await ensureAudioContext();
            console.log("[Play] togglePlay 调用, isPlayingRef:", isPlayingRef.current);

            if (isPlayingRef.current) {
                // PAUSE
                isPlayingRef.current = false;
                setIsPlaying(false);

                // For Web Audio
                if (audioContextRef.current?.state === 'running') {
                    audioContextRef.current.suspend();
                }
                // For HTML Audio
                if (currentAudio) {
                    currentAudio.pause();
                }
            } else {
                // PLAY / RESUME

                // 🔥 Always prime AudioContext in user gesture
                primeAudio();
                const ctx = initAudioContext();
                if (ctx && ctx.state === 'suspended') {
                    await ctx.resume();
                }

                // ✅ 简化逻辑：优先播放缓存音频
                if (hasCachedAudio) {
                    // 如果有 currentAudio 且在暂停状态，恢复播放
                    if (currentAudio && currentAudio.paused && currentAudio.src) {
                        try {
                            await currentAudio.play();
                            setIsPlaying(true);
                            isPlayingRef.current = true;
                            return;
                        } catch (e) {
                            console.error("[Play] Resume failed, starting fresh", e);
                        }
                    }
                    // 否则从头开始播放缓存
                    await playCachedAudio();
                } else if (audioQueue.length > 0) {
                    // Resume Queue Playback
                    setIsPlaying(true);
                    isPlayingRef.current = true;
                }
            }
        } finally {
            // Unlock after a moment to allow UI to settle and prevent bounce
            setTimeout(() => {
                isTogglingRef.current = false;
            }, 300);
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
        // 🌟 采用统计页面模式：外层静态，内容动画
        <motion.div
            className="group relative h-full"
            variants={JELLY_VARIANTS}
            whileHover="hover"
            whileTap="tap"
        >
            <GlassCard
                className={cn(
                    "h-full p-6 transition-all bg-gradient-to-br from-rose-500/[0.05] to-pink-500/[0.05]",
                    "hover:bg-rose-500/10 hover:shadow-lg hover:shadow-rose-500/10"
                )}
                hoverEffect={true}
            >
                {/* 🌟 内容层动画：采用统计页面模式 - opacity + y + index延迟 */}
                <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                        type: "spring",
                        stiffness: 100,
                        damping: 15,
                        delay: index * 0.08
                    }}
                    className="relative"
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
                                    <div className="relative" ref={versionPickerRef}>
                                        {synthModelBadge && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    triggerLight();
                                                    setShowCardMenu(false);
                                                    setShowVersionPicker((prev) => !prev);
                                                }}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-200 hover:bg-cyan-500/14 transition-colors"
                                            >
                                                {synthModelBadge}
                                                <ChevronDown className={cn("w-3 h-3 transition-transform", showVersionPicker && "rotate-180")} />
                                            </button>
                                        )}
                                        <AnimatePresence>
                                            {showVersionPicker && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                                                    className="absolute left-0 top-full mt-2 z-50 w-44 overflow-hidden rounded-[16px] border border-white/10 bg-[rgba(14,18,24,0.82)] shadow-[0_14px_36px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
                                                >
                                                    <div className="max-h-44 overflow-y-auto p-1">
                                                        {versionPickerOptions.map((option) => {
                                                            const isDisabled = !option.synthesized && !option.isCurrentSettings;
                                                            return (
                                                                <button
                                                                    key={option.key}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isDisabled) return;
                                                                        triggerLight();
                                                                        if (option.version) {
                                                                            setSelectedVersionCacheKey(option.version.cacheKey);
                                                                        } else {
                                                                            setSelectedVersionCacheKey(null);
                                                                        }
                                                                        setShowVersionPicker(false);
                                                                    }}
                                                                    disabled={isDisabled}
                                                                    className={cn(
                                                                        "w-full flex items-center justify-between gap-2 rounded-[12px] px-2.5 py-2 text-left transition-colors",
                                                                        option.isSelected
                                                                            ? "bg-cyan-500/16 text-white"
                                                                            : "text-white/88 hover:bg-white/6",
                                                                        isDisabled && "text-white/28 hover:bg-transparent cursor-default"
                                                                    )}
                                                                >
                                                                    <div className="min-w-0 flex items-center gap-2">
                                                                        <span
                                                                            className={cn(
                                                                                "h-1.5 w-1.5 rounded-full shrink-0",
                                                                                option.synthesized
                                                                                    ? "bg-emerald-300"
                                                                                    : "bg-white/18"
                                                                            )}
                                                                        />
                                                                        <div className="min-w-0">
                                                                            <div className="truncate text-[13px] leading-none">{option.label}</div>
                                                                            {(option.isCurrentSettings || option.version) && (
                                                                                <div className="mt-0.5 text-[10px] text-white/34">
                                                                                    {option.isCurrentSettings
                                                                                        ? "当前设置"
                                                                                        : formatLocalSynthVersionTime(option.version!.synthesizedAt)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <span className={cn(
                                                                            "text-[10px]",
                                                                            option.synthesized ? "text-white/54" : "text-white/26"
                                                                        )}>
                                                                            {option.synthesized ? "已合成" : "未合成"}
                                                                        </span>
                                                                        {option.isSelected && <Check className="w-3.5 h-3.5 text-cyan-200" />}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <span
                                        title={priceEstimate.detail}
                                        className={cn(
                                            "px-1.5 py-0.5 rounded border font-medium",
                                            PRICE_BADGE_STYLES[priceEstimate.tone]
                                        )}
                                    >
                                        {priceEstimate.label}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* 菜单按钮 */}
                                <div className="relative">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerMedium();
                                            setShowVersionPicker(false);
                                            setShowCardMenu(!showCardMenu);
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </motion.button>

                                    {/* 下拉菜单 */}
                                    <AnimatePresence>
                                        {showCardMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                className="absolute right-0 top-full mt-1 w-44 py-1 rounded-xl bg-zinc-900/95 border border-white/10 shadow-xl z-50"
                                            >
                                                {/* 合成音频 */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); triggerLight(); synthesizeAndDownload(); }}
                                                    disabled={isSynthesizing}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                                                >
                                                    {isSynthesizing ? (
                                                        <>
                                                            <span className="animate-spin w-4 h-4 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full" />
                                                            <span>{formatSynthesisProgress(synthesizeProgress)}</span>
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowCardMenu(false);
                                                            setDeleteCacheConfirm(true); // 显示确认弹窗
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
                                                            setShowCardMenu(false);
                                                            const blob = await getLocalAudioCache(audioCacheKey);
                                                            if (blob) {
                                                                const filename = `${card.title || '未命名'}_合成音频.wav`;
                                                                // 尝试使用 Web Share API (iOS 支持更好)
                                                                if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'audio/wav' })] })) {
                                                                    try {
                                                                        const file = new File([blob], filename, { type: 'audio/wav' });
                                                                        await navigator.share({ files: [file], title: card.title || '冒想音频' });
                                                                        return;
                                                                    } catch (err: any) {
                                                                        // 用户取消分享或失败，回退到下载
                                                                        if (err.name !== 'AbortError') console.warn('分享失败', err);
                                                                    }
                                                                }
                                                                // 回退: 标准下载 (iOS Safari 可能不工作)
                                                                const url = URL.createObjectURL(blob);
                                                                const a = document.createElement('a');
                                                                a.href = url;
                                                                a.download = filename;
                                                                document.body.appendChild(a);
                                                                a.click();
                                                                document.body.removeChild(a);
                                                                setTimeout(() => URL.revokeObjectURL(url), 100);
                                                            }
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sky-400 hover:bg-white/10 transition-colors"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        <span>下载/分享音频</span>
                                                    </button>
                                                )}

                                                <div className="my-1 border-t border-white/10" />

                                                {/* 沉浸播放 */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowCardMenu(false);
                                                        triggerMedium();
                                                        onView(card, audioCacheKey);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/20 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    <span>沉浸播放</span>
                                                </button>

                                                {/* 编辑 */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setShowCardMenu(false); onEdit(card); }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                    <span>编辑卡片</span>
                                                </button>

                                                {canMove && onMove && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowCardMenu(false); onMove(card); }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                        <span>移动到标签</span>
                                                    </button>
                                                )}

                                                {/* 删除 */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); triggerHeavy(); setShowCardMenu(false); onDelete(card.id); }}
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
                        {/* Content Preview */}
                        <div className="flex-1 min-h-[60px] max-h-[120px] overflow-y-auto custom-scrollbar my-2">
                            <p className="text-sm text-white/70 leading-relaxed font-light whitespace-pre-wrap">
                                {card.content || "暂无文案..."}
                            </p>
                        </div>

                        {/* Control Bar */}
                        <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/5">
                            <motion.button
                                onClick={(e) => { e.stopPropagation(); triggerMedium(); onView(card, audioCacheKey); }}
                                disabled={
                                    isBuffering ||
                                    isSynthesizing ||
                                    !hasCachedAudio
                                }
                                whileTap={{ scale: 0.9 }}
                                className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-full transition-all border",
                                    isSynthesizing
                                        ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300 cursor-wait"
                                        : !hasCachedAudio
                                            ? "bg-zinc-500/20 border-zinc-400/30 text-zinc-400 cursor-not-allowed"
                                            : isBuffering
                                                ? "bg-amber-500/20 border-amber-400/50 text-amber-300 cursor-wait"
                                                : isPlaying
                                                    ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/30"
                                                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                <AnimatePresence mode="wait">
                                    {isSynthesizing ? (
                                        <motion.div
                                            key="synthesizing"
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                            className="flex gap-0.5 items-center justify-center"
                                        >
                                            {[0, 1, 2].map((i) => (
                                                <motion.div
                                                    key={i}
                                                    className="w-1 bg-emerald-400 rounded-full"
                                                    initial={{ height: 4 }}
                                                    animate={{ height: [4, 12, 4] }}
                                                    transition={{
                                                        duration: 0.8,
                                                        repeat: Infinity,
                                                        delay: i * 0.15,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            ))}
                                        </motion.div>
                                    ) : !hasCachedAudio ? (
                                        <motion.div key="music" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                            <Music className="w-4 h-4" />
                                        </motion.div>
                                    ) : isBuffering ? (
                                        <motion.span
                                            key="buffering"
                                            className="animate-spin w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full"
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        />
                                    ) : isLoadingAudio ? (
                                        <motion.span
                                            key="loading"
                                            className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        />
                                    ) : isPlaying ? (
                                        <motion.div
                                            key="pause"
                                            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Pause className="w-4 h-4 fill-current" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="play"
                                            initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
                                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                            exit={{ opacity: 0, scale: 0.5, rotate: -90 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Play className="w-4 h-4 fill-current ml-0.5" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>

                            {/* 🚀 合成进度显示 */}
                            {isSynthesizing && (
                                <div className="flex items-center gap-2 text-xs text-emerald-300/80 animate-pulse">
                                    <span className="font-medium">合成中...</span>
                                    <span className="font-mono">{formatSynthesisProgress(synthesizeProgress)}</span>
                                </div>
                            )}

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
                                        <span className="text-emerald-300">
                                            {isPlaying ? "CACHED ▶" : "CACHED"}
                                        </span>
                                    ) : isSynthesizing ? (
                                        <span className="text-emerald-300">SYNTHESIZING</span>
                                    ) : (
                                        <span className="text-zinc-400">待合成</span>
                                    )}
                                    {/* 时间显示 */}
                                    {playbackProgress.duration > 0 ? (
                                        <span>
                                            {formatTime(playbackProgress.currentTime)} / {formatTime(playbackProgress.duration)}
                                        </span>
                                    ) : (
                                        <span>
                                            {audioDuration && hasCachedAudio ? formatTime(audioDuration) : "--:--"}
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
                </motion.div>
            </GlassCard>

            {/* 删除缓存确认弹窗 (iOS兼容) */}
            <AnimatePresence>
                {deleteCacheConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setDeleteCacheConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm glass-panel rounded-3xl border border-white/10 shadow-2xl p-6 text-center"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <RotateCcw className="w-8 h-8 text-amber-400" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">删除音频缓存</h3>
                            <p className="text-white/60 text-sm mb-6">确定要删除已合成的音频缓存吗？你可以重新合成。</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteCacheConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={async () => {
                                        triggerHeavy();
                                        await deleteLocalAudioCache(audioCacheKey);
                                        if (effectiveCardSettings.provider === "cosyvoice35plus") {
                                            await deleteAudioChunkCaches(audioCacheKey, card.content);
                                        }
                                        await deleteLocalTTSCardSynthVersion(audioCacheKey, card.id).catch(() => undefined);
                                        setLocalSynthVersions((prev) => (prev ?? []).filter((version) => version.cacheKey !== audioCacheKey));
                                        if (selectedVersionCacheKey === audioCacheKey) {
                                            setSelectedVersionCacheKey(null);
                                        }
                                        setHasCachedAudio(false);
                                        setCachedAudioUrl(null);
                                        setDeleteCacheConfirm(false);
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium transition-colors"
                                >
                                    删除
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------
export default function TTSStudioPage() {
    // 使用 SWR 缓存数据
    const { cards: ttsCards, addCard: apiAddCard, patchCard: apiPatchCard, deleteCard: apiDeleteCard, isLoading: isLoadingCards } = useTTSCards();
    const [activeCategory, setActiveCategory] = useState<string>(TTS_STUDIO_ALL_CATEGORY_ID);
    const [activeSubCategory, setActiveSubCategory] = useState<string>(TTS_STUDIO_ALL_CATEGORY_ID);
    const [categoryConfig, setCategoryConfig] = useState<NormalizedTTSStudioCategoryConfig>(
        normalizeTTSStudioCategoryConfig(null)
    );
    const [tagDialogMode, setTagDialogMode] = useState<"root" | "child" | null>(null);
    const [newTagName, setNewTagName] = useState("");
    const [movingCard, setMovingCard] = useState<TTSCard | null>(null);
    const [moveCategoryId, setMoveCategoryId] = useState<string>(TTS_STUDIO_ALL_CATEGORY_ID);
    const [moveSubCategoryId, setMoveSubCategoryId] = useState<string>(TTS_STUDIO_ALL_CATEGORY_ID);

    const studioCategories = useMemo(() => getTTSStudioCategories(categoryConfig), [categoryConfig]);
    const activeCategoryConfig = studioCategories.find((category) => category.id === activeCategory) ?? null;
    const activeCategoryChildren = activeCategoryConfig?.children ?? [];
    const moveCategoryConfig = studioCategories.find((category) => category.id === moveCategoryId) ?? null;
    const moveCategoryChildren = moveCategoryConfig?.children ?? [];
    const ttsCardIds = useMemo(() => new Set(ttsCards.map((card) => card.id)), [ttsCards]);
    const createCategoryAssignment = useMemo(
        () => buildCreateCardCategoryAssignment({
            categoryId: activeCategory,
            subcategoryId: activeSubCategory,
        }),
        [activeCategory, activeSubCategory],
    );

    const saveCategoryConfig = async (nextConfig: NormalizedTTSStudioCategoryConfig) => {
        setCategoryConfig(nextConfig);
        await saveLocalSingleton("user_settings", LOCAL_TTS_STUDIO_CATEGORIES_ID, nextConfig);
    };

    const handleCategoryChange = (category: string) => {
        setActiveCategory(category);
        setActiveSubCategory(TTS_STUDIO_ALL_CATEGORY_ID);
    };

    const createLocalCategoryId = (prefix: "tag" | "subtag") => {
        if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
            return `custom-${prefix}-${crypto.randomUUID()}`;
        }
        return `custom-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    };

    const openTagDialog = (mode: "root" | "child") => {
        setTagDialogMode(mode);
        setNewTagName("");
    };

    const handleCreateTag = async () => {
        const label = newTagName.trim();
        if (!label || !tagDialogMode) return;

        const nextConfig =
            tagDialogMode === "root"
                ? addTTSStudioCategory(categoryConfig, label, () => createLocalCategoryId("tag"))
                : addTTSStudioSubcategory(categoryConfig, activeCategory, label, () => createLocalCategoryId("subtag"));
        await saveCategoryConfig(nextConfig);

        const nextCategories = getTTSStudioCategories(nextConfig);
        if (tagDialogMode === "root") {
            const created = nextConfig.customCategories[nextConfig.customCategories.length - 1];
            if (created) {
                setActiveCategory(created.id);
                setActiveSubCategory(TTS_STUDIO_ALL_CATEGORY_ID);
            }
        } else {
            const createdChild = nextCategories
                .find((category) => category.id === activeCategory)
                ?.children?.at(-1);
            if (createdChild) {
                setActiveSubCategory(createdChild.id);
            }
        }

        setTagDialogMode(null);
        setNewTagName("");
    };

    const handleOpenMoveCard = (card: TTSCard) => {
        setMovingCard(card);
        setMoveCategoryId(card.category_id || TTS_STUDIO_ALL_CATEGORY_ID);
        setMoveSubCategoryId(card.subcategory_id || TTS_STUDIO_ALL_CATEGORY_ID);
    };

    const handleMoveCard = async () => {
        if (!movingCard) return;
        const patch = buildCreateCardCategoryAssignment({
            categoryId: moveCategoryId,
            subcategoryId: moveSubCategoryId,
        });
        await apiPatchCard(movingCard.id, {
            category_id: patch.category_id ?? null,
            subcategory_id: patch.subcategory_id ?? null,
        });
        setMovingCard(null);
    };
    const [ttsProvider, setTTSProvider] = useState<TTSProvider>(DEFAULT_TTS_PROVIDER);
    const [cosyvoiceSpeed, setCosyvoiceSpeed] = useState<number>(COSYVOICE_PROFILE.speed);
    const [cosyvoiceInstruction, setCosyvoiceInstruction] = useState<string>(COSYVOICE_PROFILE.instruction);
    const [cosyvoiceSeed, setCosyvoiceSeed] = useState<number>(COSYVOICE_PROFILE.seed);
    const [cosyvoiceVoiceId, setCosyvoiceVoiceId] = useState<CosyVoiceVoiceId>(DEFAULT_COSYVOICE_VOICE_ID);// 🚀 iOS 性能优化：延迟动画启动，等待页面完成静态渲染
    const [mimoTTSModel, setMimoTTSModel] = useState<MimoTTSModel>(DEFAULT_MIMO_TTS_MODEL);
    const [mimoTTSVoice, setMimoTTSVoice] = useState<MimoTTSVoice>(DEFAULT_MIMO_TTS_VOICE);
    const [mimoTTSInstruction, setMimoTTSInstruction] = useState<string>(DEFAULT_MIMO_TTS_INSTRUCTION);
    const [mimoTTSVoiceDesignPrompt, setMimoTTSVoiceDesignPrompt] = useState<string>(DEFAULT_MIMO_TTS_VOICE_DESIGN_PROMPT);
    const [mimoTTSCloneVoiceUrl, setMimoTTSCloneVoiceUrl] = useState<string>(DEFAULT_MIMO_TTS_CLONE_VOICE_URL);
    const [cosyvoice35PlusModel, setCosyvoice35PlusModel] = useState(DEFAULT_COSYVOICE_35_PLUS_MODEL);
    const [cosyvoice35PlusVoiceId, setCosyvoice35PlusVoiceId] = useState(DEFAULT_COSYVOICE_35_PLUS_VOICE_ID);
    const [cosyvoice35FlashVoiceId, setCosyvoice35FlashVoiceId] = useState(DEFAULT_COSYVOICE_35_FLASH_VOICE_ID);
    const [cosyvoice35PlusVoiceProfileId, setCosyvoice35PlusVoiceProfileId] = useState<CosyVoiceVoiceId>(DEFAULT_COSYVOICE_35_PLUS_VOICE_PROFILE_ID);
    const [cosyvoice35PlusSpeed, setCosyvoice35PlusSpeed] = useState(DEFAULT_COSYVOICE_35_PLUS_SPEED);
    const [cosyvoice35PlusInstruction, setCosyvoice35PlusInstruction] = useState(DEFAULT_COSYVOICE_35_PLUS_INSTRUCTION);
    const [cosyvoice35PlusLanguageHint, setCosyvoice35PlusLanguageHint] = useState(DEFAULT_COSYVOICE_35_PLUS_LANGUAGE_HINT);
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        // 使用 requestAnimationFrame 确保在下一帧启动动画
        const raf = requestAnimationFrame(() => {
            setIsMounted(true);
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const savedConfig = await getLocalSingleton(
                    "user_settings",
                    LOCAL_TTS_STUDIO_CATEGORIES_ID,
                    normalizeTTSStudioCategoryConfig(null),
                );
                setCategoryConfig(normalizeTTSStudioCategoryConfig(savedConfig));
            } catch {
                setCategoryConfig(normalizeTTSStudioCategoryConfig(null));
            }
        })();
    }, []);

    useEffect(() => {
        if (
            moveSubCategoryId !== TTS_STUDIO_ALL_CATEGORY_ID &&
            !moveCategoryChildren.some((child) => child.id === moveSubCategoryId)
        ) {
            setMoveSubCategoryId(TTS_STUDIO_ALL_CATEGORY_ID);
        }
    }, [moveCategoryChildren, moveSubCategoryId]);

    useEffect(() => {
        (async () => {
            try {
                const data = await getLocalSingleton("user_settings", LOCAL_TTS_SETTINGS_ID, normalizeTTSSettings({
                    provider: ttsProvider,
                    cosyvoiceSpeed,
                    cosyvoiceInstruction,
                    cosyvoiceSeed,
                    cosyvoiceVoiceId,
                    mimoTTSModel,
                    mimoTTSVoice,
                    mimoTTSInstruction,
                    mimoTTSVoiceDesignPrompt,
                    mimoTTSCloneVoiceUrl,
                    cosyvoice35PlusModel,
                    cosyvoice35PlusVoiceId,
                    cosyvoice35FlashVoiceId,
                    cosyvoice35PlusVoiceProfileId,
                    cosyvoice35PlusSpeed,
                    cosyvoice35PlusInstruction,
                    cosyvoice35PlusLanguageHint,
                }));
                if (isTTSProvider(data?.provider)) {
                    setTTSProvider(data.provider);
                }
                if (typeof data?.cosyvoiceSpeed === "number") {
                    setCosyvoiceSpeed(data.cosyvoiceSpeed);
                }
                if (typeof data?.cosyvoiceInstruction === "string") {
                    setCosyvoiceInstruction(data.cosyvoiceInstruction);
                }
                if (typeof data?.cosyvoiceSeed === "number") {
                    setCosyvoiceSeed(data.cosyvoiceSeed);
                }
                if (data?.cosyvoiceVoiceId === "yupinglu" || data?.cosyvoiceVoiceId === "tea") {
                    setCosyvoiceVoiceId(data.cosyvoiceVoiceId);
                }
                if (isMimoTTSModel(data?.mimoTTSModel)) {
                    setMimoTTSModel(data.mimoTTSModel);
                }
                if (isMimoTTSVoice(data?.mimoTTSVoice)) {
                    setMimoTTSVoice(data.mimoTTSVoice);
                }
                if (typeof data?.mimoTTSInstruction === "string") {
                    setMimoTTSInstruction(data.mimoTTSInstruction);
                }
                if (typeof data?.mimoTTSVoiceDesignPrompt === "string") {
                    setMimoTTSVoiceDesignPrompt(data.mimoTTSVoiceDesignPrompt);
                }
                if (typeof data?.mimoTTSCloneVoiceUrl === "string") {
                    setMimoTTSCloneVoiceUrl(data.mimoTTSCloneVoiceUrl);
                }
                if (isCosyVoice35Model(data?.cosyvoice35PlusModel)) {
                    setCosyvoice35PlusModel(data.cosyvoice35PlusModel);
                }
                if (typeof data?.cosyvoice35PlusVoiceId === "string") {
                    setCosyvoice35PlusVoiceId(data.cosyvoice35PlusVoiceId);
                }
                if (typeof data?.cosyvoice35FlashVoiceId === "string") {
                    setCosyvoice35FlashVoiceId(data.cosyvoice35FlashVoiceId);
                }
                if (data?.cosyvoice35PlusVoiceProfileId === "yupinglu" || data?.cosyvoice35PlusVoiceProfileId === "tea") {
                    setCosyvoice35PlusVoiceProfileId(data.cosyvoice35PlusVoiceProfileId);
                }
                if (typeof data?.cosyvoice35PlusSpeed === "number") {
                    setCosyvoice35PlusSpeed(data.cosyvoice35PlusSpeed);
                }
                if (typeof data?.cosyvoice35PlusInstruction === "string") {
                    setCosyvoice35PlusInstruction(data.cosyvoice35PlusInstruction);
                }
                if (isCosyVoice35PlusLanguageHint(data?.cosyvoice35PlusLanguageHint)) {
                    setCosyvoice35PlusLanguageHint(data.cosyvoice35PlusLanguageHint);
                }
            } catch { }
        })();
    }, []);

    useEffect(() => {
        const handleTTSProviderChanged = (event: Event) => {
            const detail = (event as CustomEvent<Partial<TTSSettings>>).detail || {};
            if (isTTSProvider(detail.provider)) {
                setTTSProvider(detail.provider);
            }
            if (typeof detail.cosyvoiceSpeed === "number") {
                setCosyvoiceSpeed(detail.cosyvoiceSpeed);
            }
            if (typeof detail.cosyvoiceInstruction === "string") {
                setCosyvoiceInstruction(detail.cosyvoiceInstruction);
            }
            if (typeof detail.cosyvoiceSeed === "number") {
                setCosyvoiceSeed(detail.cosyvoiceSeed);
            }
            if (detail.cosyvoiceVoiceId === "yupinglu" || detail.cosyvoiceVoiceId === "tea") {
                setCosyvoiceVoiceId(detail.cosyvoiceVoiceId);
            }
            if (isMimoTTSModel(detail.mimoTTSModel)) {
                setMimoTTSModel(detail.mimoTTSModel);
            }
            if (isMimoTTSVoice(detail.mimoTTSVoice)) {
                setMimoTTSVoice(detail.mimoTTSVoice);
            }
            if (typeof detail.mimoTTSInstruction === "string") {
                setMimoTTSInstruction(detail.mimoTTSInstruction);
            }
            if (typeof detail.mimoTTSVoiceDesignPrompt === "string") {
                setMimoTTSVoiceDesignPrompt(detail.mimoTTSVoiceDesignPrompt);
            }
            if (typeof detail.mimoTTSCloneVoiceUrl === "string") {
                setMimoTTSCloneVoiceUrl(detail.mimoTTSCloneVoiceUrl);
            }
            if (isCosyVoice35Model(detail.cosyvoice35PlusModel)) {
                setCosyvoice35PlusModel(detail.cosyvoice35PlusModel);
            }
            if (typeof detail.cosyvoice35PlusVoiceId === "string") {
                setCosyvoice35PlusVoiceId(detail.cosyvoice35PlusVoiceId);
            }
            if (typeof detail.cosyvoice35FlashVoiceId === "string") {
                setCosyvoice35FlashVoiceId(detail.cosyvoice35FlashVoiceId);
            }
            if (detail.cosyvoice35PlusVoiceProfileId === "yupinglu" || detail.cosyvoice35PlusVoiceProfileId === "tea") {
                setCosyvoice35PlusVoiceProfileId(detail.cosyvoice35PlusVoiceProfileId);
            }
            if (typeof detail.cosyvoice35PlusSpeed === "number") {
                setCosyvoice35PlusSpeed(detail.cosyvoice35PlusSpeed);
            }
            if (typeof detail.cosyvoice35PlusInstruction === "string") {
                setCosyvoice35PlusInstruction(detail.cosyvoice35PlusInstruction);
            }
            if (isCosyVoice35PlusLanguageHint(detail.cosyvoice35PlusLanguageHint)) {
                setCosyvoice35PlusLanguageHint(detail.cosyvoice35PlusLanguageHint);
            }
        };

        window.addEventListener("tts-provider-changed", handleTTSProviderChanged as EventListener);
        return () => {
            window.removeEventListener("tts-provider-changed", handleTTSProviderChanged as EventListener);
        };
    }, []);

    const ttsSettings = normalizeTTSSettings({
        provider: ttsProvider,
        cosyvoiceSpeed,
        cosyvoiceInstruction,
        cosyvoiceSeed,
        cosyvoiceVoiceId,
        mimoTTSModel,
        mimoTTSVoice,
        mimoTTSInstruction,
        mimoTTSVoiceDesignPrompt,
        mimoTTSCloneVoiceUrl,
        cosyvoice35PlusModel,
        cosyvoice35PlusVoiceId,
        cosyvoice35FlashVoiceId,
        cosyvoice35PlusVoiceProfileId,
        cosyvoice35PlusSpeed,
        cosyvoice35PlusInstruction,
        cosyvoice35PlusLanguageHint,
    });

    const [editingCard, setEditingCard] = useState<TTSCard | null>(null);
    // 👁️ 阅读模式：查看完整文案（只读）
    const [viewingCard, setViewingCard] = useState<TTSCard | null>(null);

    const [editTitle, setEditTitle] = useState("");

    const [editContent, setEditContent] = useState("");
    const [editVoiceId, setEditVoiceId] = useState(VOICES[0].id);
    const [isSaving, setIsSaving] = useState(false);

    // AI 生成相关状态 (for edit modal)
    const [aiPromptEdit, setAiPromptEdit] = useState("");
    const [aiGeneratingEdit, setAiGeneratingEdit] = useState(false);
    const [aiDurationEdit, setAiDurationEdit] = useState<number>(5); // 目标时长（分钟）
    const [guidanceLevelEdit, setGuidanceLevelEdit] = useState<'light' | 'medium' | 'heavy'>('medium');

    // 🎵 沉浸式播放器状态
    const [playerCard, setPlayerCard] = useState<TTSCard | null>(null);
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [playerIsPlaying, setPlayerIsPlaying] = useState(false);
    const [playerCurrentTime, setPlayerCurrentTime] = useState(0);
    const [playerDuration, setPlayerDuration] = useState(0);
    const [playerCurrentText, setPlayerCurrentText] = useState("");

    // 🌿 白噪音/环境音（复用冥想页面的 hook）
    const {
        activeTracks,
        trackVolumes,
        masterVolume,
        setMasterVolume,
        toggleTrack,
        setTrackVolume,
        stopAll: stopAllAmbient,
    } = useWhiteNoise();

    // 🎵 沉浸式播放器：音频引擎
    const playerAudioRef = useRef<HTMLAudioElement | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null); // Use state to trigger re-render
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    const shouldBypassPlayerWebAudio = () => {
        if (typeof window === "undefined") return false;
        return shouldBypassWebAudioForBackgroundPlayback({
            userAgent: window.navigator.userAgent,
            displayModeStandalone: window.matchMedia?.("(display-mode: standalone)")?.matches ?? false,
            navigatorStandalone: (window.navigator as any).standalone === true,
            capacitorNative: (window as any).Capacitor?.isNativePlatform?.() === true,
        });
    };

    // 初始化音频引擎
    useEffect(() => {
        if (!playerAudioRef.current) {
            playerAudioRef.current = new Audio();
            playerAudioRef.current.crossOrigin = "anonymous";
            // iOS needs a plain media element path to keep background playback alive in PWA mode.
            (playerAudioRef.current as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
            playerAudioRef.current.preload = "auto";
        }

        const audio = playerAudioRef.current;

        const handleTimeUpdate = () => {
            setPlayerCurrentTime(audio.currentTime);
            if (playerCard?.content) {
                // Update logic if needed
            }
        };

        const handleLoadedMetadata = () => {
            setPlayerDuration(audio.duration);
        };

        const handleEnded = () => {
            setPlayerIsPlaying(false);
            setPlayerCurrentTime(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
            audio.pause();
        };
    }, [playerCard]);

    // 初始化 Web Audio API (在首次用户交互后)
    const initAudioContext = () => {
        if (shouldBypassPlayerWebAudio()) {
            setAnalyser(null);
            return null;
        }
        if (!audioCtxRef.current && playerAudioRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            const analyserNode = ctx.createAnalyser();
            analyserNode.fftSize = 256;

            const source = ctx.createMediaElementSource(playerAudioRef.current);
            source.connect(analyserNode);
            analyserNode.connect(ctx.destination);

            audioCtxRef.current = ctx;
            setAnalyser(analyserNode);
            sourceRef.current = source;
        } else if (audioCtxRef.current?.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    useEffect(() => {
        if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

        if (!playerCard || !isPlayerOpen) {
            navigator.mediaSession.playbackState = "none";
            return;
        }

        navigator.mediaSession.metadata = new MediaMetadata({
            title: playerCard.title || "声波工坊",
            artist: "Rain",
            album: "声波工坊",
        });
        navigator.mediaSession.playbackState = playerIsPlaying ? "playing" : "paused";
        navigator.mediaSession.setActionHandler("play", () => {
            playerAudioRef.current?.play().then(() => setPlayerIsPlaying(true)).catch(() => { });
        });
        navigator.mediaSession.setActionHandler("pause", () => {
            playerAudioRef.current?.pause();
            setPlayerIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler("seekto", (details) => {
            if (typeof details.seekTime === "number") {
                if (!playerAudioRef.current) return;
                playerAudioRef.current.currentTime = details.seekTime;
                setPlayerCurrentTime(details.seekTime);
            }
        });

        return () => {
            try {
                navigator.mediaSession.setActionHandler("play", null);
                navigator.mediaSession.setActionHandler("pause", null);
                navigator.mediaSession.setActionHandler("seekto", null);
            } catch { }
        };
    }, [isPlayerOpen, playerCard, playerIsPlaying]);

    // 播放卡片逻辑
    const handlePlayCard = async (card: TTSCard, preferredCacheKey?: string) => {
        const ambientPreset = getDefaultTTSStudioAmbientPreset(activeTracks);
        for (const track of ambientPreset) {
            toggleTrack(track.id);
            setTrackVolume(track.id, track.volume);
        }

        setPlayerCard(card);
        setPlayerDuration(0);
        setPlayerCurrentTime(0);
        setPlayerIsPlaying(false);
        setPlayerCurrentText(card.title || "Ready");

        // Open player first
        setIsPlayerOpen(true);

        // Init context needs user gesture, may need to be called in the click handler directly or here
        initAudioContext();

        // 尝试获取缓存并播放
        try {
            const [localVersions, legacySnapshot] = await Promise.all([
                listLocalTTSCardSynthVersions(card.id).catch(() => []),
                getLocalLegacyTTSCardSynthSnapshot(card.id).catch(() => null),
            ]);
            const resolvedVersion = resolveLocalTTSCardVersion({
                card,
                settings: ttsSettings,
                localVersions,
                selectedVersionCacheKey: preferredCacheKey ?? null,
                legacySnapshot,
            });
            const cacheKey =
                preferredCacheKey && resolvedVersion.compatibleVersions.some((version) => version.cacheKey === preferredCacheKey)
                    ? preferredCacheKey
                    : resolvedVersion.cacheKey;
            const blob = await getLocalAudioCache(cacheKey);
            if (blob && playerAudioRef.current) {
                const url = URL.createObjectURL(blob);
                playerAudioRef.current.src = url;
                // Wait for unified animation flow (0.8s)
                setTimeout(() => {
                    playerAudioRef.current?.play()
                        .then(() => setPlayerIsPlaying(true))
                        .catch(e => console.error("Playback failed", e));
                }, 800);

                setPlayerCurrentText("正在播放...");
            } else {
                setPlayerCurrentText("未找到音频缓存，请先在列表中点击播放以合成");
            }
        } catch (error) {
            console.error("Failed to load audio cache", error);
            setPlayerCurrentText("加载音频失败");
        }
    };

    // 播放控制
    const togglePlayPause = () => {
        if (!playerAudioRef.current) return;
        if (playerIsPlaying) {
            playerAudioRef.current.pause();
            setPlayerIsPlaying(false);
        } else {
            initAudioContext();
            playerAudioRef.current.play();
            setPlayerIsPlaying(true);
        }
    };

    const handleSeek = (time: number) => {
        if (!playerAudioRef.current) return;
        playerAudioRef.current.currentTime = time;
        setPlayerCurrentTime(time);
    };

    const displayCards = useMemo(() => {
        const userCards = filterTTSStudioCardsBySelection(ttsCards, {
            categoryId: activeCategory,
            subcategoryId: activeSubCategory,
        });
        let builtInCards: TTSCard[] = [];
        if (activeCategory === 'desire-game') builtInCards = DESIRE_GAME_CARDS;
        else if (activeCategory === 'rain') builtInCards = RAIN_CARDS;
        else if (activeCategory === 'rain-advanced') builtInCards = RAIN_ADVANCED_CARDS;
        else if (activeCategory === 'emotion-anxiety') builtInCards = EMOTION_ANXIETY_CARDS;
        else if (activeCategory === 'emotion-body-scan') builtInCards = EMOTION_BODY_SCAN_CARDS;

        if (activeSubCategory !== TTS_STUDIO_ALL_CATEGORY_ID) {
            builtInCards = activeCategory === 'emotion-body-scan' ? builtInCards.filter(card => {
                const title = card.title || "";
                if (activeSubCategory === 'quick') return title.includes('⚡');
                if (activeSubCategory === 'basic') return title.includes('⚖️') || title.includes('🧘‍♀️');
                if (activeSubCategory === 'deep') return title.includes('🌌') || title.includes('🛡️') || title.includes('🌬️');
                if (activeSubCategory === 'sleep') return title.includes('💤');
                if (activeSubCategory === 'visual') return title.includes('🌿');
                if (activeSubCategory === 'active') return title.includes('🏃');
                return false;
            }) : [];
        }
        return [...userCards, ...builtInCards];
    }, [activeCategory, activeSubCategory, ttsCards]);

    const handlePrev = () => {
        if (!playerCard) return;
        const currentIndex = displayCards.findIndex(c => c.id === playerCard.id);
        if (currentIndex > 0) {
            handlePlayCard(displayCards[currentIndex - 1]);
        }
    };

    const handleNext = () => {
        if (!playerCard) return;
        const currentIndex = displayCards.findIndex(c => c.id === playerCard.id);
        if (currentIndex < displayCards.length - 1) {
            handlePlayCard(displayCards[currentIndex + 1]);
        }
    };

    // 删除确认弹窗状态（替代 iOS 不支持的 confirm）
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        // 使用自定义确认弹窗代替 confirm()，因为 iOS WebView 不支持
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        await apiDeleteCard(deleteConfirmId);
        await deleteLocalTTSCardSynthVersionsForCard(deleteConfirmId).catch(() => undefined);
        await deleteTTSCardSynthSnapshot(deleteConfirmId).catch(() => undefined);
        setDeleteConfirmId(null);
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

        const { totalSeconds } = buildAIGenerationTargets(aiDurationEdit, guidanceLevelEdit);

        // Auto-fill title if empty
        if (!editTitle.trim()) {
            setEditTitle(aiPromptEdit);
        }

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: aiPromptEdit,
                    duration: aiDurationEdit,
                    guidanceLevel: guidanceLevelEdit,
                }),
            });

            if (!response.ok) throw new Error("生成失败");

            const streamState = await readGenerateResponseStream(response, {
                onText: setEditContent,
            });
            const shortGenerationMessage = getShortGenerationMessage(streamState.text, totalSeconds);
            if (shortGenerationMessage) {
                window.alert(shortGenerationMessage);
            }
        } catch (e) {
            console.error("AI 生成失败:", e);
            window.alert(e instanceof Error ? e.message : "生成失败，请重试...");
        } finally {
            setAiGeneratingEdit(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingCard) return;
        setIsSaving(true);
        try {
            const res = await apiPatchCard(editingCard.id, {
                title: editTitle,
                content: editContent,
                voice_id: editVoiceId,
                guidance_level: guidanceLevelEdit,
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
                <motion.div
                    className="relative z-10 max-w-6xl mx-auto px-6 py-12 pt-24 pb-32 min-h-screen"
                    initial={{ y: 20 }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                    <header className="mb-8">
                        <h1 className="text-3xl font-thin text-white/90">声波工坊</h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2, duration: 1 }}
                            className="text-white/40 mt-2 font-light"
                        >
                            Text to Speech Studio
                        </motion.p>
                    </header>

                    {/* 🔥 新建卡片 - 无入场动画 */}
                    <div>
                        <GlassInput
                            onAddCard={(card) => apiAddCard({
                                ...card,
                                ...createCategoryAssignment,
                            })}
                        />
                    </div>

                    {/* 分类标签 */}
                    <div className="flex gap-4 mt-8 mb-6 px-1 overflow-x-auto pb-2 scrollbar-hide [-webkit-overflow-scrolling:touch]">
                        <button 
                            onClick={() => handleCategoryChange(TTS_STUDIO_ALL_CATEGORY_ID)} 
                            className={cn(
                                "px-5 py-2.5 rounded-full text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap",
                                activeCategory === TTS_STUDIO_ALL_CATEGORY_ID
                                    ? TTS_STUDIO_CATEGORY_TONE_CLASSES.neutral.active
                                    : TTS_STUDIO_CATEGORY_TONE_CLASSES.neutral.idle
                            )}
                        >
                            全部语料
                        </button>
                        {studioCategories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => handleCategoryChange(category.id)}
                                className={cn(
                                    "px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0 whitespace-nowrap",
                                    activeCategory === category.id
                                        ? TTS_STUDIO_CATEGORY_TONE_CLASSES[category.tone].active
                                        : TTS_STUDIO_CATEGORY_TONE_CLASSES[category.tone].idle
                                )}
                            >
                                <span>{category.icon}</span> {category.label}
                            </button>
                        ))}
                        <button
                            onClick={() => openTagDialog("root")}
                            className="px-4 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 flex-shrink-0 whitespace-nowrap border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                        >
                            <Plus className="w-4 h-4" />
                            新建标签
                        </button>
                    </div>

                    {/* Secondary Navigation */}
                    <AnimatePresence>
                        {activeCategoryConfig && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="flex overflow-x-auto pb-2 scrollbar-hide space-x-2 [-webkit-overflow-scrolling:touch]"
                            >
                                <button
                                    onClick={() => setActiveSubCategory(TTS_STUDIO_ALL_CATEGORY_ID)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 whitespace-nowrap",
                                        activeSubCategory === TTS_STUDIO_ALL_CATEGORY_ID
                                            ? TTS_STUDIO_CATEGORY_TONE_CLASSES[activeCategoryConfig.tone].subActive
                                            : TTS_STUDIO_CATEGORY_TONE_CLASSES[activeCategoryConfig.tone].subIdle
                                    )}
                                >
                                    全部
                                </button>
                                {activeCategoryChildren.map((child) => (
                                    <button
                                        key={child.id}
                                        onClick={() => setActiveSubCategory(child.id)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 whitespace-nowrap",
                                            activeSubCategory === child.id
                                                ? TTS_STUDIO_CATEGORY_TONE_CLASSES[activeCategoryConfig.tone].subActive
                                                : TTS_STUDIO_CATEGORY_TONE_CLASSES[activeCategoryConfig.tone].subIdle
                                        )}
                                    >
                                        {child.icon} {child.label}
                                    </button>
                                ))}
                                <button
                                    onClick={() => openTagDialog("child")}
                                    className="px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap border border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white/80"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    二级标签
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <AnimatePresence mode="wait">
                            {isLoadingCards && activeCategory === 'all' ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center py-20 text-white/20"
                                >
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500 mb-4" />
                                    <p className="text-sm font-light">正在加载语料库...</p>
                                </motion.div>
                            ) : displayCards.length === 0 ? (
                                <motion.div
                                    key="empty"
                                    variants={ITEM_VARIANTS}
                                    initial="hidden"
                                    animate="show"
                                    className="text-center py-20 text-white/20 border border-dashed border-rose-200/10 rounded-3xl"
                                >
                                    <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                    <p className="text-sm font-light">这里空空如也，试着创建一个新的语音卡片吧。</p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="grid"
                                    variants={CONTAINER_VARIANTS}
                                    initial="hidden"
                                    animate={isMounted ? "show" : "hidden"}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                >
                                    {displayCards.map((card: TTSCard, index: number) => (
                                        <TTSCardItem
                                            key={card.id}
                                            card={card}
                                            onDelete={handleDelete}
                                            onEdit={handleEdit}
                                            onMove={handleOpenMoveCard}
                                            onView={(c, preferredCacheKey) => handlePlayCard(c, preferredCacheKey)}
                                            ttsSettings={ttsSettings}
                                            index={index}
                                            canMove={ttsCardIds.has(card.id)}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Edit Modal */}
                <AnimatePresence>
                    {editingCard && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
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
                                                    {AI_DURATION_OPTIONS.map((duration) => (
                                                        <option key={duration} value={duration} className="bg-zinc-800">
                                                            {duration}分钟
                                                        </option>
                                                    ))}
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

                {/* 👁️ 阅读模式弹窗 (Read-Only Modal) */}
                <AnimatePresence>
                    {viewingCard && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setViewingCard(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-zinc-900/90 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[80vh]"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                                    <h3 className="text-lg font-medium text-white/90 truncate pr-4">
                                        {viewingCard.title || "未命名文案"}
                                    </h3>
                                    <button
                                        onClick={() => setViewingCard(null)}
                                        className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Content Scroll Area */}
                                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                    <p className="text-base text-white/80 leading-loose whitespace-pre-wrap font-light tracking-wide">
                                        {viewingCard.content}
                                    </p>
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 border-t border-white/5 bg-black/20 flex justify-end">
                                    <button
                                        onClick={() => {
                                            setViewingCard(null);
                                            handleEdit(viewingCard);
                                        }}
                                        className="text-xs text-white/30 hover:text-white/60 transition-colors mr-auto self-center"
                                    >
                                        需要修改?
                                    </button>
                                    <button
                                        onClick={() => setViewingCard(null)}
                                        className="px-6 py-2 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors"
                                    >
                                        关闭
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 标签创建弹窗 */}
                <AnimatePresence>
                    {tagDialogMode && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/55 backdrop-blur-md"
                            onClick={() => setTagDialogMode(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.94, opacity: 0, y: 12 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.94, opacity: 0, y: 12 }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 p-5 shadow-2xl backdrop-blur-2xl"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-medium text-cyan-200/70">
                                            {tagDialogMode === "root" ? "一级标签" : activeCategoryConfig ? `二级标签 · ${activeCategoryConfig.label}` : "二级标签"}
                                        </div>
                                        <h3 className="mt-1 text-lg font-semibold text-white">
                                            {tagDialogMode === "root" ? "新建标签" : "新建二级标签"}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setTagDialogMode(null)}
                                        className="rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white"
                                        aria-label="关闭标签弹窗"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <input
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") void handleCreateTag();
                                    }}
                                    autoFocus
                                    placeholder={tagDialogMode === "root" ? "例如：睡前练习" : "例如：雨天、晨间、复盘"}
                                    className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-cyan-300/30 focus:ring-2 focus:ring-cyan-300/10"
                                />

                                <div className="mt-5 flex justify-end gap-2">
                                    <button
                                        onClick={() => setTagDialogMode(null)}
                                        className="rounded-xl bg-white/5 px-4 py-2 text-sm text-white/65 hover:bg-white/10 hover:text-white"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={() => void handleCreateTag()}
                                        disabled={!newTagName.trim()}
                                        className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/20 disabled:bg-white/10 disabled:text-white/25"
                                    >
                                        创建
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 移动卡片弹窗 */}
                <AnimatePresence>
                    {movingCard && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/55 backdrop-blur-md"
                            onClick={() => setMovingCard(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.94, opacity: 0, y: 12 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.94, opacity: 0, y: 12 }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 p-5 shadow-2xl backdrop-blur-2xl"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-medium text-cyan-200/70">移动卡片</div>
                                        <h3 className="mt-1 text-lg font-semibold text-white line-clamp-1">
                                            {movingCard.title || "未命名卡片"}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setMovingCard(null)}
                                        className="rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white"
                                        aria-label="关闭移动弹窗"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="mt-5 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-white/45">一级标签</label>
                                        <select
                                            value={moveCategoryId}
                                            onChange={(e) => {
                                                setMoveCategoryId(e.target.value);
                                                setMoveSubCategoryId(TTS_STUDIO_ALL_CATEGORY_ID);
                                            }}
                                            className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-white outline-none focus:border-cyan-300/30"
                                        >
                                            <option value={TTS_STUDIO_ALL_CATEGORY_ID} className="bg-zinc-900">全部语料</option>
                                            {studioCategories.map((category) => (
                                                <option key={category.id} value={category.id} className="bg-zinc-900">
                                                    {category.icon} {category.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-white/45">二级标签</label>
                                        <select
                                            value={moveSubCategoryId}
                                            onChange={(e) => setMoveSubCategoryId(e.target.value)}
                                            disabled={moveCategoryId === TTS_STUDIO_ALL_CATEGORY_ID || moveCategoryChildren.length === 0}
                                            className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-white outline-none focus:border-cyan-300/30 disabled:opacity-45"
                                        >
                                            <option value={TTS_STUDIO_ALL_CATEGORY_ID} className="bg-zinc-900">不指定二级标签</option>
                                            {moveCategoryChildren.map((child) => (
                                                <option key={child.id} value={child.id} className="bg-zinc-900">
                                                    {child.icon} {child.label}
                                                </option>
                                            ))}
                                        </select>
                                        {moveCategoryId !== TTS_STUDIO_ALL_CATEGORY_ID && moveCategoryChildren.length === 0 && (
                                            <p className="text-xs text-white/35">这个一级标签下还没有二级标签。</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-5 flex justify-end gap-2">
                                    <button
                                        onClick={() => setMovingCard(null)}
                                        className="rounded-xl bg-white/5 px-4 py-2 text-sm text-white/65 hover:bg-white/10 hover:text-white"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={() => void handleMoveCard()}
                                        className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/20 hover:bg-cyan-300"
                                    >
                                        移动
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 删除确认弹窗 (iOS WebView 兼容) */}
                <AnimatePresence>
                    {deleteConfirmId && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setDeleteConfirmId(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-sm glass-panel rounded-3xl border border-white/10 shadow-2xl p-6 text-center"
                            >
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center">
                                    <Trash2 className="w-8 h-8 text-rose-400" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">确认删除</h3>
                                <p className="text-white/60 text-sm mb-6">确定要删除这张卡片吗？此操作无法撤销。</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-medium transition-colors"
                                    >
                                        删除
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🎵 沉浸式播放器 */}
                <TTSStudioPlayer
                    isOpen={isPlayerOpen}
                    title={playerCard?.title || ""}
                    currentText={playerCurrentText}
                    fullText={playerCard?.content || ""}
                    isPlaying={playerIsPlaying}
                    isLoading={false}
                    currentTime={playerCurrentTime}
                    duration={playerDuration}
                    onPlayPause={togglePlayPause}
                    onSeek={handleSeek}
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onClose={() => {
                        setIsPlayerOpen(false);
                        setPlayerIsPlaying(false);
                        setPlayerCard(null);
                        playerAudioRef.current?.pause();
                    }}
                    analyserNode={analyser}
                    // 白噪音 Props
                    ambientSounds={AMBIENT_SOUNDS}
                    activeTracks={activeTracks}
                    trackVolumes={trackVolumes}
                    masterVolume={masterVolume}
                    onToggleTrack={toggleTrack}
                    onSetTrackVolume={setTrackVolume}
                    onSetMasterVolume={setMasterVolume}
                    onStopAllAmbient={stopAllAmbient}
                />
            </div>
        </AuthGuard>
    );
}
