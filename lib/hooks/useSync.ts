'use client';

/**
 * 后台同步管理器
 * 
 * 负责在后台将 IndexedDB 本地数据与 Supabase 云端保持同步。
 * - App 启动时触发一次全量同步
 * - 之后每 5 分钟静默同步
 * - 网络恢复时自动同步
 */

import { useEffect, useRef } from 'react';
import * as localDB from '../localDB';
import type { StoreName } from '../localDB';
import { getApiUrl } from '../config';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 分钟

// 将云端数据拉到本地 IndexedDB
async function pullFromCloud(storeName: StoreName, apiPath: string): Promise<boolean> {
    try {
        const res = await fetch(getApiUrl(apiPath));
        if (!res.ok) return false;
        const data = await res.json();
        if (Array.isArray(data)) {
            await localDB.replaceAll(storeName, data);
            await localDB.setLastSyncTime(storeName);
            console.log(`[Sync] ✅ ${storeName}: 同步了 ${data.length} 条记录`);
            return true;
        }
        return false;
    } catch (e) {
        console.warn(`[Sync] ⚠️ ${storeName} 同步失败:`, e);
        return false;
    }
}

// 需要同步的表和对应的 API 路径
const SYNC_TARGETS: { store: StoreName; api: string }[] = [
    { store: 'tts_cards', api: '/api/tts/cards' },
    { store: 'meditation_topics', api: '/api/meditation/cards' },
];

/** 执行一次全量同步 */
export async function syncAll(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) {
        console.log('[Sync] 离线状态，跳过同步');
        return;
    }

    console.log('[Sync] 开始后台同步...');
    const results = await Promise.allSettled(
        SYNC_TARGETS.map(t => pullFromCloud(t.store, t.api))
    );
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`[Sync] 完成: ${succeeded}/${SYNC_TARGETS.length} 张表同步成功`);
}

/** React Hook: 挂载后台同步定时器 */
export function useBackgroundSync() {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // 启动时首次同步（延迟 2 秒，让页面先渲染完）
        const initialTimer = setTimeout(() => {
            syncAll();
        }, 2000);

        // 定时同步
        intervalRef.current = setInterval(() => {
            syncAll();
        }, SYNC_INTERVAL);

        // 网络恢复时同步
        const handleOnline = () => {
            console.log('[Sync] 网络恢复，触发同步');
            syncAll();
        };
        window.addEventListener('online', handleOnline);

        return () => {
            clearTimeout(initialTimer);
            if (intervalRef.current) clearInterval(intervalRef.current);
            window.removeEventListener('online', handleOnline);
        };
    }, []);
}
