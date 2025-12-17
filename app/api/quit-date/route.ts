import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureTables, hasDb } from "@/lib/db";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const jar = await cookies();
    let uid = jar.get("uid")?.value || "";
    if (!hasDb()) {
      const res = NextResponse.json({ quitDate: null }, { status: 200 });
      if (!uid) {
        uid = crypto.randomUUID();
        res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      }
      return res;
    }
    await ensureTables();
    if (!uid) {
      uid = crypto.randomUUID();
      await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
      const res = NextResponse.json({ quitDate: null }, { status: 200 });
      res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      return res;
    }
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    const rows = await sql`SELECT quit_date FROM user_settings WHERE user_id = ${uid}`;
    const d = rows.rows?.[0]?.quit_date || null;
    return NextResponse.json({ quitDate: d }, { status: 200 });
  } catch {
    return NextResponse.json({ quitDate: null }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const jar = await cookies();
    let uid = jar.get("uid")?.value || "";
    if (!hasDb()) {
      const res = NextResponse.json({ ok: true }, { status: 200 });
      if (!uid) {
        uid = crypto.randomUUID();
        res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      }
      return res;
    }
    await ensureTables();
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    const body = await req.json();
    const qd = body?.quitDate ? String(body.quitDate) : null;
    await sql`INSERT INTO user_settings(user_id, quit_date, updated_at) VALUES (${uid}, ${qd}, now())
      ON CONFLICT (user_id) DO UPDATE SET quit_date = EXCLUDED.quit_date, updated_at = now()`;
    const res = NextResponse.json({ ok: true }, { status: 200 });
    if (!jar.get("uid")?.value) {
      res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    return res;
  } catch {
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}

export const runtime = 'edge';
