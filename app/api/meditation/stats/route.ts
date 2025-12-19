
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch all sessions (id, started_at, duration_seconds)
        // Optimized: only select necessary fields
        const { data: sessions, error } = await supabase
            .from('meditation_sessions')
            .select('started_at, duration_seconds')
            .eq('user_id', user.id)
            .order('started_at', { ascending: true });

        if (error) throw error;

        // Calculate Stats in JS (easier than complex SQL for streaks across timezones)
        let totalSessions = 0;
        let totalDurationSeconds = 0;
        let currentStreak = 0;
        let longestStreak = 0;

        if (sessions && sessions.length > 0) {
            totalSessions = sessions.length;
            totalDurationSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

            // Streak Calculation
            // 1. Get unique dates (normalized to local time?? Server is UTC usually. Let's assume user wants UTC dates for simplicity or client handles it. 
            // Ideally streaks depend on User Timezone. 
            // For this API, let's treat streaks based on UTC dates for now to be consistent server-side.

            const dates = Array.from(new Set(sessions.map(s => s.started_at.split('T')[0]))).sort();

            // Calculate streaks
            let tempStreak = 0;
            let lastDate: Date | null = null;

            for (const dStr of dates) {
                const d = new Date(dStr);
                if (lastDate) {
                    const diff = (d.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
                    if (diff === 1) {
                        tempStreak++;
                    } else if (diff > 1) {
                        tempStreak = 1;
                    }
                } else {
                    tempStreak = 1; // First day
                }
                longestStreak = Math.max(longestStreak, tempStreak);
                lastDate = d;
            }

            // Check if current streak is active (last session was today or yesterday UTC)
            const todayStr = new Date().toISOString().split('T')[0];
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const lastSessionDate = dates[dates.length - 1];
            if (lastSessionDate === todayStr || lastSessionDate === yesterdayStr) {
                currentStreak = tempStreak;
            } else {
                currentStreak = 0;
            }
        }

        return NextResponse.json({
            totalSessions,
            totalDurationMinutes: Math.round(totalDurationSeconds / 60),
            currentStreak,
            longestStreak,
            daysMeditated: sessions ? new Set(sessions.map(s => s.started_at.split('T')[0])).size : 0
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const runtime = 'edge';
