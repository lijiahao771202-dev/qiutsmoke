"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, RefreshCw, CheckCircle2, Sparkles, Waves, Flower2, CircleDot, Flame, Gem, Orbit, Cherry, Star, Flower, Globe, Wind, Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useHeartRate } from "@/lib/hooks/useHeartRate";
import HeartRateIndicator from "@/components/HeartRateGraph";
import PracticeCompletionView from "@/components/PracticeCompletionView";
import { getApiUrl } from "@/lib/config";
import { useBinauralBeats, BINAURAL_PRESETS } from "@/lib/hooks/useBinauralBeats";
import { useLocalNotifications } from "@/lib/hooks/useLocalNotifications";
import { unlockAudio, playCompletionSound, getSharedAudioContext } from "@/lib/audioUnlock";
import { useGlobalWhiteNoise } from "@/contexts/WhiteNoiseContext";
import { SoundscapesContent } from "@/components/soundscapes/SoundscapesContent";
import { usePracticeKeepAwake } from "@/hooks/usePracticeKeepAwake";
import { completeMeditationSession, createMeditationSession } from "@/lib/hooks/useData";

import scriptsPrepare from "@/app/data/scripts_prepare.json";
import scriptsRecognize from "@/app/data/scripts_recognize.json";
import scriptsAllow from "@/app/data/scripts_allow.json";
import scriptsInvestigate from "@/app/data/scripts_investigate.json";
import scriptsNote from "@/app/data/scripts_note.json";
import scriptsInterrupt from "@/app/data/scripts_interrupt.json";

// --- Types ---
type Phase = "IDLE" | "TRANSITION_TO_PRACTICE" | "COUNTDOWN" | "PREP_SURF" | "PRACTICING" | "COMPLETED" | "SUMMARY";
type BreathPhase = "INHALE" | "HOLD" | "EXHALE";
type Theme = "SPHERE" | "SURF" | "ZEN" | "GALAXY" | "SAKURA" | "STARFALL" | "LOTUS";
type BreathingPatternId = "478" | "box" | "focus" | "sigh" | "energy";

interface BreathingPattern {
    id: BreathingPatternId;
    name: string;
    description: string;
    inhale: number; // seconds
    hold: number;   // seconds (0 = skip hold phase)
    exhale: number; // seconds
}

const BREATHING_PATTERNS: BreathingPattern[] = [
    { id: "478", name: "4-7-8 放松", description: "经典深度放松", inhale: 4, hold: 7, exhale: 8 },
    { id: "box", name: "方形呼吸", description: "平衡与专注", inhale: 4, hold: 4, exhale: 4 },
    { id: "focus", name: "专注呼吸", description: "无屏息，简单有效", inhale: 5, hold: 0, exhale: 5 },
    { id: "sigh", name: "生理叹息", description: "模拟自然叹息", inhale: 4, hold: 0, exhale: 8 },
    { id: "energy", name: "能量呼吸", description: "快节奏提神", inhale: 2, hold: 2, exhale: 2 },
];

// --- Theme Config ---
const THEMES: Record<Theme, { name: string; icon: any; color: string }> = {
    SPHERE: { name: "Sphere", icon: Globe, color: "text-blue-400" },
    SURF: { name: "Surfing", icon: Waves, color: "text-blue-500" },
    ZEN: { name: "Zen", icon: CircleDot, color: "text-stone-300" },
    GALAXY: { name: "Galaxy", icon: Orbit, color: "text-indigo-400" },
    SAKURA: { name: "Sakura", icon: Cherry, color: "text-pink-300" },
    STARFALL: { name: "Starfall", icon: Star, color: "text-yellow-300" },
    LOTUS: { name: "Lotus", icon: Flower, color: "text-amber-200" },
};

// --- Configuration ---
const BREATH_CYCLE = {
    INHALE: 4000,
    HOLD: 7000,
    EXHALE: 8000,
};

const PARTICLE_COUNT = 2000;
const BASE_RADIUS = 100;
const EXPAND_RADIUS = 280;

// --- Helper Functions ---
function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const DEFAULT_SURF_SYSTEM_PROMPT = `你是一位深谙 Judson Brewer（贾德森·布鲁尔）博士成瘾机制与《欲望的博弈》理论的专业正念冥想教练。我们的最终目的是通过“欲望冲浪（Urge Surfing）”与 RAIN 冥想，帮助用户打破成瘾习惯回路，成功戒烟。

# 布鲁尔 RAIN 戒断法详细操作与样例

## R (Recognize) 认出：标签与打分
操作：引导用户认出渴望。运用【标签法】给冲动命名（“啊，这是尼古丁的冲动”）。运用【打分法】客观评估当前的渴望强度，从而将其客体化。
样例：
- “觉察到冲动升起了吗？在心里给它贴个标签：‘嗨，欲望。’如果给这股渴望打个分，1到10分，现在是几分？”
- “给当前的冲动打个分吧。把它当成一个客观的数据，单纯地认出它现在的强度。”

## A (Allow) 允许：友善与接纳
操作：放弃对抗，以【绝对友善和接纳】的态度为渴望腾出空间。不加评判地允许躯体不适感流淌，像招待一位暂时的访客一样接纳它。
样例：
- “带着友善的态度，允许这股冲动在体内存在。不要推开它，也不要满足它，就让它待在那里。”
- “大脑可能会烦躁，但请温柔地对这股感觉说：‘你可以待在这里，我为你腾出空间。’”

## I (Investigate) 探究：动态的温和好奇心
操作：唤醒“温和的好奇心”，向内极其细致地探索躯体感觉。引导用户抓住最细微的感觉，并去发现【欲望不是一成不变的，它是动态流动的】。同时觉察并旁观大脑产生的想法。
样例：
- “带着好奇心，找找身体哪里最难受？是喉咙干痒还是胸口紧绷？它是在发热还是发紧？是在微微跳动还是移动？”
- “注意观察，这种紧绷感不是固定不变的，它在微妙地变化。如果大脑在找借口，把想法当做云朵看着它飘过。”

## N (Note / Non-identify) 解离与非认同
操作：进入【解离阶段】。告知烟瘾如同海浪，必然会经历上升、冲顶、然后下降的过程。建立解离认知：“我有渴望，但我不是渴望本身。我可以有冲动，但我【不必采取行动】。”
样例：
- “冲动就像海浪，会上升、冲顶，然后终将消退。看着它起伏，告诉自己：‘我不必采取任何行动。’”
- “你不是你的欲望，你只是在岸边观察海浪的人。感受这股力量正在自行解体、消散。”

# 铁律约束
1. 你的回复必须且只能是一句不超过30字的短句，**直接输出纯文本**。不要任何Markdown、标签或多余解释。
2. **拒绝机械复述**：当用户反馈感受时，绝对不要像客服一样只会说“我理解”、“我听到了”。你必须像一位真正的大师，立刻用【极具洞察力的疑问句或祈使句】将用户拉入更深的觉察。
3. 必须紧密承接前文历史，自然地顺着上一句话给出下一句引导，保持对话行云流水。
4. 语气沉稳、友善、充满穿透力且极其富有好奇心。每一句话都应该像是在幽暗中点亮一盏灯。
5. 绝对不可直接说出"烟"、"抽烟"等触发词。用"海浪"、"冲动"、"原始的能量"来指代。
6. 严格根据当前传入的【当前所处阶段】进行针对性发言，步步深入。`;

const DEFAULT_SURF_STAGES = [
    { maxTime: 40, stageName: "【第0阶段：准备上板】", command: "引导用户做深呼吸，稳住重心，准备迎接海浪。" },
    { maxTime: 180, stageName: "【第1阶段：R - Recognize 认出渴望】", command: "请严格按照系统提示词中【R (Recognize) 认出】的操作和样例进行引导。" },
    { maxTime: 300, stageName: "【第2阶段：A - Allow 允许不适存在】", command: "请严格按照系统提示词中【A (Allow) 允许】的操作和样例进行引导。" },
    { maxTime: 600, stageName: "【第3阶段：I - Investigate 探究躯体感受】", command: "请严格按照系统提示词中【I (Investigate) 探究】的操作和样例进行引导。" },
    { maxTime: 99999, stageName: "【第4阶段：N - Note 记录生灭与非认同】", command: "请严格按照系统提示词中【N (Note / Non-identify) 记录与非认同】的操作和样例进行引导。" },
];


// -----------------------------------------------------------------------------
// Component: Ruler Time Selector
// -----------------------------------------------------------------------------
const RulerTimeSelector = React.memo(({
    value,
    onChange,
    min = 1,
    max = 60
}: {
    value: number,
    onChange: (val: number) => void,
    min?: number,
    max?: number
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const { triggerLight } = useHaptics();

    // Local state for immediate UI feedback without waiting for parent
    const [localValue, setLocalValue] = useState(value);

    // Sync local state if parent updates externally (unlikely during scroll, but good practice)
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Generate ticks: each minute is a tick.
    const TICK_WIDTH = 24;

    useEffect(() => {
        if (scrollRef.current) {
            // Initial scroll position alignment
            // value 5 -> index 0. value = min + index.
            const index = value - min;
            scrollRef.current.scrollLeft = index * TICK_WIDTH;
        }
    }, []); // Run once on mount

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;

        // Calculate raw value
        const rawIndex = scrollLeft / TICK_WIDTH;
        const index = Math.round(rawIndex);
        let newValue = min + index;

        // Clamp
        if (newValue < min) newValue = min;
        if (newValue > max) newValue = max;

        // Immediate Visual Feedback
        if (newValue !== localValue) {
            setLocalValue(newValue);
            triggerLight();

            // Debounce the parent update to avoid expensive re-renders on every frame.
            // The local value handles the UI feedback, so we only need to sync with parent
            // when the user pauses or stops scrolling.
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
                onChange(newValue);
            }, 100); // 100ms debounce
        }
    };

    return (
        <div className="w-full relative h-24 flex flex-col items-center justify-center">
            {/* Current Value Display - Uses fast local state */}
            <div className="text-4xl font-light mb-2 text-white tabular-nums tracking-widest">
                {localValue}<span className="text-base text-white/40 ml-1">min</span>
            </div>

            {/* Ruler Container */}
            <div className="relative w-full h-12 overflow-hidden">
                {/* Center Indicator Line (Red/Accent) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-8 bg-red-500 z-10 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>

                {/* Scrollable Area */}
                <div
                    ref={scrollRef}
                    className="absolute inset-0 overflow-x-auto hide-scrollbar snap-x snap-mandatory"
                    onScroll={handleScroll}
                    style={{ scrollBehavior: 'smooth' }}
                >
                    <div
                        className="flex items-end h-full"
                        style={{
                            width: 'max-content',
                            paddingLeft: 'calc(50% - 12px)', // TICK_WIDTH / 2
                            paddingRight: 'calc(50% - 12px)'
                        }}
                    >
                        {Array.from({ length: max - min + 1 }).map((_, i) => {
                            const val = min + i;
                            const isMajor = val % 5 === 0;
                            return (
                                <div
                                    key={val}
                                    className="flex flex-col items-center justify-end shrink-0 snap-center"
                                    style={{ width: TICK_WIDTH }}
                                >
                                    <div
                                        className={`w-[1px] bg-white/40 rounded-full`}
                                        style={{ height: isMajor ? 24 : 12, opacity: isMajor ? 0.8 : 0.3 }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Remove black gradients as requested */}
            </div>
        </div>
    );
});


// -----------------------------------------------------------------------------
// Component: Main Page
// -----------------------------------------------------------------------------

export default function ImmersivePracticePage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <PracticeContent />,
        document.body
    );
}

