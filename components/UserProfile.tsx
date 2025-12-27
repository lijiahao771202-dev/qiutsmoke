"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogOut, ChevronDown, Image as ImageIcon, Check, Shuffle, User, Pencil, Trash2, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBackground, WALLPAPERS } from "./BackgroundContext";
import { cn } from "@/lib/utils";
import { AVATAR_PRESETS, getAvatarById } from "@/lib/avatars";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { getApiUrl } from "@/lib/config";
import ReminderSettings from "./ReminderSettings";

export default function UserProfile() {
    const [user, setUser] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);

    const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [showReminderSettings, setShowReminderSettings] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // 用户资料状态
    const [nickname, setNickname] = useState("");
    const [avatarId, setAvatarId] = useState("cat");
    const [isSaving, setIsSaving] = useState(false);

    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const { setWallpaper, wallpaperId } = useBackground();

    useEffect(() => {
        // 使用 getSession 读取本地 cookie，不发网络请求
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            // 从 user_metadata 加载头像和昵称
            if (session?.user) {
                setNickname(session.user.user_metadata?.nickname || "");
                setAvatarId(session.user.user_metadata?.avatar_id || "cat");
            }
        };
        getInitialSession();

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                setNickname(session.user.user_metadata?.nickname || "");
                setAvatarId(session.user.user_metadata?.avatar_id || "cat");
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setIsOpen(false);
        router.refresh();
        router.push("/auth");
    };

    const handleRandomWallpaper = () => {
        const available = WALLPAPERS.filter(w => w.id !== wallpaperId);
        const random = available[Math.floor(Math.random() * available.length)];
        setWallpaper(random.id);
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(getApiUrl("/api/profile"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname, avatarId }),
            });
            if (res.ok) {
                // 刷新用户数据
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    // 手动刷新 user_metadata
                    await supabase.auth.refreshSession();
                }
                setShowProfileEditor(false);
            }
        } catch (e) {
            console.error("Save profile failed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMeditationData = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(getApiUrl("/api/meditation/sessions?all=true"), {
                method: "DELETE",
            });
            if (res.ok) {
                setShowDeleteConfirm(false);
                // 刷新页面以更新数据
                router.refresh();
                window.location.reload();
            }
        } catch (e) {
            console.error("Delete meditation data failed:", e);
        } finally {
            setIsDeleting(false);
        }
    };

    const { triggerLight } = useHaptics();

    if (!user) return null;

    const currentAvatar = getAvatarById(avatarId);
    const displayName = nickname || user.email?.split("@")[0] || "用户";

    return (
        <>
            <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] right-6 z-50" ref={dropdownRef}>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        triggerLight();
                        setIsOpen(!isOpen);
                    }}
                    className="flex items-center gap-2 p-1.5 pr-3 rounded-full glass-panel border border-white/10 bg-white/5 hover:bg-white/10 transition-colors shadow-lg"
                >
                    {/* 使用选择的头像 */}
                    <div className={cn(
                        "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-lg shadow-inner",
                        currentAvatar.bgGradient
                    )}>
                        {currentAvatar.emoji}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 top-full mt-2 w-72 glass-panel rounded-2xl p-2 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-3xl bg-black/40"
                        >
                            {/* Header with Avatar and Name */}
                            <div className="px-4 py-4 border-b border-white/5 mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-2xl shadow-lg",
                                        currentAvatar.bgGradient
                                    )}>
                                        {currentAvatar.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-base font-medium text-white/90 truncate">{displayName}</div>
                                        <div className="text-xs text-white/40 truncate">{user.email}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="space-y-1">
                                {/* Edit Profile */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowProfileEditor(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-violet-400 hover:text-violet-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">编辑资料</span>
                                </button>

                                {/* Wallpaper Picker */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowWallpaperPicker(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                                        <ImageIcon className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">更换壁纸</span>
                                </button>

                                {/* Reminder Settings */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowReminderSettings(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-amber-400 hover:text-amber-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">提醒设置</span>
                                </button>

                                {/* Delete Meditation Data */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowDeleteConfirm(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-orange-400 hover:text-orange-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">清除冥想数据</span>
                                </button>

                                {/* Sign Out */}
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-rose-400 hover:text-rose-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                                        <LogOut className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">退出登录</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Profile Editor Modal */}
            <AnimatePresence>
                {showProfileEditor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowProfileEditor(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md max-h-[85vh] overflow-hidden glass-panel rounded-3xl border border-white/10 shadow-2xl"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-white/10">
                                <h2 className="text-lg font-medium text-white/90">编辑资料</h2>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
                                {/* Current Avatar Preview */}
                                <div className="flex flex-col items-center">
                                    <div className={cn(
                                        "w-24 h-24 rounded-full bg-gradient-to-br flex items-center justify-center text-5xl shadow-xl mb-3",
                                        getAvatarById(avatarId).bgGradient
                                    )}>
                                        {getAvatarById(avatarId).emoji}
                                    </div>
                                    <div className="text-white/60 text-sm">{getAvatarById(avatarId).name}</div>
                                </div>

                                {/* Nickname Input */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">昵称</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            placeholder="输入你的昵称..."
                                            maxLength={20}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                        />
                                        <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    </div>
                                </div>

                                {/* Avatar Selection */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-3">选择头像</label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {AVATAR_PRESETS.map((avatar) => (
                                            <motion.button
                                                key={avatar.id}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setAvatarId(avatar.id)}
                                                className={cn(
                                                    "relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all",
                                                    `bg-gradient-to-br ${avatar.bgGradient}`,
                                                    avatarId === avatar.id
                                                        ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-black/50"
                                                        : "opacity-70 hover:opacity-100"
                                                )}
                                                title={avatar.name}
                                            >
                                                {avatar.emoji}
                                                {avatarId === avatar.id && (
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                                <button
                                    onClick={() => setShowProfileEditor(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-medium transition-all disabled:opacity-50"
                                >
                                    {isSaving ? "保存中..." : "保存"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reminder Settings Modal */}
            <AnimatePresence>
                {showReminderSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowReminderSettings(false)}
                    >
                        <ReminderSettings onClose={() => setShowReminderSettings(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Wallpaper Picker Modal */}
            <AnimatePresence>
                {showWallpaperPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowWallpaperPicker(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-4xl max-h-[80vh] overflow-hidden glass-panel rounded-3xl border border-white/10 shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                <h2 className="text-lg font-medium text-white/90">壁纸选择</h2>
                                <button
                                    onClick={handleRandomWallpaper}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm text-white/80"
                                >
                                    <Shuffle className="w-4 h-4" />
                                    <span>随机壁纸</span>
                                </button>
                            </div>

                            {/* Grid */}
                            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {WALLPAPERS.map((wp) => (
                                        <motion.button
                                            key={wp.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setWallpaper(wp.id);
                                            }}
                                            className={cn(
                                                "relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-200",
                                                wallpaperId === wp.id
                                                    ? "border-cyan-400 shadow-lg shadow-cyan-500/30"
                                                    : "border-white/10 hover:border-white/30"
                                            )}
                                        >
                                            {/* Wallpaper Preview */}
                                            {wp.type === 'dynamic' ? (
                                                <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-indigo-900 to-cyan-900">
                                                    <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">
                                                        ✨ 动态
                                                    </div>
                                                </div>
                                            ) : wp.url ? (
                                                <img
                                                    src={wp.url}
                                                    alt={wp.name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-white/40 text-xs">
                                                    无预览
                                                </div>
                                            )}

                                            {/* Name Overlay */}
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                                <div className="text-xs text-white/90 text-center truncate">{wp.name}</div>
                                            </div>

                                            {/* Selected Indicator */}
                                            {wallpaperId === wp.id && (
                                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm glass-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-white/10 text-center">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-500/20 flex items-center justify-center">
                                    <Trash2 className="w-6 h-6 text-orange-400" />
                                </div>
                                <h2 className="text-lg font-medium text-white/90">清除冥想数据</h2>
                            </div>

                            {/* Content */}
                            <div className="p-6 text-center">
                                <p className="text-white/60 text-sm mb-2">
                                    确定要删除所有冥想记录吗？
                                </p>
                                <p className="text-orange-400/80 text-xs">
                                    ⚠️ 此操作不可撤销，莲花花园也将清空
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleDeleteMeditationData}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white text-sm font-medium transition-all disabled:opacity-50"
                                >
                                    {isDeleting ? "删除中..." : "确认删除"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
