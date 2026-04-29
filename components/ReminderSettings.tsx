"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Plus, Trash2, Clock, Check, Sparkles, Moon } from "lucide-react";
import { useLocalNotifications } from "@/lib/hooks/useLocalNotifications";
import { getRecommendedTimes, getDaysSinceLastMeditation } from "@/lib/utils/habitAnalyzer";
import { cn } from "@/lib/utils";
import * as localDB from "@/lib/localDB";
import type { Session } from "@/lib/hooks/useData";

interface ReminderSettingsProps {
    onClose: () => void;
}

const STORAGE_KEY = "meditation_reminder_settings";

interface ReminderConfig {
    enabled: boolean;
    times: string[];
    breakReminderEnabled: boolean;
    breakReminderDays: number;
}

export default function ReminderSettings({ onClose }: ReminderSettingsProps) {
    const {
        isNative,
        hasPermission,
        requestPermission,
        scheduleReminders,
        scheduleBreakReminder,
        cancelAllReminders,
        cancelBreakReminder,
        getScheduledCount,
    } = useLocalNotifications();

    const [isEnabled, setIsEnabled] = useState(false);
    const [times, setTimes] = useState<string[]>(["08:00"]);
    const [breakReminderEnabled, setBreakReminderEnabled] = useState(true);
    const [breakReminderDays, setBreakReminderDays] = useState(3);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [scheduledCount, setScheduledCount] = useState(0);
    const [recommendedTimes, setRecommendedTimes] = useState<string[]>([]);
    const [daysSinceLastMeditation, setDaysSinceLastMeditation] = useState(-1);

    // 加载已保存的设置
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data: ReminderConfig = JSON.parse(saved);
                setIsEnabled(data.enabled ?? false);
                setTimes(data.times ?? ["08:00"]);
                setBreakReminderEnabled(data.breakReminderEnabled ?? true);
                setBreakReminderDays(data.breakReminderDays ?? 3);
            } catch (e) {
                console.error("Failed to load reminder settings:", e);
            }
        }
    }, []);

    // 获取已调度的通知数量
    useEffect(() => {
        const fetchCount = async () => {
            const count = await getScheduledCount();
            setScheduledCount(count);
        };
        fetchCount();
    }, [getScheduledCount]);

    // 获取推荐时间和断档天数
    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const sessions = (await localDB.getAll<Session & { syncStatus?: string }>("meditation_sessions"))
                    .filter((session) => session.syncStatus !== "pending_delete")
                    .slice(0, 50)
                    .map((session) => ({
                        id: session.id,
                        duration_seconds: session.duration_seconds || 0,
                        completed_at: session.ended_at || session.started_at,
                    }));

                // 获取推荐时间
                const recommended = getRecommendedTimes(sessions, 2);
                setRecommendedTimes(recommended);

                // 获取断档天数
                const days = getDaysSinceLastMeditation(sessions);
                setDaysSinceLastMeditation(days);

                // 如果用户没有保存过设置，自动采用推荐时间
                const saved = localStorage.getItem(STORAGE_KEY);
                if (!saved && recommended.length > 0) {
                    setTimes(recommended);
                    console.log("[ReminderSettings] Auto-applied recommended times:", recommended);
                }
            } catch (e) {
                console.error("Failed to fetch sessions:", e);
            }
        };
        fetchSessions();
    }, []);

    // 添加时间
    const addTime = () => {
        if (times.length < 5) {
            setTimes([...times, "12:00"]);
        }
    };

    // 删除时间
    const removeTime = (index: number) => {
        if (times.length > 1) {
            setTimes(times.filter((_, i) => i !== index));
        }
    };

    // 更新时间
    const updateTime = (index: number, value: string) => {
        const newTimes = [...times];
        newTimes[index] = value;
        setTimes(newTimes);
    };

    // 保存设置
    const handleSave = async () => {
        setIsSaving(true);
        setMessage("");

        try {
            if (isEnabled) {
                // 请求权限（如果还没有）
                if (!hasPermission) {
                    const granted = await requestPermission();
                    if (!granted) {
                        setMessage("⚠️ 请在系统设置中允许通知权限");
                        setIsSaving(false);
                        return;
                    }
                }

                // 调度每日提醒
                const success = await scheduleReminders(times);
                if (!success) {
                    setMessage("❌ 设置失败，请重试");
                    setIsSaving(false);
                    return;
                }

                // 调度断档唤回提醒
                if (breakReminderEnabled) {
                    await scheduleBreakReminder(breakReminderDays);
                } else {
                    await cancelBreakReminder();
                }

                setMessage(`✅ 已设置 ${times.length} 个提醒`);
            } else {
                // 取消所有通知
                await cancelAllReminders();
                setMessage("🔕 已关闭所有提醒");
            }

            // 保存到本地存储
            const config: ReminderConfig = {
                enabled: isEnabled,
                times,
                breakReminderEnabled,
                breakReminderDays,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

            // 刷新计数
            const count = await getScheduledCount();
            setScheduledCount(count);
        } catch (e) {
            console.error("Save failed:", e);
            setMessage("❌ 保存失败");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md max-h-[85vh] overflow-hidden glass-panel rounded-3xl border border-white/10 shadow-2xl backdrop-blur-2xl bg-black/50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/20">
                        <Bell className="w-5 h-5 text-amber-400" />
                    </div>
                    <h2 className="text-lg font-medium text-white/90">提醒设置</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                    <X className="w-5 h-5 text-white/50" />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* 非原生环境提示 */}
                {!isNative && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-sm text-amber-300">
                            📱 提醒功能仅在 iOS App 中可用
                        </p>
                    </div>
                )}

                {/* 主开关 */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex flex-col">
                        <span className="text-white/90 font-medium">开启提醒</span>
                        <span className="text-xs text-white/50 mt-0.5">
                            {scheduledCount > 0 ? `已设置 ${scheduledCount} 个提醒` : "暂无提醒"}
                        </span>
                    </div>
                    <button
                        onClick={() => setIsEnabled(!isEnabled)}
                        className={cn(
                            "relative w-14 h-8 rounded-full transition-colors duration-300",
                            isEnabled ? "bg-amber-500" : "bg-white/20"
                        )}
                    >
                        <motion.div
                            className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md"
                            animate={{ left: isEnabled ? 28 : 4 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    </button>
                </div>

                {/* 每日提醒时间 */}
                <AnimatePresence>
                    {isEnabled && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 overflow-hidden"
                        >
                            {/* 智能推荐提示 */}
                            {recommendedTimes.length > 0 && (
                                <div className="p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
                                    <span className="text-xs text-white/60">
                                        基于你的冥想习惯，已自动推荐最佳时间
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-white/60 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>每日提醒时间</span>
                            </div>

                            {times.map((time, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center gap-3"
                                >
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(e) => updateTime(index, e.target.value)}
                                        className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg font-medium focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                    />
                                    {times.length > 1 && (
                                        <button
                                            onClick={() => removeTime(index)}
                                            className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </motion.div>
                            ))}

                            {times.length < 5 && (
                                <button
                                    onClick={addTime}
                                    className="w-full py-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 text-white/50 hover:text-white/80 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="text-sm">添加时间</span>
                                </button>
                            )}

                            {/* 断档唤回 */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <Moon className="w-5 h-5 text-indigo-400" />
                                        <div className="flex flex-col">
                                            <span className="text-white/90 font-medium text-sm">断档唤回</span>
                                            <span className="text-xs text-white/50">
                                                {breakReminderDays} 天未冥想时提醒
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setBreakReminderEnabled(!breakReminderEnabled)}
                                        className={cn(
                                            "relative w-12 h-7 rounded-full transition-colors duration-300",
                                            breakReminderEnabled ? "bg-indigo-500" : "bg-white/20"
                                        )}
                                    >
                                        <motion.div
                                            className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                                            animate={{ left: breakReminderEnabled ? 24 : 4 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    </button>
                                </div>

                                {/* 断档天数选择 */}
                                <AnimatePresence>
                                    {breakReminderEnabled && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-3 flex items-center gap-2 justify-center"
                                        >
                                            {[2, 3, 5, 7].map((days) => (
                                                <button
                                                    key={days}
                                                    onClick={() => setBreakReminderDays(days)}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-sm transition-all",
                                                        breakReminderDays === days
                                                            ? "bg-indigo-500 text-white"
                                                            : "bg-white/5 text-white/60 hover:bg-white/10"
                                                    )}
                                                >
                                                    {days}天
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* 断档状态提示 */}
                                {daysSinceLastMeditation > 0 && (
                                    <div className="mt-3 text-center text-xs text-white/40">
                                        📊 你已经 {daysSinceLastMeditation} 天没有冥想了
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 消息提示 */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-center text-sm text-white/70"
                        >
                            {message}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex-shrink-0">
                <button
                    onClick={handleSave}
                    disabled={isSaving || !isNative}
                    className={cn(
                        "w-full py-3.5 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2",
                        isNative
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98]"
                            : "bg-white/10 cursor-not-allowed opacity-50"
                    )}
                >
                    {isSaving ? (
                        <span>保存中...</span>
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            <span>保存设置</span>
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
}
