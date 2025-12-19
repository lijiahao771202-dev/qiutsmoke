import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * 高危时段 API
 * GET: 获取用户的高危时段列表
 * POST: 添加高危时段
 * DELETE: 删除高危时段
 */

// GET: 获取用户的高危时段
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("user_danger_times")
            .select("*")
            .eq("user_id", user.id)
            .order("time_slot", { ascending: true });

        if (error) {
            console.error("Error fetching danger times:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (err) {
        console.error("GET danger-times error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: 添加高危时段
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { time_slot, label } = body;

        if (!time_slot) {
            return NextResponse.json({ error: "time_slot is required" }, { status: 400 });
        }

        // 格式化时间为 HH:MM:00
        const formattedTime = time_slot.length === 5 ? `${time_slot}:00` : time_slot;

        const { data, error } = await supabase
            .from("user_danger_times")
            .insert({
                user_id: user.id,
                time_slot: formattedTime,
                label: label || "",
                enabled: true
            })
            .select()
            .single();

        if (error) {
            console.error("Error inserting danger time:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error("POST danger-times error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE: 删除高危时段
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("user_danger_times")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id); // 安全：确保只能删除自己的

        if (error) {
            console.error("Error deleting danger time:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE danger-times error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export const runtime = 'edge';
