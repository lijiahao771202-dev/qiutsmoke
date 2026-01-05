import { useState, useRef, useEffect, useCallback } from "react";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useHapticBreathing } from "@/lib/hooks/useHapticBreathing";
import { useBackgroundAudio } from "@/hooks/useBackgroundAudio"; // Ensure this path is correct
import { getApiUrl } from "@/lib/config";

// Types
type QueueItem =
    | { type: 'audio', url?: string, buffer?: AudioBuffer, id: string, status?: 'loading' | 'ready' | 'error', text?: string }
    | { type: 'pause', duration: number, id: string };

interface UseMeditationCoreOptions {
    onGenerationStart?: () => void;
    onGenerationEnd?: () => void;
    onPlayStart?: () => void;
    onPlayPause?: (isPlaying: boolean) => void;
    onSessionEnd?: () => void;
    onError?: (error: string) => void;
}

export function useMeditationCore(options: UseMeditationCoreOptions = {}) {
    const { triggerSuccess, triggerLight, triggerHeavy } = useHaptics();
    const { triggerInhale, triggerExhale, triggerHold } = useHapticBreathing();
    const backgroundAudio = useBackgroundAudio();

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [text, setText] = useState("");
    const [currentSpokenText, setCurrentSpokenText] = useState("");
    const [playedCount, setPlayedCount] = useState(0);
    const [totalSegments, setTotalSegments] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Internal Refs
    const audioQueue = useRef<QueueItem[]>([]);
    const currentAudio = useRef<HTMLAudioElement | null>(null);
    const sharedAudioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const processingBuffer = useRef("");
    const currentRate = useRef("0%");
    const isParsingRef = useRef(false);
    const isProcessingQueueRef = useRef(false);
    const currentItemIdRef = useRef<string | null>(null);
    const currentGenerationIdRef = useRef<number>(0);
    const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
    const scheduledIdsRef = useRef<Set<string>>(new Set()); // Track items that have been scheduled/played

    // Helper: Initialize Audio Context
    const ensureAudioContext = async () => {
        if (typeof window === 'undefined') return;
        const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current && AC) {
            audioContextRef.current = new AC();
        }
        if (audioContextRef.current?.state === 'suspended') {
            try { await audioContextRef.current.resume(); } catch { }
        }
    };

    // Helper: Prime Audio (iOS Fix)
    const primeAudio = useCallback(() => {
        if (typeof window === 'undefined') return;

        if (!sharedAudioRef.current) {
            sharedAudioRef.current = new Audio();
            (sharedAudioRef.current as any).playsInline = true;
        }

        // If already playing something, don't interrupt
        if (sharedAudioRef.current && !sharedAudioRef.current.paused) return;

        // Play silent buffer to unlock audio
        const sr = audioContextRef.current?.sampleRate || 44100;
        const buffer = new ArrayBuffer(44 + 441); // tiny wav
        const view = new DataView(buffer);
        // ... simple wav header constuction skipped for brevity, relies on createSilenceWavURL logic below

        // Simple silent play attempt using reuse
        try {
            const audio = sharedAudioRef.current;
            audio.volume = 0.01;
            // Use a tiny standard base64 silent wav for priming if generator not available
            audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==';
            audio.play().catch(() => { });
        } catch { }
    }, []);


    // --- Core Logic: Queue Processing ---
    useEffect(() => {
        const processQueue = async () => {
            // Stop logical check
            if (!isPlaying) {
                if (currentAudio.current) {
                    currentAudio.current.pause();
                    currentAudio.current = null;
                }
                isProcessingQueueRef.current = false;
                return;
            }

            // End of Queue Check
            if (audioQueue.current.length === 0) {
                if (!isGenerating && isPlaying) {
                    console.log("[MeditationCore] Session Complete");
                    setIsPlaying(false);
                    triggerSuccess();
                    options.onSessionEnd?.();
                }
                return;
            }

            if (isProcessingQueueRef.current) return;
            if (currentAudio.current && !currentAudio.current.paused) return;

            // Process Item
            const item = audioQueue.current[0];

            // Resume logic
            if (currentItemIdRef.current === item.id) {
                const audio = sharedAudioRef.current || currentAudio.current;
                if (audio && audio.paused) {
                    audio.play().catch(() => { });
                }
                return;
            }

            isProcessingQueueRef.current = true;
            currentItemIdRef.current = item.id;

            // Wait for loading
            if (item.type === 'audio' && item.status === 'loading') {
                isProcessingQueueRef.current = false;
                currentItemIdRef.current = null;
                return; // Wait for next tick/update
            }

            // Handle Pause
            if (item.type === 'pause') {
                const duration = item.duration;
                // Use setTimeout for pause
                await new Promise(resolve => setTimeout(resolve, duration));

                // Cleanup
                audioQueue.current.shift();
                currentItemIdRef.current = null;
                isProcessingQueueRef.current = false;
                // Trigger re-check
                processQueue();

            } else if (item.type === 'audio' && item.url) {
                // Play Audio
                if (!sharedAudioRef.current) {
                    sharedAudioRef.current = new Audio();
                    (sharedAudioRef.current as any).playsInline = true;
                }
                const audio = sharedAudioRef.current;
                audio.src = item.url;
                audio.volume = 1;

                if (item.text) setCurrentSpokenText(item.text);
                setPlayedCount(prev => prev + 1);

                // Haptic Breathing
                if (item.text) {
                    if (/(吸气|吸入|inhal)/i.test(item.text)) triggerInhale();
                    else if (/(呼气|呼出|吐气|exhal)/i.test(item.text)) triggerExhale();
                    else if (/(屏住|屏息|保持|hold)/i.test(item.text)) triggerHold();
                }

                audio.onended = () => {
                    URL.revokeObjectURL(item.url!);
                    audioQueue.current.shift();
                    currentItemIdRef.current = null;
                    isProcessingQueueRef.current = false;
                    currentAudio.current = null;
                    // Trigger next
                };

                audio.onerror = () => {
                    console.error("Audio error", item.id);
                    audioQueue.current.shift();
                    currentItemIdRef.current = null;
                    isProcessingQueueRef.current = false;
                    currentAudio.current = null;
                };

                currentAudio.current = audio;
                try {
                    await ensureAudioContext();
                    await audio.play();
                } catch (e) {
                    console.error("Play failed", e);
                    // Skip if fail
                    audioQueue.current.shift();
                    isProcessingQueueRef.current = false;
                }
            } else {
                // Skip invalid
                audioQueue.current.shift();
                isProcessingQueueRef.current = false;
            }
        };

        const interval = setInterval(processQueue, 500); // Poll queue
        return () => clearInterval(interval);

    }, [isPlaying, isGenerating]); // Dep array simplified


    // --- Core Logic: Generation ---
    const generateMeditation = async (prompt: string, duration: number, guidanceLevel: 'light' | 'medium' | 'heavy' = 'medium') => {
        const generationId = ++currentGenerationIdRef.current;
        setIsGenerating(true);
        setIsPlaying(true); // Auto start
        setText("");
        setCurrentSpokenText("");
        setPlayedCount(0);
        setTotalSegments(0);
        audioQueue.current = [];
        processingBuffer.current = "";

        primeAudio();
        await backgroundAudio.activate({
            title: "AI 冥想",
            onStop: () => stopSession()
        });

        const apiKey = localStorage.getItem("deepseek_api_key") || "";
        const systemPrompt = localStorage.getItem("global_system_prompt") || "";

        try {
            const res = await fetch(getApiUrl('/api/generate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, apiKey, systemPrompt, duration, guidanceLevel })
            });

            if (!res.ok) throw new Error(`API Error ${res.status}`);

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No stream");

            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (currentGenerationIdRef.current !== generationId) {
                    reader.cancel(); return;
                }

                const chunk = decoder.decode(value, { stream: true });
                setText(prev => prev + chunk);
                processingBuffer.current += chunk;
                await processBuffer();
            }
            // Flush
            await processBuffer(true);
            setIsGenerating(false);

        } catch (e: any) {
            console.error("Generation failed", e);
            setIsGenerating(false);
            options.onError?.(e.message);
            triggerHeavy();
        }
    };

    // --- Core Logic: Buffer Parser (simplified from page.tsx) ---
    const processBuffer = async (flush = false) => {
        if (isParsingRef.current) return;
        isParsingRef.current = true;

        const tagRegex = /\[(pause|rate)\s*[:=]?\s*([^\]]+)\]/i;

        try {
            while (true) {
                const buffer = processingBuffer.current;
                if (!buffer) break;

                const match = buffer.match(tagRegex);

                if (match && match.index !== undefined) {
                    const textBefore = buffer.substring(0, match.index).trim();
                    const tagType = match[1].toLowerCase();
                    const tagValue = match[2];

                    if (textBefore) {
                        await queueText(textBefore);
                    }

                    if (tagType === 'pause') {
                        const val = parseFloat(tagValue);
                        const unit = tagValue.includes('ms') ? 'ms' : 's';
                        const ms = (unit === 's' || val < 50) ? val * 1000 : val;
                        audioQueue.current.push({
                            type: 'pause',
                            duration: ms,
                            id: Math.random().toString()
                        });
                    } else if (tagType === 'rate') {
                        currentRate.current = tagValue.trim();
                    }

                    processingBuffer.current = buffer.substring(match.index + match[0].length);
                } else if (flush) {
                    if (buffer.trim()) await queueText(buffer.trim());
                    processingBuffer.current = "";
                    break;
                } else {
                    break;
                }
            }
        } finally {
            isParsingRef.current = false;
        }
    };

    const queueText = async (rawText: string) => {
        // Sanitize
        const text = rawText.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').replace(/\[[^\]]*$/g, '').replace(/[*_#`~]/g, '').trim();
        if (!text) return;

        const id = Math.random().toString();
        // Optimistically increment total
        setTotalSegments(prev => prev + 1);

        // Push loading placeholder
        audioQueue.current.push({
            type: 'audio',
            id,
            status: 'loading',
            text
        });

        // Fetch TTS
        generateAudioWithRetry(text, id);
    };

    const generateAudioWithRetry = async (text: string, id: string) => {
        try {
            const voice = localStorage.getItem("meditation_voice") || "zh-CN-XiaoxiaoNeural";
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice, rate: currentRate.current })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                // Update queue
                const idx = audioQueue.current.findIndex(i => i.id === id);
                if (idx !== -1) {
                    audioQueue.current[idx] = { ...audioQueue.current[idx], url, status: 'loading' ? 'ready' : 'ready' } as any;
                    // Note: TS hack, logic is sound
                }
            } else {
                throw new Error("TTS Error");
            }
        } catch {
            // Remove failed
            const idx = audioQueue.current.findIndex(i => i.id === id);
            if (idx !== -1) audioQueue.current.splice(idx, 1);
        }
    };

    const stopSession = () => {
        setIsPlaying(false);
        setIsGenerating(false);
        audioQueue.current = [];
        if (currentAudio.current) {
            currentAudio.current.pause();
            currentAudio.current = null;
        }
        backgroundAudio.deactivate();
        currentGenerationIdRef.current++;
    };

    const togglePlay = () => {
        if (!isPlaying) ensureAudioContext();
        setIsPlaying(!isPlaying);
    };

    return {
        isPlaying,
        isGenerating,
        text,
        currentSpokenText,
        generateMeditation,
        stopSession,
        togglePlay,
        progress: { current: playedCount, total: totalSegments },
        elapsedSeconds
    };
}
