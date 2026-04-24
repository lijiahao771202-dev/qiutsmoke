import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "tts-audio-cache";
const MAX_AUDIO_BYTES = 200 * 1024 * 1024;

function getAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase service role configuration");
    }

    return createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

async function getAuthenticatedUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
}

function getCacheKey(req: Request) {
    const url = new URL(req.url);
    const key = url.searchParams.get("key")?.trim();
    return key || null;
}

function cacheKeyToStoragePath(userId: string, cacheKey: string) {
    const encodedKey = Buffer.from(cacheKey, "utf8").toString("base64url");
    return {
        folder: userId,
        fileName: `${encodedKey}.wav`,
        path: `${userId}/${encodedKey}.wav`,
    };
}

function isNotFoundError(error: { message?: string; statusCode?: string | number } | null) {
    if (!error) return false;
    return error.statusCode === 404 || String(error.message || "").toLowerCase().includes("not found");
}

async function ensureBucket(adminClient: ReturnType<typeof getAdminClient>) {
    const { error: getError } = await adminClient.storage.getBucket(BUCKET_NAME);
    if (!getError) return;

    const { error: createError } = await adminClient.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: MAX_AUDIO_BYTES,
        allowedMimeTypes: ["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3"],
    } as any);

    if (createError && !isNotFoundError(createError)) {
        throw createError;
    }
}

async function requireUserAndKey(req: Request) {
    const user = await getAuthenticatedUser();
    if (!user) {
        return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) };
    }

    const cacheKey = getCacheKey(req);
    if (!cacheKey) {
        return { error: new Response(JSON.stringify({ error: "Missing cache key" }), { status: 400 }) };
    }

    return { user, cacheKey };
}

export async function HEAD(req: Request) {
    try {
        const result = await requireUserAndKey(req);
        if ("error" in result) return result.error;

        const adminClient = getAdminClient();
        const { folder, fileName } = cacheKeyToStoragePath(result.user.id, result.cacheKey);
        const { data, error } = await adminClient.storage
            .from(BUCKET_NAME)
            .list(folder, { limit: 1, search: fileName });

        if (error) {
            return new Response(null, { status: isNotFoundError(error) ? 404 : 500 });
        }

        const file = data?.find((item) => item.name === fileName);
        if (!file) return new Response(null, { status: 404 });

        return new Response(null, {
            status: 200,
            headers: {
                "x-audio-cache-size": String(file.metadata?.size || ""),
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        console.error("[TTS Cache HEAD]", error);
        return new Response(null, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const result = await requireUserAndKey(req);
        if ("error" in result) return result.error;

        const adminClient = getAdminClient();
        const { path } = cacheKeyToStoragePath(result.user.id, result.cacheKey);
        const { data, error } = await adminClient.storage.from(BUCKET_NAME).download(path);

        if (error || !data) {
            return new Response(JSON.stringify({ error: "Audio cache not found" }), {
                status: isNotFoundError(error) ? 404 : 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(data, {
            status: 200,
            headers: {
                "Content-Type": data.type || "audio/wav",
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error) {
        console.error("[TTS Cache GET]", error);
        return new Response(JSON.stringify({ error: "Failed to download audio cache" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

export async function PUT(req: Request) {
    try {
        const result = await requireUserAndKey(req);
        if ("error" in result) return result.error;

        const body = await req.arrayBuffer();
        if (body.byteLength === 0) {
            return new Response(JSON.stringify({ error: "Empty audio body" }), { status: 400 });
        }
        if (body.byteLength > MAX_AUDIO_BYTES) {
            return new Response(JSON.stringify({ error: "Audio cache too large" }), { status: 413 });
        }

        const adminClient = getAdminClient();
        await ensureBucket(adminClient);

        const { path } = cacheKeyToStoragePath(result.user.id, result.cacheKey);
        const contentType = req.headers.get("content-type") || "audio/wav";
        const { error } = await adminClient.storage
            .from(BUCKET_NAME)
            .upload(path, body, {
                contentType,
                cacheControl: "31536000",
                upsert: true,
            });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("[TTS Cache PUT]", error);
        return new Response(JSON.stringify({ error: "Failed to upload audio cache" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

export async function DELETE(req: Request) {
    try {
        const result = await requireUserAndKey(req);
        if ("error" in result) return result.error;

        const adminClient = getAdminClient();
        const { path } = cacheKeyToStoragePath(result.user.id, result.cacheKey);
        const { error } = await adminClient.storage.from(BUCKET_NAME).remove([path]);

        if (error && !isNotFoundError(error)) throw error;

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("[TTS Cache DELETE]", error);
        return new Response(JSON.stringify({ error: "Failed to delete audio cache" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
