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
    const audioRef = useRef<HTMLAudioElement | null>(null); // Fallback for iOS

    // Lazy init AudioContext (MUST be on user gesture for iOS)
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                audioContextRef.current = new AudioContextClass();
            }
        }
        // Resume if suspended (common on iOS)
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stop();
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
            // Lazy init AudioContext (iOS fix)
            const audioContext = getAudioContext();

            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice, rate }),
            });

            if (!response.ok) throw new Error('TTS Failed: ' + response.status);

            const arrayBuffer = await response.arrayBuffer();

            if (audioContext) {
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);

                source.onended = () => {
                    setIsPlaying(false);
                    sourceRef.current = null;
                };

                source.start(0);
                sourceRef.current = source;
                setIsPlaying(true);
            } else {
                // Fallback: Use HTMLAudioElement for incompatible browsers
                console.warn("[useEdgeTTS] AudioContext not available, using Audio element fallback.");
                const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                audioRef.current = audio;
                audio.onended = () => {
                    setIsPlaying(false);
                    URL.revokeObjectURL(url);
                };
                await audio.play();
                setIsPlaying(true);
            }

        } catch (error) {
            console.error("TTS Play Error:", error);
            setIsPlaying(false);
        } finally {
            setIsLoading(false);
        }
    }, [getAudioContext]);

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
        // Also stop HTMLAudioElement fallback
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    return { play, stop, isPlaying, isLoading };
}
