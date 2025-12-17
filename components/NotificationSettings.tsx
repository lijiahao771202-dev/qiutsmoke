"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Clock, X, Plus, Trash2, Send } from "lucide-react";

interface NotificationSettingsProps {
    onClose?: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [reminderTimes, setReminderTimes] = useState<string[]>(["08:00"]);
    const [loading, setLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const supported = "Notification" in window && "serviceWorker" in navigator;
        setIsSupported(supported);

        if (supported) {
            setPermission(Notification.permission);
        }

        // Load from localStorage
        const saved = localStorage.getItem("meditation_reminders");
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setReminderTimes(data.times || ["08:00"]);
                setIsSubscribed(data.enabled || false);
            } catch { }
        }
    }, []);

    const requestPermission = async () => {
        if (!isSupported) return false;
        const result = await Notification.requestPermission();
        setPermission(result);
        return result === "granted";
    };

    const subscribe = async () => {
        setLoading(true);
        setMessage("");

        try {
            if (permission !== "granted") {
                const granted = await requestPermission();
                if (!granted) {
                    setMessage("需要通知权限才能发送提醒");
                    setLoading(false);
                    return;
                }
            }

            // Save to localStorage (simple approach without database)
            localStorage.setItem("meditation_reminders", JSON.stringify({
                times: reminderTimes,
                enabled: true,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }));

            setIsSubscribed(true);
            setMessage(`✅ 已设置 ${reminderTimes.length} 个提醒时段！`);
            setMessage("✅ 提醒已开启 (本地存储)");
        } catch (err) {
            console.error("Subscribe error:", err);
            setMessage("设置失败: " + (err instanceof Error ? err.message : String(err)));
        }

        setLoading(false);
    };

    const unsubscribe = async () => {
        setLoading(true);
        localStorage.setItem("meditation_reminders", JSON.stringify({
            times: reminderTimes,
            enabled: false
        }));
        setIsSubscribed(false);
        setMessage("提醒已关闭");
        setLoading(false);
    };

    const addTime = () => {
        if (reminderTimes.length < 5) {
            setReminderTimes([...reminderTimes, "12:00"]);
        }
    };

    const removeTime = (index: number) => {
        if (reminderTimes.length > 1) {
            setReminderTimes(reminderTimes.filter((_, i) => i !== index));
        }
    };

    const updateTime = (index: number, value: string) => {
        const newTimes = [...reminderTimes];
        newTimes[index] = value;
        setReminderTimes(newTimes);
    };

    // 测试通知 - 简化版
    const sendTestNotification = async () => {
        setTestLoading(true);
        setMessage("");
        console.log("[Notification] Starting test...");
        console.log("[Notification] Current permission:", permission);
        console.log("[Notification] API available:", "Notification" in window);

        try {
            // 先请求权限
            if (Notification.permission === "default") {
                console.log("[Notification] Requesting permission...");
                const result = await Notification.requestPermission();
                console.log("[Notification] Permission result:", result);
                setPermission(result);
                if (result !== "granted") {
                    setMessage("❌ 需要通知权限！请在浏览器设置中允许");
                    setTestLoading(false);
                    return;
                }
            } else if (Notification.permission === "denied") {
                setMessage("❌ 通知被阻止！请在浏览器设置中允许");
                setTestLoading(false);
                return;
            }

            // 创建通知
            console.log("[Notification] Creating notification...");
            const notification = new Notification("🧘 测试提醒", {
                body: "如果你看到这条消息，说明通知功能正常！",
                tag: "test-notification",
                requireInteraction: false
            });

            notification.onclick = () => {
                console.log("[Notification] Clicked!");
                window.focus();
            };

            notification.onerror = (e) => {
                console.error("[Notification] Error:", e);
            };

            console.log("[Notification] Created successfully!");
            setMessage("✅ 测试通知已发送！请查看系统通知");

            // 临时 alert 确认
            alert("通知已创建！如果没看到系统通知，请检查 macOS 通知中心或 Chrome 通知设置");
        } catch (err) {
            console.error("[Notification] Exception:", err);
            setMessage("发送失败: " + (err instanceof Error ? err.message : String(err)));
        }

        setTestLoading(false);
    };

    if (!isSupported) {
        return (
            <div className="glass-panel rounded-2xl p-6 text-center">
                <BellOff className="w-12 h-12 mx-auto text-white/30 mb-4" />
                <p className="text-white/60 text-sm">
                    你的浏览器不支持推送通知。<br />
                    请使用 Safari 并将 App 添加到主屏幕。
                </p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-3xl p-6 relative overflow-hidden max-w-md mx-auto"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20">
                        <Bell className="w-5 h-5 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-light text-white">每日冥想提醒</h3>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        title="关闭"
                    >
                        <X className="w-5 h-5 text-white/50" />
                    </button>
                )}
            </div>

            {/* Time Pickers */}
            <div className="mb-4">
                <label className="block text-white/40 text-xs uppercase tracking-wider mb-3">提醒时间 (最多5个)</label>
                <div className="space-y-2">
                    {reminderTimes.map((time, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="flex-1 relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => updateTime(index, e.target.value)}
                                    title="选择提醒时间"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                                />
                            </div>
                            {reminderTimes.length > 1 && (
                                <button
                                    onClick={() => removeTime(index)}
                                    className="p-2 hover:bg-rose-500/20 rounded-lg transition-colors text-rose-400"
                                    title="删除此时间"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {reminderTimes.length < 5 && (
                    <button
                        onClick={addTime}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2 border border-dashed border-white/20 rounded-xl text-white/40 hover:text-white/60 hover:border-white/30 transition-colors text-sm"
                        title="添加新的提醒时间"
                    >
                        <Plus className="w-4 h-4" />
                        添加时间段
                    </button>
                )}
            </div>

            {/* Subscribe Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={isSubscribed ? unsubscribe : subscribe}
                disabled={loading}
                className={`w-full py-3.5 rounded-2xl font-medium transition-all mb-3 ${isSubscribed
                    ? "bg-white/10 text-white/70 hover:bg-white/15"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20"
                    }`}
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                        处理中...
                    </span>
                ) : isSubscribed ? (
                    <span className="flex items-center justify-center gap-2">
                        <BellOff className="w-5 h-5" />
                        关闭提醒
                    </span>
                ) : (
                    <span className="flex items-center justify-center gap-2">
                        <Bell className="w-5 h-5" />
                        开启 {reminderTimes.length} 个提醒
                    </span>
                )}
            </motion.button>

            {/* Test Notification Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={sendTestNotification}
                disabled={testLoading}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors text-sm flex items-center justify-center gap-2"
                title="发送一条测试通知"
            >
                {testLoading ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                ) : (
                    <>
                        <Send className="w-4 h-4" />
                        发送测试通知
                    </>
                )}
            </motion.button>

            {/* Message */}
            <AnimatePresence>
                {message && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-center text-sm text-white/60 mt-4"
                    >
                        {message}
                    </motion.p>
                )}
            </AnimatePresence>

            {/* iOS Hint */}
            {permission === "default" && (
                <p className="text-xs text-white/30 text-center mt-4">
                    💡 点击按钮后请允许通知权限
                </p>
            )}

            {/* Note about local storage */}
            <p className="text-xs text-white/20 text-center mt-3">
                ⚠️ 提醒时间保存在本地，需要部署到服务器后才能定时推送
            </p>
        </motion.div>
    );
}
