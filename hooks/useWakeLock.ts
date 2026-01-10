/**
 * useWakeLock Hook
 * 
 * 使用 Screen Wake Lock API 阻止设备屏幕在播放期间熄灭。
 * - 在播放时调用 requestWakeLock() 获取锁
 * - 在暂停/停止时调用 releaseWakeLock() 释放锁
 * - 自动处理页面可见性变化，重新获取锁
 */

import { useRef, useCallback, useEffect } from 'react';

// 定义 WakeLockSentinel 类型 (浏览器原生类型，但 TS 可能未包含)
interface WakeLockSentinel {
    readonly released: boolean;
    readonly type: 'screen';
    release(): Promise<void>;
    addEventListener(type: 'release', listener: () => void): void;
    removeEventListener(type: 'release', listener: () => void): void;
}

interface WakeLockAPI {
    request(type: 'screen'): Promise<WakeLockSentinel>;
}

// WakeLock API is natively typed in modern TypeScript libs
// If not available, check with 'wakeLock' in navigator

export function useWakeLock() {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const isRequestedRef = useRef(false); // 追踪用户是否主动请求了锁

    // 检查 API 是否可用
    const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

    // 请求唤醒锁
    const requestWakeLock = useCallback(async () => {
        if (!isSupported) {
            console.warn('[WakeLock] Screen Wake Lock API 不可用');
            return null;
        }

        // 如果已经有锁且未释放，直接返回
        if (wakeLockRef.current && !wakeLockRef.current.released) {
            return wakeLockRef.current;
        }

        try {
            wakeLockRef.current = await (navigator.wakeLock as unknown as WakeLockAPI).request('screen');
            isRequestedRef.current = true;
            console.log('[WakeLock] 🔒 屏幕唤醒锁已获取');

            // 监听锁被系统释放的事件（例如电量过低）
            wakeLockRef.current.addEventListener('release', () => {
                console.log('[WakeLock] ⚠️ 屏幕唤醒锁被系统释放');
            });

            return wakeLockRef.current;
        } catch (err) {
            // 可能的原因：电量过低、页面不可见、用户拒绝等
            console.error('[WakeLock] 请求失败:', err);
            return null;
        }
    }, [isSupported]);

    // 释放唤醒锁
    const releaseWakeLock = useCallback(async () => {
        isRequestedRef.current = false;

        if (wakeLockRef.current && !wakeLockRef.current.released) {
            try {
                await wakeLockRef.current.release();
                console.log('[WakeLock] 🔓 屏幕唤醒锁已释放');
            } catch (err) {
                console.error('[WakeLock] 释放失败:', err);
            }
        }
        wakeLockRef.current = null;
    }, []);

    // 处理页面可见性变化：当页面重新可见时，尝试重新获取锁
    useEffect(() => {
        if (!isSupported) return;

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && isRequestedRef.current) {
                // 页面重新可见且用户之前请求过锁，尝试重新获取
                if (!wakeLockRef.current || wakeLockRef.current.released) {
                    console.log('[WakeLock] 页面可见，尝试重新获取锁...');
                    await requestWakeLock();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isSupported, requestWakeLock]);

    // 组件卸载时自动释放锁
    useEffect(() => {
        return () => {
            if (wakeLockRef.current && !wakeLockRef.current.released) {
                wakeLockRef.current.release().catch(() => { });
            }
        };
    }, []);

    return {
        isSupported,
        requestWakeLock,
        releaseWakeLock,
    };
}