function PracticeContent() {
    // --- State ---
    const [phase, setPhase] = useState<Phase>("IDLE");
    const [durationMinutes, setDurationMinutes] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("practiceDuration");
            if (saved) return parseInt(saved, 10);
        }
        return 15;
    });

    // Save Duration Preference
    useEffect(() => {
        localStorage.setItem("practiceDuration", durationMinutes.toString());
    }, [durationMinutes]);

    const [timeLeft, setTimeLeft] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [breathPhase, setBreathPhase] = useState<BreathPhase>("INHALE");
    const [countdown, setCountdown] = useState(3);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState<Theme>(() => {
        // Load saved theme from localStorage
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("practiceTheme") as Theme | null;
            if (saved && THEMES[saved]) return saved;
        }
        return "ZEN";
    });

    // Surf Pre-boarding Form Data
    const [surfIntensity, setSurfIntensity] = useState<number>(5);
    const [surfTrigger, setSurfTrigger] = useState<string>("");
    const [surfLocation, setSurfLocation] = useState<string>("");
    const [surfAbstinence, setSurfAbstinence] = useState<string>("");
    const [surfMentalTrap, setSurfMentalTrap] = useState<string>("");
    const surfDiagnosisRef = useRef<string>(""); // useRef to avoid stale closure in heartbeat useEffect
    const [selectedPattern, setSelectedPattern] = useState<BreathingPatternId>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("breathingPattern") as BreathingPatternId | null;
            if (saved && BREATHING_PATTERNS.find(p => p.id === saved)) return saved;
        }
        return "478";
    });

    const [guidanceMode, setGuidanceMode] = useState<'off' | 'light' | 'medium' | 'heavy' | 'ai'>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("practiceGuidanceMode");
            if (saved === 'light' || saved === 'medium' || saved === 'heavy' || saved === 'ai' || saved === 'off') return saved as any;
        }
        return 'off';
    });
    const [surfFrequency, setSurfFrequency] = useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("surfFrequency");
            return saved ? parseInt(saved, 10) : 45;
        }
        return 45;
    });
    const [surfStyle, setSurfStyle] = useState<'interactive' | 'immersive' | 'system'>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("surfStyle") as any;
            return (saved === 'interactive' || saved === 'immersive' || saved === 'system') ? saved : 'interactive';
        }
        return 'interactive';
    });

    useEffect(() => {
        localStorage.setItem("practiceGuidanceMode", guidanceMode);
    }, [guidanceMode]);

    // AI Smart Reminder States
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isPromptInspectorOpen, setIsPromptInspectorOpen] = useState(false);
    const [aiMood, setAiMood] = useState('平静');
    const [aiMode, setAiMode] = useState('常规正念');
    const [aiFrequency, setAiFrequency] = useState<'light' | 'medium' | 'heavy'>('medium');
    const [activeSkillMetadata, setActiveSkillMetadata] = useState<{file: string, stage: string, toolCalled?: boolean, functionName?: string} | null>(null);

    const [surfPromptsConfig, setSurfPromptsConfig] = useState<{ systemPrompt: string, stages: any[] }>({
        systemPrompt: DEFAULT_SURF_SYSTEM_PROMPT,
        stages: DEFAULT_SURF_STAGES
    });
    const [isSurfPromptsModalOpen, setIsSurfPromptsModalOpen] = useState(false);

    // Hydrate from localStorage safely on client
    useEffect(() => {
        try {
            const saved = localStorage.getItem("surfPromptsConfig");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.stages && Array.isArray(parsed.stages)) {
                    setSurfPromptsConfig(parsed);
                }
            }
        } catch(e) {
            console.error("Failed to parse surfPromptsConfig", e);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("surfPromptsConfig", JSON.stringify(surfPromptsConfig));
    }, [surfPromptsConfig]);

    const { triggerLight, triggerMedium, triggerHeavy, triggerSuccess } = useHaptics();
    // --- Time Selector Visibility ---
    const [isSelectorVisible, setIsSelectorVisible] = useState(false); // Default hidden
    const [showSoundscapes, setShowSoundscapes] = useState(false);
    const selectorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Show on Mount (optional, user said "defaults to hidden" if no operation, but usually better to show briefly?)
    // User said: "if no operation default to hidden". Let's default to false as requested.
    // However, if default is hidden, user doesn't know it's there. 
    // Maybe show briefly on mount then hide?
    useEffect(() => {
        setIsSelectorVisible(true);
        selectorTimeoutRef.current = setTimeout(() => setIsSelectorVisible(false), 3000);
        return () => {
            if (selectorTimeoutRef.current) clearTimeout(selectorTimeoutRef.current);
        };
    }, []);

    // 计算当前呼吸模式的毫秒值
    const currentPattern = useMemo(() => {
        const pattern = BREATHING_PATTERNS.find(p => p.id === selectedPattern) || BREATHING_PATTERNS[0];
        return {
            ...pattern,
            INHALE: pattern.inhale * 1000,
            HOLD: pattern.hold * 1000,
            EXHALE: pattern.exhale * 1000,
        };
    }, [selectedPattern]);

    // --- Heart Rate ---
    const {
        currentBPM,
        heartRateHistory,
        isMonitoring,
        isAuthorized,
        error: heartRateError,
        requestPermission,
        startMonitoring,
        stopMonitoring,
    } = useHeartRate();

    // --- Session Data for Summary ---
    const [sessionHeartRates, setSessionHeartRates] = useState<number[]>([]);
    const [sessionDuration, setSessionDuration] = useState<number>(0);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    const router = useRouter(); // Use App Router
    const { activeTracks } = useGlobalWhiteNoise();
    const { activate: activateKeepAwake, deactivate: deactivateKeepAwake } = usePracticeKeepAwake();

    // --- Guidance TTS ---
    const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
        if (typeof window !== "undefined") {
            ttsAudioRef.current = new Audio();
        }
    }, []);

    const ttsQueueRef = useRef<{
        jobs: { text: string; blobUrl?: string; isReady: boolean }[];
        isFetching: boolean;
        isPlaying: boolean;
    }>({ jobs: [], isFetching: false, isPlaying: false });

    // The Queue Processor Engine
    const processTTSQueue = async () => {
        const queue = ttsQueueRef.current;
        
        // Worker 1: Fetching
        if (!queue.isFetching) {
            const nextUnfetched = queue.jobs.find(j => !j.blobUrl && !j.isReady);
            if (nextUnfetched) {
                queue.isFetching = true;
                try {
                    const ttsRes = await fetch(getApiUrl("/api/tts"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: nextUnfetched.text,
                            voice: "zh-CN-XiaoxiaoNeural",
                            rate: "-15%"
                        })
                    });
                    if (ttsRes.ok) {
                        const blob = await ttsRes.blob();
                        nextUnfetched.blobUrl = URL.createObjectURL(blob);
                        nextUnfetched.isReady = true;
                    } else {
                        nextUnfetched.isReady = true; 
                    }
                } catch (e) {
                    console.error("TTS pipeline fetch failed", e);
                    nextUnfetched.isReady = true;
                } finally {
                    queue.isFetching = false;
                    processTTSQueue(); 
                }
            }
        }

        // Worker 2: Playing
        if (!queue.isPlaying) {
            const nextToPlay = queue.jobs[0];
            if (nextToPlay && nextToPlay.isReady) {
                if (nextToPlay.blobUrl && ttsAudioRef.current) {
                    queue.isPlaying = true;
                    const audio = ttsAudioRef.current;
                    audio.src = nextToPlay.blobUrl;
                    audio.volume = 0.8;
                    console.log("[TTS Pipeline] Playing chunk:", nextToPlay.text);
                    
                    const onEnded = () => {
                        audio.removeEventListener('ended', onEnded);
                        audio.removeEventListener('error', onEnded);
                        queue.jobs.shift(); // remove played
                        queue.isPlaying = false;
                        
                        const triggerSystemEngineNext = () => {
                            if (selectedTheme === 'SURF' && surfStyle === 'system') {
                                const isPriority = systemPriorityQueueRef.current.length > 0;
                                // priority interrupt waits 1s, normal stage waits dynamically
                                let delay = 1000;
                                if (!isPriority) {
                                    const stage = systemStageRef.current;
                                    if (stage === 0) delay = 5000; // Prepare
                                    else if (stage === 1) delay = 8000; // Recognize
                                    else if (stage === 2) delay = 8000; // Allow
                                    else if (stage === 3) delay = 10000; // Investigate
                                    else if (stage === 4) delay = 6000; // Note
                                }
                                systemWaitTimerRef.current = setTimeout(() => {
                                    popNextSystemSentence();
                                }, delay);
                            }
                        };
                        
                        triggerSystemEngineNext();
                        processTTSQueue();
                    };
                    audio.addEventListener('ended', onEnded);
                    audio.addEventListener('error', onEnded);
                    
                    audio.play().catch(e => {
                        console.error("[TTS Pipeline] play failed", e);
                        onEnded();
                    });
                } else {
                    // Blob failed, skip
                    queue.jobs.shift();
                    
                    const triggerSystemEngineNext = () => {
                        if (selectedTheme === 'SURF' && surfStyle === 'system') {
                            const isPriority = systemPriorityQueueRef.current.length > 0;
                            // priority interrupt waits 1s, normal stage waits dynamically
                            let delay = 1000;
                            if (!isPriority) {
                                const stage = systemStageRef.current;
                                if (stage === 0) delay = 5000; // Prepare
                                else if (stage === 1) delay = 8000; // Recognize
                                else if (stage === 2) delay = 8000; // Allow
                                else if (stage === 3) delay = 10000; // Investigate
                                else if (stage === 4) delay = 6000; // Note
                            }
                            systemWaitTimerRef.current = setTimeout(() => {
                                popNextSystemSentence();
                            }, delay);
                        }
                    };
                    triggerSystemEngineNext();
                    
                    processTTSQueue();
                }
            }
        }
    };

    const enqueueTTSChunk = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        ttsQueueRef.current.jobs.push({ text: trimmed, isReady: false });
        processTTSQueue();
    };

    const clearTTSQueue = () => {
        ttsQueueRef.current.jobs = [];
        ttsQueueRef.current.isPlaying = false;
        ttsQueueRef.current.isFetching = false;
        if (ttsAudioRef.current) {
            ttsAudioRef.current.pause();
            ttsAudioRef.current.src = "";
        }
    };

    // --- System Mode Event-Driven Engine Methods ---
    const popNextSystemSentence = useCallback(() => {
        if (systemWaitTimerRef.current) {
            clearTimeout(systemWaitTimerRef.current);
            systemWaitTimerRef.current = null;
        }

        const typeSentenceAndPlay = (sentence: string) => {
            const logIndex = startAiStreamLog();
            let charIdx = 0;
            const typeInterval = setInterval(() => {
                if (charIdx < sentence.length) {
                    appendAiStreamLog(logIndex, sentence[charIdx]);
                    charIdx++;
                } else {
                    clearInterval(typeInterval);
                }
            }, 30);
            enqueueTTSChunk(sentence);
        };

        // 1. Check Priority Queue (Interrupts)
        if (systemPriorityQueueRef.current.length > 0) {
            const interruptSentence = systemPriorityQueueRef.current.shift()!;
            typeSentenceAndPlay(interruptSentence);
            return;
        }

        // 2. Check Main Queue
        if (systemMainQueueRef.current.length > 0) {
            const nextSentence = systemMainQueueRef.current.shift()!;
            typeSentenceAndPlay(nextSentence);
        } else {
            // Main queue empty! Proceed to next stage
            const nextStage = systemStageRef.current + 1;
            if (nextStage <= 4) {
                systemStageRef.current = nextStage;
                setSystemStage(nextStage);
                loadSystemScriptForStage(nextStage);
            } else {
                console.log("[System Mode] Practice Complete.");
            }
        }
    }, [enqueueTTSChunk]);

    const getRandomVersion = useCallback((jsonArray: any[]) => {
        if (!jsonArray || jsonArray.length === 0) return [];
        const randomItem = jsonArray[Math.floor(Math.random() * jsonArray.length)];
        return randomItem.sentences || [];
    }, []);

    const loadSystemScriptForStage = useCallback((stage: number) => {
        let sentences: string[] = [];
        if (stage === 0) sentences = getRandomVersion(scriptsPrepare);
        else if (stage === 1) sentences = getRandomVersion(scriptsRecognize);
        else if (stage === 2) sentences = getRandomVersion(scriptsAllow);
        else if (stage === 3) sentences = getRandomVersion(scriptsInvestigate);
        else if (stage === 4) sentences = getRandomVersion(scriptsNote);
        
        systemMainQueueRef.current = [...sentences];
        console.log(`[System Mode] Loaded Stage ${stage} script:`, sentences);
        
        if (!ttsQueueRef.current.isPlaying) {
            popNextSystemSentence();
        }
    }, [getRandomVersion, popNextSystemSentence]);

    // Keep playVoicePrompt for simple random fixed prompts
    const playVoicePrompt = async (text: string): Promise<void> => {
        enqueueTTSChunk(text);
        return Promise.resolve(); // Resolves instantly so we don't block the caller
    };

    // Guidance Prompt Pools (Longer, deeper start prompts)
    const START_PROMPTS = [
        "欢迎来到今天的正式冥想练习。在这段完全属于你的时间里，没有任何人会来打扰你，也没有任何急需处理的任务。请慢慢找一个最安稳舒适的姿势，轻轻地、毫无保留地闭上双眼。跟随着你下一次深长的呼吸，感受身体一点一点地沉入当下的宁静之中。",
        "很高兴你愿意为自己腾出这段无比珍贵的时光。此刻，你可以把全世界暂时隔离在门外。无论今天奔波了多久，在接下来的时间里，让身体的每一寸肌肉都逐渐松弛下来。深吸一口气，感受清凉的空气充满胸腔，再缓缓吐出，卸下肩颈所有的疲惫与紧绷。",
        "请为自己终于停下了脚步而感到自豪。先把所有的期待、评判以及待办事项，通通放在一旁。此刻，没有任何你要去的地方，也没有任何你要做的事情。试着把觉知轻轻收回来，放在自己一上一下、连绵不断的呼吸声中。",
        "慢慢地，让眼皮自然地下垂、闭拢。你的头脑此刻可能依然有些吵闹，甚至思绪纷飞，这都非常正常。请像一位慈悲的旁观者一样，允许内心的喧嚣发生、又自己散去。你只需要把最轻柔的注意力，维系在鼻尖进出的那一缕空气上。"
    ];

    const MIDDLE_PROMPTS = [
        "如果你发现此刻思绪飘远了，没关系，这正是大脑最擅长做的事。微笑着，重新把心意带回到呼吸上。",
        "注意此时此刻，你的心跑去了哪里？不管去得有多远，借由一呼一吸的手，你就能立刻回来。",
        "发现自己走神，其实一次完美的觉知复苏。现在，轻轻牵起注意力的手，像牵着一个迷路的孩子一样，把它带回这里。",
        "无论你的心正在追逐未来，还是反复咀嚼过去，都不必自责。只需在下一次吸气时，把一切拉回当下。",
        "当你听到我的声音，这就是生命在提醒你：回到现在。感受空气划过鼻尖的那一点微末清凉。",
        "不用立刻斩断杂念，只需要把注意力的探照灯，温柔且缓慢地转回到胸腔的一起一伏上。",
        "分心是冥想路上的必经风景，而不是障碍。看见了风景后，现在，我们继续回归宁静的旅程。",
        "别在乎你刚才已经发呆了多久，在时间的长河里，只要你愿意，呼出的这一秒就是全新的起点。",
        "如果有很多声音在争夺你的注意力，没关系。挑出呼吸的声音，把它作为你此刻唯一的锚点。",
        "最深刻的专注，往往伴随着无数次的偏离。每一次温和的拉回，都在一次次强化你的内在力量。",
        "试着在心里退后一步。看着脑海里浮现的念头，就像坐在河谷旁，静静看着水面上漂过的一片落叶。",
        "念头只是大脑分泌的产物，它们不是你，更不是事实。允许它们出现，也允许它们自然消散。",
        "如果大脑向你抛出焦虑、情绪或是画面，不要去抓取。做一个天空般的旁观者，任凭云卷云舒。",
        "那些纷沓至来的想法，就像是在屏幕上播放的无声电影。你只需要安坐在观众席里，不参与，不点评。",
        "试着只是看见你在想什么，而不是陷入其中。看见之后，轻轻放下，把空间留给接下来的呼吸。",
        "念头就像路过的列车，你站在站台上，看着它们呼啸而过，但你不需要上车。",
        "你无法让海滩上的波浪停止拍打，但你可以选择不去冲浪。面对涌来的思绪，也是如此。",
        "有些想法会非常喧闹，带着强烈的情绪。把它当作一阵吹过树林的急风，风过之后，树林依旧宁静。",
        "不需要强求清空大脑。试着在这所有的思绪之中，凿出一个只属于你和呼吸的宁静小房间。",
        "每一个念头的寿命其实都很短，只要你不去给它添柴加火，它就会自己慢慢熄灭。",
        "不论你刚刚内心多么烦躁或混乱，这都无妨。冥想没有好坏之分，此刻发生的一切，就是它该有的样子。",
        "放下你要变得专注或者立刻平静的企图心。允许此时的你就是紧绷的，只要你去觉察这个事实就好。",
        "不要评价你刚才的表现。我们不用打分，在这个时间段里，只要你还坐在这里，这就已经是最完美的修行。",
        "如果周围有噪音甚至打扰，不要把它们当作敌人。试着将这些声音也纳入你的禅定中，成为环境的一部分。",
        "也许你觉得大脑很乱、做得不够好，那只是大脑的评判机制在运作罢了。轻轻告诉自己：我已经做得很好了。",
        "去接纳内心的每一个低谷，每一次急躁。用如同对待最好朋友般的温柔，来对待此刻自己内心的任何一面。",
        "冥想没有必须到达的境界。此时、此刻、此地，你只需要纯粹地坐在这里。",
        "我们平时总是习惯解决问题。但在这一刻，你不是一个需要被修复的机器，不用解决任何事。",
        "当某种情绪像浪潮涌来，不去迎面撞击它。让自己化作一片无边无际的沙滩，去承载所有涌上来的海浪。",
        "给自己允许，允许自己无所事事，允许自己在这个时刻一事无成。存在本身，就是最高的目的。",
        "把极其微小的注意力，轻轻放在你的肩膀和脖颈上。如果在那里感到了紧绷，随着一声悠长的呼气，让它融化掉。",
        "感受你身体此时的重量。让椅子或垫子完全稳稳地托住你，你不需要用任何力气去支撑你自己。",
        "将觉知带到你的面部。是否不知不觉皱起了眉，或者咬紧了牙？现在，让面部肌肉像冰雪消融一样慢慢松开。",
        "你能感觉到胸腔深处、心脏的跳动吗？无论它快或慢，试着只是陪伴着这股温热的生命节奏。",
        "把空气想象成一道流动的水。吸气时，水流滋养你的内脏；呼气时，水流带走你一整天的疲惫与不适。",
        "如果感觉到身体某处有酸痛或麻木，不要抗拒。把深长的呼吸送向那里，温柔地包裹住它。",
        "从头顶，到肩膀，到指尖，再到脚趾。允许每一寸皮肤都进入休眠状态。你已经做得足够好了。",
        "注意双手相交或者放在腿上的温度。这种微小而确定的触感，就是我们与当下最深切的连接。",
        "让眼皮再沉重一点。切断大量的视觉信息后，去体会这只有听觉、触觉，绝对纯粹而安全的内在庇护所。",
        "让每一次呼气都比以往更加彻底一点。在一呼一出之间，把积聚的浑浊，统统排向地心。",
        "放松对所有事情的控制权。深吸一口气，然后任凭身体自己呼出它。让呼吸去完成它自己，你只负责体会。",
        "想象你原本背负的沉重包袱，正一个接一个地掉落在周围的地上。现在的你，无比轻盈。",
        "随着每一次起伏的波浪，感受自己正在越来越深地沉入一个宁静的无底空间，这里毫无防备，却充满了绝对的安全。",
        "在这短暂的停顿中，什么都不去期待。过去的已经沉没，未来的还没到来，你能抓住的，只有此时、此地。",
        "所有你要背负的责任，在这一刻都被彻底豁免了。这是一个没有任务、没有目标、哪怕闭着眼浪费光阴也极其合理的港湾。",
        "去试着聆听两口呼吸之间，那段极其微小的停顿。在那短暂的零点几秒钟里，整个世界是绝对静止的。",
        "把心安顿在当下这一秒钟里。这一秒里没有未还的债务，没有待回的邮件，也没有任何人苛刻的期待。",
        "感受自己像是一棵扎进深土里的巨树。无论外界的风雨如何喧嚣流转，你的根基始终稳固、深沉、寂静。",
        "把这个时刻，当作大自然赠予你的一个小小的生命空隙。躲在这个纯净的空隙里，不用再做大人，找回你自己。",
        "无论房间外面正在发生什么，在这个只属于你的微小宇宙里，此刻，一切安好。"
    ];

    const END_PROMPTS = [
        "我们今天的练习马上就要结束了。你可以开始稍微活动一下手指和脚趾，在准备好的时候，缓缓睁开双眼。",
        "带着这份你刚刚为自己寻回的宁静，轻轻动一动身体。无论何时觉得准备好了，按你的节奏，重新看见这个世界。",
        "在结束之前，在心里默默感谢自己拨出的这段时间。慢慢地，唤醒你的身体，温柔地睁开眼睛。",
        "练习接近尾声。让外界的声音、光线重新进入你的觉知。动动肩膀，带着这份踏实，慢慢睁开眼。",
        "深深地吸气，让这份清澈流向全身；缓缓地呼气。把现在的放松感带入接下来的生活，慢慢睁开双眼。",
        "记住这种回归平静的感觉，它随时都在你心里。动动脚尖，伸一个小懒腰，缓缓地，睁开眼。"
    ];

    // Guidance Preloader Logic (Zero Latency & Autoplay Policy Bypassing)
    const preloadedStartUrlRef = useRef<string | null>(null);
    const preloadedStartTextRef = useRef<string | null>(null);
    const aiHistoryRef = useRef<{ role: string; content: string }[]>([]);
    const [chatHistory, setChatHistory] = useState<{role: string; content: string}[]>([]);
    const surfBusyRef = useRef(false);
    
    // Immersive Mode Queue Refs
    const playbackQueueRef = useRef<string[]>([]);
    const isFetchingBatchRef = useRef<boolean>(false);

    // System Mode Stage & Queue Refs
    const [systemStage, setSystemStage] = useState(0);
    const systemStageRef = useRef(0);
    const systemMainQueueRef = useRef<string[]>([]);
    const systemPriorityQueueRef = useRef<string[]>([]);
    const systemWaitTimerRef = useRef<NodeJS.Timeout | null>(null);
    // Helper to keep ref and state in sync
    const pushAiLog = useCallback((role: string, content: string) => {
        aiHistoryRef.current.push({ role, content });
        setChatHistory([...aiHistoryRef.current]);
    }, []);

    // Helper for streaming chat log updates
    const startAiStreamLog = () => {
        aiHistoryRef.current.push({ role: 'assistant', content: '' });
        setChatHistory([...aiHistoryRef.current]);
        return aiHistoryRef.current.length - 1;
    };
    
    const appendAiStreamLog = (index: number, chunk: string) => {
        if (aiHistoryRef.current[index]) {
            aiHistoryRef.current[index].content += chunk;
            setChatHistory([...aiHistoryRef.current]);
        }
    };

    // Common Generic Stream Fetch helper
    const streamAiReminder = async (bodyPayload: any, disableAutoQueue = false) => {
        const r = await fetch("/api/generate-reminder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyPayload)
        });

        if (!r.body) throw new Error("No body from backend");

        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let metaParsed = false;
        let buffer = "";
        let unplayedSentenceBuffer = "";
        
        const logIndex = startAiStreamLog();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            
            if (!metaParsed) {
                if (buffer.startsWith('__META__=')) {
                    const newlineIdx = buffer.indexOf('\n');
                    if (newlineIdx !== -1) {
                        const metaStr = buffer.substring(9, newlineIdx);
                        try {
                            const meta = JSON.parse(metaStr);
                            if (meta.activeSkill) setActiveSkillMetadata({ file: meta.activeSkill, stage: meta.rainStage, toolCalled: meta.toolCalled, functionName: meta.functionName });
                        } catch(e) {}
                        metaParsed = true;
                        
                        const textChunk = buffer.substring(newlineIdx + 1);
                        buffer = "";
                        if (textChunk) {
                            appendAiStreamLog(logIndex, textChunk);
                            unplayedSentenceBuffer += textChunk;
                        }
                    }
                } else {
                    metaParsed = true; // Fallback, no meta
                    appendAiStreamLog(logIndex, buffer);
                    unplayedSentenceBuffer += buffer;
                    buffer = "";
                }
            } else {
                appendAiStreamLog(logIndex, buffer);
                unplayedSentenceBuffer += buffer;
                buffer = "";
            }

            // Chunk Splitter check for punctuation
            const sentenceMatch = unplayedSentenceBuffer.match(/([^。！？；,;]+[。！？；,;])/);
            if (sentenceMatch) {
                const sentence = sentenceMatch[0];
                if (!disableAutoQueue) enqueueTTSChunk(sentence);
                unplayedSentenceBuffer = unplayedSentenceBuffer.substring(sentence.length);
            }
        }
        
        // Flush remaining
        if (unplayedSentenceBuffer) {
            if (!disableAutoQueue) enqueueTTSChunk(unplayedSentenceBuffer);
        }
        
        return aiHistoryRef.current[logIndex]?.content || fullText; // return full accumulated text, with safety check
    };

    const bowlBufferRef = useRef<AudioBuffer | null>(null);

    const preloadAudioAssets = async () => {
        if (guidanceMode === 'off' && selectedTheme !== 'SURF') return;
        
        // 1. Preload TTS Blob
        try {
            let text = START_PROMPTS[Math.floor(Math.random() * START_PROMPTS.length)];
            
            if (guidanceMode === 'ai' || selectedTheme === 'SURF') {
                try {
                    const fullText = await streamAiReminder({
                        mood: aiMood,
                        mode: selectedTheme === 'SURF' ? 'urge_surfing' : aiMode,
                        elapsedTime: 0,
                        totalTime: durationMinutes,
                        sessionPhase: 'start',
                        practiceCount: selectedTheme === 'SURF' && typeof window !== 'undefined' ? parseInt(localStorage.getItem('surfSuccessCount') || '0', 10) : 0,
                        customSurfPrompts: selectedTheme === 'SURF' ? surfPromptsConfig : undefined
                    }, true); // preloads without auto-playing queue
                    if (fullText) text = fullText;
                } catch (e) {
                    console.error("AI Start preload failed stream generation, fallback to fixed text", e);
                }
            }
            
            preloadedStartTextRef.current = text;

            const ttsRes = await fetch(getApiUrl("/api/tts"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, voice: "zh-CN-XiaoxiaoNeural", rate: "-15%" })
            });
            if (ttsRes.ok) {
                const blob = await ttsRes.blob();
                if (preloadedStartUrlRef.current) URL.revokeObjectURL(preloadedStartUrlRef.current);
                preloadedStartUrlRef.current = URL.createObjectURL(blob);
            }
        } catch (e) {
            console.error("Preload TTS failed", e);
        }

        // 2. Preload Singing Bowl into Web Audio API (bypasses HTML5 Autoplay rules)
        try {
            if (!bowlBufferRef.current) {
                const bowlRes = await fetch("/bowl.wav");
                const arrayBuffer = await bowlRes.arrayBuffer();
                const ctx = getSharedAudioContext();
                bowlBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
            }
        } catch (e) {
            console.error("Preload bowl failed", e);
        }
    };

    // Guidance Triggers Tracker
    const playedTriggersRef = useRef<Set<number>>(new Set());
    const guidanceTimestampsRef = useRef<{ start: number, middles: number[], end: number }>({ start: -1, middles: [], end: -1 });

    // Compute Triggers & Preload on start or mode change
    useEffect(() => {
        const totalSeconds = durationMinutes * 60;
        
        let middles: number[] = [];
        
        // Dynamic algorithm adjusting frequency proportionally to selected duration
        if (totalSeconds >= 180) { // Require at least 3 mins to insert middle prompts
            const effectiveMode = guidanceMode === 'ai' ? aiFrequency : guidanceMode;
            if (effectiveMode === 'light') {
                // 1 reminder exactly at 50% marking
                middles = [Math.floor(totalSeconds / 2)];
            } else if (effectiveMode === 'medium') {
                // Dynamically split into thirds (33%, 66%), creating 2 gentle midway anchors
                middles = [
                    Math.floor(totalSeconds / 3),
                    Math.floor((totalSeconds * 2) / 3)
                ];
            } else if (effectiveMode === 'heavy') {
                // High frequency: Cap minimum interval to 2 minutes, but smoothly scale for long sessions 
                // e.g. 10m -> hits at 2.5m, 5m, 7.5m (3 reminders). 60m -> hits every 5m (11 reminders).
                const interval = Math.max(120, Math.floor(totalSeconds / 6)); 
                for (let t = interval; t < totalSeconds - 60; t += interval) {
                    middles.push(t);
                }
            }
        }

        guidanceTimestampsRef.current = {
            start: 2, // Play exactly at 2 seconds elapsed
            middles,
            end: totalSeconds >= 60 ? totalSeconds - 30 : -1 // Trigger 30s before end to give time for ending speech
        };

        // Transition handling & preloading
        if (phase === "TRANSITION_TO_PRACTICE" || phase === "IDLE") {
            playedTriggersRef.current.clear();
            if (phase === "TRANSITION_TO_PRACTICE") {
                aiHistoryRef.current = [];
                setChatHistory([]);
            }
            if (ttsAudioRef.current) ttsAudioRef.current.pause();
            
            // Trigger seamless background preload
            if (phase === "IDLE") preloadAudioAssets();
        }
    }, [phase, guidanceMode, aiFrequency, durationMinutes]);

    useEffect(() => {
        if (phase !== "PRACTICING" || (guidanceMode === 'off' && selectedTheme !== "SURF")) return; // Always process SURF theme pulses even if guidanceMode off

        const totalSeconds = durationMinutes * 60;
        const currentElapsed = elapsedSeconds;
        const triggers = guidanceTimestampsRef.current;
        const played = playedTriggersRef.current;

        const playRandom = async (arr: string[]) => {
            const text = arr[Math.floor(Math.random() * arr.length)];
            await playVoicePrompt(text);
        };

        const playSingingBowl = () => {
            try {
                if (bowlBufferRef.current) {
                    const ctx = getSharedAudioContext();
                    
                    if (ctx.state === 'suspended') {
                        ctx.resume();
                    }
                    
                    const source = ctx.createBufferSource();
                    source.buffer = bowlBufferRef.current;
                    const gainNode = ctx.createGain();
                    gainNode.gain.value = 1.0;
                    
                    source.connect(gainNode);
                    gainNode.connect(ctx.destination);
                    source.start(0);
                } else {
                    const bowl = new window.Audio("/bowl.wav");
                    bowl.volume = 1.0;
                    bowl.play().catch(e => console.error("Bowl playback failed", e));
                }
            } catch (e) {
                console.error("Audio object creation failed", e);
            }
        };

        const fetchAiPrompt = async (sessionPhase: 'middle' | 'end', elapsed: number) => {
            try {
                if (selectedTheme === 'SURF') {
                    pushAiLog('user', `(距开始已 ${elapsed} 秒) 我还在继续体验，请给出下一句旁白指引。`);
                }

                await streamAiReminder({
                    mood: aiMood,
                    mode: selectedTheme === 'SURF' ? 'urge_surfing' : aiMode,
                    elapsedTime: elapsed,
                    totalTime: durationMinutes * 60,
                    sessionPhase,
                    diagnosisProfile: selectedTheme === 'SURF' ? surfDiagnosisRef.current : undefined,
                    practiceCount: selectedTheme === 'SURF' && typeof window !== 'undefined' ? parseInt(localStorage.getItem('surfSuccessCount') || '0', 10) : 0,
                    history: aiHistoryRef.current
                });
            } catch (e) {
                console.error(`AI ${sessionPhase} failed`, e);
                const arr = sessionPhase === 'end' ? END_PROMPTS : MIDDLE_PROMPTS;
                const fbText = arr[Math.floor(Math.random() * arr.length)];
                pushAiLog('assistant', fbText);
                await playVoicePrompt(fbText);
            }
        };

        // 1. Start
        if (currentElapsed === triggers.start && !played.has(triggers.start)) {
            played.add(triggers.start);
            playSingingBowl(); // Chime first
            if (selectedTheme === 'SURF') {
                // SURF mode uses its own specialized intro in PREP_SURF, do nothing.
            } else if (guidanceMode === 'ai' && preloadedStartTextRef.current) {
                pushAiLog('assistant', preloadedStartTextRef.current);
                if (preloadedStartUrlRef.current && ttsAudioRef.current) {
                    ttsAudioRef.current.src = preloadedStartUrlRef.current;
                    ttsAudioRef.current.volume = 0.8;
                    const audio = ttsAudioRef.current;
                    // Wait 8000ms for the bowl's reverbs to fade naturally before speaking
                    setTimeout(() => {
                        audio.play().catch(e => console.error(e));
                    }, 8000);
                } else {
                    setTimeout(() => playRandom(START_PROMPTS), 8000); // Fallback
                }
            } else {
                setTimeout(() => playRandom(START_PROMPTS), 8000); // Fallback
            }
        }

        // 2. Middle
        if (selectedTheme !== 'SURF' && triggers.middles.includes(currentElapsed) && !played.has(currentElapsed)) {
            played.add(currentElapsed);
            if (guidanceMode === 'ai') {
                fetchAiPrompt('middle', currentElapsed).catch(console.error);
            } else {
                playRandom(MIDDLE_PROMPTS).catch(console.error); // No chime for middles to keep it gentle
            }
        }

        // 3. End
        if (selectedTheme !== 'SURF' && currentElapsed === triggers.end && !played.has(triggers.end)) {
            played.add(triggers.end);
            const doEnd = async () => {
                // Speech first, wait for completion, then chime the ending marking
                if (guidanceMode === 'ai') {
                    await fetchAiPrompt('end', currentElapsed);
                } else {
                    await playRandom(END_PROMPTS);
                }
                playSingingBowl();
            };
            doEnd().catch(console.error);
        }

        // 4. SURF Auto Pulse (every 45s) - OPTION A SELECTED: Keep heartbeat, but use Function Calling
        if (selectedTheme === "SURF" && currentElapsed > 0 && currentElapsed % surfFrequency === 0 && !played.has(`surf_${currentElapsed}`)) {
            played.add(`surf_${currentElapsed}`);
            if (surfBusyRef.current) {
                console.log('[SURF] Auto-pulse skipped: user action in progress');
            } else if (surfStyle === 'interactive') {
                const doSurfPulse = async () => {
                    surfBusyRef.current = true;
                    try {
                        await streamAiReminder({
                            mood: aiMood,
                            mode: 'urge_surfing',
                            surfStyle: 'interactive',
                            elapsedTime: currentElapsed,
                            totalTime: totalSeconds,
                            sessionPhase: 'middle',
                            diagnosisProfile: surfDiagnosisRef.current,
                            history: aiHistoryRef.current,
                            practiceCount: typeof window !== 'undefined' ? parseInt(localStorage.getItem('surfSuccessCount') || '0', 10) : 0,
                            customSurfPrompts: surfPromptsConfig
                        });
                    } catch(e) { console.error(e); } finally {
                        surfBusyRef.current = false;
                    }
                };
                doSurfPulse();
            } else if (surfStyle === 'immersive') {
                // Immersive Mode: Pull from local queue
                const doQueuePulse = async () => {
                    if (playbackQueueRef.current.length > 0) {
                        const nextSentence = playbackQueueRef.current.shift()!;
                        console.log("[SURF Immersive] Popped from queue:", nextSentence);
                        const logIndex = startAiStreamLog();
                        // Simulate typewriter
                        let charIdx = 0;
                        const typeInterval = setInterval(() => {
                            if (charIdx < nextSentence.length) {
                                appendAiStreamLog(logIndex, nextSentence[charIdx]);
                                charIdx++;
                            } else {
                                clearInterval(typeInterval);
                                enqueueTTSChunk(nextSentence);
                            }
                        }, 50); // 50ms per character
                    }

                    // Background reload if queue is low
                    if (playbackQueueRef.current.length <= 1 && !isFetchingBatchRef.current) {
                        isFetchingBatchRef.current = true;
                        try {
                            const resultText = await streamAiReminder({
                                mood: aiMood,
                                mode: 'urge_surfing',
                                surfStyle: 'immersive',
                                elapsedTime: currentElapsed + surfFrequency, // look ahead
                                totalTime: totalSeconds,
                                sessionPhase: 'middle',
                                diagnosisProfile: surfDiagnosisRef.current,
                                history: aiHistoryRef.current,
                                practiceCount: typeof window !== 'undefined' ? parseInt(localStorage.getItem('surfSuccessCount') || '0', 10) : 0,
                                customSurfPrompts: surfPromptsConfig
                            }, true); // disableAutoQueue = true
                            
                            // Parse batch sentences
                            const sentences = resultText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                            playbackQueueRef.current.push(...sentences);
                            console.log("[SURF Immersive] Reloaded queue in background:", sentences);
                        } catch(e) {
                            console.error("[SURF Immersive] Batch fetch failed", e);
                        } finally {
                            isFetchingBatchRef.current = false;
                        }
                    }
                };
                doQueuePulse();
            }
        }
    }, [elapsedSeconds, phase, guidanceMode, durationMinutes, aiMood, aiMode, selectedTheme]);

    // --- Urge Surfing Realtime Action ---
    const handleUrgeSurfingAction = async (action: string, buttonId?: string) => {
        if (surfBusyRef.current) return; // prevent collision with auto-pulse
        surfBusyRef.current = true;
        triggerMedium();
        const isFinish = action.includes('完成');
        const count = typeof window !== 'undefined' ? parseInt(localStorage.getItem('surfSuccessCount') || '0', 10) : 0;
        
        try {
            if (isFinish) {
                if (typeof window !== 'undefined') localStorage.setItem('surfSuccessCount', (count + 1).toString());
            }
            pushAiLog('user', `我现在的感受是：${action}`);

            clearTTSQueue();
            
            if (surfStyle === 'interactive') {
                await streamAiReminder({
                    mood: aiMood,
                    mode: 'urge_surfing',
                    surfStyle: 'interactive',
                    elapsedTime: elapsedSeconds,
                    totalTime: durationMinutes * 60,
                    sessionPhase: isFinish ? 'end' : 'middle',
                    history: aiHistoryRef.current,
                    userAction: action,
                    diagnosisProfile: surfDiagnosisRef.current,
                    practiceCount: count,
                    customSurfPrompts: surfPromptsConfig
                });
            } else if (surfStyle === 'immersive') {
                // Immersive Mode Action
                playbackQueueRef.current = []; // Clear queue on interrupt
                isFetchingBatchRef.current = true;
                
                const resultText = await streamAiReminder({
                    mood: aiMood,
                    mode: 'urge_surfing',
                    surfStyle: 'immersive',
                    elapsedTime: elapsedSeconds,
                    totalTime: durationMinutes * 60,
                    sessionPhase: isFinish ? 'end' : 'middle',
                    history: aiHistoryRef.current,
                    userAction: action,
                    diagnosisProfile: surfDiagnosisRef.current,
                    practiceCount: count,
                    customSurfPrompts: surfPromptsConfig
                }, true); // disableAutoQueue
                
                const sentences = resultText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                if (sentences.length > 0) {
                    const immediateSentence = sentences.shift()!;
                    const logIndex = startAiStreamLog();
                    let charIdx = 0;
                    const typeInterval = setInterval(() => {
                        if (charIdx < immediateSentence.length) {
                            appendAiStreamLog(logIndex, immediateSentence[charIdx]);
                            charIdx++;
                        } else {
                            clearInterval(typeInterval);
                            enqueueTTSChunk(immediateSentence);
                        }
                    }, 50); // 50ms per character
                    
                    playbackQueueRef.current = sentences; // Queue the rest
                }
                isFetchingBatchRef.current = false;
            } else if (surfStyle === 'system') {
                // System Mode Interrupt Action
                clearTTSQueue();
                if (systemWaitTimerRef.current) clearTimeout(systemWaitTimerRef.current);
                
                let sentences: string[] = [];
                if (buttonId && (scriptsInterrupt as any)[buttonId]) {
                    const versions = (scriptsInterrupt as any)[buttonId];
                    sentences = [...versions[Math.floor(Math.random() * versions.length)]];
                } else if (isFinish && (scriptsInterrupt as any)['complete']) {
                    const versions = (scriptsInterrupt as any)['complete'];
                    sentences = [...versions[Math.floor(Math.random() * versions.length)]];
                } else {
                    sentences = [action];
                }
                
                systemPriorityQueueRef.current = [...sentences];
                popNextSystemSentence();
            }
        } catch (e) {
            console.error("SURF Action API Failed", e);
            isFetchingBatchRef.current = false;
        } finally {
            surfBusyRef.current = false;
        }

        if (isFinish) {
            completePractice();
        }
    };

    // --- Local Notifications (for auto habit reminder) ---

    // --- Local Notifications (for auto habit reminder) ---
    const { scheduleBreakReminder } = useLocalNotifications();

    // playCompletionSound 已从 @/lib/audioUnlock 导入，使用共享 AudioContext

    // --- Refs ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hapticTimers = useRef<NodeJS.Timeout[]>([]);
    const requestRef = useRef<number>(0);
    const practiceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const practiceStartTimeRef = useRef<number>(0);
    const breathTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Animation State
    // We add 'diffuse' properties for the idle cloud state
    const animState = useRef({
        particles: [] as any[],
        hue: 200,
        textTargets: [] as { x: number, y: number }[], // NEW: Text Particle Targets
        bpmParticleStartIndex: 0, // NEW: Index where BPM particles start
        morphStartTime: 0, // NEW: When morphing begins
        dropParticleStartIndex: 0, // NEW: Index where Drop particles start
        sessionHeartRates: [] as number[], // Heart rates for curve drawing

        // Sync State (for stale closure fix)
        phase: "IDLE" as Phase,
        breathPhase: "INHALE" as BreathPhase,
        theme: "ROSE" as Theme, // Sync theme

        // Transition
        transitionStartTime: 0,
        transitionDuration: 2000,

        completionStartTime: 0, // NEW
        themeStartTime: 0, // NEW: For theme intro animations

        // Breath Cycle
        currentRadius: BASE_RADIUS,
        phaseStartTime: 0,
        phaseDuration: 0,
    });

    // --- Initialization ---
    useEffect(() => {
        setTimeLeft(durationMinutes * 60);
    }, [durationMinutes]);

    // --- Canvas Logic ---
    const initParticles = (width: number, height: number) => {
        const particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            // Structured (Target) Properties
            const angle = Math.random() * Math.PI * 2;
            const dist = (Math.random() * 0.5 + 0.5) * BASE_RADIUS;

            // Diffuse (Initial/Idle) Properties - Random Galaxy
            const diffuseX = (Math.random() - 0.5) * width * 1.5 + width / 2;
            const diffuseY = (Math.random() - 0.5) * height * 1.5 + height / 2;

            particles.push({
                // Current Pos (Starts as diffuse)
                x: diffuseX,
                y: diffuseY,

                // Diffuse State (Drift)
                dx: (Math.random() - 0.5) * 0.5,
                dy: (Math.random() - 0.5) * 0.5,
                diffuseX,
                diffuseY,

                // Structured State (Orbit)
                angle,
                dist,
                speed: 0.005 + Math.random() * 0.02,

                // Visuals
                size: Math.random() * 2 + 0.5,
                wobble: Math.random() * 20,
            });
        }
        animState.current.particles = particles;
    };

    // --- Theme Renderers ---

    /**
     * 🌹 Theme v3.0 Redesign: "The Quantum Rose" (Particle System)
     * "Rose is not a shape, but a frequency."
     * Replaces line drawing with a high-density particle field.
     */
    const renderRose = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const time = timestamp * 0.001;

        // --- 1. CONFIGURATION ---
        const baseHue = 340; // Deep Rose
        const k = 4; // 8 Petals (k=4)

        // --- 2. PARTICLE LOOP ---
        state.particles.forEach((p: any, i: number) => {
            // A. Target Calculation (The Ideal Rose)
            // Distribute particles along the curve parameter 'theta'
            // We use 'i' to determine the theta for this particle
            const theta = (i / state.particles.length) * Math.PI * 2 * k; // Wrap multiple times

            // Add some depth/volume: modifiy radius based on index to create "thick" petals
            const layerOffset = (i % 5) * 0.1;

            // Rose Equation: r = cos(k * theta)
            let rBase = Math.cos(k * theta);

            // Make it positive only usually creates 4 petals, allowing negative creates 8. 
            // Let's use the absolute value or just let it cross center for the full 8 petal look.

            // Apply scale
            // Breathing modulates the scale
            const currentScale = 200 * breathScale + 20 * Math.sin(time * 2);

            let targetR = rBase * currentScale * (1 - layerOffset * 0.2);

            // Convert to Cartesian
            let targetX = centerX + targetR * Math.cos(theta);
            let targetY = centerY + targetR * Math.sin(theta);

            // B. STATE: IDLE (Visual Tension)
            // In idle, particles vibrate/orbit around their target slightly
            if (transitionProgress < 1 || bloomProgress === 0) {
                // Lissajous orbit around the target point
                const tension = 10;
                const orbitSpeed = 2 + (i % 3);
                const orbitX = Math.cos(time * orbitSpeed + i) * tension;
                const orbitY = Math.sin(time * orbitSpeed + i) * tension;

                targetX += orbitX;
                targetY += orbitY;
            }

            // C. STATE: BLOOM / EXIT (Disperse)
            if (bloomProgress > 0) {
                // Particles spiral out
                const disperseAngle = Math.atan2(p.y - centerY, p.x - centerX);
                const disperseDist = 500 * bloomProgress * (1 + (i % 10) * 0.1);

                targetX = centerX + Math.cos(disperseAngle + bloomProgress * 2) * (currentScale + disperseDist);
                targetY = centerY + Math.sin(disperseAngle + bloomProgress * 2) * (currentScale + disperseDist);

                // Add some chaotic wind
                targetX += Math.sin(time * 5 + p.y * 0.01) * 20 * bloomProgress;
            }

            // D. PHYSICS (Interpolation)
            // Smoothly move particle 'p' towards 'target'
            // Use specialized 'rose' props on p if needed, or just reuse diffuseX/Y or x/y
            // For this transition to work with other themes, we usually interpolate 
            // derived coordinates (orbitX/Y) with p.diffuse (idle state of other themes).
            // But here, let's treat 'targetX/Y' as the active destination.

            // Since we are replacing the line logic which didn't use p.x/p.y persistence for the shape,
            // we will use the standard "transition" blend for entry/exit to other themes.
            // But within the theme, we want responsive movement.

            // Let's assume 'p.diffuseX' is valid from the generic init or other themes.
            // We want to pull p.diffuseX/Y towards our Rose Target when active.

            const dx = targetX - p.diffuseX;
            const dy = targetY - p.diffuseY;

            // Spring strength
            const spring = 0.05;
            p.diffuseX += dx * spring;
            p.diffuseY += dy * spring;

            // Apply transition from previous theme (if any)
            // 'transitionProgress' goes 0->1 when entering this theme.
            // The standard renderer logic usually interpolates:
            // finalX = p.diffuseX + (TargetShape - p.diffuseX) * transitionProgress
            // But here we are modifying p.diffuseX directly to BE the rose shape? 
            // Looking at 'renderAurora', it updates p.diffuseX/Y for idle, then calculates orbitX/Y for active.
            // Let's follow that pattern for consistency.

            // Let's say the Rose Target IS the computed orbit position.
            const orbitX = targetX - centerX; // Local coords
            const orbitY = targetY - centerY;

            // Final interpolation
            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            // E. RENDER
            // Visuals
            const petalIndex = Math.floor((theta / (Math.PI * 2)) * k * 2) % (k * 2);
            // Shade pinks with some variation
            const hueVar = Math.sin(i + time) * 10;
            const alpha = 0.6 + Math.sin(time * 3 + i) * 0.3; // Twinkle

            // Bloom fade out
            const bloomAlpha = alpha * (1 - bloomProgress);

            ctx.fillStyle = `hsla(${baseHue + hueVar}, 80%, 70%, ${bloomAlpha})`;

            // Additive glow
            ctx.globalCompositeOperation = 'lighter';

            ctx.beginPath();
            ctx.arc(finalX, finalY, p.size * (1 + breathScale * 0.5), 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.globalCompositeOperation = 'source-over'; // Reset
    };

    const renderAurora = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Aurora colors: Purple, Cyan, Green
        const baseHues = [280, 180, 120];

        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: MAGNETIC FLUX ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.001;
                // Vertical High Velocity Flow
                p.diffuseY -= 2 + Math.random();
                if (p.diffuseY < -50) p.diffuseY = height + 50;

                // Horizontal Magnetic Bands
                const bandIndex = i % 5;
                const bandOffset = (bandIndex - 2) * 120;
                // Sine wave tracking
                const wave = Math.sin(p.diffuseY * 0.005 + time + bandIndex) * 80;
                const targetX = centerX + bandOffset + wave;

                // Smoothly pull particles into the magnetic bands
                p.diffuseX += (targetX - p.diffuseX) * 0.1;

                // Add "Spark" jitter
                p.diffuseX += (Math.random() - 0.5) * 5;
            }

            // Structured Orbit logic
            p.angle += p.speed * 0.3;

            // Aurora forms vertical bands that wave horizontally
            const waveOffset = Math.sin(timestamp * 0.001 + p.angle * 2) * 50 * breathScale;
            const curtainY = Math.sin(p.angle * 4 + timestamp * 0.002) * 30;

            let effectiveDist = (p.dist * 0.5 + 80) * breathScale;
            let effectiveAlpha = 0.4 + Math.sin(timestamp * 0.003 + i * 0.5) * 0.3;

            // Bloom: Solar Storm - Particles accelerate into vertical light pillars (Beaming Up)
            let yOffset = 0;
            let bloomScale = 1;
            if (bloomProgress > 0) {
                // Squeeze horizontally to form beams
                const squeeze = 1 - bloomProgress * 0.95; // 1 -> 0.05
                effectiveDist *= squeeze;

                // Accelerate upwards exponentially
                yOffset = -Math.pow(bloomProgress, 3) * height * 1.5;

                // Stretch vertically
                bloomScale = 1 + bloomProgress * 10;

                // Fade to white/cyan brightness
                effectiveAlpha = 1.0 - bloomProgress * 0.2;
            }

            const orbitX = Math.cos(p.angle) * effectiveDist + waveOffset;
            const orbitY = (Math.sin(p.angle) * effectiveDist * 0.6 + curtainY) * bloomScale;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress + yOffset;

            if (transitionProgress < 1) effectiveAlpha *= 0.5;

            // Cycle through aurora colors
            const hueIndex = i % 3;
            const hue = baseHues[hueIndex] + Math.sin(timestamp * 0.001 + i * 0.1) * 20;

            ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size * 1.2, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderZen = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Zen: Minimalist concentric rings
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: 3D GYROSCOPE ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.001;
                const r = 220; // Large mechanical rings
                const group = i % 3;

                let x = 0, y = 0, z = 0;

                // Ring assignment
                if (group === 0) { // Ring X
                    const theta = p.angle + time;
                    y = r * Math.cos(theta);
                    z = r * Math.sin(theta);
                } else if (group === 1) { // Ring Y
                    const theta = p.angle + time * 1.2;
                    x = r * Math.cos(theta);
                    z = r * Math.sin(theta);
                } else { // Ring Z
                    const theta = p.angle + time * 0.8;
                    x = r * Math.cos(theta);
                    y = r * Math.sin(theta);
                }

                // Global Rotation of the mechanism
                const rotX = time * 0.2;
                const rotY = time * 0.3;

                // Rotate around X
                let y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
                let z1 = y * Math.sin(rotX) + z * Math.cos(rotX);
                y = y1; z = z1;

                // Rotate around Y
                let x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
                let z2 = x * Math.sin(rotY) + z * Math.cos(rotY);
                x = x1; z = z2;

                // Perspective project
                const scale = 350 / (350 - z);
                p.diffuseX = centerX + x * scale;
                p.diffuseY = centerY + y * scale;
            } else {
                // Active: Smooth drift
                p.diffuseX += p.dx * 0.2;
                p.diffuseY += p.dy * 0.2;
            }
            p.angle += p.speed * 0.15;

            // Concentric rings logic
            const ringIndex = Math.floor(p.dist / 30);
            let ringDist = (ringIndex * 40 + 60) * breathScale;

            let effectiveAlpha = 0.3 + (ringIndex % 2) * 0.2;

            const ripple = Math.sin(timestamp * 0.002 - ringIndex * 0.5) * 5;

            // Bloom: Singularity - All rings align and implode to the center
            if (bloomProgress > 0) {
                // Stop rippling

                // Implode Radius to 0
                const implodeFactor = 1 - Math.pow(bloomProgress, 0.5); // Fast start
                ringDist *= implodeFactor;

                // Flatten 3D tilt to 2D perfect circle as it implodes
                // We do this by overriding the final projection in the next step, 
                // but here we just reduce the distances.

                // Fade out at the very end
                if (bloomProgress > 0.8) effectiveAlpha *= (1 - (bloomProgress - 0.8) * 5);
            }

            const effectiveDist = ringDist + ripple * (1 - bloomProgress); // Reduce ripple
            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist;

            let finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            let finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            // Singularity Override
            if (bloomProgress > 0) {
                // Interpolate from 3D projected position (finalX) to 2D center (centerX)
                // Actually orbitX/Y are 2D circle coords. 
                // We want to transition from "Mechanical Gyro" (p.diffuseX) to "Perfect 2D Circle" then "Zero"
                // But p.diffuseX is frozen in idle. 
                // Let's just pull everything to center.

                finalX = centerX + (finalX - centerX) * (1 - bloomProgress * 0.5); // Pull to center
                finalY = centerY + (finalY - centerY) * (1 - bloomProgress * 0.5);

                // Also pull z-depth?
                // Just shrink.
            }

            if (transitionProgress < 1) effectiveAlpha *= 0.3;

            // Zen colors
            let hue = 45 + ringIndex * 5;
            let lightness = 85 - ringIndex * 3;

            if (bloomProgress > 0) {
                // Turn to pure white light before vanishing
                lightness = 85 + bloomProgress * 15;
                hue = 45;
            }

            ctx.fillStyle = `hsla(${hue}, 15%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderGalaxy = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Galaxy: Celestial Clockwork (Refined)
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: CELESTIAL CLOCKWORK ---
            if (transitionProgress < 1) {
                // Flattened Accretion Disk
                // Strict orbital paths, slow rotation

                const time = timestamp * 0.0001; // VERY Slow time

                // Distribution: dense center, sparse edges
                const r = 40 + Math.pow(i / state.particles.length, 0.8) * 300;

                // Keplerian Orbit Speed: slower at edges
                const orbitSpeed = 400 / (r * r + 100);
                const theta = i + time * orbitSpeed * 50;

                // Tilt the galaxy
                const tilt = 0.6; // 60 degrees tilt

                const rx = Math.cos(theta) * r;
                const ry = Math.sin(theta) * r * tilt;

                p.diffuseX = centerX + rx;
                p.diffuseY = centerY + ry;

                // Stabilize Z-depth for sorting/size (simulated)
                // Particles in "back" are smaller/dimmer
                const z = Math.sin(theta) * r * tilt;
                p.z = z;

            } else {
                p.diffuseX += p.dx * 0.3;
                p.diffuseY += p.dy * 0.3;
            }

            // Simplifed Active Spiral rotation
            const spiralFactor = p.dist * 0.01;
            const spinAccel = bloomProgress > 0 ? bloomProgress * 0.5 : 0;
            p.angle += p.speed * 0.4 + spiralFactor * 0.001 + spinAccel;

            // Spiral arm effect
            const armPhase = (p.angle * 2 + p.dist * 0.02 + timestamp * 0.0005) % (Math.PI * 2);
            const armIntensity = (Math.sin(armPhase) + 1) * 0.5;

            let effectiveDist = p.dist * breathScale * (0.8 + armIntensity * 0.4);
            let effectiveAlpha = 0.2 + armIntensity * 0.6;

            // Bloom: Warp Drive - Hyper-stretch into Z-space streaks
            if (bloomProgress > 0) {
                // Exponential Z-stretch
                const warp = Math.pow(bloomProgress, 4) * 5000;

                // Visual Warp: stretch away from center
                effectiveDist += warp;

                // Reduce alpha rapidly as they stretch to infinity
                effectiveAlpha *= (1 - bloomProgress * 0.5);
            }

            // Flatter Y for more drama during warp
            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist * (bloomProgress > 0 ? 0.1 : 0.6); // Flatten during warp

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) {
                // Custom Idle Alpha/Size based on Z-depth
                effectiveAlpha = 0.5 + Math.sin(timestamp * 0.001 + i) * 0.2;
                // Dim backside
                if ((p.z || 0) < 0) effectiveAlpha *= 0.5;
            } else {
                if (transitionProgress < 1) effectiveAlpha *= 0.5;
            }

            // Galaxy colors
            const baseHue = 240 + Math.sin(p.angle) * 40;
            const isStarCore = i % 20 === 0;
            const lightness = isStarCore ? 90 + Math.random() * 10 : 50 + armIntensity * 20;

            ctx.fillStyle = `hsla(${baseHue}, ${isStarCore ? 20 : 70}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;

            let size = isStarCore ? p.size * 2 : p.size;
            if (transitionProgress < 1) {
                // Perspective scale
                size = Math.max(0.5, p.size * (1 + (p.z || 0) * 0.002));
            }

            ctx.arc(finalX, finalY, size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderInferno = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Inferno: Flames rising upward
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: FIRE TORNADO ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.001;

                // Rising motion (Y decreases)
                const loopHeight = height + 200;
                let y = (timestamp * 0.5 + i * 2) % loopHeight;
                y = height + 100 - y; // Rise up from bottom

                // Funnel Shape (Wider at top)
                const yNorm = 1 - (y / height); // 0 (bottom) to 1 (top)
                const funnelRadius = 50 + Math.pow(yNorm, 2) * 200;

                // Fast Rotation
                const theta = i * 0.05 + time * 8;

                const x = Math.cos(theta) * funnelRadius;
                const z = Math.sin(theta) * funnelRadius; // Depth

                const scale = 400 / (400 - z * 0.5);

                p.diffuseX = centerX + x * scale;
                p.diffuseY = y;

                // Violent Shake
                p.diffuseX += (Math.random() - 0.5) * 10;
            } else {
                p.diffuseX += p.dx + Math.sin(timestamp * 0.01 + i) * 0.5;
                p.diffuseY += p.dy - 0.5;
            }
            p.angle += p.speed * 0.5;

            const flickerSpeed = 0.008;
            const flicker = Math.sin(timestamp * flickerSpeed + p.angle * 3 + i * 0.1) * 15;

            let effectiveDist = p.dist * breathScale + flicker;
            let effectiveAlpha = 0.4 + Math.sin(timestamp * 0.005 + i) * 0.3;

            const riseOffset = Math.sin(p.angle) * 30 * breathScale;

            // Bloom: Phoenix Ascension - Turn Blue/White and spiral up rapidly
            let ashY = 0;
            let ashColor = false;

            if (bloomProgress > 0) {
                ashColor = true; // Use blue/white palette

                // Rapid vertical ascent
                ashY = -Math.pow(bloomProgress, 2) * height * 1.5;

                // Tighten the spiral (reduce radius)
                effectiveDist *= (1 - bloomProgress * 0.8);

                // Spin faster
                const spin = bloomProgress * 15;
                // Add spin to orbit calc
                // We do this by modifying p.angle effectively in the orbit calc below? 
                // No, p.angle is read-only here. We can add offset to orbitX/Y calculation.
                p.tempAngleOffset = spin;

                effectiveAlpha *= (1 - bloomProgress * 0.2);
            } else {
                p.tempAngleOffset = 0;
            }

            const orbitX = Math.cos(p.angle + (p.tempAngleOffset || 0)) * effectiveDist;
            const orbitY = Math.sin(p.angle + (p.tempAngleOffset || 0)) * effectiveDist - riseOffset + ashY;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.5;

            // Color Logic
            let hue = 0;
            let saturation = 100;
            let lightness = 50;

            if (ashColor) {
                // Phoenix Colors: Blue -> White
                // Hue: 200 (Blue) -> 60 (Yellow/White) ? No, Blue flames are 200-240.
                const distRatio = p.dist / 150;
                hue = 200 + distRatio * 30; // 200-230
                saturation = 100;
                lightness = 50 + bloomProgress * 50; // Go to white
            } else {
                const distRatio = p.dist / 150;
                hue = 0 + distRatio * 45;
                lightness = 50 + distRatio * 20;
            }

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size * (1 + (p.dist / 150) * 0.5), 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderCrystal = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Crystal: Rainbow prism effect
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: ROTATING MONOLITH ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.0005;

                // Cube Grid Mapping
                // Map particles to a structured 3D grid
                const side = 12; // 12x12x12 = 1728
                const ix = i % side;
                const iy = Math.floor(i / side) % side;
                const iz = Math.floor(i / (side * side)) % side;

                const spacing = 35;
                const offset = (side * spacing) / 2;

                // Start centered
                let x = ix * spacing - offset;
                let y = iy * spacing - offset;
                let z = iz * spacing - offset;

                // 3D Rotation (Euler)
                const rotX = time;
                const rotY = time * 0.7;

                // Rotate X
                let y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
                let z1 = y * Math.sin(rotX) + z * Math.cos(rotX);
                y = y1; z = z1;

                // Rotate Y
                let x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
                let z2 = x * Math.sin(rotY) + z * Math.cos(rotY);
                x = x1; z = z2;

                const fov = 400;
                const scale = fov / (fov - z);

                p.diffuseX = centerX + x * scale;
                p.diffuseY = centerY + y * scale;
            } else {
                p.diffuseX += p.dx * 0.2;
                p.diffuseY += p.dy * 0.2;
            }
            p.angle += p.speed * 0.2;

            const facetAngle = Math.floor(p.angle / (Math.PI / 3)) * (Math.PI / 3);
            const shimmer = Math.sin(timestamp * 0.003 + i * 0.5) * 10;

            let effectiveDist = p.dist * breathScale + shimmer;
            let effectiveAlpha = 0.3 + Math.abs(Math.sin(timestamp * 0.002 + p.angle * 2)) * 0.5;

            // Bloom: Sublimation - Dissolve into upward floating mist
            let riseY = 0;
            let mistX = 0;
            if (bloomProgress > 0) {
                // Float Upwards
                riseY = -bloomProgress * height * 0.8;

                // Jitter X (Dissolving)
                mistX = (Math.random() - 0.5) * bloomProgress * 100;

                // Shrink Size (Sublime)
                // Note: we can't change p.size permanently, but we can fake it by alpha
                // or drawing logic. Let's rely on Alpha fade.
                effectiveAlpha *= (1 - bloomProgress);
            }

            const orbitX = Math.cos(p.angle) * effectiveDist + mistX;
            const orbitY = Math.sin(p.angle) * effectiveDist * 0.5 + riseY; // Flattened hexagon

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.4;

            // Rainbow prism colors
            const hue = (p.angle * 180 / Math.PI + timestamp * 0.05) % 360;
            const saturation = 80 + Math.sin(timestamp * 0.002 + i) * 15;

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, 70%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderSakura = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Sakura: Cherry blossoms drifting
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: WIND RIVER ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.001;

                // Flow Field: Smooth, laminar flow
                // Particles move from left to right with sine wave modulated Y

                // Reset to left if off screen
                if (p.diffuseX > width + 50) {
                    p.diffuseX = -50;
                    p.diffuseY = height * Math.random();
                }

                // Laminar Speed based on Y (faster in middle)
                const flowSpeed = 1.0 + Math.sin(p.diffuseY / height * Math.PI) * 1.5;
                p.diffuseX += flowSpeed;

                // Gentle Waviness (River path)
                const riverCurve = Math.sin(p.diffuseX * 0.002 + time * 0.5) * 0.5;
                p.diffuseY += riverCurve;

                // Micro-turbulence (Flutter)
                p.diffuseX += Math.sin(time * 5 + i) * 0.2;
                p.diffuseY += Math.cos(time * 3 + i) * 0.2;

            } else {
                p.diffuseX += p.dx + Math.sin(timestamp * 0.002 + i * 0.5) * 0.3;
                p.diffuseY += p.dy + 0.3;
            }
            p.angle += p.speed * 0.1;

            const sway = Math.sin(timestamp * 0.003 + p.angle * 2) * 30 * breathScale;
            const flutter = Math.cos(timestamp * 0.005 + i) * 10;

            let effectiveDist = p.dist * breathScale * 0.8 + sway;
            let effectiveAlpha = 0.4 + Math.sin(timestamp * 0.002 + i * 0.3) * 0.3;

            // Bloom: Petal Spiral - Double Helix Ascension
            let spiralX = 0;
            let spiralY = 0;
            if (bloomProgress > 0) {
                // Rising Spiral
                const rise = bloomProgress * height;
                spiralY = -rise;

                // Spiral Radius expansion
                const spiralRadius = bloomProgress * 200;
                spiralX = Math.cos(rise * 0.05 + i) * spiralRadius;

                effectiveAlpha *= (1 - bloomProgress * 0.5);
            }

            const orbitX = Math.cos(p.angle) * effectiveDist + flutter + spiralX;
            const orbitY = Math.sin(p.angle) * effectiveDist * 0.7 + spiralY;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.6;

            // Sakura colors
            // More pastel, less neon
            const hue = 340 + Math.sin(i * 0.1) * 10;
            const lightness = 85 + Math.sin(timestamp * 0.002 + i) * 10;
            const saturation = 50 + Math.random() * 20;

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;

            // Soft petals
            ctx.arc(finalX, finalY, p.size * 1.2, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderStarfall = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Starfall: Shooting stars
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: STAR TRAILS ---
            if (transitionProgress < 1) {
                // Circular Long-Exposure
                const time = timestamp * 0.0001;

                // Dist: Distance from Celestial Pole (Offset center)
                // Pole is at top-left
                const cx = width * 0.3;
                const cy = height * 0.3;

                // Use i to define stable radius/angle
                const r = 200 + (i % 100) * 10;
                const startAngle = i * 0.1;

                // Very slow rotation
                const currentAngle = startAngle - time;

                p.diffuseX = cx + Math.cos(currentAngle) * r;
                p.diffuseY = cy + Math.sin(currentAngle) * r;

                // Trails logic is handled in draw phase
            } else {
                const speed = 0.5 + (i % 10) * 0.1;
                p.diffuseX += p.dx * speed;
                p.diffuseY += p.dy * speed + 0.2;
            }
            p.angle += p.speed * 0.6;

            const streakLength = 15 + Math.sin(timestamp * 0.01 + i) * 5;

            let effectiveDist = p.dist * breathScale;
            let effectiveAlpha = 0.3 + Math.random() * 0.4;

            // Bloom: Falling Up - Gravity reversal, stars ascend rapidly
            if (bloomProgress > 0) {
                // Inverse gravity acceleration
                const lift = Math.pow(bloomProgress, 2) * height * 1.5;

                // Add strict vertical lift to orbitY calculation (offset)
                p.bloomLift = -lift;

                // Stretch vertical streaks (Star Wars jump style but up)
                // We can simulate this by drawing lines, or just moving particles fast

                // Fade out
                effectiveAlpha *= (1 - bloomProgress * 0.2);
                lightness = 100; // Turn white hot
            } else {
                p.bloomLift = 0;
            }

            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist + (p.bloomLift || 0);

            // Re-calc final position here to ensure we capture the lift
            // Note: finalX/Y are calculated in next lines, so we just need to ensure orbitY feeds into it.


            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.4;

            // Star colors
            const hue = 220 + Math.sin(i * 0.2) * 20; // Blueish
            let lightness = 80 + Math.sin(timestamp * 0.003 + i) * 20;
            const isMainStar = i % 15 === 0;

            // Supernova whiteness
            if (bloomProgress > 0) {
                lightness = 100 - (bloomProgress * 20); // Start white, fade slightly
            }

            ctx.fillStyle = `hsla(${hue}, ${bloomProgress > 0 ? 0 : 60}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();

            // Draw Streak if Falling (Idle) or if Main Star (Active)
            // For Idle: Draw circular arc trail ? No, simple trail is enough or just dot for "Star Trails" photo effect
            // Actually "Star Trails" implies long streaks.
            // Let's draw arcs for idle

            const showStreak = (isMainStar && transitionProgress > 0.5 && bloomProgress === 0);

            if (showStreak) {
                // Active Trajectory: Orbit
                const trailX = finalX - Math.cos(p.angle) * streakLength;
                const trailY = finalY - Math.sin(p.angle) * streakLength;

                ctx.moveTo(trailX, trailY);
                ctx.lineTo(finalX, finalY);
                ctx.strokeStyle = `hsla(${hue}, 80%, ${lightness}%, ${effectiveAlpha * 0.5})`;
                ctx.lineWidth = p.size;
                ctx.stroke();
            } else if (transitionProgress < 1) {
                // Idle: Draw Arc Tail (approximate)
                const arcLen = 0.05 + Math.random() * 0.05;
                const cx = width * 0.3;
                const cy = height * 0.3;
                const r = Math.sqrt(Math.pow(finalX - cx, 2) + Math.pow(finalY - cy, 2));
                const angle = Math.atan2(finalY - cy, finalX - cx);

                ctx.beginPath();
                ctx.arc(cx, cy, r, angle, angle + arcLen);
                ctx.strokeStyle = `hsla(${hue}, 60%, ${lightness}%, ${effectiveAlpha * 0.5})`;
                ctx.lineWidth = p.size * 0.5;
                ctx.stroke();
            }

            p.x = finalX; p.y = finalY;

            // Draw star head
            ctx.beginPath();
            ctx.arc(finalX, finalY, isMainStar ? p.size * 2 : p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderLotus = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        // Lotus: Peaceful multi-layered petals
        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: MANDALA GEOMETRY ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.0002;

                // Sacred 12-fold symmetry layout
                const petals = 12;
                const layers = 8;

                const layer = Math.floor(i / (PARTICLE_COUNT / layers));
                const petal = i % petals;

                const baseR = (layer + 1) * 35;
                const baseTheta = (petal / petals) * Math.PI * 2;

                // Complex rotation per layer (Alternating directions)
                const dir = layer % 2 === 0 ? 1 : -1;
                const theta = baseTheta + time * dir + layer * 0.1;

                // Breathing/Pulsing Effect
                const pulse = Math.sin(timestamp * 0.001 + layer) * 10;
                const r = baseR + pulse;

                p.diffuseX = centerX + Math.cos(theta) * r;
                p.diffuseY = centerY + Math.sin(theta) * r;
            } else {
                p.diffuseX += p.dx * 0.1;
                p.diffuseY += p.dy * 0.1;
            }
            p.angle += p.speed * 0.08;

            const layer = Math.floor(p.dist / 40);

            const openAmount = breathScale * (1 + layer * 0.3);
            let effectiveDist = (layer * 45 + 50) * openAmount;

            const float = Math.sin(timestamp * 0.001 + layer) * 3;
            effectiveDist += float;

            let effectiveAlpha = 0.4 + (1 - layer * 0.1);

            // Bloom: Golden Enlightenment - Full radial expansion into pure gold light
            let expansion = 0;
            if (bloomProgress > 0) {
                // Expand Layers Outward significantly
                expansion = bloomProgress * 300;
                effectiveDist += expansion;

                // Fade? No, staying bright until end
                effectiveAlpha = Math.max(0, effectiveAlpha * (1 - bloomProgress * 0.1));
            }

            const orbitX = Math.cos(p.angle) * effectiveDist;
            const orbitY = Math.sin(p.angle) * effectiveDist * 0.9;

            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.4;

            // Lotus colors
            let hue = 40 + layer * 5;
            let saturation = 20 + layer * 10;
            let lightness = 90 - layer * 5;

            // Bloom glow
            if (bloomProgress > 0) {
                // Transition to Pure Gold
                hue = 45; // Gold
                saturation = 80 + bloomProgress * 20; // Max saturation
                lightness = 70 + bloomProgress * 30; // Bright

                // Add "shine" (no implementation needed, just color)
            }

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size * (1 + layer * 0.2), 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderLiquid = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;
        const now = timestamp * 0.001;

        state.particles.forEach((p: any, i: number) => {
            const fluidNoise = Math.sin(now * 0.4 + p.angle * 2) * Math.cos(now * 0.3 + p.dist * 0.01);

            // --- IDLE: SILK TIDES ---
            if (transitionProgress < 1) {
                const time = timestamp * 0.0005;

                // 3D Sine Wave Grid (Silk Fabric)
                // Particles arranged in a loose grid that undulates

                const cols = 25;
                const row = Math.floor(i / cols);
                const col = i % cols;

                // Grid spacing
                const spacing = 30;
                const offsetX = (cols * spacing) / 2;
                const offsetY = (state.particles.length / cols * spacing) / 2;

                const baseX = col * spacing - offsetX + centerX;
                const baseY = row * spacing - offsetY + centerY;

                // Diagonal Wave flow
                const wave1 = Math.sin(col * 0.2 + row * 0.1 + time * 2) * 20;
                const wave2 = Math.cos(col * 0.1 - row * 0.2 + time * 3) * 20;

                // Viscous drifting
                p.diffuseX = baseX + wave1;
                p.diffuseY = baseY + wave2;

                // Add depth perspective (pseudo-3D)
                // Center is "higher" (closer)
                const distToCenter = Math.sqrt(Math.pow(p.diffuseX - centerX, 2) + Math.pow(p.diffuseY - centerY, 2));
                const z = Math.max(0, 100 - distToCenter * 0.2);
                const scale = 1 + z * 0.002;

                p.diffuseX = centerX + (p.diffuseX - centerX) * scale;
                p.diffuseY = centerY + (p.diffuseY - centerY) * scale;

            } else {
                // Active State: Organic rotation
                p.angle += 0.002 + Math.sin(now * 0.5 + i * 0.1) * 0.001;
            }

            const tension = 1 - (breathScale - 1);
            const displacement = fluidNoise * 20 * tension;
            const lensEffect = Math.sin(p.angle * 6 + now) * 12;
            let targetDist = (p.dist + displacement + lensEffect) * breathScale;

            // Bloom: Vaporize - Rise up as bubbles and pop
            let bubbleY = 0;
            if (bloomProgress > 0) {
                // Rise Up
                bubbleY = -bloomProgress * height * 0.8;

                // Jiggle (Boiling)
                const jiggle = Math.sin(timestamp * 0.05 + i) * 10 * bloomProgress;
                effectiveDist += jiggle;

                // Expand rings slightly
                targetDist += bloomProgress * 50;

                effectiveAlpha *= (1 - bloomProgress * 0.4);
            }

            const burstX = 0;
            const burstY = bubbleY;

            const orbitX = Math.cos(p.angle) * targetDist + burstX;
            const orbitY = Math.sin(p.angle) * targetDist + burstY;
            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            const dot = Math.abs(Math.sin(p.angle + now * 0.5));
            const fresnel = Math.pow(dot, 4);

            // Glass Color Strategy (Strict)
            // Mercury: Silver/Chrome
            const baseHue = 200; // Slight blue tint for metallic feel
            const h = baseHue;
            const s = 0 + fresnel * 10; // Very low saturation (Silver)
            const l = 40 + fresnel * 50; // High contrast metallic
            const alpha = 0.4 + fresnel * 0.6; // Opaque-ish

            // DRAW BODY - OPTIMIZED
            ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;

            ctx.beginPath();
            const bodySize = p.size * (0.9 + fresnel * 0.5);
            ctx.arc(finalX, finalY, bodySize, 0, Math.PI * 2);
            ctx.fill();

            // DRAW SPECULAR
            if (fresnel > 0.6 || Math.sin(now * 3 + i) > 0.9) {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + fresnel * 0.3})`;
                ctx.beginPath();
                ctx.arc(finalX - bodySize * 0.25, finalY - bodySize * 0.25, bodySize * 0.35, 0, Math.PI * 2);
                ctx.fill();
            }

            // ctx.shadowBlur = 0; // Not needed as we didn't set it
            p.x = finalX; p.y = finalY;
        });
    };

    const renderSurf = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const elapsedSeconds = state.elapsedSeconds || 0;
        const tMinutes = elapsedSeconds / 60;
        
        let urgeIntensity = 0;
        if (state.phase === "IDLE") {
            // In the theme selection page, simulate a gentle, breathing swell so it doesn't look stuck
            urgeIntensity = 0.3 + Math.sin(timestamp * 0.001) * 0.15; 
        } else {
            // Psychological Urge Curve: 0m->0, 1m->1, 3m->1, 5m->0.1, >5m->0.1
            if (tMinutes < 1) urgeIntensity = tMinutes; // Rising
            else if (tMinutes < 3) urgeIntensity = 1; // Peak Urge
            else if (tMinutes < 5) urgeIntensity = Math.max(0.05, 1 - (tMinutes - 3) / 2); // Receding
            else urgeIntensity = 0.05; // Calm baseline
        }
        
        // Extremely smooth, localized time
        const speed = 0.0008;
        const now = timestamp * speed;

        const centerX = width / 2;
        const horizonY = height * 0.7; // The base sea level is in the lower third

        state.particles.forEach((p: any, i: number) => {
            // Pseudorandom organic distribution
            const hashU = Math.abs(Math.sin(i * 11.111)); // Horizontal scatter (0 to 1)
            const u = hashU; 
            
            // Depth distribution (0 is surface, 1 is abyss). Cubing creates a thick "skin" near 0.
            const depthHash = Math.abs(Math.sin(i * 99.123)); 
            const depthFactor = depthHash * depthHash * depthHash; 
            
            // Absolutely NO horizontal scrolling. This cures the motion sickness entirely.
            const xNormalized = u - 0.5; // -0.5 to 0.5
            const targetX = centerX + xNormalized * width * 1.5; // Spread wider than screen
            
            // Asymmetric Gaussian Curve (steeper on right side) to mimic a "Breaking Wave" profile
            const skew = 1 + xNormalized * 2.0; 
            const skewedX = xNormalized * Math.max(0.2, skew);
            const spread = 0.04 + urgeIntensity * 0.04; 
            const hump = Math.exp(-(skewedX * skewedX) / spread);
            
            // Huge towering peak during intense urges
            const amplitude = 30 + urgeIntensity * (height * 0.35); 
            
            // Vertical liquid ripple (adds organic life without shifting particle X position)
            const ripple = Math.sin(u * Math.PI * 15 - now * 2) * (3 + urgeIntensity * 8);
            
            // Combine breath, hump, and ripple for the surface height
            const surfaceY = horizonY - hump * amplitude * breathScale + ripple;
            
            // Drop particles downward into the deep water
            const maxDepth = height * 0.4;
            const targetY = surfaceY + depthFactor * maxDepth;

            // Soft suspended floating orbit
            const floatX = Math.sin(now + i) * (5 + hump * 5);
            const floatY = Math.cos(now + i * 1.5) * (5 + hump * 5);

            p.diffuseX = p.diffuseX || p.x;
            p.diffuseY = p.diffuseY || p.y;

            if (transitionProgress < 0.01) {
                // IDLE preview: drive particles directly to the wave shape
                p.diffuseX += ((targetX + floatX) - p.diffuseX) * 0.03;
                p.diffuseY += ((targetY + floatY) - p.diffuseY) * 0.03;
            } else {
                p.diffuseX += ((targetX + floatX) - p.diffuseX) * 0.03 * transitionProgress;
                p.diffuseY += ((targetY + floatY) - p.diffuseY) * 0.03 * transitionProgress;
            }
            p.x = p.diffuseX;
            p.y = p.diffuseY;

            // Deep emotional coloring
            const isSurface = depthFactor < 0.05;
            
            let hue = 210 - (1 - depthFactor) * 20; // Abyss is teal, surface is blue
            if (isSurface) hue = 190 + hump * 15; // Wave crest is bright cyan
            
            let saturation = 40 + urgeIntensity * 40 + hump * 20;

            let lightness = 8 + (1 - depthFactor) * 15; // Dark depths
            if (isSurface) {
                lightness += 15 + hump * 50 * urgeIntensity; // Glow at the crest
            }
            
            const alpha = (0.2 + (1 - depthFactor) * 0.8) * (0.4 + bloomProgress * 0.6);
            
            // Crest particles are large and glowing, abyss particles are dust
            const particleSize = p.size * (isSurface ? 1.5 + hump * urgeIntensity : 0.6 + (1 - depthFactor) * 0.6);

            ctx.beginPath();
            ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
            ctx.fill();
        });
    };

    const renderPrism = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const centerX = width / 2;
        const centerY = height / 2;

        state.particles.forEach((p: any, i: number) => {
            // --- IDLE: LASER GRID ---
            if (transitionProgress < 1) {
                // Initialize Grid Direction if missing
                if (!p.gridDir) {
                    p.gridDir = Math.random() > 0.5 ? 'x' : 'y';
                    p.gridSpeed = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 5);
                }

                // Random 90 degree turn (Cybernetic randomness)
                if (Math.random() < 0.02) {
                    p.gridDir = p.gridDir === 'x' ? 'y' : 'x';
                    p.gridSpeed = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 5);
                }

                // Move
                if (p.gridDir === 'x') p.diffuseX += p.gridSpeed;
                else p.diffuseY += p.gridSpeed;

                // Wrap around edges
                if (p.diffuseX < 0) p.diffuseX = width;
                if (p.diffuseX > width) p.diffuseX = 0;
                if (p.diffuseY < 0) p.diffuseY = height;
                if (p.diffuseY > height) p.diffuseY = 0;
            } else {
                p.diffuseX += p.dx * 0.1;
                p.diffuseY += p.dy * 0.1;
            }
            p.angle += p.speed * 0.15;

            const numSides = 6;
            const angleOffset = (Math.PI * 2 / numSides) * (i % numSides);
            const baseAngle = p.angle + angleOffset;
            const shimmer = Math.sin(timestamp * 0.004 + i * 0.2) * 10;
            let effectiveDist = (p.dist * 0.8 + shimmer) * breathScale;
            let effectiveAlpha = 0.4 + Math.abs(Math.sin(timestamp * 0.002 + p.angle * 3)) * 0.4;

            // Bloom: Data Transmission - Particles snap to axes and shoot out at light speed
            let burstX = 0;
            let burstY = 0;

            if (bloomProgress > 0) {
                const speed = bloomProgress * 2000;
                // Determine Axis based on particle index
                // (simulating system bus transmission)
                if (i % 2 === 0) {
                    // Horizontal Move
                    const dir = (i % 4 === 0) ? 1 : -1;
                    burstX = dir * speed;
                } else {
                    // Vertical Move
                    const dir = (i % 4 === 1) ? 1 : -1;
                    burstY = dir * speed;
                }

                // Turn white/cyan
                effectiveAlpha *= (1 - bloomProgress * 0.1);
            }

            const orbitX = Math.cos(baseAngle) * effectiveDist + burstX;
            const orbitY = Math.sin(baseAngle) * effectiveDist + burstY;
            const finalX = p.diffuseX + (centerX + orbitX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (centerY + orbitY - p.diffuseY) * transitionProgress;

            if (transitionProgress < 1) effectiveAlpha *= 0.5;

            const hue = (timestamp * 0.02 + i * 0.5) % 360;
            const saturation = 70 + Math.sin(timestamp * 0.003 + i) * 20;
            const lightness = 70 + Math.cos(timestamp * 0.002 + i) * 10;

            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${effectiveAlpha})`;
            ctx.beginPath();
            p.x = finalX; p.y = finalY;
            ctx.arc(finalX, finalY, p.size * 1.1, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const renderSphere = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, timestamp: number, transitionProgress: number, bloomProgress: number, breathScale: number) => {
        const isMobile = width <= 768;
        const centerX = width / 2;
        const centerY = height / 2 + (isMobile ? Math.min(height * 0.02, 20) : 0);
        const now = Date.now();
        const introElapsed = now - (state.themeStartTime || 0);

        // --- 1. INTRO: "Celestial Assembly" (Elegant Swirl) ---
        // 0s -> 2.4s: Particles gently spiral in from a nebula
        let introExpansion = 0;
        let introRotation = 0;
        let introAlpha = 1;

        if (transitionProgress < 1 && introElapsed < 2400) {
            const introDuration = 2400;
            const progress = Math.min(introElapsed / introDuration, 1);

            // "Elegant Arrival": Smooth easing (EaseOutCubic)
            const ease = 1 - Math.pow(1 - progress, 3);

            introExpansion = (1 - ease) * 1200; // Start moderately far
            introRotation = (1 - ease) * Math.PI * 1.5; // Soft spiral
            introAlpha = ease; // Fade in gracefully
        }

        state.particles.forEach((p: any, i: number) => {
            // --- IDLE STATE: "Quantum Cloud" ---
            // Instead of static rings, a vibrating, shifting swarm that roughly holds shape
            if (transitionProgress < 1) {
                // Chaotic "Electron" movement
                const time = timestamp * 0.001;
                const chaoticNoise = Math.sin(time + i * 0.1) + Math.cos(time * 0.5 + p.angle);

                // Target: Loose sphere distribution
                // We use the same sphere math but with added noise
                const phi = Math.acos(1 - (2 * i) / PARTICLE_COUNT);

                // Add Intro Spiral Rotation 
                const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi + time * 0.2 + introRotation;

                // Radius breathes heavily in idle
                const idlePulse = Math.sin(time * 2) * 20;
                let r = ((isMobile ? 186 : 160) + idlePulse) + chaoticNoise * 15;

                // 3D Coords
                let x = r * Math.sin(phi) * Math.cos(theta);
                let y = r * Math.sin(phi) * Math.sin(theta);
                let z = r * Math.cos(phi);

                // Add random orbit jitter
                x += Math.sin(time * 3 + i) * 10;
                y += Math.cos(time * 2 + i) * 10;

                // Project
                const fov = 350;
                const scale = fov / (fov - z);
                const targetIdleX = centerX + x * scale;
                const targetIdleY = centerY + y * scale;

                // Apply Implosion Offset (Radial + Spiral twisting visually achieved by theta rotation above)
                // We physically push them out radially for the "Diffusion" feel
                const dx = targetIdleX - centerX;
                const dy = targetIdleY - centerY;
                const distRaw = Math.sqrt(dx * dx + dy * dy) || 0.001;
                const nx = dx / distRaw;
                const ny = dy / distRaw;

                // Force "Diffusion" - if introExpansion is high, they are far away.
                // Also add some random Z-depth noise to the expansion so they don't look like a flat sheet expanding
                const expansionZ = introExpansion * (1 + Math.sin(i) * 0.5);

                const finalIntroX = targetIdleX + nx * expansionZ;
                const finalIntroY = targetIdleY + ny * expansionZ;

                p.diffuseX += (finalIntroX - p.diffuseX) * 0.1; // Softer spring for elegance
                p.diffuseY += (finalIntroY - p.diffuseY) * 0.1;
            }

            // --- ACTIVE STATE: Perfect Sphere ---
            // Sphere rotation angle (Y-axis)
            const rotY = timestamp * 0.0003;

            // Map to Sphere (Golden Spiral Distribution)
            const phi = Math.acos(1 - (2 * i) / PARTICLE_COUNT);
            const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi + rotY;

            let r = (isMobile ? 162 : 130) * breathScale;

            // Bloom Expansion
            if (bloomProgress > 0) {
                r += bloomProgress * 400;
            }

            // 3D Cartesian Coordinates
            let x = r * Math.sin(phi) * Math.cos(theta);
            let y = r * Math.sin(phi) * Math.sin(theta);
            let z = r * Math.cos(phi);

            // Tilt Sphere (X-axis rotation)
            const tilt = 0.4;
            const y_t = y * Math.cos(tilt) - z * Math.sin(tilt);
            const z_t = y * Math.sin(tilt) + z * Math.cos(tilt);
            y = y_t;
            z = z_t;

            // Perspective Projection
            const fov = 350;
            const scale = fov / (fov - z);
            const projX = x * scale;
            const projY = y * scale;

            const targetX = centerX + projX;
            const targetY = centerY + projY;

            // Strict interpolation handles the transition from "Cloud" to "Sphere"
            const finalX = p.diffuseX + (targetX - p.diffuseX) * transitionProgress;
            const finalY = p.diffuseY + (targetY - p.diffuseY) * transitionProgress;

            // Colors: Blue & Gold Interleaved
            const isGold = i % 15 === 0 || (i % 23 === 0);
            const hue = isGold ? 42 : 215;
            const sat = isGold ? 95 : 75;
            // Lighting based on depth (z)
            const lightness = isGold ? 60 + (z / r) * 20 : 55 + (z / r) * 25;
            let alpha = 0.5 + (z / r) * 0.5; // Fade back points

            if (transitionProgress < 1 && introElapsed < 2400) {
                alpha *= introAlpha; // Apply intro fade
            }
            if (bloomProgress > 0) alpha *= (1 - bloomProgress);

            ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lightness}%, ${Math.min(alpha, 1)})`;
            ctx.beginPath();
            const size = p.size * scale * (isGold ? 1.6 : 1.1);
            ctx.arc(finalX, finalY, Math.max(0, size), 0, Math.PI * 2);
            ctx.fill();
        });
    };

    const updateParticles = (timestamp: number, width: number, height: number, ctx: CanvasRenderingContext2D) => {
        const state = animState.current;
        const widthHalf = width / 2;
        const heightHalf = height / 2;

        // --- 1. Transition Logic ---
        const now = Date.now();
        let transitionProgress = 0;
        let bloomProgress = 0;

        if (state.phase === "TRANSITION_TO_PRACTICE") {
            const elapsed = now - state.transitionStartTime;
            transitionProgress = Math.min(elapsed / state.transitionDuration, 1);
            transitionProgress = easeInOutCubic(transitionProgress);
        } else if (state.phase === "PRACTICING" || state.phase === "COUNTDOWN") {
            transitionProgress = 1;
        } else if (state.phase === "COMPLETED" || state.phase === "SUMMARY") {
            transitionProgress = 1;
            const elapsed = now - (state.completionStartTime || now);
            bloomProgress = Math.min(elapsed / 3000, 1);
            if (state.phase === "SUMMARY") bloomProgress = 1; // Keep fully bloomed
            else if (state.theme === "ROSE") bloomProgress = 1 - Math.pow(1 - bloomProgress, 3);
            else bloomProgress = elapsed / 3000; // Linear for others or custom
        }

        // --- 2. Breath Logic ---
        let breathScale = 1;
        if (state.phase === "PRACTICING" || state.phase === "COMPLETED") {
            const elapsed = now - state.phaseStartTime;
            if (state.phase === "PRACTICING") {
                const breathProg = Math.min(elapsed / state.phaseDuration, 1);
                const smoothedBreath = easeInOutCubic(breathProg);

                if (state.breathPhase === "INHALE") {
                    state.currentRadius = BASE_RADIUS + (EXPAND_RADIUS - BASE_RADIUS) * smoothedBreath;
                    state.hue = 200 + (20 * smoothedBreath);
                } else if (state.breathPhase === "HOLD") {
                    state.currentRadius = EXPAND_RADIUS + Math.sin(timestamp * 0.003) * 5;
                    state.hue = 220;
                } else if (state.breathPhase === "EXHALE") {
                    state.currentRadius = EXPAND_RADIUS - (EXPAND_RADIUS - BASE_RADIUS) * smoothedBreath;
                    state.hue = 220 - (20 * smoothedBreath);
                }
            }
            breathScale = state.currentRadius / BASE_RADIUS;
        } else {
            state.currentRadius = BASE_RADIUS + Math.sin(timestamp * 0.001) * 10;
            breathScale = state.currentRadius / BASE_RADIUS;
        }

        // --- 3. Draw & Dispatch ---
        // Clear with Fade
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        ctx.fillRect(0, 0, width, height);

        if (state.phase === "SUMMARY" && state.textTargets && state.textTargets.length > 0) {
            renderTextMorph(ctx, state, width, height, now);
        } else if (state.theme === "SURF") {
            renderSurf(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "LIQUID") {
            renderLiquid(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "AURORA") {
            renderAurora(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "ZEN") {
            renderZen(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "GALAXY") {
            renderGalaxy(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "INFERNO") {
            renderInferno(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "CRYSTAL") {
            renderCrystal(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "SAKURA") {
            renderSakura(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "STARFALL") {
            renderStarfall(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "LOTUS") {
            renderLotus(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "PRISM") {
            renderPrism(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else if (state.theme === "SPHERE") {
            renderSphere(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale);
        } else {
            renderRose(ctx, state, width, height, timestamp, transitionProgress, bloomProgress, breathScale); // Default
        }
    };

    const draw = (time: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        updateParticles(time, canvas.width, canvas.height, ctx);
        requestRef.current = requestAnimationFrame(draw);
    };

    useEffect(() => {
        const canvas = canvasRef.current;

        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // Fix: Initialize themeStartTime so intro plays on reload
            animState.current.themeStartTime = Date.now();
            animState.current.theme = selectedTheme;

            initParticles(canvas.width, canvas.height);
            requestRef.current = requestAnimationFrame(draw);
        }

        const handleResize = () => {
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // --- Save Theme Preference ---
    useEffect(() => {
        localStorage.setItem("practiceTheme", selectedTheme);
    }, [selectedTheme]);

    // --- Logic ---
    const clearHapticTimers = () => {
        hapticTimers.current.forEach(t => clearTimeout(t));
        hapticTimers.current = [];
    };

    const playHapticPattern = (phaseType: BreathPhase) => {
        clearHapticTimers();

        if (phaseType === "INHALE") {
            // 🌬️ 连续感：70次震动，每57ms一次，从轻到重
            // Light×23 → Medium×23 → Heavy×24
            for (let i = 0; i < 70; i++) {
                const delay = i * 57; // 0, 57, 114, ... 3933
                let trigger: () => void;
                if (i < 23) {
                    trigger = triggerLight;
                } else if (i < 46) {
                    trigger = triggerMedium;
                } else {
                    trigger = triggerHeavy;
                }
                hapticTimers.current.push(setTimeout(trigger, delay));
            }
        } else if (phaseType === "HOLD") {
            // 💓 心跳感：双击节奏 (thump-thump... thump-thump...)
            // 每对心跳间隔约2秒
            const heartbeat = (delay: number) => {
                hapticTimers.current.push(
                    setTimeout(triggerMedium, delay),
                    setTimeout(triggerLight, delay + 150),
                );
            };
            heartbeat(0);
            heartbeat(2000);
            heartbeat(4000);
            heartbeat(6000);
        } else if (phaseType === "EXHALE") {
            // 🍃 连续释放感：32次震动，每250ms一次，从重到轻
            // Heavy×11 → Medium×11 → Light×10
            for (let i = 0; i < 32; i++) {
                const delay = i * 250; // 0, 250, 500, ... 7750
                let trigger: () => void;
                if (i < 11) {
                    trigger = triggerHeavy;
                } else if (i < 22) {
                    trigger = triggerMedium;
                } else {
                    trigger = triggerLight;
                }
                hapticTimers.current.push(setTimeout(trigger, delay));
            }
        }
    };

    // --- Keep Awake ---
    useEffect(() => {
        const isPracticing = phase === "PRACTICING" || phase === "TRANSITION_TO_PRACTICE" || phase === "COUNTDOWN";

        if (isPracticing) {
            void activateKeepAwake();
        } else {
            void deactivateKeepAwake();
        }

    }, [activateKeepAwake, deactivateKeepAwake, phase]);

    useEffect(() => {
        return () => {
            void deactivateKeepAwake();
        };
    }, [deactivateKeepAwake]);

    useEffect(() => {
        // Sync Ref for Animation Loop
        animState.current.phase = phase;
        animState.current.breathPhase = breathPhase;
        if (animState.current.theme !== selectedTheme) {
            animState.current.theme = selectedTheme;
            animState.current.themeStartTime = Date.now(); // RESET INTRO TIMER
        }

        animState.current.phaseStartTime = Date.now();
        if (breathPhase === "INHALE") animState.current.phaseDuration = currentPattern.INHALE;
        if (breathPhase === "HOLD") animState.current.phaseDuration = currentPattern.HOLD;
        if (breathPhase === "EXHALE") animState.current.phaseDuration = currentPattern.EXHALE;

        // Haptics Trigger
        if (phase === "PRACTICING") {
            playHapticPattern(breathPhase);
        }
    }, [breathPhase, phase, selectedTheme]); // Added selectedTheme

    const handleStart = () => {
        // Start iOS PWA keep-awake fallback inside the direct user gesture.
        void activateKeepAwake();

        // 🔥 CRITICAL: Unlock audio FIRST in the synchronous user click context
        // This must happen before any setTimeout/async breaks the interaction chain
        unlockAudio();

        // 1. Trigger Transition (Particles Implode)
        setPhase("TRANSITION_TO_PRACTICE");
        animState.current.transitionStartTime = Date.now();
        triggerMedium();

        // 2. Wait for transition (2s) then start countdown
        setTimeout(() => {
            if (selectedTheme === "SURF") {
                setPhase("PREP_SURF");
            } else {
                setPhase("COUNTDOWN");
                setCountdown(3);
            }
        }, 2000); // 2s transition matches animState.transitionDuration
    };

    const startPractice = async () => {
        // Safety Clear: Prevent multiple intervals from running
        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        setPhase("PRACTICING");
        setBreathPhase("INHALE");
        practiceStartTimeRef.current = Date.now();

        // 📊 Record Session Start to Database
        try {
            const themeName = THEMES[selectedTheme]?.name || "正式练习";
            createMeditationSession({
                topicId: `practice-${selectedTheme.toLowerCase()}`,
                topicName: `正式练习 - ${themeName}`,
            }).then((data) => {
                if (data?.id) setCurrentSessionId(data.id);
            }).catch(e => console.error("Failed to start session recording", e));
        } catch (e) {
            console.error("Failed to start session recording", e);
        }

        // Start Heart Rate Monitoring (if authorized)
        if (!isAuthorized) {
            const granted = await requestPermission();
            if (granted) startMonitoring(true); // Pass true to bypass state timing issue
        } else {
            startMonitoring();
        }

        // 🎵 Start Binaural Beats if enabled
        // 🎵 Start Binaural Beats if enabled
        // NOW MANAGED GLOBALLY VIA MIXER. NO AUTO-START HERE.

        // Start Recursive Cycle
        runBreathingCycle("INHALE");

        // Timer
        setTimeLeft(durationMinutes * 60);
        setElapsedSeconds(0);
        animState.current.elapsedSeconds = 0;
        practiceTimerRef.current = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
            setElapsedSeconds((prev) => {
                animState.current.elapsedSeconds = prev + 1;
                return prev + 1;
            });
        }, 1000);
    };

    const runBreathingCycle = (currentPhase: BreathPhase) => {
        // Use a ref-based check for the phase to avoid stale closure issues
        if (animState.current.phase === "COMPLETED" || animState.current.phase === "SUMMARY") return;

        let nextPhase: BreathPhase;
        let duration: number;

        switch (currentPhase) {
            case "INHALE":
                // Skip HOLD if duration is 0
                nextPhase = currentPattern.HOLD > 0 ? "HOLD" : "EXHALE";
                duration = currentPattern.INHALE;
                break;
            case "HOLD":
                nextPhase = "EXHALE";
                duration = currentPattern.HOLD;
                break;
            case "EXHALE":
                nextPhase = "INHALE";
                duration = currentPattern.EXHALE;
                break;
        }

        setBreathPhase(currentPhase);

        breathTimerRef.current = setTimeout(() => {
            runBreathingCycle(nextPhase);
        }, duration);
    };

    const completePractice = () => {
        if (phase === "COMPLETED" || phase === "SUMMARY") return; // Prevent double trigger

        setPhase("COMPLETED");
        animState.current.completionStartTime = Date.now(); // Start dispersion

        // 1. Capture Session Data IMMEDIATELY
        const elapsedSeconds = Math.round((Date.now() - practiceStartTimeRef.current) / 1000);
        const currentHRHistory = [...heartRateHistory];

        setSessionDuration(elapsedSeconds);
        setSessionHeartRates(currentHRHistory);

        // 📊 Record Session End to Database
        if (currentSessionId) {
            completeMeditationSession(currentSessionId, elapsedSeconds).then(() => {
                setCurrentSessionId(null); // Clear for next session

                // 🔔 Auto-refresh break reminder (reschedule for 3 days from now)
                scheduleBreakReminder(3).catch(e =>
                    console.log("[Practice] Break reminder refresh skipped:", e)
                );
            }).catch(e => console.error("Failed to end session recording", e));
        }

        // Stop Heart Rate Monitoring
        stopMonitoring();

        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
        clearHapticTimers();

        // 🎊 完成反馈
        triggerHeavy();
        window.setTimeout(() => triggerHeavy(), 150);
        window.setTimeout(() => triggerHeavy(), 300);
        window.setTimeout(() => {
            triggerSuccess();
            playCompletionSound();
        }, 500);

        // Show summary after animation completes
        window.setTimeout(() => {
            setPhase("SUMMARY");

            // --- Generate Text Targets for Particles ---
            const durationText = formatTime(elapsedSeconds);

            // Calculate Stats
            const avgBpm = currentHRHistory.length > 0
                ? Math.round(currentHRHistory.reduce((a, b) => a + b, 0) / currentHRHistory.length)
                : 0;
            const bpmText = avgBpm > 0 ? avgBpm.toString() : "--"; // Just the number is cleaner

            // Calculate BPM Difference
            const startBpm = currentHRHistory[0] || 0;
            const endBpm = currentHRHistory[currentHRHistory.length - 1] || 0;
            const diff = endBpm - startBpm;
            const diffText = diff === 0 ? "±0" : (diff > 0 ? "+" + diff : diff.toString());

            const canvas = canvasRef.current;
            if (canvas) {
                animState.current.morphStartTime = Date.now() + 3000;
                animState.current.sessionHeartRates = currentHRHistory;

                const { points, bpmStartIndex, dropStartIndex } = getTextPoints(durationText, bpmText, diffText, canvas.width, canvas.height);
                animState.current.textTargets = points;
                animState.current.bpmParticleStartIndex = bpmStartIndex;
                animState.current.dropParticleStartIndex = dropStartIndex;
            }
        }, 5000);
    };

    // Monitor for completion
    useEffect(() => {
        if (phase === "PRACTICING" && timeLeft <= 0 && selectedTheme !== "SURF") {
            completePractice();
        }
    }, [timeLeft, phase, selectedTheme]);

    // Countdown Logic
    useEffect(() => {
        if (phase === "COUNTDOWN") {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                // Countdown finished, start practice
                startPractice();
            }
        }
    }, [phase, countdown]);

    const cleanup = () => {
        if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
        if (breathTimerRef.current) clearTimeout(breathTimerRef.current);
        clearHapticTimers();

        // Stop all audio & TTS
        clearTTSQueue();
        if (ttsAudioRef.current) {
            ttsAudioRef.current.pause();
            ttsAudioRef.current.src = "";
        }

        // Clear system mode timers
        if (systemWaitTimerRef.current) {
            clearTimeout(systemWaitTimerRef.current);
            systemWaitTimerRef.current = null;
        }

        // Reset async flags so nothing re-triggers
        surfBusyRef.current = false;
        isFetchingBatchRef.current = false;
    };

    const handleExit = () => {
        cleanup();
        // Reset animation state to prevent stale phase refs
        animState.current.phase = "IDLE";
        if (phase === "IDLE") {
            // If in IDLE (theme selection), go back to home
            router.push('/');
        } else {
            // During practice/countdown/prep: go directly home
            // Don't go to IDLE first — that triggers preloadAudioAssets and is slow
            setPhase("IDLE");
            setBreathPhase("INHALE");
            setCountdown(3);
            router.push('/');
        }
    };

    // Ensure cleanup runs on unmount
    useEffect(() => {
        return () => cleanup();
    }, []);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const previousPaddingBottom = document.body.style.paddingBottom;

        document.body.style.overflow = "hidden";
        document.body.style.paddingBottom = "0px";

        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.paddingBottom = previousPaddingBottom;
        };
    }, []);


    return (
        <>
            {/* Full-screen practice container */}
            <div
                className="fixed inset-0 z-[99999] overflow-hidden bg-black animate-in fade-in duration-500"
            >
                <div
                    className="absolute inset-0 text-white font-sans overflow-hidden"
                >
                    {/* Canvas */}
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 block touch-none"
                    />

                    <div
                        className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between"
                        style={{
                            paddingTop: 'env(safe-area-inset-top)',
                            paddingBottom: 'env(safe-area-inset-bottom)',
                            paddingLeft: 'env(safe-area-inset-left)',
                            paddingRight: 'env(safe-area-inset-right)',
                        }}
                    >

                        {/* Header */}
                        <header className="w-full p-6 flex justify-between items-start pointer-events-auto z-50">
                            <button
                                onClick={handleExit}
                                className="p-3 bg-white/5 backdrop-blur-md rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/5 group"
                            >
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                            {/* Right Side Controls - Only show in IDLE */}
                            {phase === "IDLE" && (
                                <div className="flex gap-2 items-center">
                                    {selectedTheme === 'SURF' && (
                                        <button
                                            onClick={() => setIsSurfPromptsModalOpen(true)}
                                            className="w-11 h-11 flex items-center justify-center rounded-full bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                                            title="自定义冲浪提示词"
                                        >
                                            ⚙️
                                        </button>
                                    )}
                                    {/* 🎵 Sound Selection Button - Navigates to Global Mixer */}
                                    <div className="relative">
                                        <button
                                            onClick={() => {
                                                setShowSoundscapes(true);
                                                triggerLight();
                                            }}
                                            title="Soundscapes Mixer"
                                            aria-label="Open Soundscapes Mixer"
                                            className={`w-11 h-11 flex items-center justify-center rounded-full backdrop-blur-md transition-all border ${(activeTracks.size > 0)
                                                ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/30'
                                                : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            <span className="text-xl">🎵</span>
                                        </button>
                                    </div>

                                    {/* Breathing Pattern Button - Icon Only */}
                                    <div className="relative">
                                        <button
                                            title="呼吸模式"
                                            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/5 text-white/50 hover:bg-white/10 transition-all"
                                        >
                                            <Wind size={20} />
                                        </button>
                                        <select
                                            title="选择呼吸模式"
                                            value={selectedPattern}
                                            onChange={(e) => {
                                                setSelectedPattern(e.target.value as BreathingPatternId);
                                                localStorage.setItem("breathingPattern", e.target.value);
                                                triggerLight();
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
                                        >
                                            {BREATHING_PATTERNS.map((pattern) => (
                                                <option key={pattern.id} value={pattern.id}>
                                                    {pattern.name} ({pattern.inhale}-{pattern.hold > 0 ? `${pattern.hold}-` : ''}{pattern.exhale})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </header>



                        {/* Center UI - Absolute Layer for Perfect Centering */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                            <AnimatePresence mode="wait">
                                {phase === "COUNTDOWN" && (
                                    <motion.div
                                        key="cnt"
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 2 }}
                                        className="text-9xl font-thin text-white mix-blend-screen"
                                    >
                                        {countdown}
                                    </motion.div>
                                )}
                                {phase === "PREP_SURF" && (
                                    <motion.div
                                        key="prep"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 1.1 }}
                                        className="flex flex-col items-center pointer-events-auto space-y-6 bg-black/40 p-8 rounded-3xl backdrop-blur-xl border border-white/10 w-full max-w-sm"
                                    >
                                        <div className="text-xl text-white font-light tracking-widest text-center shadow-black drop-shadow-lg">
                                            战前状况评估
                                        </div>

                                        <div className="w-full">
                                            <div className="text-sm text-white/60 mb-2">渴望强度 ({surfIntensity}/10)</div>
                                            <input 
                                                type="range" min="1" max="10" step="1" 
                                                value={surfIntensity} 
                                                onChange={(e) => setSurfIntensity(parseInt(e.target.value))}
                                                className="w-full accent-red-500" 
                                            />
                                        </div>

                                        <div className="w-full">
                                            <div className="text-sm text-white/60 mb-2">触发诱因</div>
                                            <div className="flex flex-wrap gap-2">
                                                {['环境刺激', '压力', '无聊', '情绪波动', '无名火'].map(trigger => (
                                                    <button 
                                                        key={trigger}
                                                        onClick={() => setSurfTrigger(trigger)}
                                                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${surfTrigger === trigger ? 'bg-red-500/40 border-red-500 text-white' : 'bg-white/5 border-white/20 text-white/60'}`}
                                                    >
                                                        {trigger}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="w-full">
                                            <div className="text-sm text-white/60 mb-2">最强躯体锚点</div>
                                            <div className="flex flex-wrap gap-2">
                                                {['胸口紧缩', '喉管发干', '大脑发麻', '腹部绷紧', '全身虚弱'].map(loc => (
                                                    <button 
                                                        key={loc}
                                                        onClick={() => setSurfLocation(loc)}
                                                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${surfLocation === loc ? 'bg-red-500/40 border-red-500 text-white' : 'bg-white/5 border-white/20 text-white/60'}`}
                                                    >
                                                        {loc}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="w-full">
                                            <div className="text-sm text-white/60 mb-2">已戒断时长</div>
                                            <div className="flex flex-wrap gap-2">
                                                {['刚发作', '坚持了1天', '坚持了几天', '突破1周了'].map(t => (
                                                    <button 
                                                        key={t}
                                                        onClick={() => setSurfAbstinence(t)}
                                                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${surfAbstinence === t ? 'bg-red-500/40 border-red-500 text-white' : 'bg-white/5 border-white/20 text-white/60'}`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="w-full">
                                            <div className="text-sm text-white/60 mb-2">当前思维旋涡（大脑的骗局）</div>
                                            <div className="flex flex-wrap gap-2">
                                                {['“就抽这一口”', '“生活太累了想放松”', '“感觉空虚”', '“感觉快爆炸了”'].map(trap => (
                                                    <button 
                                                        key={trap}
                                                        onClick={() => setSurfMentalTrap(trap)}
                                                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${surfMentalTrap === trap ? 'bg-red-500/40 border-red-500 text-white' : 'bg-white/5 border-white/20 text-white/60'}`}
                                                    >
                                                        {trap}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                triggerMedium();
                                                
                                                const actionStr = `[临床接线档案] 当前渴望强度：${surfIntensity}/10。诱发原因：${surfTrigger || '未说明'}。最强躯体锚点：${surfLocation || '全身'}。已戒断时长：${surfAbstinence || '不明'}。思维诱惑骗局：${surfMentalTrap || '无'}。`;
                                                surfDiagnosisRef.current = actionStr; // Lock it into the ref for the heartbeat
                                                
                                                startPractice();
                                                
                                                if (surfStyle === 'system') {
                                                    // System Mode Event-Driven Engine Init
                                                    setSystemStage(0);
                                                    systemStageRef.current = 0;
                                                    systemMainQueueRef.current = [];
                                                    systemPriorityQueueRef.current = [];
                                                    clearTTSQueue();
                                                    if (systemWaitTimerRef.current) {
                                                        clearTimeout(systemWaitTimerRef.current);
                                                        systemWaitTimerRef.current = null;
                                                    }
                                                    loadSystemScriptForStage(0);
                                                    
                                                    // Also push a simulated log for UI
                                                    pushAiLog('user', actionStr);
                                                } else {
                                                    // Trigger AI with form data Start Phase 0
                                                    try {
                                                        // Ensure the action is logged in chat history for context
                                                        pushAiLog('user', actionStr);
                                                        
                                                        await streamAiReminder({
                                                            mood: aiMood,
                                                            mode: 'urge_surfing',
                                                            surfStyle: surfStyle,
                                                            elapsedTime: 0,
                                                            totalTime: durationMinutes * 60,
                                                            sessionPhase: 'start',
                                                            diagnosisProfile: actionStr,
                                                            history: aiHistoryRef.current,
                                                            practiceCount: typeof window !== 'undefined' ? parseInt(localStorage.getItem('surfSuccessCount') || '0', 10) : 0,
                                                            customSurfPrompts: surfPromptsConfig
                                                        });
                                                    } catch(e) { console.error(e); }
                                                }
                                            }}
                                            className="w-full px-8 py-3 mt-4 bg-red-600/50 border border-red-500/50 rounded-full text-white text-lg font-medium hover:bg-red-500/70 transition-colors shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                                        >
                                            开始冲浪
                                        </button>
                                        
                                        <button
                                            type="button"
                                            onClick={() => setIsSurfPromptsModalOpen(true)}
                                            className="w-full py-2 px-4 rounded-full border border-white/10 text-white/60 text-xs mt-3 hover:text-white hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                                        >
                                            ⚙️ 高级：自定义冲浪提示词
                                        </button>
                                    </motion.div>
                                )}

                                {phase === "PRACTICING" && (
                                    <motion.div
                                        key={breathPhase}
                                        initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                                        transition={{ duration: 1 }}
                                        className="text-center mix-blend-screen"
                                    >
                                        <span className="text-4xl md:text-5xl font-light tracking-[0.3em] uppercase text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                            {selectedTheme === 'SURF' ? (
                                                <>
                                                    {breathPhase === "INHALE" && "感 受 浪 潮"}
                                                    {breathPhase === "HOLD" && "立 于 浪 尖"}
                                                    {breathPhase === "EXHALE" && "随 波 卸 力"}
                                                </>
                                            ) : (
                                                <>
                                                    {breathPhase === "INHALE" && "吸 气"}
                                                    {breathPhase === "HOLD" && "屏 气"}
                                                    {breathPhase === "EXHALE" && "呼 气"}
                                                </>
                                            )}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Heart Rate Indicator - Top Right */}
                        {phase === "PRACTICING" && (
                            <HeartRateIndicator
                                currentBPM={currentBPM}
                                isMonitoring={isMonitoring}
                                error={heartRateError}
                            />
                        )}

                        {phase === "COMPLETED" && (
                            <motion.div
                                key="done"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center gap-4 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12 }}
                                    className="p-4 rounded-full bg-green-500/20 text-green-400 mb-2"
                                >
                                    <CheckCircle2 size={48} />
                                </motion.div>
                                <h1 className="text-3xl font-light text-white tracking-widest">
                                    Session Complete
                                </h1>
                            </motion.div>
                        )}


                        {/* Footer UI (Independent of Center UI) */}
                        <div className="w-full flex flex-col items-center justify-end pointer-events-none z-40 flex-1">

                        </div>

                        {/* Footer */}
                        <footer className="w-full max-w-sm px-6 pb-2 pointer-events-none z-50">
                            <AnimatePresence>
                                {/* IDLE UI */}
                                {phase === "IDLE" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 50 }}
                                        className="flex flex-col gap-10 pointer-events-auto"
                                    >
                                        {/* Removed Ruler from Top */}

                                        {/* Ruler Time Selector / Surge Theme Indicator */}
                                        <div className="w-full mb-2 flex flex-col items-center justify-center min-h-[40px]">
                                            {selectedTheme === "SURF" ? (
                                                <div className="px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs tracking-widest font-medium flex items-center gap-2">
                                                    <Waves size={14} />
                                                    <span>冲浪急救模式 (无限时长)</span>
                                                </div>
                                            ) : (
                                                <AnimatePresence mode="wait">
                                                    {isSelectorVisible ? (
                                                        <motion.div
                                                            key="selector"
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.3 }}
                                                            className="w-full"
                                                            onTouchStart={() => {
                                                                if (selectorTimeoutRef.current) clearTimeout(selectorTimeoutRef.current);
                                                                selectorTimeoutRef.current = setTimeout(() => setIsSelectorVisible(false), 3000);
                                                            }}
                                                        >
                                                            <RulerTimeSelector
                                                                value={durationMinutes}
                                                                onChange={(val) => {
                                                                    setDurationMinutes(val);
                                                                    if (selectorTimeoutRef.current) clearTimeout(selectorTimeoutRef.current);
                                                                    selectorTimeoutRef.current = setTimeout(() => setIsSelectorVisible(false), 3000);
                                                                }}
                                                            />
                                                        </motion.div>
                                                    ) : (
                                                        <motion.button
                                                            key="trigger"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            onClick={() => {
                                                                setIsSelectorVisible(true);
                                                                if (selectorTimeoutRef.current) clearTimeout(selectorTimeoutRef.current);
                                                                selectorTimeoutRef.current = setTimeout(() => setIsSelectorVisible(false), 3000);
                                                            }}
                                                            className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs tracking-widest font-light hover:bg-white/10 transition-colors"
                                                        >
                                                            {durationMinutes} MIN
                                                        </motion.button>
                                                    )}
                                                </AnimatePresence>
                                            )}
                                        </div>

                                        {/* Theme Selector - Scrollable (Bottom) */}
                                        <div className="w-full overflow-x-auto scrollbar-hide py-4 -mx-4 px-4">
                                            <div className="flex gap-3 w-max snap-x snap-mandatory">
                                                {(Object.keys(THEMES) as Theme[]).map((themeKey) => {
                                                    const theme = THEMES[themeKey];
                                                    const isSelected = selectedTheme === themeKey;
                                                    const Icon = theme.icon;

                                                    return (
                                                        <button
                                                            key={themeKey}
                                                            onClick={() => {
                                                                setSelectedTheme(themeKey);
                                                                triggerLight();
                                                            }}
                                                            className={`
                                                        snap-center flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all min-w-[70px]
                                                        ${isSelected ? "bg-white/15 scale-105 border-white/30" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"}
                                                        border ${isSelected ? "border-white/30" : "border-transparent"}
                                                    `}
                                                        >
                                                            <div className={`p-1.5 rounded-full ${isSelected ? theme.color : "text-current"}`}>
                                                                <Icon size={22} />
                                                            </div>
                                                            <span className="text-[9px] font-medium tracking-wider uppercase whitespace-nowrap">
                                                                {theme.name}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Binaural section removed - toggle is now in header */}

                                        {/* Guidance Toggle Segments */}
                                        {selectedTheme !== 'SURF' && (
                                            <div className="w-full flex flex-col mb-4 bg-white/5 rounded-2xl p-4 border border-white/10 gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl transition-colors ${guidanceMode !== 'off' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/10 text-white/50'}`}>
                                                        <Sparkles size={18} />
                                                    </div>
                                                    <div className="flex flex-col text-left">
                                                        <span className="text-sm font-medium text-white/90">语音引导</span>
                                                        <span className="text-[10px] text-white/50">在适当进度随机插入高阶疏导人声</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-5 gap-2 mt-1">
                                                    {[
                                                        { value: 'off', label: '关闭' },
                                                        { value: 'light', label: '轻(偶有)' },
                                                        { value: 'medium', label: '中(适度)' },
                                                        { value: 'heavy', label: '多(频繁)' },
                                                        { value: 'ai', label: 'AI 智能' }
                                                    ].map((mode) => (
                                                        <button
                                                            key={mode.value}
                                                            onClick={() => {
                                                                setGuidanceMode(mode.value as any);
                                                                triggerLight();
                                                                if (mode.value === 'ai') {
                                                                    setIsAiModalOpen(true);
                                                                }
                                                            }}
                                                            className={`py-2 rounded-xl text-xs font-medium transition-all ${
                                                                guidanceMode === mode.value 
                                                                    ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50' 
                                                                    : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10 hover:text-white/70'
                                                            }`}
                                                        >
                                                            {mode.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {selectedTheme === 'SURF' && (
                                            <div className="w-full flex flex-col mb-4 bg-red-900/10 rounded-2xl p-4 border border-red-500/10 gap-3">
                                                {surfStyle !== 'system' && (
                                                    <>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-xl transition-colors bg-red-500/20 text-red-400`}>
                                                                <Activity size={18} />
                                                            </div>
                                                            <div className="flex flex-col text-left">
                                                                <span className="text-sm font-medium text-white/90">教练心跳轮询频次</span>
                                                                <span className="text-[10px] text-white/50">决定后台守护你的探针频率</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-3 w-full mt-2">
                                                            <div className="flex justify-between items-center text-xs text-red-300 font-medium px-1">
                                                                <span>激进 (15s)</span>
                                                                <span className="text-red-200">当前: {surfFrequency}秒/次</span>
                                                                <span>独立 (60s)</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="15"
                                                                max="60"
                                                                step="5"
                                                                value={surfFrequency}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value, 10);
                                                                    setSurfFrequency(val);
                                                                    localStorage.setItem("surfFrequency", val.toString());
                                                                }}
                                                                className="w-full h-2 bg-red-950/50 rounded-lg appearance-none cursor-pointer accent-red-500 border border-red-500/20"
                                                            />
                                                        </div>

                                                        <div className="w-full h-px bg-white/5 my-2"></div>
                                                    </>
                                                )}
                                                
                                                <div className="flex flex-col text-left mb-2">
                                                    <span className="text-sm font-medium text-white/90">AI 发话风格架构</span>
                                                    <span className="text-[10px] text-white/50">分流选择底层系统 Prompt 的驱动逻辑</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setSurfStyle('interactive');
                                                            localStorage.setItem('surfStyle', 'interactive');
                                                        }}
                                                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${surfStyle === 'interactive' ? 'bg-red-500/20 border-red-500/40 shadow-lg shadow-red-900/20' : 'bg-black/20 border-white/5 hover:bg-white/5 text-white/50'}`}
                                                    >
                                                        <div className="text-sm font-medium mb-1 flex items-center gap-1.5">
                                                            <span>⚡</span>
                                                            <span className={surfStyle === 'interactive' ? 'text-red-200' : 'text-white/60'}>互动步进</span>
                                                        </div>
                                                        <div className="text-[9px] leading-tight text-white/50">短平快指令，紧贴情绪。</div>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setSurfStyle('immersive');
                                                            localStorage.setItem('surfStyle', 'immersive');
                                                        }}
                                                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${surfStyle === 'immersive' ? 'bg-indigo-500/20 border-indigo-500/40 shadow-lg shadow-indigo-900/20' : 'bg-black/20 border-white/5 hover:bg-white/5 text-white/50'}`}
                                                    >
                                                        <div className="text-sm font-medium mb-1 flex items-center gap-1.5">
                                                            <span>🌊</span>
                                                            <span className={surfStyle === 'immersive' ? 'text-indigo-200' : 'text-white/60'}>沉浸长篇</span>
                                                        </div>
                                                        <div className="text-[9px] leading-tight text-white/50">打破字数，连贯剧本。</div>
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setSurfStyle('system');
                                                            localStorage.setItem('surfStyle', 'system');
                                                        }}
                                                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${surfStyle === 'system' ? 'bg-emerald-500/20 border-emerald-500/40 shadow-lg shadow-emerald-900/20' : 'bg-black/20 border-white/5 hover:bg-white/5 text-white/50'}`}
                                                    >
                                                        <div className="text-sm font-medium mb-1 flex items-center gap-1.5">
                                                            <span>🛡️</span>
                                                            <span className={surfStyle === 'system' ? 'text-emerald-200' : 'text-white/60'}>系统预制</span>
                                                        </div>
                                                        <div className="text-[9px] leading-tight text-white/50">神经科学打断安抚库。</div>
                                                    </button>
                                                </div>

                                                <button 
                                                    onClick={() => setIsPromptInspectorOpen(true)}
                                                    className="w-full mt-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white/90 hover:bg-white/10 transition-colors text-[10px] flex items-center justify-center gap-2"
                                                >
                                                    <Activity size={12} />
                                                    <span>查看/编辑底层系统级提示词 (System Prompts)</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Start Button */}
                                        <button
                                            onClick={handleStart}
                                            className="w-full py-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-xl font-light tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            <Play size={20} fill="currentColor" />
                                            <span>BEGIN</span>
                                        </button>
                                    </motion.div>
                                )}

                                {phase === "PRACTICING" && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="w-full py-5 flex flex-col items-center gap-6 pointer-events-auto"
                                    >
                                        {/* TOP: Stage Indicator */}
                                        {selectedTheme === "SURF" && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-center text-white/40 text-[11px] font-medium tracking-widest uppercase mb-[-1rem] mt-2"
                                            >
                                                {surfStyle === 'system' ? (
                                                    systemStage === 0 ? '【 第 0 阶段：准备上板 】' :
                                                    systemStage === 1 ? '【 第 1 阶段：R · 认出渴望 】' :
                                                    systemStage === 2 ? '【 第 2 阶段：A · 允许不适 】' :
                                                    systemStage === 3 ? '【 第 3 阶段：I · 探究身体 】' :
                                                    '【 第 4 阶段：N · 解离 】'
                                                ) : (
                                                    elapsedSeconds <= 40 ? '【 第 0 阶段：准备上板 】' :
                                                    elapsedSeconds <= 180 ? '【 第 1 阶段：R · 认出渴望 】' :
                                                    elapsedSeconds <= 300 ? '【 第 2 阶段：A · 允许不适 】' :
                                                    elapsedSeconds <= 600 ? '【 第 3 阶段：I · 探究身体 】' :
                                                    '【 第 4 阶段：N · 解离 】'
                                                )}
                                            </motion.div>
                                        )}

                                        <span className="text-4xl font-thin tracking-widest text-white/70 tabular-nums">
                                            {formatTime(selectedTheme === "SURF" ? elapsedSeconds : timeLeft)}
                                        </span>
                                        
                                        {selectedTheme === "SURF" && (
                                            <>
                                            {/* Chat History Terminal Overlay */}
                                            <div className="w-full max-w-[340px] flex flex-col items-center mt-2 mb-4">
                                                <button
                                                    onClick={() => setIsChatOpen(!isChatOpen)}
                                                    className="px-5 py-2 rounded-full bg-white/5 border border-white/5 text-[10px] text-white/40 hover:bg-white/10 hover:text-white/70 transition-all flex items-center gap-2 mb-4"
                                                >
                                                    <Activity size={12} />
                                                    {isChatOpen ? '隐 藏 实 时 脑 波 交 互 记 录' : '展 开 实 时 脑 波 交 互 记 录'}
                                                </button>
                                                
                                                {isChatOpen && chatHistory.length > 0 && (
                                                    <div className="w-full max-h-[180px] overflow-y-auto flex flex-col gap-3 p-4 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-2xl text-[12px] leading-relaxed [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_100%)] scrollbar-hide shadow-2xl">
                                                        {chatHistory.map((msg, i) => (
                                                            <div 
                                                                key={i} 
                                                                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                                            >
                                                                <span className={`px-4 py-2 rounded-2xl max-w-[85%] font-light tracking-wide ${
                                                                    msg.role === 'user' 
                                                                        ? msg.content.includes('临床接线') 
                                                                            ? 'bg-blue-500/10 text-blue-200/50 border border-blue-500/20 text-[10px]' 
                                                                            : 'bg-white/10 text-white/90 border border-white/10 shadow-sm' 
                                                                        : 'bg-transparent text-emerald-200/90 text-[13px]'
                                                                }`}>
                                                                    {msg.content}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {/* Auto-scroll anchor */}
                                                        <div ref={(el) => { el?.scrollIntoView({ behavior: 'smooth' }) }} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-4 w-full max-w-[340px] pb-6">
                                                <div className="grid grid-cols-2 gap-3">
                                                    {(() => {
                                                        const isSystem = surfStyle === 'system';
                                                        let s0, s1, s2, s3, s4;
                                                        if (isSystem) {
                                                            s0 = systemStage === 0;
                                                            s1 = systemStage === 1;
                                                            s2 = systemStage === 2;
                                                            s3 = systemStage === 3;
                                                            s4 = systemStage === 4;
                                                        } else {
                                                            s0 = elapsedSeconds <= 40;
                                                            s1 = elapsedSeconds > 40 && elapsedSeconds <= 180;
                                                            s2 = elapsedSeconds > 180 && elapsedSeconds <= 300;
                                                            s3 = elapsedSeconds > 300 && elapsedSeconds <= 600;
                                                            s4 = elapsedSeconds > 600;
                                                        }

                                                        const btns = s0 ? [
                                                            { id: 'ready', label: '🏄 我准备好了', action: '我已经站上冲浪板，准备好迎接海浪了。' },
                                                            { id: 'nervous', label: '😰 有点紧张', action: '我感到紧张，海浪好像要来了。' },
                                                        ] : s1 ? [
                                                            { id: 'recognized', label: '👁️ 我认出来了', action: '我认出来了，这是尼古丁的冲动在呼唤我。' },
                                                            { id: 'score3', label: '📊 强度 3/10', action: '我给当前渴望打分：3分，比较轻微但能感知到。' },
                                                            { id: 'score5', label: '📊 强度 5/10', action: '我给当前渴望打分：5分，中等强度，能明显感受到。' },
                                                            { id: 'score8', label: '📊 强度 8/10', action: '我给当前渴望打分：8分，非常强烈，几乎要被吞没。' },
                                                        ] : s2 ? [
                                                            { id: 'allow', label: '🤝 我允许它存在', action: '我选择不对抗，允许这股冲动在体内流淌。' },
                                                            { id: 'hard', label: '😣 好难受但不对抗', action: '真的很难受，但我不跟它拔河，我为它腾出空间。' },
                                                            { id: 'cannothold', label: '🆘 快撑不住了', action: '我快撑不住了，大脑不停地找借口。' },
                                                            { id: 'friendly', label: '💛 友善地接纳', action: '我试着带着友善的态度对冲动说：你可以待在这里。' },
                                                        ] : s3 ? [
                                                            { id: 'throat', label: '🫁 喉咙', action: '我觉察到渴望集中在喉咙，有干痒发紧的感觉。' },
                                                            { id: 'chest', label: '🫀 胸口', action: '我觉察到渴望集中在胸口，有沉闷紧绷的感觉。' },
                                                            { id: 'belly', label: '🔥 腹部', action: '我觉察到渴望集中在腹部，有灼热翻滚的感觉。' },
                                                            { id: 'hands', label: '🖐️ 手指', action: '我觉察到渴望集中在手指，它们在微微颤抖想要抓取。' },
                                                            { id: 'pulsing', label: '💫 在跳动', action: '这种感觉不是固定的，我注意到它在微微跳动和变化。' },
                                                            { id: 'shrinking', label: '📐 在收缩', action: '这种感觉好像在收缩、变紧，像被挤压一样。' },
                                                        ] : [
                                                            { id: 'fading', label: '🌊 在消退', action: '我注意到冲动的海浪正在消退，强度在降低。' },
                                                            { id: 'stillstrong', label: '💪 还很强', action: '冲动还很强，但我只是在旁边观察它，不采取行动。' },
                                                            { id: 'notme', label: '🧘 我不是欲望', action: '我清楚地感受到：我有欲望，但我不是欲望本身。' },
                                                            { id: 'noaction', label: '🛑 不必行动', action: '海浪在冲顶后终将回落，我不必采取任何行动。' },
                                                        ];

                                                        return btns.map(btn => (
                                                            <button
                                                                key={btn.id}
                                                                onClick={() => handleUrgeSurfingAction(btn.action, btn.id)}
                                                                className="py-3 px-2 rounded-2xl text-xs font-light tracking-wider backdrop-blur-xl transition-all active:scale-[0.97] flex items-center justify-center text-center leading-tight shadow-lg bg-white/5 text-white/70 border border-white/10 hover:bg-white/15 hover:border-white/30 hover:text-white"
                                                            >
                                                                {btn.label}
                                                            </button>
                                                        ));
                                                    })()}
                                                    <button
                                                        onClick={() => handleUrgeSurfingAction('我彻底翻越了这座浪！它的能量已经完全瓦解。完成！')}
                                                        className="col-span-2 py-4 mt-2 rounded-2xl text-xs font-medium tracking-widest backdrop-blur-xl transition-all active:scale-[0.98] flex items-center justify-center text-center leading-tight shadow-[0_0_20px_rgba(16,185,129,0.1)] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40"
                                                    >
                                                        🚩 渴望已消散，我驾驭了它 (完成)
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Dynamic Real-time Frequency Slider in Practice Phase */}
                                            {surfStyle !== 'system' && (
                                                <div className="w-full max-w-[340px] flex flex-col p-4 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-2xl gap-3 mb-4 shadow-xl">
                                                <div className="flex justify-between items-center text-[10px] text-white/40 font-medium px-2 uppercase tracking-widest">
                                                    <span>高频保护</span>
                                                    <span className="text-white/70">心跳轮询: {surfFrequency}秒</span>
                                                    <span>低频独立</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="15"
                                                    max="60"
                                                    step="5"
                                                    value={surfFrequency}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value, 10);
                                                        setSurfFrequency(val);
                                                        localStorage.setItem("surfFrequency", val.toString());
                                                    }}
                                                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400"
                                                />
                                                </div>
                                            )}
                                            </>
                                        )}
                                    </motion.div>
                                )}

                                {phase === "COMPLETED" && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        onClick={() => setPhase("IDLE")}
                                        className="w-full py-4 glass-panel rounded-full flex items-center justify-center gap-2 hover:bg-white/10 transition-colors pointer-events-auto"
                                    >
                                        <RefreshCw size={18} />
                                        <span>Repeat Session</span>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </footer>
                    </div >

                    {/* Practice Summary - Immersive Overlay */}
                    {phase === "SUMMARY" && (
                        <PracticeCompletionView
                            duration={sessionDuration}
                            heartRateHistory={sessionHeartRates}
                            theme={selectedTheme}
                            onClose={() => {
                                setPhase("IDLE");
                                setBreathPhase("INHALE");
                                setCountdown(3);
                                setTimeLeft(durationMinutes * 60);
                            }}
                        />
                    )}

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
                                <SoundscapesContent onClose={() => setShowSoundscapes(false)} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
                </div>
            </div>
            <AnimatePresence>
                {isAiModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
                        onClick={() => setIsAiModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm p-6 rounded-3xl bg-gray-900 border border-white/10 shadow-2xl flex flex-col gap-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-white/90">AI 智能向导配置</h3>
                                <button onClick={() => setIsAiModalOpen(false)} className="text-white/40 hover:text-white"><X size={20}/></button>
                            </div>
                            
                            <div className="flex flex-col gap-5">
                                <div>
                                    <label className="text-sm font-light text-white/60 mb-3 block">当前心境 / 关注点</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['平静', '焦虑', '疲惫', '想要向外抓取/执念发挥', '睡前'].map(mood => (
                                            <button
                                                key={mood}
                                                onClick={() => { setAiMood(mood); triggerLight(); }}
                                                className={`px-4 py-2 rounded-xl text-xs transition-colors ${aiMood === mood ? 'bg-purple-500/40 text-purple-200 border border-purple-500/50' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'}`}
                                            >
                                                {mood}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-light text-white/60 mb-3 block">特定潜意识模式</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['常规正念', 'RAIN-察觉与允许', '身体沉降扫描', '纯粹存在留白'].map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => { setAiMode(mode); triggerLight(); }}
                                                className={`px-4 py-2 rounded-xl text-xs transition-colors ${aiMode === mode ? 'bg-purple-500/40 text-purple-200 border border-purple-500/50' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'}`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-light text-white/60 mb-3 block">AI 动态频率</label>
                                    <div className="flex gap-2">
                                        {[
                                            { value: 'light', label: '轻度' },
                                            { value: 'medium', label: '适中' },
                                            { value: 'heavy', label: '频繁' }
                                        ].map(freq => (
                                            <button
                                                key={freq.value}
                                                onClick={() => { setAiFrequency(freq.value as any); triggerLight(); }}
                                                className={`flex-1 py-2 rounded-xl text-xs transition-colors ${aiFrequency === freq.value ? 'bg-purple-500/40 text-purple-200 border border-purple-500/50' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'}`}
                                            >
                                                {freq.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => { setIsAiModalOpen(false); triggerSuccess(); }} 
                                className="w-full mt-2 py-3 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 transition-colors"
                            >
                                完成配置
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Surf Prompts Configuration Modal - Plain Divs to avoid AnimatePresence bugs */}
            {isSurfPromptsModalOpen && (
                <div 
                    className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" 
                    style={{ zIndex: 9999999 }}
                >
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto text-white shadow-2xl relative pointer-events-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-medium tracking-wide">⚙️ 自定义冲浪提示词</h2>
                            <button
                                onClick={() => setIsSurfPromptsModalOpen(false)}
                                className="p-2 bg-white/5 rounded-full hover:bg-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">系统提示词 (System Prompt - 教练人设与铁律)</label>
                                <textarea
                                    value={surfPromptsConfig?.systemPrompt || ''}
                                    onChange={(e) => setSurfPromptsConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                                    className="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white/90 font-mono resize-y focus:border-red-500/50 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-white/70 mb-2">分段操作手册 (Stage Prompts)</h3>
                                {(surfPromptsConfig?.stages || []).map((stage: any, index: number) => (
                                    <div key={index} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3">
                                        <div className="flex items-center gap-4">
                                            <div className="text-xs text-white/50 w-24">时间 &lt;= {stage.maxTime === 99999 ? '∞' : stage.maxTime}秒</div>
                                            <input
                                                type="text"
                                                value={stage?.stageName || ''}
                                                onChange={(e) => {
                                                    const newStages = [...(surfPromptsConfig.stages || [])];
                                                    newStages[index] = { ...newStages[index], stageName: e.target.value };
                                                    setSurfPromptsConfig(prev => ({ ...prev, stages: newStages }));
                                                }}
                                                className="flex-1 bg-black/30 border border-white/10 rounded-lg p-2 text-sm text-white/90 focus:border-red-500/50 focus:outline-none"
                                                placeholder="阶段名称"
                                            />
                                        </div>
                                        <textarea
                                            value={stage?.command || ''}
                                            onChange={(e) => {
                                                const newStages = [...(surfPromptsConfig.stages || [])];
                                                newStages[index] = { ...newStages[index], command: e.target.value };
                                                setSurfPromptsConfig(prev => ({ ...prev, stages: newStages }));
                                            }}
                                            className="w-full h-24 bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white/90 resize-y focus:border-red-500/50 focus:outline-none"
                                            placeholder="教练指令"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between pt-4 border-t border-white/10">
                                <button
                                    onClick={() => {
                                        if (confirm('确定要恢复默认配置吗？')) {
                                            setSurfPromptsConfig({ systemPrompt: DEFAULT_SURF_SYSTEM_PROMPT, stages: JSON.parse(JSON.stringify(DEFAULT_SURF_STAGES)) });
                                        }
                                    }}
                                    className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
                                >
                                    恢复默认
                                </button>
                                <button
                                    onClick={() => setIsSurfPromptsModalOpen(false)}
                                    className="px-6 py-2 bg-red-600/50 border border-red-500/50 rounded-full text-sm font-medium hover:bg-red-500/70 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                >
                                    完成并保存
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Inspector Modal (Tabbed) */}
            <AnimatePresence>
                {isPromptInspectorOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md"
                        onClick={() => setIsPromptInspectorOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col rounded-3xl bg-gray-900 border border-white/10 shadow-2xl"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-white/10">
                                <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">
                                    <Activity size={18} className="text-indigo-400" />
                                    底层提示词架构监视器
                                </h3>
                                <button onClick={() => setIsPromptInspectorOpen(false)} className="text-white/40 hover:text-white"><X size={20}/></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 text-sm font-mono leading-relaxed">
                                <div className="space-y-4">
                                    <div className="text-xs text-white/50 mb-2">无论处于什么模式，AI 首先都会受到以下核心理论与铁律的约束：</div>
                                    <h4 className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest">Base System Prompt (基础设定与 RAIN 铁律)</h4>
                                    <div className="p-4 rounded-xl bg-black/40 border border-emerald-500/20 text-emerald-100/70 whitespace-pre-wrap text-xs">
                                        {surfPromptsConfig.systemPrompt}
                                    </div>
                                </div>
                                
                                <div className="w-full h-px bg-white/10 my-2" />

                                <div className="text-xs text-white/50 mb-2">在这之上，将根据你的模式选择，注入不同的局部引擎指令：</div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Interactive Mode Prompts */}
                                    <div className="space-y-2">
                                        <h4 className="text-red-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5 bg-red-500/10 p-2 rounded-t-lg border-b border-red-500/20">
                                            <span>⚡</span> 互动步进式专属驱动
                                        </h4>
                                        <div className="p-4 rounded-b-lg bg-red-950/20 border-x border-b border-red-500/20 text-red-100/70 whitespace-pre-wrap text-[11px] flex flex-col gap-3 h-full">
                                            <div>
                                                <span className="text-red-300 font-semibold block mb-1">【当定时器触发/沉默时】：</span>
                                                （用户正在沉默中体验。请自然地承接你上一句话的方向，继续给出下一步引导。历时 X 秒。当前阶段：Y。不要超过30个字。）
                                            </div>
                                            <div className="h-px bg-red-500/10 w-full" />
                                            <div>
                                                <span className="text-red-300 font-semibold block mb-1">【当用户点击动态按钮时】：</span>
                                                【用户反馈】："..." <br/>
                                                请结合前文，严格根据《当前阶段教练操作手册》给出一句回应。不要超过30个字。
                                            </div>
                                        </div>
                                    </div>

                                    {/* Immersive Mode Prompts */}
                                    <div className="space-y-2">
                                        <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5 bg-indigo-500/10 p-2 rounded-t-lg border-b border-indigo-500/20">
                                            <span>🌊</span> 沉浸长篇式专属驱动
                                        </h4>
                                        <div className="p-4 rounded-b-lg bg-indigo-950/20 border-x border-b border-indigo-500/20 text-indigo-100/70 whitespace-pre-wrap text-[11px] flex flex-col gap-3 h-full">
                                            <div>
                                                <span className="text-indigo-300 font-semibold block mb-1">【全局突破设定】：</span>
                                                不要限制字数。请一次性生成 3~4 句连贯、递进的指导语（构成一个小节的剧本）。每一句必须用单独的换行符 \n 隔开。
                                            </div>
                                            <div className="h-px bg-indigo-500/10 w-full" />
                                            <div>
                                                <span className="text-indigo-300 font-semibold block mb-1">【后台剧本弹药库耗尽时】：</span>
                                                （用户正在沉默中体验。请自然承接，为当前阶段生成一整段 3~4 句的连贯剧本。历时 X 秒。当前阶段：Y。注意每句之间用换行符隔开。）
                                            </div>
                                            <div className="h-px bg-indigo-500/10 w-full" />
                                            <div>
                                                <span className="text-indigo-300 font-semibold block mb-1">【当用户打断（点击按钮）时】：</span>
                                                【用户反馈】："..." <br/>
                                                请立刻生成第 1 句短句作为安抚/追问，并紧接着换行生成后续 2~3 句剧本来进一步探究。
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// --- Particle Text Morphing Helpers ---
const getTextPoints = (text1: string, text2: string, text3: string, width: number, height: number) => {
    if (typeof document === 'undefined') return { points: [], bpmStartIndex: 0, dropStartIndex: 0 }; // Server-side safety

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return { points: [], bpmStartIndex: 0, dropStartIndex: 0 };

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const points: { x: number, y: number }[] = [];
    const step = 4; // Denser particles for better clarity

    // 1. Scan Duration Text (Center Top)
    ctx.font = '500 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(text1, width / 2, height / 2 - 140);

    let imageData = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            if (imageData[index] > 128) points.push({ x, y });
        }
    }
    const bpmStartIndex = points.length;

    // 2. Scan BPM Text (Bottom Left)
    ctx.clearRect(0, 0, width, height);
    ctx.font = '500 80px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(text2, width / 2 - 140, height / 2 + 100);

    imageData = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            if (imageData[index] > 128) points.push({ x, y });
        }
    }
    const dropStartIndex = points.length;

    // 3. Scan Drop Text (Bottom Right)
    ctx.clearRect(0, 0, width, height);
    ctx.fillText(text3, width / 2 + 140, height / 2 + 100); // Same font as above

    imageData = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            const index = (y * width + x) * 4;
            if (imageData[index] > 128) points.push({ x, y });
        }
    }

    // Shuffle segments
    // 1
    for (let i = bpmStartIndex - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [points[i], points[j]] = [points[j], points[i]];
    }
    // 2
    for (let i = dropStartIndex - 1; i > bpmStartIndex; i--) {
        const j = Math.floor(Math.random() * (i - bpmStartIndex + 1)) + bpmStartIndex;
        [points[i], points[j]] = [points[j], points[i]];
    }
    // 3
    for (let i = points.length - 1; i > dropStartIndex; i--) {
        const j = Math.floor(Math.random() * (i - dropStartIndex + 1)) + dropStartIndex;
        [points[i], points[j]] = [points[j], points[i]];
    }

    return { points, bpmStartIndex, dropStartIndex };
};

const renderHeartRateCurve = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, progress: number) => {
    const history = state.sessionHeartRates;
    if (!history || history.length < 2) return;

    // Chart Area: Below Duration, Above Stats
    const chartWidth = width * 0.5;
    const chartHeight = 80;
    const startX = (width - chartWidth) / 2;
    const startY = height / 2 - 40;

    // Get bounds
    const minHR = Math.min(...history) - 5;
    const maxHR = Math.max(...history) + 5;
    const range = maxHR - minHR || 10;

    ctx.save();
    ctx.globalAlpha = Math.max(0, (progress - 0.5) * 2); // Fade in late in the morph
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Glassy Glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";

    for (let i = 0; i < history.length; i++) {
        const x = startX + (i / (history.length - 1)) * chartWidth;
        const y = startY + chartHeight - ((history[i] - minHR) / range) * chartHeight;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            const prevX = startX + ((i - 1) / (history.length - 1)) * chartWidth;
            const prevY = startY + chartHeight - ((history[i - 1] - minHR) / range) * chartHeight;
            // Control points for smooth spline
            const cp1x = prevX + (x - prevX) / 2;
            const cp2x = prevX + (x - prevX) / 2;
            ctx.bezierCurveTo(cp1x, prevY, cp2x, y, x, y);
        }
    }

    ctx.stroke();

    // Add endpoints dots
    [0, history.length - 1].forEach(idx => {
        const x = startX + (idx / (history.length - 1)) * chartWidth;
        const y = startY + chartHeight - ((history[idx] - minHR) / range) * chartHeight;
        ctx.beginPath();
        ctx.fillStyle = "white";
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
};

const renderTextMorph = (ctx: CanvasRenderingContext2D, state: any, width: number, height: number, now: number) => {
    const particles = state.particles;
    const targets = state.textTargets;
    if (!targets || targets.length === 0) return;

    const morphStartTime = state.morphStartTime || 0;
    const morphElapsed = now - morphStartTime;

    // Phase 2: Drift (Wait until bloom finishes + buffer)
    if (morphElapsed < 0) {
        // Just drift loosely
        particles.forEach((p: any) => {
            p.x += (Math.random() - 0.5) * 0.5;
            p.y += (Math.random() - 0.5) * 0.5;
            // Use subtle white for drift
            ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        return;
    }

    // Phase 3: Morph to Text
    const morphDuration = 1500;
    // Assuming easeInOutCubic is defined elsewhere or will be added.
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const progress = Math.min(morphElapsed / morphDuration, 1);
    const easedProgress = easeInOutCubic(progress);

    // Draw Heart Rate Curve behind particles (fades in with morph)
    renderHeartRateCurve(ctx, state, width, height, progress);

    const lerp = 0.08;
    const beatSpeed = 0.008; // Heartbeat freq
    const beat = Math.pow(Math.sin(now * beatSpeed), 60); // Sharp spike for heartbeat

    // Theme Colors
    let baseHue = 0;
    let baseSat = 0; // 0 = white
    let dynamicColor = false;

    if (state.theme === "ROSE") { baseHue = 340; baseSat = 80; dynamicColor = true; }
    else if (state.theme === "LIQUID") { baseHue = 190; baseSat = 10; dynamicColor = true; }
    else if (state.theme === "AURORA") { baseHue = 160; baseSat = 70; dynamicColor = true; }
    else if (state.theme === "GALAXY") { baseHue = 260; baseSat = 80; dynamicColor = true; }
    else if (state.theme === "INFERNO") { baseHue = 20; baseSat = 90; dynamicColor = true; }
    else if (state.theme === "ZEN") { baseHue = 45; baseSat = 60; dynamicColor = true; }
    else if (state.theme === "PRISM") { baseHue = 180; baseSat = 20; dynamicColor = true; }
    else { baseHue = 0; baseSat = 0; }

    particles.forEach((p: any, i: number) => {
        let tx = p.x;
        let ty = p.y;
        let targetAlpha = 0;
        let sizeScale = 1;

        if (i < targets.length) {
            tx = targets[i].x;
            ty = targets[i].y;
            targetAlpha = 0.9;

            // 💓 BPM Heartbeat Effect (BPM segment only)
            if (i >= state.bpmParticleStartIndex && i < (state.dropParticleStartIndex || 999999)) {
                sizeScale = 1 + beat * 0.4;
                targetAlpha = 0.7 + beat * 0.3;
                tx += (tx - width / 2) * beat * 0.03;
                ty += (ty - height / 2) * beat * 0.03;
            }

            // Liquid Noise
            const noise = Math.sin(now * 0.002 + i) * 1.5;
            tx += Math.cos(i) * noise;
            ty += Math.sin(i) * noise;

        } else {
            // Excess particles drift and fade
            tx = p.x + (Math.random() - 0.5) * 5;
            ty = p.y + (Math.random() - 0.5) * 5;
            targetAlpha = 0;
        }

        // Interpolate
        p.x += (tx - p.x) * lerp;
        p.y += (ty - p.y) * lerp;

        // Draw
        if (dynamicColor && i < targets.length) {
            // Stats (BPM and Drop) - distinct colors
            if (state.bpmParticleStartIndex && i >= state.bpmParticleStartIndex) {
                // Determine if it's the Drop segment
                const isDrop = state.dropParticleStartIndex && i >= state.dropParticleStartIndex;

                if (isDrop) {
                    // Difference segment (White or Neutral)
                    ctx.fillStyle = `rgba(255, 255, 255, ${targetAlpha})`;
                } else {
                    // BPM segment (Themed)
                    ctx.fillStyle = `hsla(${baseHue}, ${baseSat}%, 70%, ${targetAlpha})`;
                }
            } else {
                // Duration segment (Brightest)
                ctx.fillStyle = `hsla(${baseHue}, ${baseSat}%, 90%, ${targetAlpha})`;
            }
        } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${targetAlpha})`;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * sizeScale, 0, Math.PI * 2);
        ctx.fill();
    });
};
