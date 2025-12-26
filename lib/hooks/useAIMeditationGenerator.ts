import { useState, useRef, useEffect, useCallback } from "react";
import { getApiUrl } from "@/lib/config";

export interface AIPlaybackState {
    status: "idle" | "generating" | "synthesizing" | "playing" | "completed" | "error";
    script: string;
    error?: string;
    isPlaying: boolean;
    progress: number; // 0-100 (approximate)
}

export function useAIMeditationGenerator() {
    const [state, setState] = useState<AIPlaybackState>({
        status: "idle",
        script: "",
        isPlaying: false,
        progress: 0,
    });

    const abortControllerRef = useRef<AbortController | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioQueueRef = useRef<Array<{ url: string; text: string }>>([]);
    const isPlayingRef = useRef(false);

    // Initialize shared audio
    useEffect(() => {
        if (typeof window !== "undefined") {
            audioRef.current = new Audio();
            (audioRef.current as any).playsInline = true;
        }
        return () => {
            // Cleanup
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const generateAndPlay = useCallback(async (prompt: string, durationMinutes: number = 3) => {
        try {
            if (abortControllerRef.current) abortControllerRef.current.abort();
            abortControllerRef.current = new AbortController();

            setState(prev => ({ ...prev, status: "generating", script: "", error: undefined, progress: 0 }));

            // 1. Generate Script (Stream)
            const res = await fetch(getApiUrl("/api/generate"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    duration: durationMinutes,
                    guidanceLevel: "medium", // Default for cards
                    apiKey: typeof localStorage !== 'undefined' ? localStorage.getItem("deepseek_api_key") : undefined
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!res.ok) throw new Error("Generation failed");
            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullScript = "";

            setState(prev => ({ ...prev, status: "synthesizing" }));

            // Read stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullScript += chunk;

                // Update script preview in UI
                setState(prev => ({ ...prev, script: fullScript }));
            }

            // 2. Synthesize & Play (Simplified Pipeline)
            // For this "Lite" version, we will sanitize and synthesize the whole script logic
            // In a real sophisticated version, we'd use the complex queue from MeditatePage.
            // Here we will do a simpler Queue approach: Split by [pause], synthesize sentences.

            await processAndPlayScript(fullScript);

        } catch (e: any) {
            if (e.name === "AbortError") return;
            console.error("AI Generation Error:", e);
            setState(prev => ({ ...prev, status: "error", error: e.message || "Failed to generate" }));
        }
    }, []);

    const processAndPlayScript = async (script: string) => {
        // Basic parser similar to meditate page but simplified
        // 1. Clean script
        // 2. Split into segments
        // 3. Queue audio fetch

        // Quick sanitization
        const cleanScript = script.replace(/\*\*/g, "").replace(/\[rate.*?\]/g, "");

        // Split by pause tags [pause Xs]
        // Regex to match text and pause separately
        const parts = cleanScript.split(/(\[pause\s+\d+s\])/g).filter(p => p.trim());

        const queue: Array<{ type: 'tts' | 'silence', duration?: number, text?: string }> = [];

        for (const part of parts) {
            const pauseMatch = part.match(/\[pause\s+(\d+)s\]/);
            if (pauseMatch) {
                queue.push({ type: 'silence', duration: parseInt(pauseMatch[1], 10) });
            } else {
                if (part.trim()) queue.push({ type: 'tts', text: part.trim() });
            }
        }

        setState(prev => ({ ...prev, status: "playing", isPlaying: true }));
        isPlayingRef.current = true;

        for (let i = 0; i < queue.length; i++) {
            if (!isPlayingRef.current) break;
            const item = queue[i];

            setState(prev => ({ ...prev, progress: (i / queue.length) * 100 }));

            if (item.type === 'silence') {
                await new Promise(r => setTimeout(r, (item.duration || 1) * 1000));
            } else if (item.type === 'tts' && item.text) {
                try {
                    const ttsRes = await fetch(getApiUrl("/api/tts"), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: item.text,
                            voice: "zh-CN-XiaoxiaoNeural", // Default sweet voice
                            rate: "0%"
                        })
                    });
                    if (ttsRes.ok) {
                        const blob = await ttsRes.blob();
                        const url = URL.createObjectURL(blob);
                        await playAudio(url);
                        URL.revokeObjectURL(url);
                    }
                } catch (e) {
                    console.error("TTS Error", e);
                }
            }
        }

        setState(prev => ({ ...prev, status: "completed", isPlaying: false, progress: 100 }));
        isPlayingRef.current = false;
    };

    const playAudio = (url: string): Promise<void> => {
        return new Promise((resolve) => {
            if (!audioRef.current) return resolve();
            const audio = audioRef.current;
            audio.src = url;
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(e => {
                console.warn("Autoplay block?", e);
                resolve();
            });
        });
    };

    const stop = useCallback(() => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        isPlayingRef.current = false;
        setState(prev => ({ ...prev, status: "idle", isPlaying: false }));
    }, []);

    return {
        ...state,
        generateAndPlay,
        stop
    };
}
