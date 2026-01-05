import { create } from 'zustand';

export type MoodType = 'calm' | 'happy' | 'sad' | 'anxious' | 'focus';

interface MoodState {
    currentMood: MoodType;
    setMood: (mood: MoodType) => void;
}

export const MOOD_THEMES: Record<MoodType, {
    primary: string;   // Main gradient color
    secondary: string; // Secondary gradient color
    accent: string;    // Accent color for UI elements
    bg: string;        // Base background color
    speed: number;     // Animation speed multiplier (1 = normal)
}> = {
    calm: {
        primary: "from-rose-100/40",
        secondary: "to-teal-100/40",
        accent: "bg-rose-500",
        bg: "bg-[#FDFCF8]",
        speed: 1,
    },
    happy: {
        primary: "from-orange-200/50",
        secondary: "to-amber-100/50",
        accent: "bg-orange-500",
        bg: "bg-[#FFF8F0]",
        speed: 1.2,
    },
    sad: {
        primary: "from-indigo-200/30",
        secondary: "to-blue-100/30",
        accent: "bg-indigo-400",
        bg: "bg-[#F0F4F8]",
        speed: 0.6,
    },
    anxious: {
        primary: "from-slate-300/40",
        secondary: "to-gray-200/40",
        accent: "bg-slate-500",
        bg: "bg-[#E8E8E8]",
        speed: 2.5, // Turbulent
    },
    focus: {
        primary: "from-sky-200/40",
        secondary: "to-emerald-100/40",
        accent: "bg-sky-500",
        bg: "bg-[#F0F9FF]",
        speed: 1,
    },
};

export const useMoodStore = create<MoodState>((set) => ({
    currentMood: 'calm',
    setMood: (mood) => set({ currentMood: mood }),
}));
