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
    const [isLoadingAudio, setIsLoadingAudio] = useState(false); // For spinning indicator
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

    // Refs
    const currentItemIdRef = useRef<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const wakeLockRef = useRef<any>(null);

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    const ensureAudioContext = async () => {
        const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current && AC) {
            const ctx = new AC();
            audioContextRef.current = ctx;
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
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

    // Cleanup
    useEffect(() => {
        return () => {
            if (currentAudio) currentAudio.pause();
            setAudioQueue([]);
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
    // Queue Consumer (The "Meditation Page" Pattern)
    // -------------------------------------------------------------------------
    useEffect(() => {
        // 1. Global Stop/Pause Check
        if (!isPlaying) {
            if (currentAudio) currentAudio.pause();
            currentItemIdRef.current = null; // Reset item lock so it can "Resume" if needed? 
            // Actually, if we pause, we usually want to resume the SAME item.
            // But for Simplicity: "Pause" stops playback. "Resume" restarts logic?
            // User requested: "Resume" logic.
            // If we pause `currentAudio` (html audio), calling `.play()` resumes it.
            // But if we are in the middle of a "Promise", the promise is pending "onended".
            // If we pause, "onended" won't fire.
            // So if we just set isPlaying=false, the Effect re-runs.
            // But the *async function* from previous run is still alive?
            // React's unique challenge. 
            // In Meditation Page:
            // if (!isPlaying) { currentAudio.pause(); return; }
            // So it effectively "Aborts" the check loop.
            // BUT the async function `(async () => { ... })()` initiated in previous render stays alive?
            // No, variables in closure might persist.
            // But `currentAudio` is state.
            return;
        }

        // 2. Queue Empty Check
        if (audioQueue.length === 0) {
            setIsPlaying(false);
            return;
        }

        const item = audioQueue[0];

        // 3. Prevent Re-entry for same item
        if (currentItemIdRef.current === item.id) return;
        currentItemIdRef.current = item.id;

        // 4. Process Item
        const process = async () => {
            try {
                if (item.type === 'pause') {
                    // Play Silence
                    await playSilence(item.duration);
                } else if (item.type === 'text') {
                    // Fetch & Play
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
                console.error("Process error", err);
            } finally {
                // 5. Advance Queue
                // ONLY if we are still playing? 
                // If user paused mid-way, `isPlaying` changed. 
                // But this closure runs to completion.
                // We should remove item.
                setAudioQueue(prev => prev.slice(1));
                currentItemIdRef.current = null; // Allow next item
            }
        };

        process();

    }, [isPlaying, audioQueue]); // Intentionally exclude currentAudio to avoid loops, relying on ref logic?
    // Actually Meditation page dependencies: [isPlaying, audioQueue, currentAudio]
    // My playAudioElement updates currentAudio.


    // -------------------------------------------------------------------------
    // Controls
    // -------------------------------------------------------------------------

    const startNewPlayback = () => {
        // Reset
        if (currentAudio) {
            currentAudio.pause();
            setCurrentAudio(null);
        }
        currentItemIdRef.current = null;

        const segments: QueueItem[] = [];
        let currentRate = card.rate || "0%";
        // Flexible Regex
        const regex = /(\[(?:pause|rate)[^\]]+\])/g;
        const parts = card.content.split(regex);

        for (const part of parts) {
            if (!part.trim()) continue;
            if (part.startsWith("[")) {
                if (part.includes("pause")) {
                    const match = part.match(/pause\s*[:=]?\s*(\d+)/i);
                    if (match) {
                        segments.push({
                            type: 'pause',
                            duration: parseInt(match[1]),
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

        setAudioQueue(segments);
        setIsPlaying(true);
    };

    const togglePlay = () => {
        if (isPlaying) {
            // PAUSE
            setIsPlaying(false);
            if (currentAudio) currentAudio.pause();
        } else {
            // RESUME or START
            if (audioQueue.length > 0) {
                setIsPlaying(true);
                // The Effect will start processing the head item.
                // NOTE: If we were halfway through an item, `process` function finished?
                // If we paused `currentAudio`, `onended` never fired.
                // So the queue head is still the same item.
                // Upon `setIsPlaying(true)`, the Effect runs again.
                // Checks `currentItemIdRef`. 
                // If we didn't clear `currentItemIdRef` on pause, it returns.
                // BUT we want to RESUME playback of `currentAudio` if it exists.

                // Resume Logic:
                if (currentAudio && currentAudio.paused) {
                    currentAudio.play();
                    // But `playAudioElement` promise is still pending?
                    // No. The previous Effect instance created the promise.
                    // If we unmount/remount effect...
                    // The Promise is in a detached closure.
                } else {
                    // No current audio, just let logic run
                }
            } else {
                startNewPlayback();
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
                            <h3 className="text-lg font-semibold text-white/90 leading-tight">
                                {card.title || "未命名卡片"}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                    {card.voice_id}
                                </span>
                                <span>{card.rate || "Default"}</span>
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEdit(card)} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDelete(card.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-white/60 hover:text-red-400 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
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
                            className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-full transition-all border",
                                isPlaying
                                    ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/30"
                                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20"
                            )}
                        >
                            {isLoadingAudio ? (
                                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                            ) : isPlaying ? (
                                <Pause className="w-4 h-4 fill-current" />
                            ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                        </button>

                        <div className="flex-1 space-y-1.5">
                            <div className="flex justify-between text-xs text-white/40 font-mono">
                                <span>{isPlaying ? "PLAYING" : "READY"}</span>
                                <span>{audioQueue.length > 0 ? `${audioQueue.length} SEGS` : "00:00"}</span>
                            </div>
                            {/* Progress Bar (Fake visual based on queue left) */}
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-rose-500"
                                    layout
                                    transition={{ duration: 0.3 }}
                                    style={{ width: `${audioQueue.length > 0 ? 100 : 0}%` }}
                                />
                            </div>
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
