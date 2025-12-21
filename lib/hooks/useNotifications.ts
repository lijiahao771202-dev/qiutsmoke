"use client";

import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useCallback, useState, useEffect, useMemo } from 'react';

/**
 * 更可靠的原生环境检测
 * Capacitor.isNativePlatform() 在远程 URL 加载时可能返回 false
 * 使用 User-Agent 作为备选检测方法
 */
const detectNativeEnvironment = (): boolean => {
    if (typeof window === 'undefined') return false;

    // 首先尝试 Capacitor 官方检测
    try {
        if (Capacitor.isNativePlatform()) return true;
    } catch (e) {
        console.warn('[NativeDetect] Capacitor detection failed:', e);
    }

    // 备选：检测 iOS WebView User-Agent
    // Capacitor iOS 使用 WKWebView，可以通过 UA 检测
    const ua = navigator.userAgent;
    // 检测是否在 iOS App 的 WebView 中 (不是 Safari)
    const isIOSWebView = /iPhone|iPad|iPod/.test(ua) && !ua.includes('Safari');
    // 或者检测 Capacitor 特有的 UA 标识
    const hasCapacitorFlag = ua.includes('Capacitor');

    return isIOSWebView || hasCapacitorFlag;
};

/**
 * useNotifications Hook
 * 提供本地通知功能，用于冥想提醒等场景
 * 仅在 Capacitor 原生环境中可用
 */
export const useNotifications = () => {
    const [permissionGranted, setPermissionGranted] = useState(false);

    // 检测是否在原生环境 (使用增强的检测方法)
    const isNative = useMemo(() => detectNativeEnvironment(), []);

    // 检查权限状态 (仅在原生环境)
    useEffect(() => {
        if (!isNative) return; // Web 环境跳过

        (async () => {
            try {
                const status = await LocalNotifications.checkPermissions();
                setPermissionGranted(status.display === 'granted');
            } catch (e) {
                console.warn('[Notifications] Check permission failed', e);
            }
        })();
    }, [isNative]);

    /**
     * 请求通知权限
     */
    const requestPermission = useCallback(async (): Promise<boolean> => {
        try {
            const result = await LocalNotifications.requestPermissions();
            const granted = result.display === 'granted';
            setPermissionGranted(granted);
            return granted;
        } catch (e) {
            console.warn('[Notifications] Request permission failed', e);
            return false;
        }
    }, []);

    /**
     * 调度每日提醒
     * @param hour 小时 (0-23)
     * @param minute 分钟 (0-59)
     */
    const scheduleDailyReminder = useCallback(async (hour: number, minute: number): Promise<boolean> => {
        try {
            // 确保有权限
            if (!permissionGranted) {
                const granted = await requestPermission();
                if (!granted) return false;
            }

            // 取消已有的每日提醒，避免重复
            await LocalNotifications.cancel({ notifications: [{ id: 1001 }] });

            // 计算下一次触发时间
            const now = new Date();
            const scheduledDate = new Date();
            scheduledDate.setHours(hour, minute, 0, 0);

            // 如果今天的时间已过，则安排明天
            if (scheduledDate <= now) {
                scheduledDate.setDate(scheduledDate.getDate() + 1);
            }

            const options: ScheduleOptions = {
                notifications: [
                    {
                        id: 1001, // Daily Reminder Fixed ID
                        title: "冥想提醒",
                        body: "新的一天，花几分钟与自己独处吧 🧘",
                        schedule: {
                            on: { hour, minute },
                            allowWhileIdle: true
                        },
                        extra: { url: "/meditate" }
                    }
                ]
            };

            await LocalNotifications.schedule(options);
            console.log('[Notifications] ✅ Daily reminder scheduled for', hour, ':', minute);
            return true;
        } catch (e) {
            console.error('[Notifications] Schedule daily failed', e);
            return false;
        }
    }, [permissionGranted, requestPermission]);

    /**
     * 调度高危时段提醒 (支持多个)
     */
    const scheduleDangerReminders = useCallback(async (times: { id: string, time: string, label: string }[]): Promise<boolean> => {
        try {
            if (!permissionGranted) {
                const granted = await requestPermission();
                if (!granted) return false;
            }

            // Cancel all existing danger reminders (IDs 2000+)
            // Note: In a real app we might track IDs better, here we blindly cancel a range or use a group
            // For simplicity, we assume we just reschedule all active ones.
            // Capacitor doesn't support 'cancel by group' easily without tracking IDs.
            // We'll trust the caller to manage or we cancel a known set if possible.
            // For MVP: We cancel ALL triggers? No, just danger ones.
            // Risk: We might leak IDs if we don't track them.
            // Better: Use a fixed hashing for IDs or stored list.

            // Just schedule new ones. The user handles "enable/disable" by passing the current active list.
            // We should cancel old ones corresponding to these? 
            // Let's assume we cancel specific IDs if we knew them.
            // Strategy: Use hash of time string for ID? Or simple counter?

        } catch (e) {
            return false;
        }
        return true;
    }, [permissionGranted, requestPermission]);

    const scheduleSingleNotification = useCallback(async (id: number, title: string, body: string, hour: number, minute: number) => {
        try {
            await LocalNotifications.schedule({
                notifications: [{
                    id,
                    title,
                    body,
                    schedule: { on: { hour, minute }, allowWhileIdle: true },
                    extra: { url: "/meditate" }
                }]
            });
        } catch (e) {
            console.error("Schedule single failed", e);
        }
    }, []);

    /**
     * 取消所有提醒
     */
    const cancelAllReminders = useCallback(async () => {
        try {
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel({ notifications: pending.notifications });
            }
            console.log('[Notifications] All reminders cancelled');
        } catch (e) {
            console.warn('[Notifications] Cancel failed', e);
        }
    }, []);

    /**
     * 发送即时测试通知 (调试用)
     */
    const sendTestNotification = useCallback(async () => {
        try {
            if (!permissionGranted) {
                await requestPermission();
            }
            const notifs = await LocalNotifications.schedule({
                notifications: [{
                    title: "测试通知",
                    body: "这是一条来自本地的测试通知 👋",
                    id: 999,
                    schedule: { at: new Date(Date.now() + 1000) },
                    sound: undefined,
                    attachments: undefined,
                    actionTypeId: "",
                    extra: null
                }]
            });
            console.log('[Notifications] Test notification scheduled');
        } catch (e) {
            console.error('[Notifications] Test failed', e);
        }
    }, [permissionGranted, requestPermission]);

    return {
        isNative, // 是否在原生环境
        permissionGranted,
        requestPermission,
        scheduleDailyReminder,
        scheduleSingleNotification, // Exposed for generic use
        cancelAllReminders,
        sendTestNotification
    };
};
