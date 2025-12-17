import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import webpush from "web-push";

// 配置 VAPID
webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

// 这个 API 会被 Vercel Cron 每分钟调用一次
export async function GET(req: Request) {
    // 验证 Cron 密钥 (可选但推荐)
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 使用 Service Role 访问所有用户数据
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 获取当前 UTC 时间
        const now = new Date();

        // 查询所有应该在当前时间发送提醒的用户
        // 我们查找 reminder_time 在当前分钟内的订阅
        const currentHour = now.getUTCHours().toString().padStart(2, "0");
        const currentMinute = now.getUTCMinutes().toString().padStart(2, "0");
        const currentTimeUTC = `${currentHour}:${currentMinute}:00`;

        // 简化版：直接匹配时间 (生产环境应考虑时区转换)
        // 这里假设 reminder_time 存的是用户本地时间，我们需要转换
        // 但为简化，先用 SQL 函数处理
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth, reminder_time, timezone")
            .eq("enabled", true);

        if (error) {
            console.error("Query error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!subscriptions?.length) {
            return NextResponse.json({ message: "No subscriptions", sent: 0 });
        }

        // 筛选出当前时间应该发送的订阅
        const toSend = subscriptions.filter(sub => {
            try {
                // 获取用户时区的当前时间
                const userNow = new Date(now.toLocaleString("en-US", { timeZone: sub.timezone || "Asia/Shanghai" }));
                const userHour = userNow.getHours().toString().padStart(2, "0");
                const userMinute = userNow.getMinutes().toString().padStart(2, "0");
                const userTime = `${userHour}:${userMinute}`;

                // 检查是否匹配 reminder_time (格式: "08:00:00")
                const reminderTime = sub.reminder_time?.substring(0, 5); // "08:00"
                return userTime === reminderTime;
            } catch {
                return false;
            }
        });

        if (!toSend.length) {
            return NextResponse.json({ message: "No reminders due", checked: subscriptions.length, sent: 0 });
        }

        const payload = JSON.stringify({
            title: "🧘 该冥想了",
            body: "来一场心灵放松吧，保持每日的正念练习",
            icon: "/icon-192.png",
            data: { url: "/meditate" }
        });

        // 发送通知
        const results = await Promise.allSettled(
            toSend.map(sub =>
                webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth
                        }
                    },
                    payload
                ).catch(err => {
                    // 如果订阅失效 (410 Gone)，禁用它
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

        const successful = results.filter(r => r.status === "fulfilled").length;
        const failed = results.filter(r => r.status === "rejected").length;

        return NextResponse.json({
            success: true,
            checked: subscriptions.length,
            matched: toSend.length,
            sent: successful,
            failed
        });
    } catch (err: unknown) {
        console.error("Cron error:", err);
        return NextResponse.json({
            error: "Cron job failed",
            details: err instanceof Error ? err.message : String(err)
        }, { status: 500 });
    }
}
