"use client";

import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { useCallback, useState, useEffect } from 'react';

/**
 * useNotifications Hook
 * 提供本地通知功能，用于冥想提醒等场景
 */
export const useNotifications = () => {
    const [permissionGranted, setPermissionGranted] = useState(false);

    // 检查权限状态
    useEffect(() => {
        (async () => {
            try {
                const status = await LocalNotifications.checkPermissions();
                setPermissionGranted(status.display === 'granted');
            } catch (e) {
                console.warn('[Notifications] Check permission failed', e);
            }
        })();
    }, []);

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
                        id: 1001,
                        title: '🧘 冥想时刻',
                        body: '现在是您预定的冥想时间，让我们一起开始吧！',
                        schedule: {
                            at: scheduledDate,
                            repeats: true,
                            every: 'day',
                        },
                        sound: 'default',
                        actionTypeId: 'OPEN_MEDITATE',
                        extra: { page: '/meditate' }
                    }
                ]
            };

            await LocalNotifications.schedule(options);
            console.log('[Notifications] ✅ Daily reminder scheduled for', hour, ':', minute);
            return true;
        } catch (e) {
            console.error('[Notifications] Schedule failed', e);
            return false;
        }
    }, [permissionGranted, requestPermission]);

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
            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: 9999,
                        title: '🔔 测试通知',
                        body: '如果您看到这条通知，说明推送已正常工作！',
                        schedule: { at: new Date(Date.now() + 3000) }, // 3秒后
                    }
                ]
            });
            console.log('[Notifications] Test notification scheduled');
        } catch (e) {
            console.error('[Notifications] Test failed', e);
        }
    }, [permissionGranted, requestPermission]);

    return {
        permissionGranted,
        requestPermission,
        scheduleDailyReminder,
        cancelAllReminders,
        sendTestNotification
    };
};
