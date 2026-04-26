import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  isSupabaseStorageAlreadyExistsError,
  isSupabaseStorageMissingError,
} from "@/lib/supabase-storage-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET_NAME = "tts-card-synth-versions";
const MAX_META_BYTES = 256 * 1024;

type VersionPayload = {
  id: string;
  cardId: string;
  cacheKey: string;
  synthesizedAt: string;
  snapshot: Record<string, unknown>;
  modelLabel: string;
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

function getCardId(req: Request) {
  const url = new URL(req.url);
  const cardId = url.searchParams.get("cardId")?.trim();
  return cardId || null;
}

function getCacheKey(req: Request) {
  const url = new URL(req.url);
  const cacheKey = url.searchParams.get("cacheKey")?.trim();
  return cacheKey || null;
}

function cardIdToStoragePath(userId: string, cardId: string) {
  const encodedId = Buffer.from(cardId, "utf8").toString("base64url");
  return `${userId}/${encodedId}.json`;
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

function isVersionPayload(value: unknown): value is VersionPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<VersionPayload>;
  return (
    typeof payload.id === "string" &&
    typeof payload.cardId === "string" &&
    typeof payload.cacheKey === "string" &&
    typeof payload.synthesizedAt === "string" &&
    typeof payload.modelLabel === "string" &&
    !!payload.snapshot &&
    typeof payload.snapshot === "object"
  );
}

function sortVersionsByNewest(versions: VersionPayload[]) {
  return [...versions].sort((left, right) => {
    const leftTime = Date.parse(left.synthesizedAt);
    const rightTime = Date.parse(right.synthesizedAt);

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return rightTime - leftTime;
  });
}

async function readVersionList(adminClient: ReturnType<typeof getAdminClient>, userId: string, cardId: string) {
  const storage = adminClient.storage.from(BUCKET_NAME);
  const path = cardIdToStoragePath(userId, cardId);
  const { data, error } = await storage.download(path);

  if (error || !data) {
    if (isSupabaseStorageMissingError(error)) return [] as VersionPayload[];
    throw error;
  }

  const parsed = await data.text().then((text) => JSON.parse(text) as unknown).catch(() => []);
  return Array.isArray(parsed)
    ? sortVersionsByNewest(parsed.filter(isVersionPayload))
    : [];
}

async function writeVersionList(
  adminClient: ReturnType<typeof getAdminClient>,
  userId: string,
  cardId: string,
  versions: VersionPayload[],
) {
  const body = JSON.stringify(sortVersionsByNewest(versions));
  if (Buffer.byteLength(body, "utf8") > MAX_META_BYTES) {
    throw new Error("Version list too large");
  }

  const storage = adminClient.storage.from(BUCKET_NAME);
  const path = cardIdToStoragePath(userId, cardId);
  const { error } = await storage.upload(path, body, {
    contentType: "application/json",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw error;
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

    const versions = await readVersionList(adminClient, result.user.id, result.cardId);
    return new Response(JSON.stringify(versions), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[TTSCardSynthVersions GET]", error);
    return new Response(JSON.stringify({ error: "Failed to download synth versions" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(req: Request) {
  try {
    const result = await requireUserAndCardId(req);
    if ("error" in result) return result.error;

    const payload = (await req.json().catch(() => null)) as unknown;
    if (!isVersionPayload(payload) || payload.cardId !== result.cardId) {
      return new Response(JSON.stringify({ error: "Invalid version payload" }), { status: 400 });
    }

    const adminClient = getAdminClient();
    await ensureBucket(adminClient);

    const currentVersions = await readVersionList(adminClient, result.user.id, result.cardId);
    const merged = [
      payload,
      ...currentVersions.filter((version) => version.cacheKey !== payload.cacheKey),
    ];
    await writeVersionList(adminClient, result.user.id, result.cardId, merged);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[TTSCardSynthVersions PUT]", error);
    return new Response(JSON.stringify({ error: "Failed to upload synth version" }), {
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
    await ensureBucket(adminClient);
    const cacheKey = getCacheKey(req);

    if (!cacheKey) {
      const path = cardIdToStoragePath(result.user.id, result.cardId);
      const { error } = await adminClient.storage.from(BUCKET_NAME).remove([path]);
      if (error && !isSupabaseStorageMissingError(error)) throw error;
    } else {
      const currentVersions = await readVersionList(adminClient, result.user.id, result.cardId);
      const nextVersions = currentVersions.filter((version) => version.cacheKey !== cacheKey);
      if (nextVersions.length === 0) {
        const path = cardIdToStoragePath(result.user.id, result.cardId);
        const { error } = await adminClient.storage.from(BUCKET_NAME).remove([path]);
        if (error && !isSupabaseStorageMissingError(error)) throw error;
      } else {
        await writeVersionList(adminClient, result.user.id, result.cardId, nextVersions);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[TTSCardSynthVersions DELETE]", error);
    return new Response(JSON.stringify({ error: "Failed to delete synth version" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
