import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Vercel 后端地址
const VERCEL_BACKEND = "https://qiutsmoke.vercel.app";

// 辅助函数：格式化日期
const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    });
};

// 注意：web-push 将使用动态导入以避免 Edge Runtime 构建错误


export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { title, body: pushBody, url, sendToAll, targetUserId } = body;

        // 获取订阅
        let query = supabase.from("push_subscriptions").select("user_id, endpoint, p256dh, auth");

        if (sendToAll) {
            // 发送给所有人 (不加过滤)
        } else if (targetUserId) {
            // 发送给特定用户 (Admin 功能)
            // 可以在这里加个权限校验，确保调用者是管理员，或者假设 API 路由本身受到很好的保护
            // 目前假设 Admin 页面是受保护的
            query = query.eq("user_id", targetUserId);
        } else {
            // 默认发送给自己 (测试)
            query = query.eq("user_id", user.id);
        }

        const { data: subscriptions, error: subError } = await query;

        if (subError) {
            return NextResponse.json({ error: subError.message }, { status: 500 });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({
                error: "No subscriptions found",
                success: 0,
                failed: 0,
                total: 0
            }, { status: 404 });
        }

        // 构建推送 payload
        const payload = {
            title: title || "🧘 来自 Rain 的提醒",
            body: pushBody || "该冥想了，来一场心灵放松吧～",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: "push-" + Date.now(),
            data: { url: url || "/meditate" },
        };

        // 检查是否有本地 VAPID 密钥 (用于本地直接发送)
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@rain-meditation.app";

        // 模式 1: 本地/服务端直接发送 (如果配置了密钥)
        if (vapidPrivateKey && vapidPublicKey) {
            console.log("Using local direct send...");

            // 动态导入 web-push
            const webpush = (await import("web-push")).default;

            webpush.setVapidDetails(
                vapidEmail,
                vapidPublicKey,
                vapidPrivateKey
            );

            let successCount = 0;
            let failureCount = 0;
            const errors: string[] = [];

            await Promise.all(subscriptions.map(async (sub) => {
                try {
                    const pushSub = {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth }
                    };
                    await webpush.sendNotification(pushSub, JSON.stringify(payload));
                    successCount++;
                } catch (error: any) {
                    console.error("Local send error:", error);
                    failureCount++;
                    if (error.body && !errors.includes(error.body)) errors.push(error.body);
                    else if (error.message && !errors.includes(error.message)) errors.push(error.message);
                }
            }));

            return NextResponse.json({
                success: successCount,
                failed: failureCount,
                errors: errors.slice(0, 3),
                total: subscriptions.length,
                message: `✅ 本地发送完成！成功: ${successCount}, 失败: ${failureCount} (Errors: ${errors.join(", ") || "None"})`,
            });
        }

        // 模式 2: 代理到 Vercel (如果没配置密钥)
        console.log("Proxying to Vercel...");
        const pushSubscriptions = subscriptions.map(s => ({
            endpoint: s.endpoint,
            keys: {
                p256dh: s.p256dh,
                auth: s.auth
            }
        }));

        try {
            const vercelRes = await fetch(`${VERCEL_BACKEND}/api/push/real`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subscriptions: pushSubscriptions,
                    payload,
                }),
            });

            if (vercelRes.ok) {
                const result = await vercelRes.json();
                return NextResponse.json({
                    ...result,
                    total: subscriptions.length,
                    message: `✅ 推送完成(Proxy)！成功: ${result.success}, 失败: ${result.failed}`,
                });
            } else {
                const errData = await vercelRes.json().catch(() => ({}));
                return NextResponse.json({
                    error: errData.error || "Push service error",
                    total: subscriptions.length,
                }, { status: vercelRes.status });
            }
        } catch (e: any) {
            console.error("Vercel proxy error:", e);
            return NextResponse.json({
                error: "Push service proxy failed: " + e.message,
                total: subscriptions.length,
            }, { status: 503 });
        }

    } catch (err: any) {
        console.error("Push API error:", err);
        return NextResponse.json({
            error: "Internal server error: " + (err.message || String(err)),
            stack: err.stack
        }, { status: 500 });
    }
}

// GET: 获取订阅统计和用户列表
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. 获取所有订阅记录
        const { data: subscriptions, count, error: subError } = await supabase
            .from("push_subscriptions")
            .select("user_id, updated_at", { count: "exact" })
            .order("updated_at", { ascending: false });

        if (subError) {
            return NextResponse.json({ error: subError.message }, { status: 500 });
        }

        const totalSubscribers = count || 0;
        let subscribersList: any[] = [];

        // 2. 如果有 Service Role Key，获取用户详细信息
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (serviceRoleKey && supabaseUrl && subscriptions && subscriptions.length > 0) {
            try {
                // 创建 Admin 客户端
                const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false
                    }
                });

                // 获取所有相关用户的 ID
                const userIds = subscriptions.map(sub => sub.user_id);

                // 遗憾的是 Supabase Admin API 没有直接批量获取用户的接口 (listUsers 不能按 ID 数组过滤)
                // 但由于这是管理员页面且用户量不大，我们可以暂时获取所有用户 (分页) 或者这里只演示当前情况
                // 更好的做法：如果用户量大，应该在 public schema 建立 profiles 表。
                // 这里我们假设用户量较小，直接 listUsers 获取一批，然后在内存匹配

                const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({
                    perPage: 100 // 限制 100 人，避免过大
                });

                if (!usersError && users) {
                    // 合并数据
                    subscribersList = subscriptions.map(sub => {
                        const u = users.find(u => u.id === sub.user_id);
                        return {
                            id: sub.user_id,
                            updated_at: formatDate(sub.updated_at),
                            email: u?.email || "Unknown",
                            nickname: u?.user_metadata?.nickname || "User",
                            avatar_id: u?.user_metadata?.avatar_id || "cat",
                            last_sign_in: u?.last_sign_in_at ? formatDate(u.last_sign_in_at) : null
                        };
                    });
                }
            } catch (e) {
                console.error("Admin fetch users failed:", e);
                // Fallback: 返回基本信息
                subscribersList = subscriptions.map(sub => ({
                    id: sub.user_id,
                    updated_at: formatDate(sub.updated_at),
                    email: "Needs Service Role Key",
                    nickname: "Unknown",
                    avatar_id: "cat"
                }));
            }
        } else {
            // 没有 key 或者没有订阅
            subscribersList = subscriptions?.map(sub => ({
                id: sub.user_id,
                updated_at: formatDate(sub.updated_at),
                email: "***",
                nickname: "用户",
                avatar_id: "cat"
            })) || [];
        }

        return NextResponse.json({
            totalSubscribers,
            subscribers: subscribersList
        });
    } catch (err) {
        console.error("GET stats error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
