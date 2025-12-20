"use client";

import { useEffect, useState } from "react";
import {
    Search, User, Mail, Bell, Smartphone, Calendar,
    MoreHorizontal, Send, X, RefreshCw, CheckCircle, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// --- Types ---
interface UserStats {
    total_users: number;
    online_users: number;
    subscribed_users: number;
}

interface UserData {
    id: string;
    email: string;
    nickname: string;
    avatar_id: string;
    created_at: string;
    last_sign_in_at: string;
    is_online: boolean;
    is_subscribed: boolean;
    device_count: number;
}

interface AvatarConfig {
    emoji: string;
    bgGradient: string;
}

// --- Helpers ---
const getAvatarById = (avatarId: string): AvatarConfig => {
    const avatars: Record<string, AvatarConfig> = {
        cat: { emoji: "🐱", bgGradient: "from-orange-100 to-amber-100" },
        dog: { emoji: "🐶", bgGradient: "from-stone-100 to-orange-100" },
        fox: { emoji: "🦊", bgGradient: "from-orange-200 to-red-100" },
        rabbit: { emoji: "🐰", bgGradient: "from-pink-100 to-rose-100" },
        panda: { emoji: "🐼", bgGradient: "from-slate-100 to-zinc-200" },
        koala: { emoji: "🐨", bgGradient: "from-gray-200 to-slate-200" },
        lion: { emoji: "🦁", bgGradient: "from-yellow-200 to-amber-200" },
        tiger: { emoji: "🐯", bgGradient: "from-orange-200 to-yellow-100" },
    };
    return avatars[avatarId] || avatars.cat;
};

export default function UserManagementPage() {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [filterSubscribed, setFilterSubscribed] = useState(false);

    // Modal State
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [pushTitle, setPushTitle] = useState("🧘 来自 Rain 的消息");
    const [pushBody, setPushBody] = useState("");
    const [pushUrl, setPushUrl] = useState("/meditate");
    const [sending, setSending] = useState(false);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setUsers(data.users);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.nickname?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterSubscribed ? user.is_subscribed : true;
        return matchesSearch && matchesFilter;
    });

    // Send Push Handler
    const handleSendPush = async () => {
        if (!selectedUser) return;
        setSending(true);
        try {
            const res = await fetch("/api/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: pushTitle,
                    body: pushBody,
                    url: pushUrl,
                    targetUserId: selectedUser.id, // Targeted Send
                    sendToAll: false
                })
            });

            if (res.ok) {
                alert("发送成功！");
                setSelectedUser(null);
                setPushBody(""); // Reset body but keep Title/URL
            } else {
                alert("发送失败，请检查网络或配置");
            }
        } catch (e) {
            alert("发送出错");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-6">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">用户管理</h1>
                    <p className="text-slate-500 text-sm mt-1">查看及管理所有注册用户</p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
                    title="刷新数据"
                >
                    <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                </button>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                    label="总用户数"
                    value={stats?.total_users ?? "..."}
                    icon={<User className="w-5 h-5 text-blue-500" />}
                    color="bg-blue-50 border-blue-100"
                />
                <StatCard
                    label="今日活跃"
                    value={stats?.online_users ?? "..."}
                    icon={<Calendar className="w-5 h-5 text-green-500" />}
                    color="bg-green-50 border-green-100"
                />
                <StatCard
                    label="订阅推送"
                    value={stats?.subscribed_users ?? "..."}
                    icon={<Bell className="w-5 h-5 text-purple-500" />}
                    color="bg-purple-50 border-purple-100"
                />
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜索邮箱或昵称..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={filterSubscribed}
                            onChange={(e) => setFilterSubscribed(e.target.checked)}
                            className="rounded text-blue-500 focus:ring-blue-500"
                        />
                        仅显示已订阅
                    </label>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">用户</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">状态</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">设备</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">最后活跃</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((user) => {
                                const avatar = getAvatarById(user.avatar_id);
                                return (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner bg-gradient-to-br",
                                                    avatar.bgGradient
                                                )}>
                                                    {avatar.emoji}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 text-sm">{user.nickname}</div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <TooltipBadge
                                                    active={user.is_online}
                                                    activeText="在线"
                                                    inactiveText="离线"
                                                    activeColor="bg-green-100 text-green-700"
                                                    inactiveColor="bg-slate-100 text-slate-500"
                                                />
                                                <TooltipBadge
                                                    active={user.is_subscribed}
                                                    activeText="已订阅"
                                                    inactiveText="未订阅"
                                                    activeColor="bg-blue-100 text-blue-700"
                                                    inactiveColor="bg-slate-100 text-slate-400"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-slate-500 text-sm">
                                                <Smartphone className="w-4 h-4" />
                                                <span>{user.device_count}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {user.is_online ? "刚刚" : (user.last_sign_in_at !== "N/A" ? user.last_sign_in_at : "未登录过")}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                disabled={!user.is_subscribed}
                                                className={cn(
                                                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                                    user.is_subscribed
                                                        ? "bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"
                                                        : "bg-slate-50 border-transparent text-slate-300 cursor-not-allowed"
                                                )}
                                            >
                                                <Bell className="w-3.5 h-3.5" />
                                                发送消息
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!loading && filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                                        没有找到相关用户
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Send Push Modal */}
            <AnimatePresence>
                {selectedUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <Send className="w-4 h-4 text-blue-500" />
                                    发送给 {selectedUser.nickname}
                                </h3>
                                <button onClick={() => setSelectedUser(null)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-500 mb-1.5">标题</label>
                                    <input
                                        value={pushTitle}
                                        onChange={(e) => setPushTitle(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-500 mb-1.5">内容</label>
                                    <textarea
                                        rows={3}
                                        value={pushBody}
                                        onChange={(e) => setPushBody(e.target.value)}
                                        placeholder="请输入推送内容..."
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-500 mb-1.5">跳转链接</label>
                                    <input
                                        value={pushUrl}
                                        onChange={(e) => setPushUrl(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-200 transition-colors font-medium"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSendPush}
                                    disabled={sending || !pushBody.trim()}
                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {sending && <RefreshCw className="w-3 h-3 animate-spin" />}
                                    发送并关闭
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Sub Components ---

const StatCard = ({ label, value, icon, color }: { label: string, value: number | string, icon: React.ReactNode, color: string }) => (
    <div className={cn("rounded-2xl p-5 border flex items-center justify-between shadow-sm", color, "bg-opacity-50")}>
        <div>
            <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{label}</div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
        </div>
        <div className="p-3 bg-white rounded-xl shadow-sm border border-white/50">
            {icon}
        </div>
    </div>
);

const TooltipBadge = ({ active, activeText, inactiveText, activeColor, inactiveColor }: any) => (
    <span className={cn(
        "px-2 py-1 rounded-md text-[10px] font-medium border border-transparent",
        active ? activeColor : inactiveColor
    )}>
        {active ? activeText : inactiveText}
    </span>
);
