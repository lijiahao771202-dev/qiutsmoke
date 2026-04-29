"use client";

import { useCallback, useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications, ActionPerformed } from "@capacitor/local-notifications";
import { useRouter } from "next/navigation";
import {
    generateMultipleDailyMessages,
    generateBreakReminderMessage
} from "@/lib/utils/notificationMessages";
import * as localDB from "@/lib/localDB";
import { computeMeditationStats, type Session } from "@/lib/hooks/useData";

// 通知 ID 范围
// 1000-1099: 每日提醒
// 3000: 断档唤回提醒

interface UserStats {
    totalSessions: number;
    totalMinutes: number;
    currentStreak: number;
    daysSinceLastMeditation: number;
}

/**
 * iOS Local Notifications Hook
 * 封装 Capacitor Local Notifications API，用于冥想提醒
 */
export function useLocalNotifications() {
    const [hasPermission, setHasPermission] = useState(false);
    const [isNative, setIsNative] = useState(false);
    const router = useRouter();

    // 检查是否在原生环境
    useEffect(() => {
        const checkNative = Capacitor.isNativePlatform();
        setIsNative(checkNative);
        console.log("[Notifications] isNative:", checkNative);
    }, []);

    // 检查权限状态
    useEffect(() => {
        if (!isNative) return;

        const checkPermission = async () => {
            try {
                const result = await LocalNotifications.checkPermissions();
                const granted = result.display === "granted";
                setHasPermission(granted);
                console.log("[Notifications] Permission status:", result.display);
            } catch (e) {
                console.error("[Notifications] Permission check failed:", e);
            }
        };
        checkPermission();
    }, [isNative]);

    // 监听通知点击事件，实现深度链接
    useEffect(() => {
        if (!isNative) return;

        const handleNotificationAction = (action: ActionPerformed) => {
            console.log("[Notifications] Action performed:", action);

            // 获取通知中的路由信息
            const route = action.notification.extra?.route as string;
            if (route) {
                console.log("[Notifications] Navigating to:", route);
                router.push(route);
            } else {
                // 默认跳转到练习页面
                router.push("/practice");
            }
        };

        // 添加监听器
        LocalNotifications.addListener("localNotificationActionPerformed", handleNotificationAction);

        // 清理监听器
        return () => {
            LocalNotifications.removeAllListeners();
        };
    }, [isNative, router]);

    /**
     * 请求通知权限
     */
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isNative) {
            console.log("[Notifications] Not native platform, skipping permission request");
            return false;
        }

        try {
            const result = await LocalNotifications.requestPermissions();
            const granted = result.display === "granted";
            setHasPermission(granted);
            console.log("[Notifications] Permission request result:", result.display);
            return granted;
        } catch (e) {
            console.error("[Notifications] Permission request failed:", e);
            return false;
        }
    }, [isNative]);

    /**
     * 获取用户统计数据（用于个性化文案）
     */
    const fetchUserStats = async (): Promise<UserStats | null> => {
        try {
            const sessions = (await localDB.getAll<Session & { syncStatus?: string }>("meditation_sessions"))
                .filter((session) => session.syncStatus !== "pending_delete");
            const stats = computeMeditationStats(sessions);
            return {
                totalSessions: stats.totalSessions || 0,
                totalMinutes: stats.totalMinutes || stats.totalDurationMinutes || 0,
                currentStreak: stats.currentStreak || 0,
                daysSinceLastMeditation: stats.daysSinceLastMeditation || 0,
            };
        } catch (e) {
            console.error("[Notifications] Failed to fetch stats:", e);
        }
        return null;
    };

    /**
     * 取消指定范围的通知
     */
    const cancelNotificationsInRange = useCallback(async (startId: number, endId: number): Promise<void> => {
        if (!isNative) return;

        try {
            const pending = await LocalNotifications.getPending();
            const toCancel = pending.notifications
                .filter((n) => n.id >= startId && n.id <= endId)
                .map((n) => ({ id: n.id }));

            if (toCancel.length > 0) {
                await LocalNotifications.cancel({ notifications: toCancel });
                console.log(`[Notifications] Cancelled ${toCancel.length} notifications (${startId}-${endId})`);
            }
        } catch (e) {
            console.error("[Notifications] Cancel failed:", e);
        }
    }, [isNative]);

    /**
     * 取消所有每日提醒 (1000-1099)
     */
    const cancelDailyReminders = useCallback(async (): Promise<void> => {
        await cancelNotificationsInRange(1000, 1099);
    }, [cancelNotificationsInRange]);

    /**
     * 取消断档唤回提醒 (3000)
     */
    const cancelBreakReminder = useCallback(async (): Promise<void> => {
        await cancelNotificationsInRange(3000, 3000);
    }, [cancelNotificationsInRange]);

    /**
     * 取消所有提醒
     */
    const cancelAllReminders = useCallback(async (): Promise<void> => {
        if (!isNative) return;

        try {
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                const ids = pending.notifications.map((n) => ({ id: n.id }));
                await LocalNotifications.cancel({ notifications: ids });
                console.log("[Notifications] Cancelled all", ids.length, "notifications");
            }
        } catch (e) {
            console.error("[Notifications] Cancel all failed:", e);
        }
    }, [isNative]);

    /**
     * 调度每日重复提醒
     * @param times 时间数组，格式: ["07:00", "12:00", "21:00"]
     */
    const scheduleReminders = useCallback(async (times: string[]): Promise<boolean> => {
        console.log("[Notifications] scheduleReminders called with:", times);

        if (!isNative) {
            console.log("[Notifications] Not native platform, skipping schedule");
            return false;
        }

        // 确保有权限
        let permission = hasPermission;
        if (!permission) {
            console.log("[Notifications] Requesting permission first...");
            permission = await requestPermission();
            if (!permission) {
                console.log("[Notifications] Permission denied");
                return false;
            }
        }

        try {
            // 先取消所有每日提醒
            await cancelDailyReminders();

            // 获取用户统计数据用于个性化文案
            const stats = await fetchUserStats();

            // 提取小时数
            const hours = times.map((t) => parseInt(t.split(":")[0], 10));

            // 生成智能文案
            const messages = generateMultipleDailyMessages(hours, stats || undefined);

            // 为每个时间点创建通知
            const notifications = [];

            for (let i = 0; i < times.length; i++) {
                const [hourStr, minuteStr] = times[i].split(":");
                const hour = parseInt(hourStr, 10);
                const minute = parseInt(minuteStr, 10);
                const message = messages[i];

                console.log(`[Notifications] Creating notification ${i} for ${hour}:${minute} - "${message.title}"`);

                notifications.push({
                    id: 1000 + i,
                    title: message.title,
                    body: message.body,
                    schedule: {
                        on: {
                            hour,
                            minute,
                        },
                        repeats: true,
                    },
                    sound: "default.wav",
                    extra: {
                        route: "/practice", // 点击跳转到练习页面
                    },
                });
            }

            if (notifications.length > 0) {
                console.log("[Notifications] Scheduling", notifications.length, "notifications...");
                await LocalNotifications.schedule({ notifications });
                console.log("[Notifications] ✅ Successfully scheduled", notifications.length, "daily reminders");
            }

            return true;
        } catch (e) {
            console.error("[Notifications] Schedule failed:", e);
            return false;
        }
    }, [isNative, hasPermission, requestPermission, cancelDailyReminders]);

    /**
     * 调度断档唤回提醒
     * 在 N 天后提醒用户冥想
     * @param days 天数，默认 3 天
     */
    const scheduleBreakReminder = useCallback(async (days: number = 3): Promise<boolean> => {
        console.log(`[Notifications] scheduleBreakReminder called, ${days} days`);

        if (!isNative) {
            console.log("[Notifications] Not native platform, skipping break reminder");
            return false;
        }

        // 确保有权限
        let permission = hasPermission;
        if (!permission) {
            permission = await requestPermission();
            if (!permission) return false;
        }

        try {
            // 取消已有的断档提醒
            await cancelBreakReminder();

            // 计算 N 天后的时间
            const triggerDate = new Date();
            triggerDate.setDate(triggerDate.getDate() + days);
            triggerDate.setHours(10, 0, 0, 0); // 固定在上午 10:00 发送

            // 生成智能文案
            const message = generateBreakReminderMessage(days);

            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: 3000,
                        title: message.title,
                        body: message.body,
                        schedule: {
                            at: triggerDate,
                        },
                        sound: "default.wav",
                        extra: {
                            route: "/practice", // 点击跳转到练习页面
                        },
                    },
                ],
            });

            console.log(`[Notifications] ✅ Break reminder scheduled for ${triggerDate.toISOString()}`);
            return true;
        } catch (e) {
            console.error("[Notifications] Break reminder schedule failed:", e);
            return false;
        }
    }, [isNative, hasPermission, requestPermission, cancelBreakReminder]);

    /**
     * 获取已调度的通知数量
     */
    const getScheduledCount = useCallback(async (): Promise<number> => {
        if (!isNative) return 0;
        try {
            const result = await LocalNotifications.getPending();
            return result.notifications.length;
        } catch (e) {
            console.error("[Notifications] getPending failed:", e);
            return 0;
        }
    }, [isNative]);

    return {
        isNative,
        hasPermission,
        requestPermission,
        scheduleReminders,
        scheduleBreakReminder,
        cancelDailyReminders,
        cancelBreakReminder,
        cancelAllReminders,
        getScheduledCount,
    };
}
