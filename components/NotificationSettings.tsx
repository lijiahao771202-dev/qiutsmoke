"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, Clock, X, Plus, Trash2, Send, AlertTriangle, Shield, Radio, CheckCircle, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/lib/hooks/useNotifications";

interface DangerTime {
    id: string;
    time_slot: string;
    label: string;
    enabled: boolean;
}

interface NotificationSettingsProps {
    onClose?: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
    // Capacitor 本地通知 hook (自动检测原生环境)
    const {
        isNative, // 是否在原生环境
        permissionGranted: nativePermission,
        requestPermission: requestNativePermission,
        scheduleDailyReminder,
        cancelAllReminders,
        sendTestNotification: sendNativeTestNotification
    } = useNotifications();

    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [reminderTimes, setReminderTimes] = useState<string[]>(["08:00"]);
    const [loading, setLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [message, setMessage] = useState("");

    // 高危时段相关状态
    const [dangerTimes, setDangerTimes] = useState<DangerTime[]>([]);
    const [newDangerTime, setNewDangerTime] = useState("14:00");
    const [newDangerLabel, setNewDangerLabel] = useState("");
    const [dangerLoading, setDangerLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"daily" | "danger" | "push">("daily");

    // 推送订阅状态
    const [isPushSubscribed, setIsPushSubscribed] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);

    // 加载高危时段
    const loadDangerTimes = useCallback(async () => {
        try {
            const res = await fetch("/api/danger-times");
            if (res.ok) {
                const data = await res.json();
                setDangerTimes(data);
            }
        } catch (err) {
            console.error("Failed to load danger times:", err);
        }
    }, []);

    useEffect(() => {
        // 在原生环境中总是支持的
        if (isNative) {
            setIsSupported(true);
            // 原生环境不用检查 Web Notification
        } else {
            // Web 环境检测
            const supported = "Notification" in window && "serviceWorker" in navigator;
            setIsSupported(supported);

            if (supported) {
                setPermission(Notification.permission);
                // 检查推送订阅状态
                checkPushSubscription();
            }
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

        // 加载高危时段
        loadDangerTimes();
    }, [loadDangerTimes, isNative]);

    // 检查推送订阅状态
    const checkPushSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            setIsPushSubscribed(!!sub);
        } catch (e) {
            console.error("Check push subscription error:", e);
        }
    };

