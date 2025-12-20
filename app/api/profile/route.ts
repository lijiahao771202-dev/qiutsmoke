/**
 * 用户个人信息 API
 * 保存/获取用户头像和昵称
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = 'edge';

// GET: 获取用户个人信息
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 从 user_metadata 获取个人信息
        const profile = {
            nickname: user.user_metadata?.nickname || '',
            avatarId: user.user_metadata?.avatar_id || 'cat',
        };

        return NextResponse.json(profile);
    } catch (err) {
        console.error("GET profile error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: 更新用户个人信息
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { nickname, avatarId } = body;

        // 更新 user_metadata
        const updates: Record<string, any> = {};
        if (nickname !== undefined) updates.nickname = nickname;
        if (avatarId !== undefined) updates.avatar_id = avatarId;

        const { error } = await supabase.auth.updateUser({
            data: updates
        });

        if (error) {
            console.error("Error updating profile:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("POST profile error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
