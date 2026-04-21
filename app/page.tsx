"use client";

import { CardStack } from "../components/ui/CardStack";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useHaptics } from "@/lib/hooks/useHaptics";

import { LotusGarden } from "@/components/LotusGarden";
import { useMeditationSessions } from "@/lib/hooks/useData";

import JourneyCard from "@/components/ui/JourneyCard";
import PulseCard from "@/components/ui/PulseCard";


// MILESTONES removed (moved to JourneyCard)
// Animation Constants (Apple Spring Physics)
const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 1
} as const;

// 🚀 入场动画已移除，只保留组件内部动画

export default function Home() {
  const [days, setDays] = useState(0);
  // State for Check-in Days

  const { triggerLight, triggerMedium } = useHaptics();

  // 获取冥想会话记录
  const { sessions, isLoading: isSessionsLoading } = useMeditationSessions();


  // 转换为莲花花园需要的格式（只计算正式练习的记录）
  const lotusRecords = sessions
    .filter(s => s.topic_id?.startsWith('practice-')) // 🪷 只有正式练习才生成莲花
    .map(s => ({
      id: s.id,
      duration: Math.round((s.duration_seconds || 0) / 60), // 转换为分钟
      created_at: s.started_at
    }));

  // --- Logic Preserved from Original ---
  // Calculate Check-in Days (Unique days with sessions)
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      // 提取所有会话的日期部分 (YYYY-MM-DD)，去重计算天数
      const uniqueDates = new Set(
        sessions.map(s => {
          const date = new Date(s.started_at);
          return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        })
      );
      setDays(uniqueDates.size);
    } else {
      // 如果没有会话，天数为 0
      setDays(0);
    }
  }, [sessions]);

  // Calculate Total Minutes
  const totalMinutes = sessions.reduce((acc, s) => acc + Math.round((s.duration_seconds || 0) / 60), 0);

  // Calculate Today's Minutes
  const todayMinutes = sessions.reduce((acc, s) => {
    const sessionDate = new Date(s.started_at);
    const today = new Date();
    const isToday = sessionDate.getDate() === today.getDate() &&
      sessionDate.getMonth() === today.getMonth() &&
      sessionDate.getFullYear() === today.getFullYear();
    return isToday ? acc + Math.round((s.duration_seconds || 0) / 60) : acc;
  }, 0);

  // Milestone logic removed (handled in JourneyCard)

  return (
    <div className="relative h-[100dvh] overflow-hidden text-white font-sans selection:bg-white/20 touch-none">

      {/* 🪷 Full Screen Lotus Garden Background - Only render after data loads */}
      {!isSessionsLoading && lotusRecords.length > 0 && <LotusGarden records={lotusRecords} streakDays={Math.min(7, lotusRecords.length)} />}

      {/* Main Content Container - 静态容器，无入场动画 */}
      <main
        className="relative z-10 flex flex-col px-6 pt-10 pb-24 mx-auto w-full max-w-md h-full justify-around gap-2"
      >

        {/* --- Block 1: Header & Status --- */}
        <motion.div
          className="flex flex-col items-center justify-center relative shrink-0"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={SPRING_TRANSITION}
        >

          {/* Days Counter Block */}
          <div className="relative text-center z-10 group cursor-pointer" onClick={() => triggerMedium()}>

            {/* Dynamic Aurora Backlight */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-[90px] rounded-full opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/10 blur-[60px] rounded-full mix-blend-overlay" />

            {/* The Big Number */}
            <h2 className="relative text-[15vh] font-bold leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/20 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-500 group-active:scale-95 group-active:opacity-80">
              {days}
            </h2>

            {/* Label */}
            <div className="flex flex-col items-center space-y-1 mt-2">
              <span className="text-xl font-medium text-white/80 tracking-[0.2em] uppercase">Check-in Days</span>
            </div>
          </div>
        </motion.div>




        {/* --- Card Queue: Swipeable Stack --- */}
        <div className="w-full h-[18rem] relative z-20">
          <CardStack>
            {/* Card 1: Main Dashboard (Command Center) */}
            <div className="w-full h-full">
              <JourneyCard days={days} times={sessions.length} minutes={totalMinutes} todayMinutes={todayMinutes} />
            </div>



            {/* Card 3: The Pulse Anchor (Tactile Relief) */}
            <div className="w-full h-full">
              <PulseCard />
            </div>


          </CardStack>
        </div>

      </main>
    </div>
  );
}
