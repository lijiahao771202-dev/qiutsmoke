import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  buildAudioCacheManifest,
  cacheKeyToAudioStoragePaths,
  TTS_AUDIO_CACHE_BUCKET,
  TTS_AUDIO_CACHE_MAX_BYTES,
} from "@/lib/tts-audio-cache-storage";
import {
  isSupabaseStorageAlreadyExistsError,
  isSupabaseStorageMissingError,
  isSupabaseStoragePayloadTooLargeError,
} from "@/lib/supabase-storage-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

function getCacheKey(req: Request) {
  const url = new URL(req.url);
  const cacheKey = url.searchParams.get("cacheKey")?.trim();
  return cacheKey || null;
}

async function ensureBucket(adminClient: ReturnType<typeof getAdminClient>) {
  const { error: getError } = await adminClient.storage.getBucket(TTS_AUDIO_CACHE_BUCKET);
  if (!getError) return;

  const { error: createError } = await adminClient.storage.createBucket(TTS_AUDIO_CACHE_BUCKET, {
    public: false,
    fileSizeLimit: TTS_AUDIO_CACHE_MAX_BYTES,
    allowedMimeTypes: [
      "audio/wav",
      "audio/x-wav",
      "audio/mpeg",
      "audio/mp4",
      "audio/webm",
      "application/json",
    ],
  } as any);

  if (
    createError &&
    !isSupabaseStorageMissingError(createError) &&
    !isSupabaseStorageAlreadyExistsError(createError)
  ) {
    throw createError;
  }
}

async function requireUserAndCacheKey(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) };
  }

  const cacheKey = getCacheKey(req);
  if (!cacheKey) {
    return { error: new Response(JSON.stringify({ error: "Missing cacheKey" }), { status: 400 }) };
  }

  return { user, cacheKey };
}

export async function GET(req: Request) {
  try {
    const result = await requireUserAndCacheKey(req);
    if ("error" in result) return result.error;

    const adminClient = getAdminClient();
    await ensureBucket(adminClient);

    const { fullPath } = cacheKeyToAudioStoragePaths(result.user.id, result.cacheKey);
    const { data, error } = await adminClient.storage.from(TTS_AUDIO_CACHE_BUCKET).download(fullPath);

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Audio cache not found" }), {
        status: isSupabaseStorageMissingError(error) ? 404 : 500,
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
    console.error("[TTSAudioCache GET]", error);
    return new Response(JSON.stringify({ error: "Failed to download audio cache" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(req: Request) {
  try {
    const result = await requireUserAndCacheKey(req);
    if ("error" in result) return result.error;

    const arrayBuffer = await req.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;
    if (byteLength <= 0) {
      return new Response(JSON.stringify({ error: "Empty audio body" }), { status: 400 });
    }
    if (byteLength > TTS_AUDIO_CACHE_MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Audio cache too large" }), { status: 413 });
    }

    const contentType = req.headers.get("content-type")?.trim() || "audio/wav";
    const blob = new Blob([arrayBuffer], { type: contentType });
    const manifest = buildAudioCacheManifest(result.cacheKey, contentType, byteLength);

    const adminClient = getAdminClient();
    await ensureBucket(adminClient);

    const { fullPath, manifestPath } = cacheKeyToAudioStoragePaths(result.user.id, result.cacheKey);
    const storage = adminClient.storage.from(TTS_AUDIO_CACHE_BUCKET);

    const { error: audioError } = await storage.upload(fullPath, blob, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });
    if (audioError) {
      if (isSupabaseStoragePayloadTooLargeError(audioError)) {
        return new Response(JSON.stringify({ error: "Audio cache too large" }), { status: 413 });
      }
      throw audioError;
    }

    const { error: manifestError } = await storage.upload(
      manifestPath,
      JSON.stringify(manifest),
      {
        contentType: "application/json",
        cacheControl: "31536000",
        upsert: true,
      },
    );
    if (manifestError) throw manifestError;

    return new Response(JSON.stringify({ success: true, byteLength }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[TTSAudioCache PUT]", error);
    return new Response(JSON.stringify({ error: "Failed to upload audio cache" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(req: Request) {
  try {
    const result = await requireUserAndCacheKey(req);
    if ("error" in result) return result.error;

    const adminClient = getAdminClient();
    const { fullPath, manifestPath, uploadMarkerPath } = cacheKeyToAudioStoragePaths(
      result.user.id,
      result.cacheKey,
    );
    const { error } = await adminClient
      .storage
      .from(TTS_AUDIO_CACHE_BUCKET)
      .remove([fullPath, manifestPath, uploadMarkerPath]);

    if (error && !isSupabaseStorageMissingError(error)) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[TTSAudioCache DELETE]", error);
    return new Response(JSON.stringify({ error: "Failed to delete audio cache" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
