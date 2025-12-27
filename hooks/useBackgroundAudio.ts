"use client";

import { useRef, useCallback, useEffect } from 'react';

/**
 * 🎵 后台音频播放 Hook
 * 
 * 功能：
 * 1. Media Session API - 锁屏界面显示播放控制
 * 2. Wake Lock API - 防止屏幕休眠
 * 3. 静默保活 - iOS 专用，定期播放微小静音防止系统暂停
 */

interface BackgroundAudioConfig {
    title: string;
    artist?: string;
    album?: string;
    artwork?: string;
    onPlay?: () => void;
    onPause?: () => void;
    onStop?: () => void;
    onSeekBackward?: () => void;
    onSeekForward?: () => void;
}

interface BackgroundAudioReturn {
    /** 激活后台音频（播放开始时调用） */
    activate: (config: BackgroundAudioConfig) => Promise<void>;
    /** 停用后台音频（播放停止时调用） */
    deactivate: () => Promise<void>;
    /** 更新播放状态 */
    setPlaybackState: (state: 'playing' | 'paused' | 'none') => void;
    /** 更新进度位置 */
    setPositionState: (duration: number, position: number, playbackRate?: number) => void;
}

// 检测 iOS 平台
const isIOS = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export function useBackgroundAudio(): BackgroundAudioReturn {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const silentAudioRef = useRef<HTMLAudioElement | null>(null);
    const isActiveRef = useRef(false);

    // 🔥 [iOS Fix] 生成抖动静音 WAV - 包含微小噪声，防止 iOS 检测为纯静音并暂停
    // iOS 会检测纯静音音频并可能暂停它，抖动静音会保持音频会话活跃
    const createDitheredSilenceWAV = useCallback((seconds: number = 10): string => {
        const sampleRate = 22050; // 较低采样率减少数据量
        const numSamples = sampleRate * seconds;
        const bytesPerSample = 2;
        const dataSize = numSamples * bytesPerSample;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        const writeStr = (offset: number, s: string) => {
            for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
        };

        // WAV header
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * bytesPerSample, true);
        view.setUint16(32, bytesPerSample, true);
        view.setUint16(34, 16, true);
        writeStr(36, 'data');
        view.setUint32(40, dataSize, true);

        // 🔥 抖动静音：微小随机噪声 (约 -60dB)
        // 这足以让 iOS 认为音频有内容，但听起来完全静音
        for (let i = 0; i < numSamples; i++) {
            const dither = (Math.random() - 0.5) * 6; // ±3 极微小噪声（几乎听不到）
            view.setInt16(44 + i * 2, Math.round(dither), true);
        }

        const blob = new Blob([buffer], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    }, []);

    // 创建静默音频元素 (使用抖动静音)
    const createSilentAudio = useCallback((): HTMLAudioElement => {
        const url = createDitheredSilenceWAV(10); // 10秒抖动静音
        const audio = new Audio(url);
        audio.loop = true;
        audio.volume = 0.01; // 微小音量保活
        // @ts-ignore
        audio.playsInline = true;
        audio.preload = 'auto';

        console.log('[BackgroundAudio] 🔊 Created dithered silence audio for keep-alive');
        return audio;
    }, [createDitheredSilenceWAV]);

    // 请求 Wake Lock
    const requestWakeLock = useCallback(async () => {
        if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

        try {
            // @ts-ignore
            const lock = await navigator.wakeLock.request('screen');
            wakeLockRef.current = lock;

            lock.addEventListener('release', () => {
                console.log('[BackgroundAudio] Wake Lock 已释放');
                wakeLockRef.current = null;
            });

            console.log('[BackgroundAudio] Wake Lock 已激活');
        } catch (err) {
            console.warn('[BackgroundAudio] Wake Lock 请求失败:', err);
        }
    }, []);

    // 释放 Wake Lock
    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
            } catch (err) {
                console.warn('[BackgroundAudio] Wake Lock 释放失败:', err);
            }
            wakeLockRef.current = null;
        }
    }, []);

    // 设置 Media Session
    const setupMediaSession = useCallback((config: BackgroundAudioConfig) => {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

        // 设置元数据
        navigator.mediaSession.metadata = new MediaMetadata({
            title: config.title,
            artist: config.artist || 'Rain Meditation',
            album: config.album || '冥想',
            artwork: config.artwork ? [
                { src: config.artwork, sizes: '512x512', type: 'image/png' }
            ] : [
                { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
            ]
        });

        // 注册控制处理器
        if (config.onPlay) {
            navigator.mediaSession.setActionHandler('play', config.onPlay);
        }
        if (config.onPause) {
            navigator.mediaSession.setActionHandler('pause', config.onPause);
        }
        if (config.onStop) {
            navigator.mediaSession.setActionHandler('stop', config.onStop);
        }
        if (config.onSeekBackward) {
            navigator.mediaSession.setActionHandler('seekbackward', config.onSeekBackward);
        }
        if (config.onSeekForward) {
            navigator.mediaSession.setActionHandler('seekforward', config.onSeekForward);
        }

        console.log('[BackgroundAudio] Media Session 已设置:', config.title);
    }, []);

    // 清除 Media Session
    const clearMediaSession = useCallback(() => {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';

        // 清除所有处理器
        const actions: MediaSessionAction[] = ['play', 'pause', 'stop', 'seekbackward', 'seekforward'];
        actions.forEach(action => {
            try {
                navigator.mediaSession.setActionHandler(action, null);
            } catch { }
        });
    }, []);

    // 启动保活
    const startKeepAlive = useCallback(() => {
        if (!silentAudioRef.current) {
            silentAudioRef.current = createSilentAudio();
        }

        const audio = silentAudioRef.current;
        // 尝试播放
        audio.play().catch((e) => {
            console.warn('[BackgroundAudio] 保活启动失败 (可能需要用户手势):', e);
        });

        // 定期检查播放状态，如果暂停了就恢复
        keepAliveIntervalRef.current = setInterval(() => {
            // 只有在 isActive 为 true 且音频暂停时才干预
            if (activeRef.current && silentAudioRef.current && silentAudioRef.current.paused) {
                console.log('[BackgroundAudio] 检测到保活暂停，尝试恢复...');
                silentAudioRef.current.play().catch(() => { });
            }
        }, 2000);

        console.log('[BackgroundAudio] 保活机制已启动');
    }, [createSilentAudio]);

    // 停止保活
    const stopKeepAlive = useCallback(() => {
        if (keepAliveIntervalRef.current) {
            clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
        }
        if (silentAudioRef.current) {
            silentAudioRef.current.pause();
        }
    }, []);

    const activeRef = useRef(false);

    // 激活后台音频
    const activate = useCallback(async (config: BackgroundAudioConfig) => {
        activeRef.current = true;
        isActiveRef.current = true;

        // 1. 启动保活音频 (这是最核心的)
        startKeepAlive();

        // 2. 设置 Media Session
        setupMediaSession(config);

        // 3. 请求 Wake Lock
        await requestWakeLock();

        // 4. 设置状态
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
        }
    }, [setupMediaSession, requestWakeLock, startKeepAlive]);

    // 停用后台音频
    const deactivate = useCallback(async () => {
        if (!isActiveRef.current) return;
        isActiveRef.current = false;

        // 1. 停止保活
        stopKeepAlive();

        // 2. 释放 Wake Lock
        await releaseWakeLock();

        // 3. 清除 Media Session
        clearMediaSession();

        console.log('[BackgroundAudio] ⏹️ 后台音频已停用');
    }, [stopKeepAlive, releaseWakeLock, clearMediaSession]);

    // 设置播放状态
    const setPlaybackState = useCallback((state: 'playing' | 'paused' | 'none') => {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
        navigator.mediaSession.playbackState = state;
    }, []);

    // 设置进度位置
    const setPositionState = useCallback((duration: number, position: number, playbackRate: number = 1) => {
        if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

        try {
            navigator.mediaSession.setPositionState({
                duration,
                position: Math.min(position, duration),
                playbackRate
            });
        } catch (err) {
            // setPositionState 可能不被所有浏览器支持
        }
    }, []);

    // 可见性变化时重新请求 Wake Lock
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && isActiveRef.current) {
                // 页面重新可见时，重新请求 Wake Lock（可能已被释放）
                if (!wakeLockRef.current) {
                    await requestWakeLock();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [requestWakeLock]);

    // 组件卸载时清理
    useEffect(() => {
        return () => {
            stopKeepAlive();
            releaseWakeLock();
        };
    }, [stopKeepAlive, releaseWakeLock]);

    return {
        activate,
        deactivate,
        setPlaybackState,
        setPositionState
    };
}
