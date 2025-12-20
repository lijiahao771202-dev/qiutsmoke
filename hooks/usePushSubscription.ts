"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 注册 Service Worker
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!("serviceWorker" in navigator)) {
        console.log("[SW] Service Worker 不支持");
        return null;
    }

    try {
        // 检查是否已注册
        const existingReg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (existingReg) {
            console.log("[SW] Service Worker 已注册");
            return existingReg;
        }

        // 注册新的 Service Worker
        console.log("[SW] 正在注册 Service Worker...");
        const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/"
        });
        console.log("[SW] ✅ Service Worker 注册成功");
        return registration;
    } catch (e) {
        console.error("[SW] Service Worker 注册失败:", e);
        return null;
    }
}

/**
 * 自动推送订阅 Hook
 * 在用户登录后自动请求通知权限并订阅推送
 */
export function usePushSubscription() {
    const hasSubscribed = useRef(false);

    useEffect(() => {
        // 避免重复订阅
        if (hasSubscribed.current) return;

        const autoSubscribe = async () => {
            // 检查浏览器支持
            if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
                console.log("[Push] 浏览器不支持推送通知");
                return;
            }

            // 首先注册 Service Worker
            const swReg = await registerServiceWorker();
            if (!swReg) {
                console.log("[Push] Service Worker 注册失败，无法订阅推送");
                return;
            }

            // 等待 Service Worker 激活
            if (swReg.installing || swReg.waiting) {
                console.log("[Push] 等待 Service Worker 激活...");
                await new Promise<void>((resolve) => {
                    const sw = swReg.installing || swReg.waiting;
                    if (sw) {
                        sw.addEventListener("statechange", () => {
                            if (sw.state === "activated") {
                                resolve();
                            }
                        });
                    } else {
                        resolve();
                    }
                    // 超时
                    setTimeout(resolve, 5000);
                });
            }

            // 检查用户是否已登录
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log("[Push] 用户未登录，跳过订阅");
                return;
            }

            // 检查是否已有订阅
            try {
                const existingSub = await swReg.pushManager.getSubscription();

                if (existingSub) {
                    console.log("[Push] 已有订阅，检查是否需要更新...");
                    await saveSubscription(user.id, existingSub);
                    hasSubscribed.current = true;
                    return;
                }
            } catch (e) {
                console.error("[Push] 检查订阅失败:", e);
            }

            // 请求通知权限
            if (Notification.permission === "default") {
                console.log("[Push] 请求通知权限...");
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    console.log("[Push] 用户拒绝了通知权限");
                    return;
                }
            } else if (Notification.permission === "denied") {
                console.log("[Push] 通知权限被阻止");
                return;
            }

            // 订阅推送
            try {
                const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                if (!vapidPublicKey) {
                    console.error("[Push] 缺少 VAPID 公钥");
                    return;
                }

                // 转换 VAPID key
                const urlBase64ToUint8Array = (base64String: string) => {
                    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
                    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
                    const rawData = window.atob(base64);
                    const outputArray = new Uint8Array(rawData.length);
                    for (let i = 0; i < rawData.length; ++i) {
                        outputArray[i] = rawData.charCodeAt(i);
                    }
                    return outputArray;
                };

                console.log("[Push] 订阅推送...");
                const subscription = await swReg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                });

                console.log("[Push] 订阅成功，保存到数据库...");
                await saveSubscription(user.id, subscription);
                hasSubscribed.current = true;
                console.log("[Push] ✅ 推送订阅完成");
            } catch (e) {
                console.error("[Push] 订阅失败:", e);
            }
        };

        // 延迟执行，避免影响首屏加载
        const timer = setTimeout(autoSubscribe, 3000);
        return () => clearTimeout(timer);
    }, []);
}

// 保存订阅到 Supabase（匹配数据库表结构）
async function saveSubscription(userId: string, subscription: PushSubscription) {
    try {
        const supabase = createClient();
        const subJson = subscription.toJSON();

        // 数据库表结构: endpoint, p256dh, auth（分开的字段）
        const { error } = await supabase.from("push_subscriptions").upsert({
            user_id: userId,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys?.p256dh || "",
            auth: subJson.keys?.auth || "",
            updated_at: new Date().toISOString(),
        }, {
            onConflict: "user_id"
        });

        if (error) {
            console.error("[Push] 保存订阅失败:", error);
        } else {
            console.log("[Push] ✅ 订阅已保存到数据库");
        }
    } catch (e) {
        console.error("[Push] 保存订阅异常:", e);
    }
}
