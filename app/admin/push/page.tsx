"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Send, Users, RefreshCw, Zap, AlertCircle, CheckCircle, Radio, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";

import { getAvatarById } from "@/lib/avatars";

export default function PushAdminPage() {
    const [totalSubscribers, setTotalSubscribers] = useState<number | null>(null);
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscribeStatus, setSubscribeStatus] = useState("");

    // 推送内容
    const [pushTitle, setPushTitle] = useState("🧘 来自 Rain 的提醒");
    const [pushBody, setPushBody] = useState("该冥想了，来一场心灵放松吧～");
    const [pushUrl, setPushUrl] = useState("/meditate");

    // 发送状态
    const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
    const [sendResult, setSendResult] = useState("");

    // 获取订阅者统计
    const fetchStats = async () => {
        try {
            const res = await fetch("/api/push/send");
            if (res.ok) {
                const data = await res.json();
                setTotalSubscribers(data.totalSubscribers || 0);
                setSubscribers(data.subscribers || []);
            }
        } catch (e) {
            console.error("Fetch stats error:", e);
        }
    };

    // 检查当前订阅状态
    const checkSubscription = async () => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            setIsSubscribed(!!sub);
        } catch (e) {
            console.error("Check subscription error:", e);
        }
    };

    useEffect(() => {
        fetchStats();
        checkSubscription();
    }, []);

    // 手动订阅推送
    const manualSubscribe = async () => {
        setLoading(true);
        setSubscribeStatus("订阅中...");

        try {
            // 检查浏览器支持
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                setSubscribeStatus("❌ 浏览器不支持推送通知");
                setLoading(false);
                return;
            }

            // 请求通知权限
            if (Notification.permission === "default") {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    setSubscribeStatus("❌ 用户拒绝了通知权限");
                    setLoading(false);
                    return;
                }
            } else if (Notification.permission === "denied") {
                setSubscribeStatus("❌ 通知权限被阻止，请在浏览器设置中允许");
                setLoading(false);
                return;
            }

            // 获取 Service Worker
            const registration = await navigator.serviceWorker.ready;

            // 获取 VAPID 公钥
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                setSubscribeStatus("❌ 缺少 VAPID 公钥配置");
                setLoading(false);
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
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

            // 保存到数据库
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setSubscribeStatus("❌ 用户未登录");
                setLoading(false);
                return;
            }

            const { error } = await supabase.from("push_subscriptions").upsert({
                user_id: user.id,
                subscription: JSON.stringify(subscription.toJSON()),
                updated_at: new Date().toISOString(),
            }, {
                onConflict: "user_id"
            });

            if (error) {
                setSubscribeStatus("❌ 保存订阅失败: " + error.message);
            } else {
                setSubscribeStatus("✅ 订阅成功！");
                setIsSubscribed(true);
                fetchStats(); // 刷新统计
            }
        } catch (e) {
            setSubscribeStatus("❌ 订阅失败: " + (e instanceof Error ? e.message : String(e)));
        }

        setLoading(false);
    };

    // 发送推送给所有用户
    const sendBroadcast = async () => {
        setSendStatus("sending");
        setSendResult("");
        setLoading(true);

        try {
            const res = await fetch("/api/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: pushTitle,
                    body: pushBody,
                    url: pushUrl,
                    sendToAll: true,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSendStatus("success");
                setSendResult(data.message || `✅ 推送已发送！成功: ${data.success}, 失败: ${data.failed}`);
                if (data.errors && data.errors.length > 0) {
                    setSendResult(prev => prev + `\n⚠️ 错误: ${data.errors.join(", ")}`);
                }
            } else {
                setSendStatus("error");
                let msg = "❌ " + (data.error || "发送失败");
                if (data.total) {
                    msg += `\n📊 共有 ${data.total} 个订阅用户`;
                }
                setSendResult(msg);
            }
        } catch (e) {
            setSendStatus("error");
            setSendResult("❌ 发送失败: " + (e instanceof Error ? e.message : String(e)));
        }

        setLoading(false);
    };

    // 本地测试通知
    const sendLocalTest = () => {
        if (Notification.permission !== "granted") {
            Notification.requestPermission();
            return;
        }

        new Notification(pushTitle, {
            body: pushBody,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: "local-test-" + Date.now(),
        });

        setSendResult("✅ 本地测试通知已发送！");
        setSendStatus("success");
    };

    return (
        <AuthGuard>
            <main className="min-h-screen pt-[calc(4rem+env(safe-area-inset-top))] pb-32 px-4 relative z-10">
                <div className="max-w-lg mx-auto space-y-6">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">推送通知管理</h1>
                        <p className="text-slate-500 text-sm">向所有用户发送推送通知</p>
                    </motion.div>

                    {/* 统计卡片 */}
                    {/* 订阅统计 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
                    >
                        <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            订阅统计
                        </h2>

                        <div className="flex items-center justify-between py-4">
                            <span className="text-slate-500">已订阅用户</span>
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-bold text-slate-900">
                                    {totalSubscribers === null ? "..." : totalSubscribers}
                                </span>
                                <button
                                    onClick={fetchStats}
                                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                                    title="刷新统计"
                                >
                                    <RefreshCw className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        {totalSubscribers === 0 && (
                            <div className="mt-2 p-3 rounded-xl bg-yellow-500/20 text-yellow-300 text-sm">
                                <AlertCircle className="w-4 h-4 inline mr-2" />
                                暂无订阅用户。用户访问应用后会自动订阅。
                            </div>
                        )}

                        {/* 订阅用户列表 */}
                        {subscribers.length > 0 && (
                            <div className="mt-6 border-t border-slate-100 pt-4">
                                <div className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">最近订阅用户</div>
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                    {subscribers.map((sub) => {
                                        const avatar = getAvatarById(sub.avatar_id);
                                        return (
                                            <div key={sub.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-xl shadow-inner shrink-0",
                                                    avatar.bgGradient
                                                )}>
                                                    {avatar.emoji}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-slate-900 truncate">
                                                            {sub.nickname}
                                                        </span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                                            {sub.email}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 truncate mt-0.5">
                                                        订阅于 {sub.updated_at}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* 推送内容编辑 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
                    >
                        <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                            <Send className="w-5 h-5 text-indigo-500" />
                            推送内容
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="push-title" className="block text-sm text-slate-500 mb-1.5">标题</label>
                                <input
                                    id="push-title"
                                    type="text"
                                    value={pushTitle}
                                    onChange={(e) => setPushTitle(e.target.value)}
                                    placeholder="通知标题"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="push-body" className="block text-sm text-slate-500 mb-1.5">内容</label>
                                <textarea
                                    id="push-body"
                                    value={pushBody}
                                    onChange={(e) => setPushBody(e.target.value)}
                                    placeholder="通知内容"
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="push-url" className="block text-sm text-slate-500 mb-1.5">点击跳转 URL</label>
                                <input
                                    id="push-url"
                                    type="text"
                                    value={pushUrl}
                                    onChange={(e) => setPushUrl(e.target.value)}
                                    placeholder="/meditate"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* 发送操作 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
                    >
                        <h2 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            发送推送
                        </h2>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                {/* 本地测试 */}
                                <button
                                    onClick={sendLocalTest}
                                    className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Bell className="w-4 h-4" />
                                    本地测试
                                </button>

                                {/* 订阅当前设备 */}
                                <button
                                    onClick={manualSubscribe}
                                    disabled={loading || isSubscribed}
                                    className={cn(
                                        "w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors",
                                        isSubscribed
                                            ? "bg-green-100 text-green-700 cursor-default"
                                            : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                                    )}
                                >
                                    <UserPlus className="w-4 h-4" />
                                    {isSubscribed ? "已订阅本机" : "订阅本机"}
                                </button>
                            </div>

                            {/* 群发推送 */}
                            <button
                                onClick={sendBroadcast}
                                disabled={loading || (totalSubscribers !== null && totalSubscribers === 0)}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-blue-500/20"
                            >
                                {loading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Radio className="w-4 h-4" />
                                )}
                                发送给所有用户 ({totalSubscribers ?? "..."} 人)
                            </button>
                        </div>

                        {sendResult && (
                            <div className={cn(
                                "mt-4 p-3 rounded-xl text-sm whitespace-pre-line",
                                sendStatus === "success" ? "bg-green-500/20 text-green-300" :
                                    sendStatus === "error" ? "bg-red-500/20 text-red-300" : ""
                            )}>
                                {sendResult}
                            </div>
                        )}
                    </motion.div>

                    {/* 说明 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
                    >
                        <h2 className="text-lg font-medium text-slate-800 mb-3">工作原理</h2>
                        <ul className="text-sm text-slate-500 space-y-2">
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>用户访问应用后会自动订阅推送通知</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>订阅信息保存在 Supabase 数据库</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>点击"发送"会向所有订阅用户推送</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                <span>iOS PWA 需要 iOS 16.4+ 才支持推送（需添加到主屏幕）</span>
                            </li>
                        </ul>
                    </motion.div>
                </div>
            </main>
        </AuthGuard>
    );
}
