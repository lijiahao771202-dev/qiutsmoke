import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureTables, hasDb } from "@/lib/db";
import { normalizeTTSSettings } from "@/lib/tts-settings";

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
    const cookieSettings = normalizeTTSSettings({
      provider: jar.get("tts_provider")?.value,
      cosyvoiceSpeed: jar.get("cosyvoice_speed")?.value,
      cosyvoiceInstruction: jar.get("cosyvoice_instruction")?.value,
      cosyvoiceSeed: jar.get("cosyvoice_seed")?.value,
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
    const rows = await sql`
      SELECT tts_provider, cosyvoice_speed, cosyvoice_instruction, cosyvoice_seed
      FROM user_settings
      WHERE user_id = ${uid}
    `;
    const settings = normalizeTTSSettings({
      provider: jar.get("tts_provider")?.value || rows.rows?.[0]?.tts_provider,
      cosyvoiceSpeed: jar.get("cosyvoice_speed")?.value || rows.rows?.[0]?.cosyvoice_speed,
      cosyvoiceInstruction:
        jar.get("cosyvoice_instruction")?.value || rows.rows?.[0]?.cosyvoice_instruction,
      cosyvoiceSeed: jar.get("cosyvoice_seed")?.value || rows.rows?.[0]?.cosyvoice_seed,
    });

    const res = NextResponse.json(settings, { status: 200 });
    if (created) {
      res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    return res;
  } catch (error) {
    console.error("GET tts-settings error:", error);
    return NextResponse.json(normalizeTTSSettings({}), { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const { uid, jar, created } = await ensureUid();
    const body = await req.json().catch(() => ({}));
    const settings = normalizeTTSSettings({
      provider: body?.provider,
      cosyvoiceSpeed: body?.cosyvoiceSpeed,
      cosyvoiceInstruction: body?.cosyvoiceInstruction,
      cosyvoiceSeed: body?.cosyvoiceSeed,
    });

    if (!hasDb()) {
      const res = NextResponse.json({ ok: true, ...settings }, { status: 200 });
      if (created || !jar.get("uid")?.value) {
        res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      }
      res.cookies.set("tts_provider", settings.provider, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      res.cookies.set("cosyvoice_speed", String(settings.cosyvoiceSpeed), { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      res.cookies.set("cosyvoice_instruction", settings.cosyvoiceInstruction, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      res.cookies.set("cosyvoice_seed", String(settings.cosyvoiceSeed), { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      return res;
    }

    await ensureTables();
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    await sql`
      INSERT INTO user_settings(user_id, tts_provider, cosyvoice_speed, cosyvoice_instruction, cosyvoice_seed, updated_at)
      VALUES (
        ${uid},
        ${settings.provider},
        ${settings.cosyvoiceSpeed},
        ${settings.cosyvoiceInstruction},
        ${settings.cosyvoiceSeed},
        now()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET tts_provider = EXCLUDED.tts_provider,
          cosyvoice_speed = EXCLUDED.cosyvoice_speed,
          cosyvoice_instruction = EXCLUDED.cosyvoice_instruction,
          cosyvoice_seed = EXCLUDED.cosyvoice_seed,
          updated_at = now()
    `;

    const res = NextResponse.json({ ok: true, ...settings }, { status: 200 });
    res.cookies.set("tts_provider", settings.provider, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    res.cookies.set("cosyvoice_speed", String(settings.cosyvoiceSpeed), { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    res.cookies.set("cosyvoice_instruction", settings.cosyvoiceInstruction, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    res.cookies.set("cosyvoice_seed", String(settings.cosyvoiceSeed), { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    if (created || !jar.get("uid")?.value) {
      res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    return res;
  } catch (error) {
    console.error("POST tts-settings error:", error);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}

export const runtime = "edge";
