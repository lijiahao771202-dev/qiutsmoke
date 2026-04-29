
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If not logged in, maybe return default topics? 
    // Or just empty list. For now, let's enforce auth or return empty.
    if (authError || !user) {
        // Optionally return default public cards here if we had a public flag
        return NextResponse.json([]);
    }

    const { data, error } = await supabase
        .from('meditation_topics')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
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
        const body = await req.json();
        const { title, prompt, icon_name, color_from, color_to } = body;

        if (!title || !prompt) {
            return NextResponse.json({ error: "Title and Prompt are required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('meditation_topics')
            .insert({
                ...(body.id ? { id: body.id } : {}),
                user_id: user.id,
                title,
                prompt,
                icon_name: icon_name || 'wind',
                color_from: color_from || 'rose-400',
                color_to: color_to || 'rose-600'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
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
        .from('meditation_topics')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export const runtime = 'edge';
