/**
 * TTS Cards API Route (Node.js Direct Implementation)
 * 
 * Simplified for Vercel deployment stability.
 * Uses Node.js runtime to ensure stable Supabase connection and environment variable access.
 */

import { createClient } from '@supabase/supabase-js';

// Force Node.js runtime for stability
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[TTS Cards] Missing configuration:', {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        });
        throw new Error('Missing Supabase configuration');
    }

    return createClient(supabaseUrl, supabaseKey);
}

export async function GET(req: Request) {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('tts_cards')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[TTS Cards GET] DB Error:', error);
            throw error;
        }

        return new Response(JSON.stringify(data || []), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (error) {
        console.error('[TTS Cards GET] System Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to fetch cards',
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = getSupabaseClient();
        const body = await req.json();
        const { content, voiceId, rate } = body;

        // Validation
        if (!content) return new Response(JSON.stringify({ error: 'Content is required' }), { status: 400 });

        const { data, error } = await supabase
            .from('tts_cards')
            .insert({
                content,
                voice_id: voiceId || 'zh-CN-XiaohanNeural',
                rate: rate || '0%'
            })
            .select()
            .single();

        if (error) {
            console.error('[TTS Cards POST] DB Error:', error);
            throw error;
        }

        return new Response(JSON.stringify(data), {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('[TTS Cards POST] System Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to create card',
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function DELETE(req: Request) {
    try {
        const supabase = getSupabaseClient();
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });

        const { error } = await supabase.from('tts_cards').delete().eq('id', id);

        if (error) {
            console.error('[TTS Cards DELETE] DB Error:', error);
            throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('[TTS Cards DELETE] System Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to delete card',
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = getSupabaseClient();
        const body = await req.json();
        const { id, title, content, voiceId, rate } = body;

        if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });

        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (voiceId !== undefined) updates.voice_id = voiceId;
        if (rate !== undefined) updates.rate = rate;

        const { data, error } = await supabase
            .from('tts_cards')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[TTS Cards PATCH] DB Error:', error);
            throw error;
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('[TTS Cards PATCH] System Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to update card',
            details: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
