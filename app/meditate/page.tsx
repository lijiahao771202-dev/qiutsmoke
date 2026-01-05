"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Wind, CloudRain, Zap, Moon, Droplets, Settings, X, Activity, Shield, Trash2, Plus, Network, Sparkles, Edit2, Check, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import AuthGuard from "@/components/AuthGuard";
import { GlassCard } from "@/components/ui/GlassCard";
import { useMeditationTopics } from "@/lib/hooks/useData";
import { getApiUrl } from "@/lib/config";
import ImmersiveMeditationPlayer from "@/components/meditation/ImmersiveMeditationPlayer";
import { useMeditationCore } from "@/lib/hooks/useMeditationCore";
import { VOICES } from "@/lib/constants";

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


export default function MeditatePage() {
    // 🌟 动画配置
    const APPLE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

    const breathingVariants = {
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
            transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
        },
        tap: {
            scale: 0.96,
            transition: { type: "spring", stiffness: 300, damping: 15 }
        }
    };

    const getCardContentVariants = (index: number) => ({
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: index * 0.08
            }
        }
    });

    // === UI State ===
    const [activeCard, setActiveCard] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
    const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
    const [apiKey, setApiKey] = useState("");
    const [showPromptEdit, setShowPromptEdit] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);
    const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
    const [globalSystemPrompt, setGlobalSystemPrompt] = useState("");
    const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
    const [draftPrompt, setDraftPrompt] = useState("");

    const [meditationDuration, setMeditationDuration] = useState(10);
    const DURATION_OPTIONS = [3, 5, 10, 15, 20, 30, 40];
    const [guidanceLevel, setGuidanceLevel] = useState<'light' | 'medium' | 'heavy'>('medium');
    const [cardSettings, setCardSettings] = useState<Record<string, { duration: number; guidanceLevel: 'light' | 'medium' | 'heavy' }>>({});

    const [newCardTitle, setNewCardTitle] = useState("");
    const [newCardPrompt, setNewCardPrompt] = useState("");

    // === Data & Haptics ===
    const { topics, addTopic: apiAddTopic, deleteTopic: apiDeleteTopic, isLoading: isLoadingTopics } = useMeditationTopics();
    const { triggerLight } = useHaptics();

    // === Core Hook Integration ===
    const core = useMeditationCore({
        onSessionEnd: () => {
            // Optional: Show celebration? default is fine
        }
    });

    // === Settings Loading ===
    useEffect(() => {
        const savedPrompt = localStorage.getItem("meditation_prompt");
        if (savedPrompt) setCustomPrompt(savedPrompt);

        try {
            const savedPrompts = localStorage.getItem("meditation_prompts");
            if (savedPrompts) setEditedPrompts(JSON.parse(savedPrompts));
        } catch { }

        const savedKey = localStorage.getItem("deepseek_api_key");
        if (savedKey) setApiKey(savedKey);

        try {
            const savedDuration = localStorage.getItem("meditation_duration");
            if (savedDuration) setMeditationDuration(parseInt(savedDuration, 10));
        } catch { }

        try {
            const savedGuidance = localStorage.getItem("meditation_guidance");
            if (savedGuidance && ['light', 'medium', 'heavy'].includes(savedGuidance)) {
                setGuidanceLevel(savedGuidance as 'light' | 'medium' | 'heavy');
            }
        } catch { }

        try {
            const savedCardSettings = localStorage.getItem("meditation_card_settings");
            if (savedCardSettings) setCardSettings(JSON.parse(savedCardSettings));
        } catch { }

        // Load server prompts / system prompt
        (async () => {
            try {
                const res = await fetch(getApiUrl('/api/prompts'));
                if (res.ok) {
                    const serverObj = await res.json();
                    if (serverObj && Object.keys(serverObj).length > 0) {
                        setEditedPrompts(serverObj);
                    }
                }
            } catch { }
        })();
    }, []);

    const customTopics = useMemo(() => {
        return topics.map(t => ({
            ...t,
            icon: ICONS_MAP[t.icon_name?.toLowerCase() as keyof typeof ICONS_MAP] || Wind
        }));
    }, [topics]);

    // Save settings
    useEffect(() => {
        localStorage.setItem("meditation_prompt", customPrompt);
        localStorage.setItem("deepseek_api_key", apiKey);
        if (editedPrompts) localStorage.setItem("meditation_prompts", JSON.stringify(editedPrompts));
    }, [customPrompt, apiKey, editedPrompts]);

    // === Handlers ===

    const handleCardClick = async (id: string) => {
        // Trigger haptic
        triggerLight();

        setActiveCard(id);
        const topic = DEFAULT_TOPICS.find(t => t.id === id) || customTopics.find(t => t.id === id);
        const promptToUse = (editedPrompts[id] ?? topic?.prompt ?? customPrompt);

        // Record Session Start (Optional, fire and forget)
        try {
            fetch(getApiUrl('/api/meditation/sessions'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topicId: id,
                    topicName: topic?.title || "未知冥想"
                })
            });
        } catch (e) {
            console.error("Failed to start session recording", e);
        }

        const currentCardSettings = cardSettings[id] || {};
        const duration = currentCardSettings.duration ?? meditationDuration;
        const guidance = currentCardSettings.guidanceLevel ?? guidanceLevel;

        // Use Core to Generate
        // Note: apiKey is retrieved from localStorage inside the hook, but we update localStorage above
        await core.generateMeditation(promptToUse, duration, guidance);
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
                    {/* Header */}
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

                    {/* Grid of Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-8">

                        {/* Default Topics */}
                        {DEFAULT_TOPICS.map((topic, index) => (
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
                                    {/* Settings Button */}
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

                                    <motion.div
                                        variants={getCardContentVariants(index)}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        {topic.icon ? <topic.icon className="w-8 h-8 mb-2 text-white/80" /> : <Wind className="w-8 h-8 mb-2 text-white/80" />}
                                        <span className="text-lg font-medium leading-tight z-10 block">{topic.title}</span>

                                        {/* Badges */}
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

                        {/* Custom Topics */}
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
                                    className="h-full p-6 flex flex-col justify-between bg-white/[0.03] border-white/5"
                                >
                                    <div className="absolute top-3 right-3 z-20 flex gap-2">
                                        <div
                                            onClick={(e) => handleDeleteCard(e, topic.id)}
                                            className="p-1.5 hover:bg-red-500/20 rounded-full text-white/20 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </div>
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

                                    <motion.div
                                        variants={getCardContentVariants(index + DEFAULT_TOPICS.length)}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        {topic.icon ? <topic.icon className="w-8 h-8 mb-2 text-white/80" /> : <Wind className="w-8 h-8 mb-2 text-white/80" />}
                                        <span className="text-lg font-medium leading-tight z-10 block">{topic.title}</span>
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

                        {/* Add Card Button */}
                        <motion.button
                            onClick={() => setShowAddCard(true)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full aspect-square rounded-[2rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/40 hover:text-white/80 hover:border-white/20 transition-all gap-2 cursor-pointer"
                        >
                            <Plus className="w-8 h-8" />
                            <span className="text-sm font-light">新建主题</span>
                        </motion.button>
                    </div>

                    {/* Global Settings & API Key */}
                    <div className="mt-8 border-t border-white/5 pt-8 mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-light text-white/60 flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                全局设置
                            </h2>
                        </div>

                        {/* Global Duration */}
                        <div className="mb-6">
                            <label className="block text-xs uppercase tracking-wider text-white/30 mb-3">默认时长</label>
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                {DURATION_OPTIONS.map(min => (
                                    <button
                                        key={min}
                                        onClick={() => {
                                            setMeditationDuration(min);
                                            localStorage.setItem("meditation_duration", min.toString());
                                        }}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-sm transition-all whitespace-nowrap",
                                            meditationDuration === min
                                                ? "bg-white/20 text-white shadow-lg backdrop-blur-md"
                                                : "bg-white/5 text-white/40 hover:bg-white/10"
                                        )}
                                    >
                                        {min} 分钟
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Global Guidance */}
                        <div className="mb-8">
                            <label className="block text-xs uppercase tracking-wider text-white/30 mb-3">默认引导模式</label>
                            <div className="grid grid-cols-3 gap-3">
                                {(Object.keys(GUIDANCE_LEVELS) as Array<keyof typeof GUIDANCE_LEVELS>).map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => {
                                            setGuidanceLevel(level);
                                            localStorage.setItem("meditation_guidance", level);
                                        }}
                                        className={cn(
                                            "px-3 py-3 rounded-xl text-xs flex flex-col items-center gap-1 transition-all border",
                                            guidanceLevel === level
                                                ? GUIDANCE_LEVELS[level].color.replace("bg-", "bg-opacity-30 bg-") + " shadow-lg"
                                                : "bg-white/5 border-transparent text-white/40 hover:bg-white/10"
                                        )}
                                    >
                                        <span>{GUIDANCE_LEVELS[level].label.split(" ")[0]}</span>
                                        <span className="opacity-80">{GUIDANCE_LEVELS[level].label.split(" ")[1]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                            <label className="block text-xs uppercase tracking-wider text-white/30 mb-2">DeepSeek API Key</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all font-mono"
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-white/20 mt-2">
                                您的 Key 仅存储在本地浏览器中，直接发送至 DeepSeek 官方 API。
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Modals */}
                <AnimatePresence>
                    {/* Add Card Modal */}
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
                                className="bg-[#1c1c1e] w-full max-w-md rounded-3xl border border-white/10 p-6 shadow-2xl"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-light text-white">新建冥想主题</h3>
                                    <button onClick={() => setShowAddCard(false)} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-white/40 uppercase tracking-widest pl-1 mb-1 block">主题名称</label>
                                        <input
                                            value={newCardTitle}
                                            onChange={e => setNewCardTitle(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
                                            placeholder="例如：缓解焦虑"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/40 uppercase tracking-widest pl-1 mb-1 block">提示词 Prompt</label>
                                        <textarea
                                            value={newCardPrompt}
                                            onChange={e => setNewCardPrompt(e.target.value)}
                                            className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none"
                                            placeholder="描述你想要的冥想引导内容..."
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveAddCard}
                                        disabled={!newCardTitle || !newCardPrompt}
                                        className="w-full py-3 bg-white text-black rounded-xl font-medium mt-4 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 active:scale-95 transition-all"
                                    >
                                        创建
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Edit Prompt / Settings Modal */}
                    {showPromptEdit && editingTopicId && (
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
                                className="bg-[#1c1c1e] w-full max-w-lg rounded-3xl border border-white/10 p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-light text-white">冥想设置</h3>
                                    <button onClick={() => setShowPromptEdit(false)} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Duration Override */}
                                    <div>
                                        <label className="text-xs text-white/40 uppercase tracking-widest pl-1 mb-2 block">此时长设置</label>
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                            {DURATION_OPTIONS.map(min => {
                                                const currentDuration = cardSettings[editingTopicId]?.duration ?? meditationDuration;
                                                return (
                                                    <button
                                                        key={min}
                                                        onClick={() => {
                                                            setCardSettings(prev => {
                                                                const next = { ...prev, [editingTopicId]: { ...prev[editingTopicId], duration: min } };
                                                                localStorage.setItem("meditation_card_settings", JSON.stringify(next));
                                                                return next;
                                                            });
                                                        }}
                                                        className={cn(
                                                            "px-3 py-2 rounded-lg text-xs transition-all whitespace-nowrap",
                                                            currentDuration === min
                                                                ? "bg-white text-black"
                                                                : "bg-white/5 text-white/40"
                                                        )}
                                                    >
                                                        {min}min
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Guidance Override */}
                                    <div>
                                        <label className="text-xs text-white/40 uppercase tracking-widest pl-1 mb-2 block">此引导模式</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(Object.keys(GUIDANCE_LEVELS) as Array<keyof typeof GUIDANCE_LEVELS>).map((level) => {
                                                const currentGuidance = cardSettings[editingTopicId]?.guidanceLevel ?? guidanceLevel;
                                                return (
                                                    <button
                                                        key={level}
                                                        onClick={() => {
                                                            setCardSettings(prev => {
                                                                const next = { ...prev, [editingTopicId]: { ...prev[editingTopicId], guidanceLevel: level } };
                                                                localStorage.setItem("meditation_card_settings", JSON.stringify(next));
                                                                return next;
                                                            });
                                                        }}
                                                        className={cn(
                                                            "px-2 py-2 rounded-lg text-xs transition-all border",
                                                            currentGuidance === level
                                                                ? GUIDANCE_LEVELS[level].color
                                                                : "bg-white/5 border-transparent text-white/40"
                                                        )}
                                                    >
                                                        {GUIDANCE_LEVELS[level].label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-white/40 uppercase tracking-widest pl-1 mb-1 block">提示词 Prompt</label>
                                        <textarea
                                            value={draftPrompt}
                                            onChange={e => setDraftPrompt(e.target.value)}
                                            className="w-full h-40 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none font-light leading-relaxed"
                                        />
                                    </div>

                                    <button
                                        onClick={handleSaveDraftPrompt}
                                        className="w-full py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 active:scale-95 transition-all"
                                    >
                                        保存更改
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Immersive Player - Connected to Core */}
                <AnimatePresence>
                    {(core.isPlaying || core.isGenerating) && (
                        <ImmersiveMeditationPlayer
                            isOpen={true}
                            title={activeCard ? (DEFAULT_TOPICS.find(t => t.id === activeCard)?.title || customTopics.find(t => t.id === activeCard)?.title || "冥想") : "冥想"}
                            text={core.currentSpokenText || ""} // Use currentSpokenText for subtitles
                            fullText={core.text} // Pass full text if needed
                            isPlaying={core.isPlaying}
                            isBuffering={core.isGenerating && !core.isPlaying} // Approximate buffering state
                            onPlayPause={core.togglePlay}
                            onClose={core.stopSession}
                            cardId={activeCard || 'meditation'}
                            queueCurrent={core.progress.current}
                            queueTotal={core.progress.total}
                            elapsedSeconds={core.elapsedSeconds}
                        />
                    )}
                </AnimatePresence>
            </div>
        </AuthGuard>
    );
}
