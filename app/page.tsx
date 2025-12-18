"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Droplets, Wind, RefreshCw, Check, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const MILESTONES = [1, 3, 7, 14, 30, 60, 100, 365];

export default function Home() {
  const [days, setDays] = useState(0);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [checkInDates, setCheckInDates] = useState<string[]>([]);
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [consecutiveDays, setConsecutiveDays] = useState(0);

  function calculateConsecutiveDays(dates: string[]) {
    if (!Array.isArray(dates) || dates.length === 0) return 0;

    const sortedDates = dates
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let consecutive = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const checkDate = new Date(sortedDates[i]);
      checkDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (checkDate.getTime() === expectedDate.getTime()) {
        consecutive++;
      } else {
        break;
      }
    }

    return consecutive;
  }

  useEffect(() => {
    const savedDate = localStorage.getItem("quitDate");
    if (savedDate) {
      setStartDate(savedDate);
      const start = new Date(savedDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDays(diffDays);
    }

    // Load check-in dates
    const savedCheckIns = localStorage.getItem("checkInDates");
    if (savedCheckIns) {
      let dates: string[] = [];
      try {
        dates = JSON.parse(savedCheckIns);
        if (!Array.isArray(dates)) dates = [];
      } catch {
        dates = [];
      }
      setCheckInDates(dates);

      // Check if today is already checked in
      const today = new Date().toDateString();
      setTodayCheckedIn(dates.includes(today));

      // Calculate consecutive days
      setConsecutiveDays(calculateConsecutiveDays(dates));
    }
  }, []);



  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      setStartDate(newDate);
      localStorage.setItem("quitDate", newDate);

      const start = new Date(newDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDays(diffDays);
    }
  };

  const getNextMilestone = () => {
    for (const milestone of MILESTONES) {
      if (days < milestone) {
        return { target: milestone, remaining: milestone - days };
      }
    }
    return null;
  };

  const getHealthStatus = () => {
    const hours = days * 24;

    // Heart rate normalizes after 20 minutes (0.014 days)
    const heartRate = {
      label: '心率',
      status: days >= 0.014 ? '正常' : '恢复中',
      progress: Math.min((days / 0.014) * 100, 100),
      color: days >= 0.014 ? 'text-green-400' : 'text-blue-400',
    };

    // Blood oxygen normalizes after 12 hours (0.5 days)
    const bloodOxygen = {
      label: '血氧',
      status: days >= 0.5 ? '正常' : '恢复中',
      progress: Math.min((days / 0.5) * 100, 100),
      color: days >= 0.5 ? 'text-green-400' : 'text-blue-400',
    };

    // Taste and smell improve after 2 days
    const taste = {
      label: '味觉',
      status: days >= 2 ? '已改善' : days >= 1 ? '改善中' : '待恢复',
      progress: Math.min((days / 2) * 100, 100),
      color: days >= 2 ? 'text-green-400' : days >= 1 ? 'text-blue-400' : 'text-slate-400',
    };

    // Lung function improves after 14 days (2 weeks)
    const lungFunction = {
      label: '肺功能',
      status: days >= 14 ? '明显改善' : days >= 7 ? '改善中' : '待改善',
      progress: Math.min((days / 14) * 100, 100),
      color: days >= 14 ? 'text-green-400' : days >= 7 ? 'text-blue-400' : 'text-slate-400',
    };

    // Circulation improves after 14 days
    const circulation = {
      label: '血液循环',
      status: days >= 14 ? '已改善' : days >= 3 ? '改善中' : '待改善',
      progress: Math.min((days / 14) * 100, 100),
      color: days >= 14 ? 'text-green-400' : days >= 3 ? 'text-blue-400' : 'text-slate-400',
    };

    // Energy levels improve after 30 days
    const energy = {
      label: '体力',
      status: days >= 30 ? '显著提升' : days >= 14 ? '提升中' : '待提升',
      progress: Math.min((days / 30) * 100, 100),
      color: days >= 30 ? 'text-green-400' : days >= 14 ? 'text-blue-400' : 'text-slate-400',
    };

    // Return the two most relevant metrics based on current progress
    if (days < 0.5) {
      return [heartRate, bloodOxygen];
    } else if (days < 2) {
      return [bloodOxygen, taste];
    } else if (days < 14) {
      return [taste, lungFunction];
    } else if (days < 30) {
      return [lungFunction, circulation];
    } else {
      return [circulation, energy];
    }
  };

  const nextMilestone = getNextMilestone();
  const healthMetrics = getHealthStatus();

  return (
    <div className="flex-1 flex flex-col items-center justify-center z-10 pt-20 pb-24 md:pb-0 px-4 min-h-screen">
      {/* Liquid Glass Container */}
      <div
        className="p-6 rounded-3xl relative overflow-hidden w-full max-w-md mx-auto"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px) saturate(180%) brightness(105%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(105%)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3)',
        }}
      >
        {/* Glass edge refraction effect */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.08) 100%)',
          }}
        />

        <div className="relative z-10 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-1"
          >
            <h1 className="text-xl font-light text-slate-300 tracking-wide">戒烟</h1>
            <div className="relative">
              <div className="text-[6rem] font-bold leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 drop-shadow-2xl">
                {days}
              </div>
              <div className="absolute -right-2 top-2 text-lg text-slate-400 font-light">天</div>
            </div>
            {/* Quit Date Display */}
            {startDate && (
              <div className="text-xs text-slate-400">
                戒烟日：{new Date(startDate).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
          </motion.div>

          {/* Milestones Progress */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">里程碑进度</span>
              {nextMilestone && (
                <span className="text-slate-300">
                  还有 <span className="font-medium text-white">{nextMilestone.remaining}</span> 天到 {nextMilestone.target} 天
                </span>
              )}
            </div>

            {/* Progress Bar Container */}
            <div className="relative pt-8 pb-4">
              {/* Background Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 rounded-full" />

              {/* Progress Line */}
              <div
                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-green-400 to-blue-400 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((days / MILESTONES[MILESTONES.length - 1]) * 100, 100)}%`
                }}
              />

              {/* Milestone Markers */}
              <div className="relative flex justify-between">
                {MILESTONES.map((milestone, index) => {
                  const isAchieved = days >= milestone;
                  const isCurrent = !isAchieved && (index === 0 || days >= MILESTONES[index - 1]);

                  return (
                    <div key={milestone} className="flex flex-col items-center" style={{ flex: index === 0 ? '0 0 auto' : '1 1 0' }}>
                      {/* Marker Dot */}
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full transition-all duration-300 relative z-10",
                          isAchieved
                            ? "bg-green-400 shadow-lg shadow-green-400/50"
                            : isCurrent
                              ? "bg-blue-400 shadow-lg shadow-blue-400/50 animate-pulse"
                              : "bg-white/20"
                        )}
                      />

                      {/* Milestone Label */}
                      <span
                        className={cn(
                          "text-xs mt-2 transition-colors duration-300",
                          isAchieved
                            ? "text-green-400 font-medium"
                            : isCurrent
                              ? "text-blue-400 font-medium"
                              : "text-slate-500"
                        )}
                      >
                        {milestone}天
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Dynamic Health Metrics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {healthMetrics.map((metric, index) => (
              <div
                key={metric.label}
                className="p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 relative overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                {index === 0 ? (
                  <Wind className="w-6 h-6 text-blue-400 relative z-10" />
                ) : (
                  <Droplets className="w-6 h-6 text-cyan-400 relative z-10" />
                )}
                <span className="text-sm text-slate-400 relative z-10">{metric.label}</span>
                <span className={cn("text-lg font-medium relative z-10", metric.color)}>
                  {metric.status}
                </span>
                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative z-10">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-500"
                    style={{ width: `${metric.progress}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 relative z-10">{Math.round(metric.progress)}%</span>
              </div>
            ))}
          </motion.div>

          {/* Quit Date Picker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">戒烟起始日</span>
              </div>
            </div>
            <div className="relative">
              <input
                type="date"
                value={startDate ? new Date(startDate).toISOString().split('T')[0] : ''}
                onChange={handleDateChange}
                className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
