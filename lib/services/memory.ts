"use client";

// Simple Local Storage Memory Service
// In Phase 3 this will be upgraded to Supabase

export interface UserProfile {
    name?: string;
    emotionalState?: string;
    lastInteraction?: number;
    preferences?: {
        preferredDuration?: number;
        preferredVoice?: string;
    };
}

const STORAGE_KEY = "ai_companion_memory";

export const memoryService = {
    getProfile(): UserProfile {
        if (typeof window === "undefined") return {};
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    },

    updateProfile(updates: Partial<UserProfile>) {
        if (typeof window === "undefined") return;
        const current = this.getProfile();
        const newData = { ...current, ...updates, lastInteraction: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        return newData;
    },

    saveContext(messages: any[]) {
        // TODO: Save chat history for short-term memory
    }
};
