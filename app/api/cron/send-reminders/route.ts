import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { getDailyMessage, getDangerMessage, type MindfulnessMessage } from "@/lib/mindfulness-messages";

// VAPID 配置延迟初始化
let vapidConfigured = false;

function ensureVapidConfigured() {
    if (vapidConfigured) return true;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        console.warn("VAPID keys not configured");
        return false;
    }

    webpush.setVapidDetails(
        process.env.VAPID_EMAIL || "mailto:admin@example.com",
        publicKey,
        privateKey
    );
    vapidConfigured = true;
    return true;
}

// 这个 API 会被 Vercel Cron 每分钟调用一次
export async function GET(req: Request) {
    // 检查 VAPID 配置
    if (!ensureVapidConfigured()) {
        return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
    }

    // 验证 Cron 密钥 (可选但推荐)
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 检查 Supabase 配置
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // 使用 Service Role 访问所有用户数据
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const now = new Date();
        const results = {
            daily: { checked: 0, matched: 0, sent: 0, failed: 0 },
            danger: { checked: 0, matched: 0, sent: 0, failed: 0 }
        };

        // ==================== 1. 处理每日定时提醒 ====================
        const { data: subscriptions, error: subError } = await supabase
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth, reminder_time, reminder_times, timezone")
            .eq("enabled", true);

        if (subError) {
            console.error("Query subscriptions error:", subError);
        }

        if (subscriptions?.length) {
            results.daily.checked = subscriptions.length;

            // 筛选当前时间应该发送的订阅
            const dailyToSend = subscriptions.filter(sub => {
                try {
                    const userNow = new Date(now.toLocaleString("en-US", { timeZone: sub.timezone || "Asia/Shanghai" }));
                    const userHour = userNow.getHours().toString().padStart(2, "0");
                    const userMinute = userNow.getMinutes().toString().padStart(2, "0");
                    const userTime = `${userHour}:${userMinute}`;

                    // 检查 reminder_times 数组（新格式）或 reminder_time（旧格式）
                    const times = sub.reminder_times || [sub.reminder_time?.substring(0, 5)].filter(Boolean);
                    return times.some((t: string) => t === userTime);
                } catch {
                    return false;
                }
            });

            results.daily.matched = dailyToSend.length;

            if (dailyToSend.length > 0) {
                const dailyResults = await sendNotifications(supabase, dailyToSend, getDailyMessage());
                results.daily.sent = dailyResults.sent;
                results.daily.failed = dailyResults.failed;
            }
        }

        // ==================== 2. 处理高危时段提醒 ====================
        const { data: dangerTimes, error: dangerError } = await supabase
            .from("user_danger_times")
            .select(`
                id, 
                time_slot, 
                label,
                user_id,
                push_subscriptions!inner(id, endpoint, p256dh, auth, timezone, enabled)
            `)
            .eq("enabled", true)
            .eq("push_subscriptions.enabled", true);

        // 如果表不存在，忽略错误
        if (dangerError && !dangerError.message.includes("does not exist")) {
            console.error("Query danger times error:", dangerError);
        }

        if (dangerTimes?.length) {
            results.danger.checked = dangerTimes.length;

            // 筛选当前时间匹配的高危时段
            const dangerToSend: Array<{
                endpoint: string;
                p256dh: string;
                auth: string;
                subId: string;
            }> = [];

            for (const dt of dangerTimes) {
                try {
                    const sub = (dt as any).push_subscriptions;
                    if (!sub) continue;

                    const userNow = new Date(now.toLocaleString("en-US", { timeZone: sub.timezone || "Asia/Shanghai" }));
                    const userHour = userNow.getHours().toString().padStart(2, "0");
                    const userMinute = userNow.getMinutes().toString().padStart(2, "0");
                    const userTime = `${userHour}:${userMinute}`;

                    const dangerTime = dt.time_slot?.substring(0, 5);
                    if (userTime === dangerTime) {
                        dangerToSend.push({
                            endpoint: sub.endpoint,
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                            subId: sub.id
                        });
                    }
                } catch (e) {
                    console.error("Process danger time error:", e);
                }
            }

            results.danger.matched = dangerToSend.length;

            if (dangerToSend.length > 0) {
                // 使用高危时段专用文案
                const dangerMessage = getDangerMessage();
                const payload = JSON.stringify({
                    title: dangerMessage.title,
                    body: dangerMessage.body,
                    icon: "/icon-192.png",
                    data: { url: dangerMessage.url || "/meditate" }
                });

                const dangerResults = await Promise.allSettled(
                    dangerToSend.map(sub =>
                        webpush.sendNotification(
                            {
                                endpoint: sub.endpoint,
                                keys: { p256dh: sub.p256dh, auth: sub.auth }
                            },
                            payload
                        ).catch(err => {
                            if (err.statusCode === 410) {
                                supabase
                                    .from("push_subscriptions")
                                    .update({ enabled: false })
                                    .eq("id", sub.subId);
                            }
                            throw err;
                        })
                    )
                );

                results.danger.sent = dangerResults.filter(r => r.status === "fulfilled").length;
                results.danger.failed = dangerResults.filter(r => r.status === "rejected").length;
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: now.toISOString(),
            daily: results.daily,
            danger: results.danger
        });
    } catch (err: unknown) {
        console.error("Cron error:", err);
        return NextResponse.json({
            error: "Cron job failed",
            details: err instanceof Error ? err.message : String(err)
        }, { status: 500 });
    }
}

// 发送通知的辅助函数
async function sendNotifications(
    supabase: ReturnType<typeof createClient>,
    subscriptions: Array<{
        id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
    }>,
    message: MindfulnessMessage
) {
    const payload = JSON.stringify({
        title: message.title,
        body: message.body,
        icon: "/icon-192.png",
        data: { url: message.url || "/meditate" }
    });

    const results = await Promise.allSettled(
        subscriptions.map(sub =>
            webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                },
                payload
            ).catch(err => {
                if (err.statusCode === 410) {
                    supabase
                        .from("push_subscriptions")
                        .update({ enabled: false })
                        .eq("id", sub.id);
                }
                throw err;
            })
        )
    );

    return {
        sent: results.filter(r => r.status === "fulfilled").length,
        failed: results.filter(r => r.status === "rejected").length
    };
}
