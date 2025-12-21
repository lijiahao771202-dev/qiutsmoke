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

    // 🎵 10秒静默 MP3 (Base64) - 比动态生成更稳定
    const SILENT_MP3 = "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAAZAAKCg4OExMTFhYWGhoaHBwcIiIiJycnKSkpLy8vMzMzOTk5Ozs7Q0NDR0dHS0tLTExMVFRUWFhYWlpaXFxcYGBgZGRkaGhoeHh4fX19g4ODiIiIjY2NkZGRlZWVmZmZnZ2doaGhpqamq6urr6+vsLCwtLS0vb29wMDAvr6+xMTExsbGysrKzMzM0tLS1dXV2tra3Nzc4ODg5OTk5+fn6urq7u7u8vLy9/f3+/v7////AAAAAHAABAAAAABQAABAAAAAAAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA//uSxAAAAAABAAAAAAAAAAAA";

    // 创建静默音频元素
    const createSilentAudio = useCallback((): HTMLAudioElement => {
        const audio = new Audio(SILENT_MP3);
        audio.loop = true;
        audio.volume = 0.01; // 微小音量保活
        // @ts-ignore
        audio.playsInline = true;
        audio.preload = 'auto';
        return audio;
    }, []);

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
