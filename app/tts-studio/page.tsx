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

// -----------------------------------------------------------------------------
// Component: TTS Card with Audio Logic
// -----------------------------------------------------------------------------

function TTSCardItem({ card, onDelete, onEdit }: { card: TTSCard; onDelete: (id: string) => void; onEdit: (card: TTSCard) => void }) {
    // Queue State
    type QueueItem =
        | { type: 'pause', duration: number, id: string }
        | { type: 'text', content: string, rate: string, voiceId: string, id: string, url?: string };

    const [audioQueue, setAudioQueue] = useState<QueueItem[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false); // UI state for "paused by user"
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);

    // Refs
    const processingRef = useRef(false);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const wakeLockRef = useRef<any>(null);

    // WakeLock Management
    const requestWakeLock = async () => {
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
            try {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
            } catch (err) {
                console.warn('Wake Lock request failed:', err);
            }
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
            } catch (err) {
                console.warn('Wake Lock release failed:', err);
            }
        }
    };

    // Effect: Handle Wake Lock based on global playing state
    useEffect(() => {
        if (isPlaying) requestWakeLock();
        else releaseWakeLock();
        return () => { releaseWakeLock(); };
    }, [isPlaying]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
            setAudioQueue([]);
        };
    }, []);

    // -------------------------------------------------------------------------
    // Audio Playback Helpers
    // -------------------------------------------------------------------------

    const playAudioElement = (url: string): Promise<void> => {
        return new Promise((resolve) => {
            const audio = new Audio(url);
            currentAudioRef.current = audio;

            // Important for mobile/background
            audio.preload = 'auto';
            // @ts-ignore
            audio.playsInline = true;

            // MediaSession Setup
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: card.title || "TTS Playback",
                    artist: "Rain App",
                });
                navigator.mediaSession.setActionHandler('play', () => {
                    audio.play();
                    setIsPlaying(true);
                    setIsPaused(false);
                });
                navigator.mediaSession.setActionHandler('pause', () => {
                    audio.pause();
                    setIsPlaying(false);
                    setIsPaused(true);
                });
            }

            audio.onended = () => {
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                resolve();
            };

            audio.onerror = (e) => {
                console.error("Audio error:", e);
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                resolve(); // Resolve anyway to continue queue
            };

            audio.play().catch(e => {
                console.error("Play prevented or interrupted:", e);
                // If paused by system or user manually, we might want to handle differently
                // But generally in this loop: if error, we move next or stop.
                // If it's an "NotAllowedError", user didn't interact. But we are in click handler chain mostly.
                resolve();
            });
        });
    };

    // -------------------------------------------------------------------------
    // Audio Queue Processing (Ref-Based Loop)
    // -------------------------------------------------------------------------

    const stopSignalRef = useRef(false);

    const processQueue = async (initialQueue: QueueItem[]) => {
        // Stop any previous processing
        stopSignalRef.current = false;
        processingRef.current = true; // Mark global processing

        // We use a local queue copy to iterate, handling the sequence without state updates interrupting
        // However, we need to update UI to show progress. 
        // Strategy: 
        // 1. We keep the full queue in Ref for the loop. 
        // 2. We update State just for "View", but the Loop uses the Ref.

        const queue = [...initialQueue];

        for (let i = 0; i < queue.length; i++) {
            // Check stop signal (e.g. Pause or Stop clicked)
            if (stopSignalRef.current) {
                // Save remaining items back to state so we can resume later?
                // For now, Pause simply stops playback. We can implement Resume logic 
                // by slicing the queue from 'i' and saving to state.
                const remaining = queue.slice(i);
                setAudioQueue(remaining);
                processingRef.current = false;
                return;
            }

            const item = queue[i];

            // UI Update: Remove item from visible queue *as we start it* or *after*?
            // Let's remove it from UI queue to show progress
            setAudioQueue(prev => prev.length > 0 ? prev.slice(1) : []);

            try {
                if (item.type === 'pause') {
                    const url = createSilenceWavURL(item.duration);
                    await playAudioElement(url);
                } else if (item.type === 'text') {
                    setIsLoadingAudio(true);
                    let url = item.url;

                    if (!url) {
                        try {
                            const res = await fetch("/api/tts", {
                                method: "POST",
                                body: JSON.stringify({
                                    text: item.content,
                                    voice: item.voiceId,
                                    rate: item.rate
                                }),
                            });
                            if (res.ok) {
                                const blob = await res.blob();
                                url = URL.createObjectURL(blob);
                            }
                        } catch (e) {
                            console.error("Fetch failed", e);
                        }
                    }
                    setIsLoadingAudio(false);

                    if (url) {
                        await playAudioElement(url);
                    }
                }
            } catch (err) {
                console.error("Item Error", err);
            }
        }

        // Loop Finished
        if (!stopSignalRef.current) {
            setIsPlaying(false);
            setIsPaused(false);
            stopSignalRef.current = false;
        }
        processingRef.current = false;
    };


    const startNewPlayback = async () => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current = null;
        }
        stopSignalRef.current = true; // Stop existing
        await new Promise(r => setTimeout(r, 50)); // Tiny yield

        const segments: QueueItem[] = [];
        let currentRate = card.rate || "0%";
        // Flexible Regex: Match [pause...] or [rate...] with any content inside brackets
        const regex = /(\[(?:pause|rate)[^\]]+\])/g;
        const parts = card.content.split(regex);

        for (const part of parts) {
            if (!part.trim()) continue;
            if (part.startsWith("[")) {
                // Flexible parsing
                if (part.includes("pause")) {
                    // Match: pause 5s, pause:5s, pause=5s
                    const match = part.match(/pause\s*[:=]?\s*(\d+)\s*s/i);
                    if (match) {
                        segments.push({
                            type: 'pause',
                            duration: parseInt(match[1]),
                            id: Math.random().toString(36).substr(2, 9)
                        });
                    }
                } else if (part.includes("rate")) {
                    // Match: rate 10%, rate:-10%
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

        setAudioQueue(segments);
        setIsPlaying(true);
        setIsPaused(false);

        // Start the loop
        processQueue(segments);
    };

    const togglePlay = () => {
        if (isPlaying) {
            // PAUSE
            stopSignalRef.current = true; // Signal loop to stop
            if (currentAudioRef.current) currentAudioRef.current.pause();
            setIsPlaying(false);
            setIsPaused(true);
        } else {
            // RESUME or START
            if (isPaused && audioQueue.length > 0) {
                // RESUME
                setIsPlaying(true);
                setIsPaused(false);
                processQueue(audioQueue); // Resume with current state queue
            } else {
                startNewPlayback();
            }
        }
    };

    const handleRestart = () => {
        if (currentAudioRef.current) currentAudioRef.current.pause();
        setIsPlaying(false);
        setIsPaused(false);
        setAudioQueue([]);
        setTimeout(() => startNewPlayback(), 100);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="group relative"
        >
            <div
                className={cn(
                    "relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-rose-500/[0.05] to-pink-500/[0.05] backdrop-blur-xl p-6 transition-all",
                    "hover:bg-rose-500/10 hover:border-rose-200/20 hover:shadow-2xl hover:shadow-rose-500/10"
                )}
            >
                {/* Visualizer Background */}
                {(isPlaying && !isPaused) && (
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
                <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-100">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(card);
                        }}
                        title="编辑卡片"
                        className="p-2 text-zinc-500/80 hover:text-blue-400 hover:bg-white/10 rounded-full transition-all"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(card.id);
                        }}
                        title="删除卡片"
                        className="p-2 text-zinc-500/80 hover:text-red-400 hover:bg-white/10 rounded-full transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
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
