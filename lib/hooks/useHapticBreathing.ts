"use client";

import { useMemo, useCallback } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

/**
 * useHapticBreathing
 * 
 * 提供呼吸训练时的触觉反馈 (Taptic Engine)
 * 仅在 Native 环境下生效，Web 环境会自动降级（空函数）
 */
export const useHapticBreathing = () => {
    // 检测是否为原生环境 (避免在 Web 端报错或无效调用)
    const isNative = useMemo(() => Capacitor.isNativePlatform(), []);

    /**
     * 吸气开始 (渐强预感)
     * 模拟能量积蓄的感觉
     */
    const triggerInhale = useCallback(async () => {
        if (!isNative) return;
        try {
            // 轻微震动，提示开始
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) {
            console.warn("[Haptics] Inhale failed", e);
        }
    }, [isNative]);

    /**
     * 屏气 (瞬间静止)
     * 一个明显的顿挫感
     */
    const triggerHold = useCallback(async () => {
        if (!isNative) return;
        try {
            // 中等震动，提示阶段切换
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) {
            console.warn("[Haptics] Hold failed", e);
        }
    }, [isNative]);

    /**
     * 呼气 (释放)
     * 
     */
    const triggerExhale = useCallback(async () => {
        if (!isNative) return;
        try {
            // 轻微震动，提示释放
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) {
            console.warn("[Haptics] Exhale failed", e);
        }
    }, [isNative]);

    /**
     * 下达指令时的强调 (例如 "准备开始")
     */
    const triggerEmphasis = useCallback(async () => {
        if (!isNative) return;
        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (e) {
            console.warn("[Haptics] Emphasis failed", e);
        }
    }, [isNative]);

    return {
        triggerInhale,
        triggerHold,
        triggerExhale,
        triggerEmphasis
    };
};
