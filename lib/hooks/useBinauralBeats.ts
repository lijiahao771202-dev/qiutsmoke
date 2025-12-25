'use client';

import { useRef, useCallback, useState } from 'react';

export type BrainwaveType = "delta" | "theta" | "alpha" | "beta";

export interface BinauralPreset {
    id: string;
    name: string;
    description: string;
    baseFrequency: number;
    beatFrequency: number;
    brainwaveType: BrainwaveType;
    icon: string;
}

export const BINAURAL_PRESETS: BinauralPreset[] = [
    { id: "delta", name: "深度恢复", description: "Delta波 · 深层修复", baseFrequency: 200, beatFrequency: 2, brainwaveType: "delta", icon: "🌙" },
    { id: "theta", name: "深度冥想", description: "Theta波 · 内观状态", baseFrequency: 200, beatFrequency: 6, brainwaveType: "theta", icon: "🧘" },
    { id: "alpha", name: "轻松放松", description: "Alpha波 · 平静专注", baseFrequency: 200, beatFrequency: 10, brainwaveType: "alpha", icon: "☁️" },
    { id: "beta", name: "专注能量", description: "Beta波 · 清醒警觉", baseFrequency: 200, beatFrequency: 18, brainwaveType: "beta", icon: "⚡" },
];

export function useBinauralBeats() {
    const audioContextRef = useRef<AudioContext | null>(null);
    const leftOscRef = useRef<OscillatorNode | null>(null);
    const rightOscRef = useRef<OscillatorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);

    const stop = useCallback(() => {
        const ctx = audioContextRef.current;
        const gain = gainNodeRef.current;

        if (ctx && gain && ctx.state !== 'closed') {
            // Smooth fade out
            try {
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            } catch (e) {
                // Context might be closed
            }

            setTimeout(() => {
                try {
                    leftOscRef.current?.stop();
                    rightOscRef.current?.stop();
                    ctx.close();
                } catch (e) {
                    // Already stopped
                }
                audioContextRef.current = null;
                leftOscRef.current = null;
                rightOscRef.current = null;
                gainNodeRef.current = null;
            }, 600);
        }

        setIsPlaying(false);
        setCurrentPresetId(null);
    }, []);

    const start = useCallback((preset: BinauralPreset) => {
        // Stop any existing playback first
        if (audioContextRef.current) {
            try {
                leftOscRef.current?.stop();
                rightOscRef.current?.stop();
                audioContextRef.current.close();
            } catch (e) { }
        }

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;

        // Create gain node for volume control
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0;
        gainNode.connect(ctx.destination);
        gainNodeRef.current = gainNode;

        // Left ear oscillator (base frequency)
        const leftOsc = ctx.createOscillator();
        leftOsc.type = 'sine';
        leftOsc.frequency.value = preset.baseFrequency;

        // Right ear oscillator (base + beat frequency)
        const rightOsc = ctx.createOscillator();
        rightOsc.type = 'sine';
        rightOsc.frequency.value = preset.baseFrequency + preset.beatFrequency;

        // Stereo panning
        const leftPanner = ctx.createStereoPanner();
        leftPanner.pan.value = -1;

        const rightPanner = ctx.createStereoPanner();
        rightPanner.pan.value = 1;

        // Connect the audio graph
        leftOsc.connect(leftPanner).connect(gainNode);
        rightOsc.connect(rightPanner).connect(gainNode);

        // Smooth fade in over 2 seconds
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 2);

        leftOsc.start();
        rightOsc.start();

        leftOscRef.current = leftOsc;
        rightOscRef.current = rightOsc;

        setIsPlaying(true);
        setCurrentPresetId(preset.id);
    }, []);

    const setVolume = useCallback((volume: number) => {
        if (gainNodeRef.current && audioContextRef.current) {
            const safeVolume = Math.max(0, Math.min(0.3, volume));
            gainNodeRef.current.gain.linearRampToValueAtTime(safeVolume, audioContextRef.current.currentTime + 0.1);
        }
    }, []);

    return {
        start,
        stop,
        setVolume,
        isPlaying,
        currentPresetId,
        presets: BINAURAL_PRESETS,
    };
}
