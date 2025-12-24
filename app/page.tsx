"use client";

import { useState, useEffect, useRef } from "react";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { motion } from "framer-motion";
import { Droplets, Wind, Activity, Zap, Heart, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { LotusGarden } from "@/components/LotusGarden";
import { useMeditationSessions } from "@/lib/hooks/useData";

const MILESTONES = [1, 3, 7, 14, 30, 60, 100, 365];

export default function Home() {
  const [days, setDays] = useState(0);
  const [startDate, setStartDate] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const { triggerLight, triggerMedium } = useHaptics();

  // 获取冒想会话记录用于莲花花园
  const { sessions } = useMeditationSessions();

  // 转换为莲花花园需要的格式
  const lotusRecords = sessions.map(s => ({
    id: s.id,
    duration: Math.round((s.duration_seconds || 0) / 60), // 转换为分钟
    created_at: s.started_at
  }));

  // --- Logic Preserved from Original ---
  useEffect(() => {
    const savedDate = localStorage.getItem("quitDate");
    if (savedDate) {
      updateDays(savedDate);
    }
  }, []);

  const updateDays = (dateStr: string) => {
    setStartDate(dateStr);
    const start = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDays(diffDays);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      localStorage.setItem("quitDate", newDate);
      updateDays(newDate);
    }
  };

  const getNextMilestone = () => {
    for (const milestone of MILESTONES) {
      if (days < milestone) {
        return { target: milestone, remaining: milestone - days };
      }
    }
    return { target: 1000, remaining: 0 }; // Default fallthrough
  };

  const getHealthStatus = () => {
    // Re-using logic but mapping to icons/colors for new UI
    // Heart rate (0.014 days), Blood oxygen (0.5 days), Taste (2 days), Lung (14 days), Circulation (14 days), Energy (30 days)

    const metrics = [
      {
        id: 'heart',
        label: '心率',
        requiredDays: 0.014,
        icon: Heart,
        color: "text-rose-400",
        desc: "恢复正常水平"
      },
      {
        id: 'oxygen',
        label: '血氧',
        requiredDays: 0.5,
        icon: Activity,
        color: "text-sky-400",
        desc: "一氧化碳排净"
      },
      {
        id: 'taste',
        label: '味觉',
        requiredDays: 2,
        icon: Droplets,
        color: "text-orange-400",
        desc: "神经末梢修复"
      },
      {
        id: 'lungs',
        label: '肺功能',
        requiredDays: 14,
        icon: Wind,
        color: "text-emerald-400",
        desc: "纤毛再生中"
      },
      {
        id: 'energy',
        label: '体力',
        requiredDays: 30,
        icon: Zap,
        color: "text-yellow-400",
        desc: "循环显著改善"
      }
    ];

    return metrics.map(m => ({
      ...m,
      progress: Math.min((days / m.requiredDays) * 100, 100),
      status: days >= m.requiredDays ? '完成' : '进行中'
    }));
  };

  const nextMilestone = getNextMilestone();
  const healthMetrics = getHealthStatus(); // Now returns all for grid display

  // Only show the 4 most relevant metrics to avoid clutter
  // Filter for metrics that are either in progress or recently completed
  const activeMetrics = healthMetrics.filter(m => m.progress < 100).slice(0, 4);
  // If fewer than 4 active, fill with completed ones from the end
  const displayMetrics = activeMetrics.length < 4
    ? [...healthMetrics.filter(m => m.progress >= 100).reverse().slice(0, 4 - activeMetrics.length), ...activeMetrics]
    : activeMetrics;

  // Sort by progress desc (completed first in the filled list, or active ones)
  // Actually, visual order: Completed -> In Progress makes sense to show achievements
  displayMetrics.sort((a, b) => b.progress - a.progress);


  return (
    <div className="relative min-h-screen text-white font-sans selection:bg-white/20">
      {/* Background is handled globally by AppWrapper now */}

      <main className="relative z-10 flex flex-col items-center px-6 pt-20 pb-24 mx-auto w-full max-w-lg min-h-screen">

        {/* Header Area */}
        <header
          className="w-full flex justify-between items-center mb-12"
        >
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white/50 tracking-widest uppercase">My Journey</span>
            <h1 className="text-2xl font-semibold tracking-tight">戒烟进度</h1>
          </div>
          <GlassCard className="p-2 rounded-full cursor-pointer active:scale-95 transition-transform">
            <Calendar className="w-5 h-5 text-white/70" />
            <input
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleDateChange}
            />
          </GlassCard>
        </header>

        {/* Main Counter - Clickable to change date */}
        <div
          className="relative mb-16 text-center"
        >
          <div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full" />
          <label
            htmlFor="days-date-input"
            onClick={() => triggerMedium()}
            className="relative cursor-pointer active:scale-95 transition-transform group block"
          >
            <h2 className="text-[8rem] font-bold leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/10 drop-shadow-2xl group-active:from-cyan-100 group-active:to-cyan-100/10 transition-all">
              {days}
            </h2>
            <span className="text-xs text-white/30 mt-1 block">点击修改日期</span>
          </label>
          <p className="text-lg text-white/40 font-light tracking-widest uppercase mt-2">Days Free</p>
          {/* Hidden date input - iOS compatible */}
          <input
            id="days-date-input"
            ref={dateInputRef}
            type="date"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            value={startDate || ''}
            onChange={handleDateChange}
          />
        </div>

        {/* Milestone Tracker (Horizontal) */}
        <div
          className="w-full mb-8"
        >
          <div className="flex justify-between items-end mb-3 px-1">
            <span className="text-sm text-white/60">下一目标</span>
            <span className="text-sm font-medium text-white">
              {nextMilestone.remaining > 0 ? `${nextMilestone.remaining} 天后` : "已达成"}
            </span>
          </div>

          <GlassCard className="p-1 rounded-2xl h-3 w-full bg-black/20">
            <motion.div
              className="h-full bg-white rounded-xl shadow-[0_0_10px_white]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((days / nextMilestone.target) * 100, 100)}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </GlassCard>
          <div className="flex justify-between mt-2 text-xs text-white/30 font-mono">
            <span>0</span>
            <span>{nextMilestone.target} DAYS</span>
          </div>
        </div>

        {/* 🪷 莲花花园 - 冒想成就 */}
        {lotusRecords.length > 0 && (
          <div className="w-full mb-8">
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-sm text-white/60">🪷 冒想花园</span>
              <span className="text-xs text-white/40">倾斜手机移动莲花</span>
            </div>
            <GlassCard className="p-0 overflow-hidden">
              <LotusGarden records={lotusRecords} className="h-56" />
            </GlassCard>
          </div>
        )}

        {/* Health Stats Grid */}
        <div
          className="grid grid-cols-2 gap-4 w-full"
        >
          {displayMetrics.map((item, idx) => (
            <GlassCard
              key={item.id}
              className="p-5 flex flex-col gap-3 group"
              hoverEffect
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex justify-between items-start">
                <div className={cn("p-2 rounded-xl bg-white/5", item.color)}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-mono text-white/30">{Math.round(item.progress)}%</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white/90">{item.label}</h3>
                <p className="text-xs text-white/50 mt-0.5">{item.desc}</p>
              </div>

              {/* Mini Progress Bar */}
              <div className="h-1 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full opacity-80", item.progress >= 100 ? "bg-white" : "bg-white/40")}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.progress}%` }}
                  transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                />
              </div>
            </GlassCard>
          ))}
        </div>
      </main>
    </div>
  );
}