    // 订阅推送通知（保存到数据库）
    const subscribePush = async () => {
        setPushLoading(true);
        setMessage("");

        try {
            // 检查浏览器支持
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                setMessage("❌ 此浏览器不支持推送通知");
                setPushLoading(false);
                return;
            }

            // 请求通知权限
            if (Notification.permission === "default") {
                const result = await Notification.requestPermission();
                setPermission(result);
                if (result !== "granted") {
                    setMessage("❌ 需要通知权限才能订阅推送");
                    setPushLoading(false);
                    return;
                }
            } else if (Notification.permission === "denied") {
                setMessage("❌ 通知权限被阻止，请在浏览器设置中允许");
                setPushLoading(false);
                return;
            }

            // 首先注册 Service Worker
            console.log("[Push] 注册 Service Worker...");
            let registration: ServiceWorkerRegistration;
            try {
                const existingReg = await navigator.serviceWorker.getRegistration("/sw.js");
                if (existingReg) {
                    registration = existingReg;
                    console.log("[Push] 使用已存在的 Service Worker");
                } else {
                    registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
                    console.log("[Push] Service Worker 注册成功");
                }
            } catch (e) {
                setMessage("❌ Service Worker 注册失败: " + (e instanceof Error ? e.message : String(e)));
                setPushLoading(false);
                return;
            }

            // 等待 Service Worker 激活
            if (registration.installing || registration.waiting) {
                console.log("[Push] 等待 Service Worker 激活...");
                await new Promise<void>((resolve) => {
                    const sw = registration.installing || registration.waiting;
                    if (sw) {
                        sw.addEventListener("statechange", () => {
                            if (sw.state === "activated") resolve();
                        });
                    }
                    setTimeout(resolve, 5000);
                });
            }

            // 获取 VAPID 公钥
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                setMessage("❌ 推送服务配置错误（VAPID 未配置）");
                setPushLoading(false);
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

            // 订阅推送
            console.log("[Push] Subscribing with VAPID key...");
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });
            console.log("[Push] Subscription created:", subscription.endpoint);

            // 保存到数据库
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setMessage("❌ 用户未登录，请先登录");
                setPushLoading(false);
                return;
            }

            console.log("[Push] Saving subscription to database...");
            const subJson = subscription.toJSON();
            const { error } = await supabase.from("push_subscriptions").upsert({
                user_id: user.id,
                endpoint: subJson.endpoint,
                p256dh: subJson.keys?.p256dh || "",
                auth: subJson.keys?.auth || "",
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "user_id"
            });

            if (error) {
                console.error("[Push] Database error:", error);
                setMessage("❌ 保存订阅失败: " + error.message);
            } else {
                console.log("[Push] Subscription saved successfully");
                setMessage("✅ 推送通知已开启！");
                setIsPushSubscribed(true);
            }
        } catch (e) {
            console.error("[Push] Subscribe error:", e);
            setMessage("❌ 订阅失败: " + (e instanceof Error ? e.message : String(e)));
        }

        setPushLoading(false);
    };

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
            // 原生环境使用 Capacitor Local Notifications
            if (isNative) {
                if (!nativePermission) {
                    const granted = await requestNativePermission();
                    if (!granted) {
                        setMessage("❌ 需要通知权限！请在系统设置中允许");
                        setLoading(false);
                        return;
                    }
                }

                // 为每个时间设置本地提醒
                for (const time of reminderTimes) {
                    const [hourStr, minuteStr] = time.split(":");
                    const hour = parseInt(hourStr, 10);
                    const minute = parseInt(minuteStr, 10);
                    await scheduleDailyReminder(hour, minute);
                }

                setMessage(`✅ 已设置 ${reminderTimes.length} 个每日提醒`);
            } else {
                // Web 环境
                if (permission !== "granted") {
                    const granted = await requestPermission();
                    if (!granted) {
                        setMessage("需要通知权限才能发送提醒");
                        setLoading(false);
                        return;
                    }
                }
                setMessage("✅ 提醒已开启");
            }

            localStorage.setItem("meditation_reminders", JSON.stringify({
                times: reminderTimes,
                enabled: true,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }));

            setIsSubscribed(true);
        } catch (err) {
            console.error("Subscribe error:", err);
            setMessage("设置失败: " + (err instanceof Error ? err.message : String(err)));
        }

        setLoading(false);
    };

    const unsubscribe = async () => {
        setLoading(true);

        // 原生环境取消所有提醒
        if (isNative) {
            await cancelAllReminders();
        }

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

    // 添加高危时段
    const addDangerTime = async () => {
        if (!newDangerTime) return;
        setDangerLoading(true);
        setMessage("");

        try {
            const res = await fetch("/api/danger-times", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    time_slot: newDangerTime,
                    label: newDangerLabel || "高危时段"
                })
            });

            if (res.ok) {
                const newItem = await res.json();
                setDangerTimes([...dangerTimes, newItem]);
                setNewDangerTime("14:00");
                setNewDangerLabel("");
                setMessage("✅ 高危时段已添加");
            } else {
                const err = await res.json();
                setMessage("添加失败: " + (err.error || "未知错误"));
            }
        } catch (err) {
            console.error("Add danger time error:", err);
            setMessage("添加失败");
        }

        setDangerLoading(false);
    };

    // 删除高危时段
    const removeDangerTime = async (id: string) => {
        try {
            const res = await fetch(`/api/danger-times?id=${id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setDangerTimes(dangerTimes.filter(t => t.id !== id));
                setMessage("已删除");
            }
        } catch (err) {
            console.error("Delete danger time error:", err);
        }
    };

    // 测试通知
    const sendTestNotification = async () => {
        setTestLoading(true);
        setMessage("");

        try {
            // 原生环境使用 Capacitor Local Notifications
            if (isNative) {
                if (!nativePermission) {
                    const granted = await requestNativePermission();
                    if (!granted) {
                        setMessage("❌ 需要通知权限！请在系统设置中允许");
                        setTestLoading(false);
                        return;
                    }
                }
                await sendNativeTestNotification();
                setMessage("✅ 测试通知已发送！请等待几秒钟...");
            } else {
                // Web 环境使用 Notification API
                if (Notification.permission === "default") {
                    const result = await Notification.requestPermission();
                    setPermission(result);
                    if (result !== "granted") {
                        setMessage("❌ 需要通知权限！");
                        setTestLoading(false);
                        return;
                    }
                } else if (Notification.permission === "denied") {
                    setMessage("❌ 通知被阻止！请在设置中允许");
                    setTestLoading(false);
                    return;
                }

                new Notification("🧘 测试提醒", {
                    body: "如果你看到这条消息，说明通知功能正常！",
                    tag: "test-notification"
                });

                setMessage("✅ 测试通知已发送！");
            }
        } catch (err) {
            console.error("Test notification error:", err);
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
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20">
                        <Bell className="w-5 h-5 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-light text-white">智能正念提醒</h3>
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

            {/* Tab 切换 */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab("daily")}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${activeTab === "daily"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                        }`}
                >
                    <Clock className="w-3.5 h-3.5" />
                    每日提醒
                </button>
                <button
                    onClick={() => setActiveTab("danger")}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${activeTab === "danger"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                        }`}
                >
                    <Shield className="w-3.5 h-3.5" />
                    高危时段
                </button>
                <button
                    onClick={() => setActiveTab("push")}
                    className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${activeTab === "push"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-white/5 text-white/50 hover:bg-white/10"
                        }`}
                >
                    <Radio className="w-3.5 h-3.5" />
                    推送通知
                </button>
            </div>

            {/* 每日提醒 Tab */}
            {activeTab === "daily" && (
                <div className="space-y-4">
                    <p className="text-white/40 text-xs">设置每日冥想提醒时间（最多5个）</p>

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
                                        title="删除"
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
                            className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-white/20 rounded-xl text-white/40 hover:text-white/60 hover:border-white/30 transition-colors text-sm"
                            title="添加时间"
                        >
                            <Plus className="w-4 h-4" />
                            添加时间段
                        </button>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={isSubscribed ? unsubscribe : subscribe}
                        disabled={loading}
                        className={`w-full py-3.5 rounded-2xl font-medium transition-all ${isSubscribed
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
                </div>
            )}

            {/* 高危时段 Tab */}
            {activeTab === "danger" && (
                <div className="space-y-4">
                    <p className="text-white/40 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        标记容易想抽烟的时段，系统会在这些时间发送正念提醒
                    </p>

                    {/* 现有高危时段 */}
                    <div className="space-y-2">
                        {dangerTimes.map((dt) => (
                            <div
                                key={dt.id}
                                className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3"
                            >
                                <Shield className="w-4 h-4 text-rose-400" />
                                <span className="text-white font-mono">{dt.time_slot.substring(0, 5)}</span>
                                <span className="text-white/50 text-sm flex-1">{dt.label}</span>
                                <button
                                    onClick={() => removeDangerTime(dt.id)}
                                    className="p-1.5 hover:bg-rose-500/20 rounded-lg transition-colors text-rose-400"
                                    title="删除"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {dangerTimes.length === 0 && (
                            <p className="text-center text-white/30 py-4 text-sm">
                                还没有设置高危时段
                            </p>
                        )}
                    </div>

                    {/* 添加新高危时段 */}
                    <div className="bg-white/5 rounded-xl p-4 space-y-3">
                        <p className="text-white/60 text-xs font-medium">添加高危时段</p>
                        <div className="flex gap-2">
                            <div className="relative">
                                <input
                                    type="time"
                                    value={newDangerTime}
                                    onChange={(e) => setNewDangerTime(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white w-28 focus:outline-none focus:ring-1 focus:ring-rose-400/50"
                                    title="时间"
                                />
                            </div>
                            <input
                                type="text"
                                value={newDangerLabel}
                                onChange={(e) => setNewDangerLabel(e.target.value)}
                                placeholder="标签（如：饭后）"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-rose-400/50"
                            />
                        </div>
                        <button
                            onClick={addDangerTime}
                            disabled={dangerLoading || !newDangerTime}
                            className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {dangerLoading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                />
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    添加高危时段
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* 推送通知 Tab */}
            {activeTab === "push" && (
                <div className="space-y-4">
                    <p className="text-white/40 text-xs flex items-center gap-2">
                        <Radio className="w-3 h-3 text-cyan-400" />
                        开启后可接收跨设备推送通知（即使关闭浏览器也能收到）
                    </p>

                    {/* 订阅状态 */}
                    <div className={`p-4 rounded-xl border ${isPushSubscribed
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-white/5 border-white/10"
                        }`}>
                        <div className="flex items-center gap-3">
                            {isPushSubscribed ? (
                                <>
                                    <CheckCircle className="w-6 h-6 text-green-400" />
                                    <div>
                                        <p className="text-green-400 font-medium">推送已开启</p>
                                        <p className="text-white/40 text-xs">此设备可以接收跨设备推送通知</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <BellOff className="w-6 h-6 text-white/30" />
                                    <div>
                                        <p className="text-white/70 font-medium">推送未开启</p>
                                        <p className="text-white/40 text-xs">点击下方按钮开启推送通知</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {!isPushSubscribed && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={subscribePush}
                            disabled={pushLoading}
                            className="w-full py-3.5 rounded-2xl font-medium bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                        >
                            {pushLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                    />
                                    订阅中...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Radio className="w-5 h-5" />
                                    开启推送通知
                                </span>
                            )}
                        </motion.button>
                    )}

                    <p className="text-white/30 text-xs text-center">
                        💡 在每个设备上都需要单独开启推送
                    </p>
                </div>
            )}

            {/* 测试通知按钮 */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={sendTestNotification}
                disabled={testLoading}
                className="w-full mt-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors text-sm flex items-center justify-center gap-2"
                title="发送测试通知"
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

            {/* 消息提示 */}
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

            {/* 权限提示 */}
            {permission === "default" && (
                <p className="text-xs text-white/30 text-center mt-4">
                    💡 点击按钮后请允许通知权限
                </p>
            )}
        </motion.div>
    );
}
