
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// 辅助函数：格式化日期
const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    });
};

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        console.log("[Stats API] URL present:", !!supabaseUrl);
        console.log("[Stats API] Key present:", !!serviceRoleKey);

        if (!serviceRoleKey || !supabaseUrl) {
            console.error("[Stats API] Missing config");
            return NextResponse.json({ error: "Server configuration error: Missing Admin Key" }, { status: 500 });
        }

        // 创建 Admin 客户端
        const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. 获取所有用户 (Supabase Auth)
        console.log("[Stats API] Fetching users...");
        const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers({
            perPage: 1000,
        });

        if (usersError) {
            console.error("[Stats API] Fetch users error:", usersError);
            return NextResponse.json({ error: usersError.message }, { status: 500 });
        }
        console.log("[Stats API] Users fetched:", users?.length);

        // 2. 获取所有订阅信息 (DB)
        const { data: subscriptions, error: subError } = await supabase
            .from("push_subscriptions")
            .select("user_id, updated_at, endpoint");

        if (subError) {
            console.error("Fetch subscriptions error:", subError);
        }

        // 3. 构建用户订阅映射 (UserId -> Subscription Details)
        const subMap = new Map<string, { count: number, lastSub: string }>();

        subscriptions?.forEach(sub => {
            const current = subMap.get(sub.user_id) || { count: 0, lastSub: "" };
            subMap.set(sub.user_id, {
                count: current.count + 1,
                lastSub: sub.updated_at
            });
        });

        // 4. 合并数据 & 计算统计
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        let onlineCount = 0;
        let subscribedCount = 0;

        const detailedUsers = users.map(u => {
            const subInfo = subMap.get(u.id);
            const isSubscribed = !!subInfo;

            // 简单的在线判定：24小时内登录过
            const lastSignInDate = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null;
            const isOnline = lastSignInDate ? lastSignInDate > oneDayAgo : false;

            if (isOnline) onlineCount++;
            if (isSubscribed) subscribedCount++;

            return {
                id: u.id,
                email: u.email,
                nickname: u.user_metadata?.nickname || "User",
                avatar_id: u.user_metadata?.avatar_id || "cat",
                created_at: formatDate(u.created_at),
                last_sign_in_at: formatDate(u.last_sign_in_at),
                is_online: isOnline,
                is_subscribed: isSubscribed,
                device_count: subInfo?.count || 0,
                // 提供给前端做排序/筛选的原始值
                raw_created_at: u.created_at,
                raw_last_sign_in: u.last_sign_in_at,
            };
        });

        // 按最后登录时间倒序排序 (最近活跃的在前面)
        detailedUsers.sort((a, b) => {
            const dateA = a.raw_last_sign_in ? new Date(a.raw_last_sign_in).getTime() : 0;
            const dateB = b.raw_last_sign_in ? new Date(b.raw_last_sign_in).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({
            stats: {
                total_users: users.length,
                online_users: onlineCount,
                subscribed_users: subscribedCount,
            },
            users: detailedUsers
        });

    } catch (err: any) {
        console.error("Admin stats API error:", err);
        return NextResponse.json({
            error: "Internal server error: " + (err.message || String(err))
        }, { status: 500 });
    }
}
