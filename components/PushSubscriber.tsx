"use client";

import { usePushSubscription } from "@/hooks/usePushSubscription";

/**
 * 推送订阅组件
 * 渲染时自动订阅推送通知
 */
export function PushSubscriber() {
    usePushSubscription();
    return null; // 不渲染任何内容
}
