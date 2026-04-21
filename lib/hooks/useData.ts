'use client';

/**
 * SWR 数据缓存 Hooks（Local-First 版本）
 * 
 * 架构：IndexedDB（毫秒级）→ SWR 缓存 → 云端 API（后台静默同步）
 * 
 * 1. 页面打开时，先从 IndexedDB 读取数据作为初始值（零延迟）
 * 2. 同时后台向云端发起请求获取最新数据
 * 3. 云端数据返回后，自动更新 IndexedDB + 刷新 UI
 * 4. 写操作同时写入 IndexedDB + 推送云端
 */

import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { getApiUrl } from '../config';
import * as localDB from '../localDB';

// ─── 通用 fetcher（带 IndexedDB 回写） ───

function createSyncFetcher<T>(storeName: localDB.StoreName) {
    return async (url: string): Promise<T[]> => {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        // 云端数据拉回后，静默写入 IndexedDB
        if (Array.isArray(data)) {
            localDB.replaceAll(storeName, data).then(() => {
                localDB.setLastSyncTime(storeName);
            }).catch(() => { /* 静默失败 */ });
        }
        return data;
    };
}

// SWR 全局配置
export const swrConfig = {
    revalidateOnFocus: false,      // 聚焦时不自动刷新
    revalidateOnReconnect: true,   // 重新连接时刷新
    dedupingInterval: 5000,        // 5秒内相同请求去重
    shouldRetryOnError: false,     // 错误时不自动重试
};

// ─── TTS Cards Hook ───

export interface TTSCard {
    id: string;
    user_id?: string;
    title?: string;
    content: string;
    voice_id: string;
    rate: string;
    guidance_level?: string;
    created_at: string;
}

export function useTTSCards() {
    const [localData, setLocalData] = useState<TTSCard[] | undefined>(undefined);

    // Step 1: 启动时从 IndexedDB 读取本地数据（毫秒级）
    useEffect(() => {
        localDB.getAll<TTSCard>('tts_cards').then(data => {
            if (data.length > 0) {
                setLocalData(data);
            }
        });
    }, []);

    // Step 2: SWR 同时后台拉云端数据，返回后自动回写 IndexedDB
    const { data, error, isLoading, mutate } = useSWR<TTSCard[]>(
        getApiUrl('/api/tts/cards'),
        createSyncFetcher<TTSCard>('tts_cards'),
        {
            ...swrConfig,
            fallbackData: localData || [], // 用本地数据作为 fallback
        }
    );

    // 优先用 SWR 的云端数据，如果还没到则用本地数据
    const cards = (data && data.length > 0) ? data : (localData || []);

    return {
        cards,
        isLoading: isLoading && !localData, // 有本地数据就不算 loading
        error,
        mutate,
        // 乐观更新：添加卡片（同时写入 IndexedDB + 云端）
        addCard: async (newCard: Partial<TTSCard>) => {
            const optimisticCard = { ...newCard, id: 'temp-' + Date.now() } as TTSCard;

            // 1. 乐观更新 UI
            mutate([optimisticCard, ...cards], false);

            // 2. 推送云端
            const res = await fetch(getApiUrl('/api/tts/cards'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCard),
            });

            if (res.ok) {
                const created = await res.json();
                // 3. 写入 IndexedDB
                localDB.put('tts_cards', created).catch(() => {});
                // 4. 刷新 SWR 获取最新列表
                mutate();
            }
            return res;
        },
        // 乐观更新：删除卡片
        deleteCard: async (id: string) => {
            // 1. 乐观更新 UI
            mutate(cards.filter(c => c.id !== id), false);
            // 2. 从 IndexedDB 删除
            localDB.remove('tts_cards', id).catch(() => {});
            // 3. 推送云端删除
            await fetch(getApiUrl(`/api/tts/cards?id=${id}`), { method: 'DELETE' });
            mutate();
        },
    };
}

// ─── Meditation Stats Hook ───

export interface StatsData {
    totalSessions: number;
    totalMinutes: number;
    totalDurationMinutes?: number;
    currentStreak: number;
    longestStreak: number;
    daysMeditated?: number;
}

const statsFetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

export function useMeditationStats() {
    const { data, error, isLoading, mutate } = useSWR<StatsData>(
        getApiUrl('/api/meditation/stats'),
        statsFetcher,
        {
            ...swrConfig,
            fallbackData: { totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0 },
        }
    );

    return {
        stats: data,
        isLoading,
        error,
        mutate,
    };
}

// ─── Meditation Sessions Hook ───

export interface Session {
    id: string;
    topic_id: string;
    topic_name: string;
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
}

export function useMeditationSessions(month?: string) {
    const url = getApiUrl(month ? `/api/meditation/sessions?month=${month}` : '/api/meditation/sessions');

    const { data, error, isLoading, mutate } = useSWR<Session[]>(
        url,
        createSyncFetcher<Session>('meditation_sessions'),
        {
            ...swrConfig,
            fallbackData: [],
        }
    );

    return {
        sessions: data || [],
        isLoading,
        error,
        mutate,
    };
}

// ─── Meditation Topics Hook ───

export interface MeditationTopic {
    id: string;
    user_id?: string;
    title: string;
    prompt?: string;
    icon_name?: string;
    created_at: string;
}

export function useMeditationTopics() {
    const [localData, setLocalData] = useState<MeditationTopic[] | undefined>(undefined);

    useEffect(() => {
        localDB.getAll<MeditationTopic>('meditation_topics').then(data => {
            if (data.length > 0) setLocalData(data);
        });
    }, []);

    const { data, error, isLoading, mutate } = useSWR<MeditationTopic[]>(
        getApiUrl('/api/meditation/cards'),
        createSyncFetcher<MeditationTopic>('meditation_topics'),
        {
            ...swrConfig,
            fallbackData: localData || [],
        }
    );

    const topics = (data && data.length > 0) ? data : (localData || []);

    return {
        topics,
        isLoading: isLoading && !localData,
        error,
        mutate,
        addTopic: async (topic: Partial<MeditationTopic>) => {
            const res = await fetch(getApiUrl('/api/meditation/cards'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(topic),
            });
            if (res.ok) {
                const created = await res.json();
                localDB.put('meditation_topics', created).catch(() => {});
                mutate();
            }
            return res;
        },
        deleteTopic: async (id: string) => {
            mutate(topics.filter(t => t.id !== id), false);
            localDB.remove('meditation_topics', id).catch(() => {});
            await fetch(getApiUrl(`/api/meditation/cards?id=${id}`), { method: 'DELETE' });
            mutate();
        },
    };
}
