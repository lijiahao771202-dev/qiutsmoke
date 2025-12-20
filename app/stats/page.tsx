
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Trophy, Activity, Flame } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { useMeditationStats, useMeditationSessions } from "@/lib/hooks/useData";

interface StatsData {
    totalSessions: number;
    totalDurationMinutes: number;
    currentStreak: number;
    longestStreak: number;
    daysMeditated: number;
}

interface Session {
    id: string;
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
    topic_name?: string;
}

const MONTH_NAMES = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];

export default function StatsPage() {
    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // 使用 SWR 缓存数据
    const { stats } = useMeditationStats();

    // 计算当前月份字符串
    const monthStr = useMemo(() => {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth() + 1;
        return `${y}-${String(m).padStart(2, '0')}`;
    }, [currentDate]);

    const { sessions, isLoading: loading } = useMeditationSessions(monthStr);

    // Calendar Logic
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    // Group sessions by day
    const sessionsByDay = sessions.reduce((acc, session) => {
        const d = new Date(session.started_at).getDate(); // Local day? 
        // Note: API returns UTC string. new Date(string) creates local date.
        // This relies on user browser being same timezone as when they meditated basically.
        if (!acc[d]) acc[d] = [];
        acc[d].push(session);
        return acc;
    }, {} as Record<number, Session[]>);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const selectedDaySessions = sessionsByDay[selectedDate.getDate()] || [];
    // Only show if selectedDate is in current month view, OR handle cross-month selection properly.
    // Simpler: Reset selectedDate to null or logic when changing months? 
    // Let's keep separate logic: selectedDate is fully independent, but the list only shows checks for current view month?
    // Better: Show list for the clicked day. If user changes month, the selection might visually disappear if not in view.

    const isSelectedInView = selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();


    return (
        <div className="min-h-screen text-slate-200 p-4 pb-32 pt-24">

            {/* Background */}
            {/* Background handled by global layout */}

            <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                <header className="mb-8">
                    <h1 className="text-3xl font-thin text-white/90">冥想统计</h1>
                    <p className="text-white/40 mt-2 font-light">回顾你的正念旅程</p>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={Activity} label="总次数" value={stats?.totalSessions || 0} unit="次" delay={0.1} />
                    <StatCard icon={Clock} label="总时长" value={stats?.totalDurationMinutes || 0} unit="分钟" delay={0.2} />
                    <StatCard icon={Flame} label="当前连续" value={stats?.currentStreak || 0} unit="天" delay={0.3} color="text-orange-400" />
                    <StatCard icon={Trophy} label="最长连续" value={stats?.longestStreak || 0} unit="天" delay={0.4} color="text-yellow-400" />
                </div>

                {/* Calendar Section */}
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Calendar */}
                    <motion.div
                        layout
                        className="md:col-span-2"
                    >
                        <GlassCard className="h-full p-6 relative overflow-hidden bg-gradient-to-br from-rose-500/[0.05] via-white/[0.05] to-rose-500/[0.02]">
                            {/* Shine effect handled by GlassCard */}

                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-light text-white/80">
                                    {currentDate.getFullYear()}年 {MONTH_NAMES[currentDate.getMonth()]}
                                </h2>
                                <div className="flex gap-2">
                                    <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                {["日", "一", "二", "三", "四", "五", "六"].map(d => (
                                    <div key={d} className="text-xs text-white/30 py-2">{d}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {/* Empty slots for start of month */}
                                {Array.from({ length: firstDay }).map((_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}

                                {/* Days */}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const sessionCount = sessionsByDay[day]?.length || 0;
                                    const isSelected = isSelectedInView && selectedDate.getDate() === day;
                                    const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

                                    return (
                                        <motion.button
                                            key={day}
                                            whileHover={{ scale: 1.1, zIndex: 10 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                const newDate = new Date(currentDate);
                                                newDate.setDate(day);
                                                setSelectedDate(newDate);
                                            }}
                                            className={cn(
                                                "aspect-square rounded-[1rem] flex flex-col items-center justify-center relative transition-all duration-300",
                                                isSelected
                                                    ? "bg-rose-500/20 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.4),0_0_20px_rgba(244,63,94,0.3)] backdrop-blur-md"
                                                    : "hover:bg-white/10 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]",
                                                isToday && !isSelected && "bg-white/5 ring-1 ring-white/10"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-sm z-10 transition-colors",
                                                isSelected ? "text-white font-medium drop-shadow-md" : "text-white/60 font-light"
                                            )}>{day}</span>

                                            {sessionCount > 0 && (
                                                <div className="mt-1 flex gap-0.5">
                                                    <div className={cn("w-1 h-1 rounded-full transition-all", isSelected ? 'bg-rose-300 shadow-[0_0_8px_rgba(253,164,175,0.8)]' : 'bg-rose-500/70')} />
                                                    {sessionCount > 1 && <div className={cn("w-1 h-1 rounded-full transition-all", isSelected ? 'bg-rose-300 shadow-[0_0_8px_rgba(253,164,175,0.8)]' : 'bg-rose-500/70')} />}
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </GlassCard>
                    </motion.div>

                    {/* Daily List */}
                    <motion.div
                        layout
                        className="md:h-full min-h-[300px]"
                    >
                        <GlassCard className="h-full p-6 relative bg-gradient-to-br from-rose-500/[0.05] via-white/[0.05] to-rose-500/[0.02]">
                            <h3 className="text-lg font-light text-white/80 mb-4 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-rose-400" />
                                {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
                            </h3>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {isSelectedInView && selectedDaySessions.length === 0 ? (
                                    <div className="text-white/20 text-center py-12 text-sm">
                                        今日未冥想
                                    </div>
                                ) : (!isSelectedInView ? (
                                    <div className="text-white/20 text-center py-12 text-sm">
                                        请选择日期
                                    </div>
                                ) : (
                                    selectedDaySessions.map(session => (
                                        <div key={session.id} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                            <div className="text-white/90 font-medium mb-1">{session.topic_name || "自由冥想"}</div>
                                            <div className="flex justify-between text-xs text-white/40">
                                                <span>{new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>{session.duration_seconds ? `${Math.round(session.duration_seconds / 60)} 分钟` : '未完成'}</span>
                                            </div>
                                        </div>
                                    ))
                                ))}
                            </div>
                        </GlassCard>
                    </motion.div>
                </div>

            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, unit, delay, color = "text-rose-400" }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
            className="group"
        >
            <GlassCard
                className="relative overflow-hidden p-5 bg-gradient-to-br from-rose-500/[0.05] via-white/[0.05] to-rose-500/[0.02]"
                hoverEffect={true}
            >
                <div className={`absolute top-4 right-4 p-2 rounded-full bg-white/5 ${color} opacity-80 group-hover:scale-110 transition-transform duration-500`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="mt-8">
                    <div className="text-3xl font-light text-white tracking-tight">
                        {value} <span className="text-xs text-white/30 font-normal ml-1">{unit}</span>
                    </div>
                    <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">{label}</div>
                </div>
            </GlassCard>
        </motion.div>
    );
}
