
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
        const { topicId, topicName } = await req.json();

        const { data, error } = await supabase
            .from('meditation_sessions')
            .insert({
                user_id: user.id,
                topic_id: topicId,
                topic_name: topicName,
                started_at: new Date().toISOString(),
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
        const { id, durationSeconds } = await req.json(); // duration override (optional) or calc from ended_at - started_at

        // We will update ended_at and calculate duration if not provided
        // But for simplicity, let's trust client's duration or calculate it here?
        // Let's just set ended_at = now, and let client pass duration if they tracked it precisely (e.g. paused time excluded).
        // Since we don't have pause tracking in DB, trusting client duration is better for "effective" duration.

        const endedAt = new Date().toISOString();

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

// export const runtime = 'edge'; // Disabled for stability
