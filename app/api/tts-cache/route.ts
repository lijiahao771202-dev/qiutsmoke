import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  isSupabaseStorageAlreadyExistsError,
  isSupabaseStorageMissingError,
  isSupabaseStoragePayloadTooLargeError,
} from "@/lib/supabase-storage-errors";
import {
  TTS_AUDIO_CACHE_BUCKET,
  TTS_AUDIO_CACHE_MAX_BYTES,
  buildAudioCacheManifest,
  buildAudioCacheUploadMarker,
  cacheKeyToAudioStoragePaths,
  parseAudioCacheManifest,
  parseAudioCacheUploadMarker,
  shouldStoreAudioCacheInChunks,
  type TTSAudioCacheManifest,
} from "@/lib/tts-audio-cache-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = TTS_AUDIO_CACHE_BUCKET;
const MAX_AUDIO_BYTES = TTS_AUDIO_CACHE_MAX_BYTES;
const AUDIO_BUCKET_OPTIONS = {
  public: false,
  allowedMimeTypes: ["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3"],
};

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
  const key = url.searchParams.get("key")?.trim();
  return key || null;
}

async function ensureBucket(adminClient: ReturnType<typeof getAdminClient>) {
  const { error: getError } = await adminClient.storage.getBucket(BUCKET_NAME);
  if (!getError) return;

  const { error: createError } = await adminClient.storage.createBucket(BUCKET_NAME, {
    ...AUDIO_BUCKET_OPTIONS,
  } as any);

  if (
    createError &&
    !isSupabaseStorageMissingError(createError) &&
    !isSupabaseStorageAlreadyExistsError(createError)
  ) {
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

async function downloadManifest(
  adminClient: ReturnType<typeof getAdminClient>,
  manifestPath: string
) {
  const { data, error } = await adminClient.storage.from(BUCKET_NAME).download(manifestPath);
  if (error || !data) return { manifest: null, error };

  const manifest = parseAudioCacheManifest(await data.arrayBuffer());
  return { manifest, error: manifest ? null : new Error("Invalid audio cache manifest") };
}

async function hasFreshUploadMarker(
  adminClient: ReturnType<typeof getAdminClient>,
  uploadMarkerPath: string
) {
  const { data, error } = await adminClient.storage.from(BUCKET_NAME).download(uploadMarkerPath);
  if (error || !data) return false;

  return Boolean(parseAudioCacheUploadMarker(await data.arrayBuffer()));
}

async function writeUploadMarker(
  adminClient: ReturnType<typeof getAdminClient>,
  uploadMarkerPath: string,
  cacheKey: string
) {
  const marker = buildAudioCacheUploadMarker(cacheKey);
  const { error } = await adminClient.storage
    .from(BUCKET_NAME)
    .upload(uploadMarkerPath, Buffer.from(JSON.stringify(marker), "utf8"), {
      contentType: "audio/wav",
      cacheControl: "no-store",
      upsert: true,
    });

  if (error) {
    console.warn("[TTS Cache] Failed to write upload marker", error);
  }
}

async function removeUploadMarker(
  adminClient: ReturnType<typeof getAdminClient>,
  uploadMarkerPath: string
) {
  const { error } = await adminClient.storage.from(BUCKET_NAME).remove([uploadMarkerPath]);
  if (error && !isSupabaseStorageMissingError(error)) {
    console.warn("[TTS Cache] Failed to remove upload marker", error);
  }
}

async function removeChunkedCache(
  adminClient: ReturnType<typeof getAdminClient>,
  paths: ReturnType<typeof cacheKeyToAudioStoragePaths>,
  manifest: TTSAudioCacheManifest | null
) {
  if (!manifest) {
    await adminClient.storage.from(BUCKET_NAME).remove([paths.manifestPath]);
    return;
  }

  const chunkPaths = Array.from({ length: manifest.chunkCount }, (_, index) => paths.chunkPath(index));
  await adminClient.storage.from(BUCKET_NAME).remove([paths.manifestPath, ...chunkPaths]);
}

async function uploadChunkedAudioCache(
  adminClient: ReturnType<typeof getAdminClient>,
  userId: string,
  cacheKey: string,
  body: Buffer,
  contentType: string
) {
  const paths = cacheKeyToAudioStoragePaths(userId, cacheKey);
  const previousManifest = await downloadManifest(adminClient, paths.manifestPath);
  const manifest = buildAudioCacheManifest(cacheKey, contentType, body.byteLength);

  for (let index = 0; index < manifest.chunkCount; index += 1) {
    const start = index * manifest.chunkBytes;
    const end = Math.min(start + manifest.chunkBytes, body.byteLength);
    const { error } = await adminClient.storage.from(BUCKET_NAME).upload(
      paths.chunkPath(index),
      body.slice(start, end),
      {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      }
    );
    if (error) throw error;
  }

  const { error: manifestError } = await adminClient.storage
    .from(BUCKET_NAME)
    .upload(paths.manifestPath, Buffer.from(JSON.stringify(manifest), "utf8"), {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });
  if (manifestError) throw manifestError;

  await adminClient.storage.from(BUCKET_NAME).remove([paths.fullPath]);

  if (previousManifest.manifest && previousManifest.manifest.chunkCount > manifest.chunkCount) {
    const staleChunks = Array.from(
      { length: previousManifest.manifest.chunkCount - manifest.chunkCount },
      (_, offset) => paths.chunkPath(manifest.chunkCount + offset)
    );
    await adminClient.storage.from(BUCKET_NAME).remove(staleChunks);
  }
}

async function downloadChunkedAudioCache(
  adminClient: ReturnType<typeof getAdminClient>,
  paths: ReturnType<typeof cacheKeyToAudioStoragePaths>
) {
  const { manifest, error } = await downloadManifest(adminClient, paths.manifestPath);
  if (error || !manifest) return { blob: null, manifest, error };

  const chunks: Blob[] = [];
  for (let index = 0; index < manifest.chunkCount; index += 1) {
    const { data, error: chunkError } = await adminClient.storage
      .from(BUCKET_NAME)
      .download(paths.chunkPath(index));
    if (chunkError || !data) return { blob: null, manifest, error: chunkError };
    chunks.push(data);
  }

  return { blob: new Blob(chunks, { type: manifest.contentType || "audio/wav" }), manifest, error: null };
}

export async function HEAD(req: Request) {
  try {
    const result = await requireUserAndKey(req);
    if ("error" in result) return result.error;

    const adminClient = getAdminClient();
    await ensureBucket(adminClient);

    const paths = cacheKeyToAudioStoragePaths(result.user.id, result.cacheKey);
    const { data, error } = await adminClient.storage
      .from(BUCKET_NAME)
      .list(paths.folder, { limit: 1, search: paths.fileName });

    if (error) {
      return new Response(null, { status: isSupabaseStorageMissingError(error) ? 404 : 500 });
    }

    const file = data?.find((item) => item.name === paths.fileName);
    if (!file) {
      const { manifest } = await downloadManifest(adminClient, paths.manifestPath);
      if (!manifest) {
        const isUploading = await hasFreshUploadMarker(adminClient, paths.uploadMarkerPath);
        if (isUploading) {
          return new Response(null, {
            status: 202,
            headers: {
              "x-audio-cache-status": "syncing",
              "Cache-Control": "private, no-store",
            },
          });
        }

        return new Response(null, { status: 404 });
      }

      return new Response(null, {
        status: 200,
        headers: {
          "x-audio-cache-size": String(manifest.byteLength),
          "Cache-Control": "private, no-store",
        },
      });
    }

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
    await ensureBucket(adminClient);

    const paths = cacheKeyToAudioStoragePaths(result.user.id, result.cacheKey);
    const { data, error } = await adminClient.storage.from(BUCKET_NAME).download(paths.fullPath);

    if (!error && data) {
      return new Response(data, {
        status: 200,
        headers: {
          "Content-Type": data.type || "audio/wav",
          "Cache-Control": "private, no-store",
        },
      });
    }

    if (!isSupabaseStorageMissingError(error)) {
      return new Response(JSON.stringify({ error: "Audio cache not found" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const chunked = await downloadChunkedAudioCache(adminClient, paths);
    if (!chunked.blob) {
      return new Response(JSON.stringify({ error: "Audio cache not found" }), {
        status: isSupabaseStorageMissingError(chunked.error) ? 404 : 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(chunked.blob, {
      status: 200,
      headers: {
        "Content-Type": chunked.blob.type || "audio/wav",
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

    const body = Buffer.from(await req.arrayBuffer());
    if (body.byteLength === 0) {
      return new Response(JSON.stringify({ error: "Empty audio body" }), { status: 400 });
    }
    if (body.byteLength > MAX_AUDIO_BYTES) {
      return new Response(JSON.stringify({ error: "Audio cache too large" }), { status: 413 });
    }

    const adminClient = getAdminClient();
    await ensureBucket(adminClient);

    const contentType = req.headers.get("content-type") || "audio/wav";
    const paths = cacheKeyToAudioStoragePaths(result.user.id, result.cacheKey);
    const { manifest: staleManifest } = await downloadManifest(adminClient, paths.manifestPath);

    await writeUploadMarker(adminClient, paths.uploadMarkerPath, result.cacheKey);
    try {
      if (shouldStoreAudioCacheInChunks(body.byteLength)) {
        await uploadChunkedAudioCache(
          adminClient,
          result.user.id,
          result.cacheKey,
          body,
          contentType
        );
      } else {
        const { error } = await adminClient.storage.from(BUCKET_NAME).upload(paths.fullPath, body, {
          contentType,
          cacheControl: "31536000",
          upsert: true,
        });

        if (error) {
          if (isSupabaseStoragePayloadTooLargeError(error)) {
            await uploadChunkedAudioCache(
              adminClient,
              result.user.id,
              result.cacheKey,
              body,
              contentType
            );
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          } else {
            throw error;
          }
        }

        await removeChunkedCache(adminClient, paths, staleManifest);
      }
    } finally {
      await removeUploadMarker(adminClient, paths.uploadMarkerPath);
    }

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
    await ensureBucket(adminClient);

    const paths = cacheKeyToAudioStoragePaths(result.user.id, result.cacheKey);
    const { manifest } = await downloadManifest(adminClient, paths.manifestPath);
    await removeChunkedCache(adminClient, paths, manifest);

    const { error } = await adminClient.storage.from(BUCKET_NAME).remove([paths.fullPath]);

    if (error && !isSupabaseStorageMissingError(error)) throw error;

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
