"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/**
 * 🌿 useWhiteNoise - 环境音混音管理 Hook
 * 
 * 功能：
 * 1. 支持多种环境音轨同时播放（混音）
 * 2. 每个音轨独立音量控制
 * 3. 支持 Web Audio API 实时生成粉红噪音
 * 4. 自动循环播放
 */

export type AmbientSoundType = 'rain' | 'waves' | 'forest' | 'fire' | 'pink_noise';

export interface AmbientSound {
    id: AmbientSoundType;
    name: string;
    url?: string;
    icon: string;
}

// 可混音的环境音列表（移除 'none'，因为现在是多选模式）
export const AMBIENT_SOUNDS: AmbientSound[] = [
    { id: 'rain', name: '轻雨', url: 'https://cdn.pixabay.com/download/audio/2025/09/02/audio_70bf864948.mp3?filename=calming-rain-loop-398653.mp3', icon: '🌧️' },
    { id: 'waves', name: '海浪', url: 'https://cdn.pixabay.com/download/audio/2025/07/09/audio_56227295c2.mp3?filename=soothing-ocean-waves-372489.mp3', icon: '🌊' },
    { id: 'forest', name: '森林', url: 'https://cdn.pixabay.com/download/audio/2025/11/30/audio_b96506e0f1.mp3?filename=birds-forest-nature-445379.mp3', icon: '🌲' },
    { id: 'fire', name: '篝火', url: 'https://cdn.pixabay.com/download/audio/2025/11/19/audio_908a09a5b0.mp3?filename=campfire-crackling-sound-439573.mp3', icon: '🔥' },
    { id: 'pink_noise', name: '粉红噪音', icon: '🌸' },
];

// 音轨状态接口
interface TrackState {
    audio?: HTMLAudioElement;
    volume: number;
    isPlaying: boolean;
}

