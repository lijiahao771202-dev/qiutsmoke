import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();

    // Check auth (Optional: RLS handles security, but good to fail fast)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('tts_cards')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(req: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { title, content, voiceId, rate } = await req.json();
        if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });

        const { error } = await supabase
            .from('tts_cards')
            .insert({
                user_id: user.id,
                title: title || "无标题",
                content,
                voice_id: voiceId,
                rate: rate || "0%"
            });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Supabase POST Error:", error);
        return NextResponse.json({ error: error.message || "Failed to create card" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await supabase
        .from('tts_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Double check ownership, though RLS does this too

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, title, content, voiceId, rate } = await req.json();
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (voiceId !== undefined) updates.voice_id = voiceId;
        if (rate !== undefined) updates.rate = rate;

        const { error } = await supabase
            .from('tts_cards')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Supabase PATCH Error:", error);
        return NextResponse.json({ error: error.message || "Failed to update card" }, { status: 500 });
    }
}


// export const runtime = 'edge'; // Disabled for stability
