import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureTables, hasDb } from "@/lib/db";
import { sql } from "@vercel/postgres";
import { normalizeAISettings } from "@/lib/ai-models";

async function ensureUid() {
  const jar = await cookies();
  const existingUid = jar.get("uid")?.value || "";

  if (existingUid) {
    return { jar, uid: existingUid, created: false };
  }

  return { jar, uid: crypto.randomUUID(), created: true };
}

export async function GET() {
  try {
    const { jar, uid, created } = await ensureUid();
    const cookieSettings = normalizeAISettings({
      provider: jar.get("ai_provider")?.value,
      model: jar.get("ai_model")?.value,
    });

    if (!hasDb()) {
      const res = NextResponse.json(cookieSettings, { status: 200 });
      if (created) {
        res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      }
      return res;
    }

    await ensureTables();
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    const rows = await sql`SELECT ai_provider, ai_model FROM user_settings WHERE user_id = ${uid}`;
    const settings = normalizeAISettings({
      provider: jar.get("ai_provider")?.value || rows.rows?.[0]?.ai_provider,
      model: jar.get("ai_model")?.value || rows.rows?.[0]?.ai_model,
    });

    const res = NextResponse.json(settings, { status: 200 });
    if (created) {
      res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    return res;
  } catch (error) {
    console.error("GET ai-settings error:", error);
    return NextResponse.json(normalizeAISettings({}), { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const { uid, jar, created } = await ensureUid();
    const body = await req.json().catch(() => ({}));
    const settings = normalizeAISettings({
      provider: body?.provider,
      model: body?.model,
    });

    if (!hasDb()) {
      const res = NextResponse.json({ ok: true, ...settings }, { status: 200 });
      if (created || !jar.get("uid")?.value) {
        res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      }
      res.cookies.set("ai_provider", settings.provider, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      res.cookies.set("ai_model", settings.model, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      return res;
    }

    await ensureTables();
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    await sql`
      INSERT INTO user_settings(user_id, ai_provider, ai_model, updated_at)
      VALUES (${uid}, ${settings.provider}, ${settings.model}, now())
      ON CONFLICT (user_id) DO UPDATE
      SET ai_provider = EXCLUDED.ai_provider,
          ai_model = EXCLUDED.ai_model,
          updated_at = now()
    `;

    const res = NextResponse.json({ ok: true, ...settings }, { status: 200 });
    res.cookies.set("ai_provider", settings.provider, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    res.cookies.set("ai_model", settings.model, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    if (created || !jar.get("uid")?.value) {
      res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    return res;
  } catch (error) {
    console.error("POST ai-settings error:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}

export const runtime = "edge";
