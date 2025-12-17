import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import webpush from "web-push";

// 配置 VAPID
webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

// POST: 手动发送通知给当前用户 (用于测试)
export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, message } = body;

        // 获取用户的推送订阅
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", user.id)
            .eq("enabled", true);

        if (error || !subscriptions?.length) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
        }

        const payload = JSON.stringify({
            title: title || "🧘 该冥想了",
            body: message || "来一场心灵放松吧",
            icon: "/icon-192.png",
            data: { url: "/meditate" }
        });

        // 发送通知到所有订阅的设备
        const results = await Promise.allSettled(
            subscriptions.map(sub =>
                webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth
                        }
                    },
                    payload
                )
            )
        );

        const successful = results.filter(r => r.status === "fulfilled").length;
        const failed = results.filter(r => r.status === "rejected").length;

        return NextResponse.json({
            success: true,
            sent: successful,
            failed
        });
    } catch (err: unknown) {
        console.error("Send notification error:", err);
        return NextResponse.json({
            error: "Failed to send notification",
            details: err instanceof Error ? err.message : String(err)
        }, { status: 500 });
    }
}
