
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: Fetch sessions (supports ?month=YYYY-MM filtering)
export async function GET(req: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // Format: YYYY-MM
    let query = supabase
        .from('meditation_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

    if (month) {
        // Simple string filtering might work if ISO strings, but better to allow range
        const startOfMonth = `${month}-01T00:00:00.000Z`;
        // Calculate end of month roughly or use date-fns. 
        // For simplicity let's stick to simple "starts with" for strings or proper range query
        // Let's use range.
        const [y, m] = month.split('-');
        const nextMonth = parseInt(m) === 12 ? 1 : parseInt(m) + 1;
        const nextYear = parseInt(m) === 12 ? parseInt(y) + 1 : parseInt(y);
        const endOfMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`;

        query = query.gte('started_at', startOfMonth).lt('started_at', endOfMonth);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

// POST: Start a new session
export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const topicId = body.topicId ?? body.topic_id;
        const topicName = body.topicName ?? body.topic_name;
        const startedAt = body.startedAt ?? body.started_at ?? new Date().toISOString();
        const durationSeconds = body.durationSeconds ?? body.duration_seconds;

        const { data, error } = await supabase
            .from('meditation_sessions')
            .insert({
                ...(body.id ? { id: body.id } : {}),
                user_id: user.id,
                topic_id: topicId,
                topic_name: topicName,
                started_at: startedAt,
                ...(body.endedAt || body.ended_at ? { ended_at: body.endedAt ?? body.ended_at } : {}),
                ...(durationSeconds !== undefined ? { duration_seconds: durationSeconds } : {}),
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH: End a session
export async function PATCH(req: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id } = body;
        const durationSeconds = body.durationSeconds ?? body.duration_seconds; // duration override (optional)

        // We will update ended_at and calculate duration if not provided
        // But for simplicity, let's trust client's duration or calculate it here?
        // Let's just set ended_at = now, and let client pass duration if they tracked it precisely (e.g. paused time excluded).
        // Since we don't have pause tracking in DB, trusting client duration is better for "effective" duration.

        const endedAt = body.endedAt ?? body.ended_at ?? new Date().toISOString();

        const updates: any = {
            ended_at: endedAt,
        };
        if (durationSeconds !== undefined) updates.duration_seconds = durationSeconds;

        const { data, error } = await supabase
            .from('meditation_sessions')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Delete all meditation sessions for the user
export async function DELETE(req: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const deleteAll = searchParams.get("all") === "true";

        if (deleteAll) {
            // 删除所有冥想记录
            const { error } = await supabase
                .from('meditation_sessions')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            return NextResponse.json({ success: true, message: "All meditation sessions deleted" });
        } else {
            return NextResponse.json({ error: "Missing ?all=true parameter" }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const runtime = 'edge';