export function useWhiteNoise() {
    // 使用 Map 管理多个音轨的状态
    const [activeTracks, setActiveTracks] = useState<Set<AmbientSoundType>>(new Set());
    const [trackVolumes, setTrackVolumes] = useState<Record<AmbientSoundType, number>>({
        rain: 0.5,
        waves: 0.5,
        forest: 0.5,
        fire: 0.5,
        pink_noise: 0.5,
    });
    const [masterVolume, setMasterVolume] = useState(0.7);

    // 音频元素引用
    const audioRefs = useRef<Map<AmbientSoundType, HTMLAudioElement>>(new Map());

    // Web Audio API 引用（用于粉红噪音）
    const audioContextRef = useRef<AudioContext | null>(null);
    const pinkNoiseNodeRef = useRef<ScriptProcessorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    // 初始化音频元素
    useEffect(() => {
        if (typeof window === 'undefined') return;

        console.log("[MixAudio] Initializing audio elements...");

        // 为每个有 URL 的音效创建 Audio 元素
        AMBIENT_SOUNDS.forEach(sound => {
            if (sound.url && !audioRefs.current.has(sound.id)) {
                const audio = new Audio();
                audio.loop = true;
                audio.crossOrigin = "anonymous";
                audio.preload = "metadata";
                audio.src = sound.url;
                audioRefs.current.set(sound.id, audio);
            }
        });

        return () => {
            // 清理所有音频
            audioRefs.current.forEach((audio, id) => {
                audio.pause();
                audio.src = "";
            });
            audioRefs.current.clear();
            stopPinkNoise();
        };
    }, []);

    // 监听主音量变化
    useEffect(() => {
        audioRefs.current.forEach((audio, id) => {
            if (activeTracks.has(id)) {
                audio.volume = trackVolumes[id] * masterVolume;
            }
        });
        if (gainNodeRef.current && audioContextRef.current && activeTracks.has('pink_noise')) {
            const ctx = audioContextRef.current;
            gainNodeRef.current.gain.setTargetAtTime(
                trackVolumes.pink_noise * masterVolume * 0.5,
                ctx.currentTime,
                0.1
            );
        }
    }, [masterVolume, trackVolumes, activeTracks]);

    // 停止粉红噪音
    const stopPinkNoise = useCallback(() => {
        if (pinkNoiseNodeRef.current) {
            try {
                console.log("[MixAudio] Stopping pink noise...");
                pinkNoiseNodeRef.current.disconnect();
            } catch (e) { }
            pinkNoiseNodeRef.current = null;
        }
    }, []);

    // 启动粉红噪音
    const startPinkNoise = useCallback(() => {
        if (typeof window === 'undefined') return;

        console.log("[MixAudio] Starting pink noise...");
        if (!audioContextRef.current) {
            const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AC();
        }

        const ctx = audioContextRef.current;
        if (!ctx) return;

        const setupNoiseNode = (context: AudioContext) => {
            stopPinkNoise();
            const bufferSize = 4096;
            const node = context.createScriptProcessor(bufferSize, 1, 1);

            // Paul Kellet 粉红噪音滤波器
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

            node.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                    b6 = white * 0.115926;
                }
            };

            if (!gainNodeRef.current) {
                gainNodeRef.current = context.createGain();
                gainNodeRef.current.connect(context.destination);
            }

            node.connect(gainNodeRef.current);
            pinkNoiseNodeRef.current = node;
            gainNodeRef.current.gain.setTargetAtTime(
                trackVolumes.pink_noise * masterVolume * 0.5,
                context.currentTime,
                0.1
            );
        };

        if (ctx.state === 'suspended') {
            ctx.resume().then(() => setupNoiseNode(ctx));
        } else {
            setupNoiseNode(ctx);
        }
    }, [stopPinkNoise, trackVolumes.pink_noise, masterVolume]);

    // 切换音轨（开/关）
    const toggleTrack = useCallback((id: AmbientSoundType) => {
        console.log(`[MixAudio] Toggling track: ${id}`);

        setActiveTracks(prev => {
            const newSet = new Set(prev);

            if (newSet.has(id)) {
                // 关闭音轨
                newSet.delete(id);
                if (id === 'pink_noise') {
                    stopPinkNoise();
                } else {
                    const audio = audioRefs.current.get(id);
                    if (audio) {
                        audio.pause();
                        audio.currentTime = 0;
                    }
                }
            } else {
                // 开启音轨
                newSet.add(id);
                if (id === 'pink_noise') {
                    startPinkNoise();
                } else {
                    const audio = audioRefs.current.get(id);
                    if (audio) {
                        audio.volume = trackVolumes[id] * masterVolume;
                        audio.play().catch(err => {
                            console.warn(`[MixAudio] Play ${id} failed:`, err);
                        });
                    }
                }
            }

            return newSet;
        });
    }, [startPinkNoise, stopPinkNoise, trackVolumes, masterVolume]);

    // 设置单个音轨音量
    const setTrackVolume = useCallback((id: AmbientSoundType, volume: number) => {
        setTrackVolumes(prev => ({ ...prev, [id]: volume }));

        if (id === 'pink_noise') {
            if (gainNodeRef.current && audioContextRef.current) {
                const ctx = audioContextRef.current;
                gainNodeRef.current.gain.setTargetAtTime(volume * masterVolume * 0.5, ctx.currentTime, 0.1);
            }
        } else {
            const audio = audioRefs.current.get(id);
            if (audio) {
                audio.volume = volume * masterVolume;
            }
        }
    }, [masterVolume]);

    // 停止所有音轨
    const stopAll = useCallback(() => {
        console.log("[MixAudio] Stopping all tracks...");
        audioRefs.current.forEach((audio) => {
            audio.pause();
            audio.currentTime = 0;
        });
        stopPinkNoise();
        setActiveTracks(new Set());
    }, [stopPinkNoise]);

    return {
        activeTracks,           // 当前激活的音轨 Set
        trackVolumes,           // 各音轨音量
        masterVolume,           // 主音量
        setMasterVolume,        // 设置主音量
        toggleTrack,            // 切换音轨
        setTrackVolume,         // 设置单个音轨音量
        stopAll,                // 停止所有
        AMBIENT_SOUNDS,         // 音效列表
    };
}
