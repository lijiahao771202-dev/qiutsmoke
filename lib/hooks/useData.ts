'use client';

/**
 * SWR 数据缓存 Hooks
 * 使用 stale-while-revalidate 策略缓存数据
 * 页面切换时立即显示缓存数据，后台静默更新
 */

import useSWR from 'swr';

// 通用 fetcher
const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error('Failed to fetch');
    }
    return res.json();
};

// SWR 全局配置
export const swrConfig = {
    revalidateOnFocus: false,      // 聚焦时不自动刷新
    revalidateOnReconnect: true,   // 重新连接时刷新
    dedupingInterval: 5000,        // 5秒内相同请求去重
    shouldRetryOnError: false,     // 错误时不自动重试
};

// TTS Cards Hook
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
    const { data, error, isLoading, mutate } = useSWR<TTSCard[]>(
        '/api/tts/cards',
        fetcher,
        {
            ...swrConfig,
            fallbackData: [], // 初始空数组，避免 undefined
        }
    );

    return {
        cards: data || [],
        isLoading,
        error,
        mutate,
        // 乐观更新：添加卡片
        addCard: async (newCard: Partial<TTSCard>) => {
            // 乐观更新 UI
            const optimisticCard = { ...newCard, id: 'temp-' + Date.now() } as TTSCard;
            mutate([optimisticCard, ...(data || [])], false);

            // 发送请求
            const res = await fetch('/api/tts/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCard),
            });

            if (res.ok) {
                // 刷新真实数据
                mutate();
            }
            return res;
        },
        // 乐观更新：删除卡片
        deleteCard: async (id: string) => {
            // 乐观更新 UI
            mutate((data || []).filter(c => c.id !== id), false);

            await fetch(`/api/tts/cards?id=${id}`, { method: 'DELETE' });
            mutate();
        },
    };
}

// Meditation Stats Hook
export interface StatsData {
    totalSessions: number;
    totalMinutes: number;
    totalDurationMinutes?: number;  // 兼容Stats页面使用的字段名
    currentStreak: number;
    longestStreak: number;
    daysMeditated?: number;
}

export function useMeditationStats() {
    const { data, error, isLoading, mutate } = useSWR<StatsData>(
        '/api/meditation/stats',
        fetcher,
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

// Meditation Sessions Hook
export interface Session {
    id: string;
    topic_id: string;
    topic_name: string;
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
}

export function useMeditationSessions(month?: string) {
    const url = month ? `/api/meditation/sessions?month=${month}` : '/api/meditation/sessions';

    const { data, error, isLoading, mutate } = useSWR<Session[]>(
        url,
        fetcher,
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

// Meditation Topics (Custom Cards) Hook
export interface MeditationTopic {
    id: string;
    user_id?: string;
    title: string;
    prompt?: string;
    icon_name?: string;
    created_at: string;
}

export function useMeditationTopics() {
    const { data, error, isLoading, mutate } = useSWR<MeditationTopic[]>(
        '/api/meditation/cards',
        fetcher,
        {
            ...swrConfig,
            fallbackData: [],
        }
    );

    return {
        topics: data || [],
        isLoading,
        error,
        mutate,
        // 添加话题
        addTopic: async (topic: Partial<MeditationTopic>) => {
            const res = await fetch('/api/meditation/cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(topic),
            });
            if (res.ok) {
                mutate();
            }
            return res;
        },
        // 删除话题
        deleteTopic: async (id: string) => {
            mutate((data || []).filter(t => t.id !== id), false);
            await fetch(`/api/meditation/cards?id=${id}`, { method: 'DELETE' });
            mutate();
        },
    };
}
