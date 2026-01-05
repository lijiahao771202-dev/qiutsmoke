"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface PlayOptions {
    text: string;
    rate?: string;
    voice?: string;
    volume?: string;
}

export function useEdgeTTS() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Initialize AudioContext
    useEffect(() => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            audioContextRef.current = new AudioContext();
        }
        return () => {
            stop(); // Cleanup on unmount
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

    const play = useCallback(async ({ text, rate = "-10%", voice = "zh-CN-XiaoxiaoNeural" }: PlayOptions) => {
        if (!text) return;

        // Stop current playback
        stop();
        setIsLoading(true);

        try {
            // Check/Resume AudioContext
            if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice, rate }),
            });

            if (!response.ok) throw new Error('TTS Failed');

            const arrayBuffer = await response.arrayBuffer();

            if (audioContextRef.current) {
                const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);

                source.onended = () => {
                    setIsPlaying(false);
                    sourceRef.current = null;
                };

                source.start(0);
                sourceRef.current = source;
                setIsPlaying(true);
            }

        } catch (error) {
            console.error("TTS Play Error:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const stop = useCallback(() => {
        if (sourceRef.current) {
            try {
                sourceRef.current.stop();
                sourceRef.current.disconnect();
            } catch (e) {
                // Ignore errors if already stopped
            }
            sourceRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    return { play, stop, isPlaying, isLoading };
}
