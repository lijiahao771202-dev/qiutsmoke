"use client";

import useSWR, { SWRConfiguration } from "swr";

// 通用 fetcher
const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
};

// SWR 全局配置：优先显示缓存数据，后台刷新
const defaultConfig: SWRConfiguration = {
    revalidateOnFocus: false, // 不在窗口聚焦时重新请求
    revalidateIfStale: true,  // 显示过期数据的同时后台刷新
    dedupingInterval: 5000,   // 5秒内相同请求去重
    errorRetryCount: 2,       // 错误重试次数
};

// 冥想卡片
export function useMeditationCards() {
    return useSWR("/api/meditation/cards", fetcher, {
        ...defaultConfig,
        revalidateOnMount: true,
    });
}

// 冥想统计
export function useMeditationStats() {
    return useSWR("/api/meditation/stats", fetcher, {
        ...defaultConfig,
        refreshInterval: 30000, // 30秒自动刷新
    });
}

// 冥想会话记录
export function useMeditationSessions(month: string) {
    return useSWR(
        month ? `/api/meditation/sessions?month=${month}` : null,
        fetcher,
        defaultConfig
    );
}

// TTS 卡片
export function useTtsCards() {
    return useSWR("/api/tts/cards", fetcher, {
        ...defaultConfig,
        revalidateOnMount: true,
    });
}

// 用户 Prompts
export function usePrompts() {
    return useSWR("/api/prompts", fetcher, {
        ...defaultConfig,
        revalidateOnMount: false, // 只在首次挂载时获取
    });
}

// 系统 Prompt
export function useSystemPrompt() {
    return useSWR("/api/system-prompt", fetcher, {
        ...defaultConfig,
        revalidateOnMount: false,
    });
}

// 导出 mutate 用于手动刷新
export { mutate } from "swr";
