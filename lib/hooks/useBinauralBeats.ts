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
    // For ramping presets
    isRamping?: boolean;
    endBeatFrequency?: number;
}

// Static presets (fixed frequency)
export const BINAURAL_PRESETS: BinauralPreset[] = [
    // 🌊 NEW: Dynamic Ramping Presets (Most Popular First)
    {
        id: "deep-journey",
        name: "入定之旅",
        description: "Alpha→Theta→Delta 渐进入定",
        baseFrequency: 200,
        beatFrequency: 12, // Start at Alpha (12Hz)
        endBeatFrequency: 2, // End at Delta (2Hz)
        brainwaveType: "alpha",
        isRamping: true,
        icon: "🌌"
    },
    {
        id: "meditation-descent",
        name: "冥想下沉",
        description: "Alpha→Theta 冥想引导",
        baseFrequency: 200,
        beatFrequency: 10, // Start at Alpha (10Hz)
        endBeatFrequency: 5, // End at deep Theta (5Hz)
        brainwaveType: "alpha",
        isRamping: true,
        icon: "🧘‍♂️"
    },
    // Classic fixed-frequency presets
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

    /**
     * Start binaural beats with optional frequency ramping
     * @param preset - The binaural preset configuration
     * @param durationSeconds - Total duration for ramping (only used if preset.isRamping is true)
     */
    const start = useCallback((preset: BinauralPreset, durationSeconds?: number) => {
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

        // iOS requires explicit resume after user interaction
        ctx.resume().then(() => {
            console.log('[BinauralBeats] AudioContext resumed, state:', ctx.state);
        }).catch(e => {
            console.error('[BinauralBeats] Failed to resume AudioContext:', e);
        });

        // Create gain node for volume control
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0;
        gainNode.connect(ctx.destination);
        gainNodeRef.current = gainNode;

        // Left ear oscillator (base frequency - stays constant)
        const leftOsc = ctx.createOscillator();
        leftOsc.type = 'sine';
        leftOsc.frequency.value = preset.baseFrequency;

        // Right ear oscillator (base + beat frequency)
        const rightOsc = ctx.createOscillator();
        rightOsc.type = 'sine';

        const startBeatFreq = preset.beatFrequency;
        const endBeatFreq = preset.endBeatFrequency ?? preset.beatFrequency;

        rightOsc.frequency.value = preset.baseFrequency + startBeatFreq;

        // 🌊 Dynamic Frequency Ramping
        if (preset.isRamping && durationSeconds && durationSeconds > 0) {
            const rampDuration = durationSeconds;

            // Schedule the frequency ramp
            // Right oscillator frequency ramps from (base + startBeat) to (base + endBeat)
            rightOsc.frequency.setValueAtTime(
                preset.baseFrequency + startBeatFreq,
                ctx.currentTime
            );
            rightOsc.frequency.linearRampToValueAtTime(
                preset.baseFrequency + endBeatFreq,
                ctx.currentTime + rampDuration
            );

            console.log(`[BinauralBeats] 🌊 Ramping from ${startBeatFreq}Hz to ${endBeatFreq}Hz over ${rampDuration}s`);
        } else {
            console.log('[BinauralBeats] Starting with fixed frequency:', startBeatFreq, 'Hz');
        }

        // Stereo panning
        const leftPanner = ctx.createStereoPanner();
        leftPanner.pan.value = -1;

        const rightPanner = ctx.createStereoPanner();
        rightPanner.pan.value = 1;

        // Connect the audio graph
        leftOsc.connect(leftPanner).connect(gainNode);
        rightOsc.connect(rightPanner).connect(gainNode);

        // Smooth fade in over 3 seconds
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 3);

        leftOsc.start();
        rightOsc.start();

        leftOscRef.current = leftOsc;
        rightOscRef.current = rightOsc;

        setIsPlaying(true);
        setCurrentPresetId(preset.id);
    }, []);

    const setVolume = useCallback((volume: number) => {
        if (gainNodeRef.current && audioContextRef.current) {
            const safeVolume = Math.max(0, Math.min(0.5, volume));
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
