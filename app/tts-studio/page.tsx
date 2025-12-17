"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Trash2, Plus, Sparkles, RotateCcw, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import AuthGuard from "@/components/AuthGuard";
// Removed Server Actions import
// import { createCard, getCards, deleteCard, type TTSCard } from "./actions";

export interface TTSCard {
    id: string;
    title: string;
    content: string;
    voice_id: string;
    rate: string;
    created_at: Date;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const VOICES = [
    { id: "zh-CN-XiaoxiaoNeural", name: "晓晓 (女声-温暖)" },
    { id: "zh-CN-YunxiNeural", name: "云希 (男声-沉稳)" },
    { id: "zh-CN-XiaohanNeural", name: "晓涵 (女声-温柔)" },
    { id: "zh-CN-YunyangNeural", name: "云野 (男声-专业)" },
];

// -----------------------------------------------------------------------------
// Component: Glass Input Card
// -----------------------------------------------------------------------------
function GlassInput({ onAdd }: { onAdd: () => void }) {
    const [text, setText] = useState("");
    const [title, setTitle] = useState("");
    const [voiceId, setVoiceId] = useState(VOICES[0].id);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        try {
            const res = await fetch("/api/tts/cards", {
                method: "POST",
                body: JSON.stringify({ title, content: text, voiceId, rate: "0%" }),
            });
            if (res.ok) {
                setText("");
                setTitle("");
                onAdd();
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full max-w-2xl mx-auto mb-12"
        >
            <div className="relative overflow-hidden rounded-3xl border border-rose-200/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-3xl bg-gradient-to-br from-rose-500/[0.05] via-white/[0.05] to-rose-500/[0.02] p-1 transition-all">
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
            </div>
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Component: TTS Card with Audio Logic
// -----------------------------------------------------------------------------

function TTSCardItem({ card, onDelete, onEdit }: { card: TTSCard; onDelete: (id: string) => void; onEdit: (card: TTSCard) => void }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);

    // Refs
    const stopRef = useRef<(() => void) | null>(null);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stopRef.current) stopRef.current();
        };
    }, []);

    const stopPlayback = () => {
        if (stopRef.current) stopRef.current();
        currentAudioRef.current = null; // Clear ref
        setIsPlaying(false);
        setIsPaused(false);
        setIsLoadingAudio(false);
    };

    const startPlayback = async () => {
        setIsLoadingAudio(true);
        setIsPaused(false);

        // Reset stop reference logic
        let shouldStop = false;
        stopRef.current = () => {
            shouldStop = true;
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
        };

        try {
            // 1. Parse text
            const segments: Array<{ text?: string; pause?: number; rate?: string }> = [];
            let currentRate = card.rate || "0%";
            const regex = /(\[(?:pause\s+\d+s|rate\s+[+-]?\d+%)\])/g;
            const parts = card.content.split(regex);

            for (const part of parts) {
                if (!part.trim()) continue;
                if (part.startsWith("[")) {
                    if (part.includes("pause")) {
                        const match = part.match(/pause\s+(\d+)s/);
                        if (match) segments.push({ pause: parseInt(match[1]) });
                    } else if (part.includes("rate")) {
                        const match = part.match(/rate\s+([+-]?\d+%)/);
                        if (match) currentRate = match[1];
                    }
                } else {
                    segments.push({ text: part, rate: currentRate });
                }
            }

            // 2. Playback Loop
            setIsLoadingAudio(false);
            setIsPlaying(true);

            for (const seg of segments) {
                if (shouldStop) break;

                if (seg.pause) {
                    await new Promise(resolve => {
                        const id = setTimeout(resolve, seg.pause! * 1000);
                        // Hook pause cancellation? Complex. 
                        // For simplicity, pauses are not "pausable" in this V1, they just run.
                        // Or we could use a pausable timeout helper.
                        // For now, let's keep it simple. If user pauses during [pause], it might just wait.
                        // If user STOPS, proper cleanup needed.
                        const prevStop = stopRef.current;
                        stopRef.current = () => {
                            clearTimeout(id);
                            shouldStop = true;
                            if (prevStop) prevStop();
                            resolve(null);
                        };
                    });
                } else if (seg.text) {
                    const res = await fetch("/api/tts", {
                        method: "POST",
                        body: JSON.stringify({
                            text: seg.text,
                            voice: card.voice_id, // Use card's voice ID
                            rate: seg.rate
                        }),
                    });

                    if (!res.ok) throw new Error("Audio gen failed");
                    if (shouldStop) break;

                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    currentAudioRef.current = audio;

                    await new Promise<void>((resolve, reject) => {
                        audio.onended = () => resolve();
                        audio.onerror = reject;

                        // Override stopRef to handle this specific audio instance
                        const prevStop = stopRef.current;
                        stopRef.current = () => {
                            audio.pause();
                            shouldStop = true;
                            // Clean up global ref
                            if (currentAudioRef.current === audio) {
                                currentAudioRef.current = null;
                            }
                            // Don't call prevStop() recursively here to avoid mess, just resolve.
                            resolve();
                        };

                        audio.play().catch(e => {
                            console.error("Play prevented", e);
                            resolve();
                        });
                    });

                    URL.revokeObjectURL(url);
                }
            }

            // Finished naturally
            if (!shouldStop) {
                setIsPlaying(false);
                setIsPaused(false);
            }

        } catch (e) {
            console.error("Playback error", e);
            setIsPlaying(false);
        } finally {
            if (!isPaused && !isPlaying) {
                // Clean up if fully done?
            }
        }
    };

    const togglePlay = () => {
        if (isPlaying) {
            // Pause
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
            }
            setIsPlaying(false);
            setIsPaused(true);
        } else {
            // Resume or Start
            if (isPaused && currentAudioRef.current) {
                currentAudioRef.current.play();
                setIsPlaying(true);
                setIsPaused(false);
            } else {
                startPlayback();
            }
        }
    };

    const handleRestart = () => {
        stopPlayback();
        // Allow state to settle then restart
        setTimeout(() => startPlayback(), 100);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="group relative"
        >
            <div
                className={cn(
                    "relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-rose-500/[0.05] to-pink-500/[0.05] backdrop-blur-xl p-6 transition-all",
                    "hover:bg-rose-500/10 hover:border-rose-200/20 hover:shadow-2xl hover:shadow-rose-500/10"
                )}
            >
                {/* Visualizer Background */}
                {isPlaying && (
                    <div className="absolute inset-x-0 bottom-0 h-1/2 flex items-end justify-center gap-1 pb-4 opacity-30 pointer-events-none">
                        {[...Array(10)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{ height: [10, 30, 10] }}
                                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1, ease: "easeInOut" }}
                                className="w-1.5 bg-rose-400 rounded-full"
                            />
                        ))}
                    </div>
                )}

                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                    <div onClick={togglePlay} className="cursor-pointer">
                        <h3 className="text-rose-100 font-bold text-lg mb-2 line-clamp-1">{card.title || "无标题"}</h3>
                        <p className="text-rose-50/80 text-base leading-relaxed font-light line-clamp-4 select-none whitespace-pre-wrap">
                            {card.content}
                        </p>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-rose-200/10">
                        <div className="flex items-center gap-2 text-xs text-rose-200/60">
                            <span className={cn(
                                "w-2 h-2 rounded-full",
                                isPlaying ? "bg-rose-400 animate-pulse" : (isPaused ? "bg-yellow-400" : "bg-white/20")
                            )} />
                            {VOICES.find(v => v.id === card.voice_id)?.name.split(" ")[0]}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Restart Button */}
                            {(isPlaying || isPaused) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRestart(); }}
                                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-rose-200/50 hover:bg-rose-500/20 hover:text-rose-200 transition-colors"
                                    title="重新播放"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            )}

                            {/* Play/Pause Button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                    isPlaying ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-rose-200/50 hover:bg-rose-500/10 hover:text-rose-200"
                                )}
                            >
                                {isLoadingAudio ? (
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Edit & Delete Buttons */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0 }}
                    className="absolute top-4 right-4 flex gap-2 z-20"
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(card);
                        }}
                        title="编辑卡片"
                        className="p-2 text-zinc-600 hover:text-blue-400 transition-colors"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(card.id);
                        }}
                        title="删除卡片"
                        className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
}

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------
export default function TTSStudioPage() {
    const [cards, setCards] = useState<TTSCard[]>([]);
    const [editingCard, setEditingCard] = useState<TTSCard | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editVoiceId, setEditVoiceId] = useState(VOICES[0].id);
    const [isSaving, setIsSaving] = useState(false);

    const fetchCards = useCallback(async () => {
        try {
            const res = await fetch("/api/tts/cards?t=" + Date.now(), {
                cache: "no-store",
                headers: { "Pragma": "no-cache" }
            });
            if (res.ok) {
                const data = await res.json();
                setCards(data);
            }
        } catch (e) {
            console.error("Failed to fetch cards", e);
        }
    }, []);

    useEffect(() => {
        fetchCards();
    }, [fetchCards]);

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这张卡片吗？')) return;

        try {
            await fetch(`/api/tts/cards?id=${id}`, { method: "DELETE" });
            fetchCards();
        } catch (e) {
            console.error(e);
        }
    };

    const handleEdit = (card: TTSCard) => {
        setEditingCard(card);
        setEditTitle(card.title);
        setEditContent(card.content);
        setEditVoiceId(card.voice_id);
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
                })
            });
            if (res.ok) {
                setEditingCard(null);
                fetchCards();
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
                <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 pt-24 pb-32">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-medium tracking-tight text-white/90">声波工坊</h1>
                        <p className="text-rose-200/60 text-sm mt-1">Text to Speech Studio</p>
                    </div>
                    <GlassInput onAdd={fetchCards} />

                    <div className="mt-16">
                        <div className="flex items-center gap-4 mb-8">
                            <h3 className="text-xl font-medium text-white/90">我的语料库</h3>
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-200 text-xs border border-rose-500/10">
                                {cards.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {cards.length > 0 && cards.map(card => (
                                    <TTSCardItem key={card.id} card={card} onDelete={handleDelete} onEdit={handleEdit} />
                                ))}
                            </AnimatePresence>
                            {cards.length === 0 && (
                                <div className="col-span-full py-20 text-center text-rose-200/40 border border-dashed border-rose-200/10 rounded-3xl">
                                    <p>这里空空如也，试着创建一个新的语音卡片吧。</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

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
