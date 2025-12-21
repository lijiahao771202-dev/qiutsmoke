
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";

// Edge Runtime is not supported for web-push (crypto dependencies)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Prevent caching

/**
 * Cron Job: Check for reminders (Danger Times) and send push notifications
 * Frequency: Every 10 minutes (ideally)
 */
export async function GET(request: Request) {
    // Basic security check
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isManualRun = request.url.includes('source=manual');

    // Allow local testing or verified cron or manual trigger from admin
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}` && !isManualRun) {
        // Uncomment in production after setting CRON_SECRET
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log("[Cron] Starting reminder check...");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: "Configuration error" }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // 2. Calculate Current Time Slot (UTC -> UTC+8)
        const now = new Date();
        const utcHour = now.getUTCHours();
        const utcMinute = now.getUTCMinutes();

        // Convert to Beijing Time
        let cnHour = utcHour + 8;
        if (cnHour >= 24) cnHour -= 24;

        const currentTotalMinutes = cnHour * 60 + utcMinute;
        console.log(`[Cron] Current Time: ${cnHour}:${utcMinute} (Total: ${currentTotalMinutes}m)`);

        // 3. Query ALL enabled reminders (Small user base optimization)
        // If user base grows, we need "buckets" in DB (e.g. a 'minute_of_day' column)
        const { data: allReminders, error: reminderError } = await supabase
            .from("user_danger_times")
            .select("user_id, label, time_slot")
            .eq("enabled", true);

        if (reminderError) throw reminderError;

        // 4. Filter matches in memory (Window: Past 12 mins to Future 2 mins)
        // This covers the 10-min Cron interval + slight drift
        const TOLERANCE_PAST = 12;
        const TOLERANCE_FUTURE = 2;

        const matchedReminders = (allReminders || []).filter(r => {
            if (!r.time_slot) return false;
            // Parse "HH:MM:SS" or "HH:MM"
            const [hStr, mStr] = r.time_slot.split(':');
            const h = parseInt(hStr);
            const m = parseInt(mStr);
            const reminderTotalMinutes = h * 60 + m;

            // Check difference (handle midnight wrap)
            let diff = currentTotalMinutes - reminderTotalMinutes;
            if (diff < -720) diff += 1440; // e.g. Now 00:05, Reminder 23:55 -> Diff +10
            if (diff > 720) diff -= 1440; // e.g. Now 23:55, Reminder 00:05 -> Diff -10

            // Match if within window: [Now - 12, Now + 2]
            // Meaning: Reminder was supposed to happen 0-12 mins ago, or in next 2 mins
            return diff >= -TOLERANCE_FUTURE && diff <= TOLERANCE_PAST;
        });

        console.log(`[Cron] Matched ${matchedReminders.length} / ${allReminders?.length} reminders`);

        if (matchedReminders.length === 0) {
            return NextResponse.json({ message: "No reminders in window" });
        }

        // 5. Send Notifications
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;
        const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@rain.com";

        if (!vapidPrivateKey) throw new Error("Missing VAPID_PRIVATE_KEY");

        webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

        const results = await Promise.all(matchedReminders.map(async (reminder) => {
            const { data: sub } = await supabase
                .from("push_subscriptions")
                .select("*")
                .eq("user_id", reminder.user_id)
                .single();

            if (!sub) return { success: false, error: "No subscription" };

            try {
                const payload = JSON.stringify({
                    title: "🔔 冥想提醒",
                    body: reminder.label ? `现在是您的"${reminder.label}"时段，来做个冥想吧？` : "到了您设置的冥想时间了",
                    icon: "/icon-192.png",
                    data: { url: "/meditate" }
                });

                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload);

                return { success: true, userId: reminder.user_id };
            } catch (e) {
                console.error(`[Cron] Failed to send to ${reminder.user_id}`, e);
                return { success: false, error: String(e) };
            }
        }));

        const successCount = results.filter(r => r.success).length;
        console.log(`[Cron] Sent ${successCount} notifications`);

        return NextResponse.json({
            success: true,
            sent: successCount,
            totalMatched: matchedReminders.length,
            debugTime: `${cnHour}:${utcMinute}`
        });

    } catch (e: any) {
        console.error("[Cron] Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
