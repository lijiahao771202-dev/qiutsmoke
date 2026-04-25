import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  isSupabaseStorageAlreadyExistsError,
  isSupabaseStorageMissingError,
} from "@/lib/supabase-storage-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "tts-card-synth-meta";
const MAX_META_BYTES = 128 * 1024;

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

function getCardId(req: Request) {
  const url = new URL(req.url);
  const cardId = url.searchParams.get("cardId")?.trim();
  return cardId || null;
}

function cardIdToStoragePath(userId: string, cardId: string) {
  const encodedId = Buffer.from(cardId, "utf8").toString("base64url");
  return {
    folder: userId,
    fileName: `${encodedId}.json`,
    path: `${userId}/${encodedId}.json`,
  };
}

async function ensureBucket(adminClient: ReturnType<typeof getAdminClient>) {
  const { error: getError } = await adminClient.storage.getBucket(BUCKET_NAME);
  if (!getError) return;

  const { error: createError } = await adminClient.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: MAX_META_BYTES,
    allowedMimeTypes: ["application/json"],
  } as any);

  if (
    createError &&
    !isSupabaseStorageMissingError(createError) &&
    !isSupabaseStorageAlreadyExistsError(createError)
  ) {
    throw createError;
  }
}

async function requireUserAndCardId(req: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) };
  }

  const cardId = getCardId(req);
  if (!cardId) {
    return { error: new Response(JSON.stringify({ error: "Missing cardId" }), { status: 400 }) };
  }

  return { user, cardId };
}

export async function GET(req: Request) {
  try {
    const result = await requireUserAndCardId(req);
    if ("error" in result) return result.error;

    const adminClient = getAdminClient();
    await ensureBucket(adminClient);

    const { path } = cardIdToStoragePath(result.user.id, result.cardId);
    const { data, error } = await adminClient.storage.from(BUCKET_NAME).download(path);

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Snapshot not found" }), {
        status: isSupabaseStorageMissingError(error) ? 404 : 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[TTS Card Synth GET]", error);
    return new Response(JSON.stringify({ error: "Failed to download synth snapshot" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(req: Request) {
  try {
    const result = await requireUserAndCardId(req);
    if ("error" in result) return result.error;

    const body = await req.text();
    if (!body.trim()) {
      return new Response(JSON.stringify({ error: "Empty snapshot body" }), { status: 400 });
    }
    if (Buffer.byteLength(body, "utf8") > MAX_META_BYTES) {
      return new Response(JSON.stringify({ error: "Snapshot too large" }), { status: 413 });
    }

    const adminClient = getAdminClient();
    await ensureBucket(adminClient);

    const { path } = cardIdToStoragePath(result.user.id, result.cardId);
    const { error } = await adminClient.storage.from(BUCKET_NAME).upload(path, body, {
      contentType: "application/json",
      cacheControl: "31536000",
      upsert: true,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[TTS Card Synth PUT]", error);
    return new Response(JSON.stringify({ error: "Failed to upload synth snapshot" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(req: Request) {
  try {
    const result = await requireUserAndCardId(req);
    if ("error" in result) return result.error;

    const adminClient = getAdminClient();
    const { path } = cardIdToStoragePath(result.user.id, result.cardId);
    const { error } = await adminClient.storage.from(BUCKET_NAME).remove([path]);

    if (error && !isSupabaseStorageMissingError(error)) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[TTS Card Synth DELETE]", error);
    return new Response(JSON.stringify({ error: "Failed to delete synth snapshot" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
