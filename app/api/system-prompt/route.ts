import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureTables, hasDb } from "@/lib/db";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const jar = await cookies();
    let uid = jar.get("uid")?.value || "";
    if (!hasDb()) {
      const res = new NextResponse("", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
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
      const res = new NextResponse("", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      return res;
    }
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    const rows = await sql`SELECT system_prompt FROM user_settings WHERE user_id = ${uid}`;
    const content = rows.rows?.[0]?.system_prompt || "";
    return new NextResponse(content, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch {
    return new NextResponse("", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

export async function POST(req: Request) {
  try {
    const jar = await cookies();
    let uid = jar.get("uid")?.value || "";
    if (!hasDb()) {
      const res = new NextResponse("ok", { status: 200 });
      if (!uid) {
        uid = crypto.randomUUID();
        res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      }
      return res;
    }
    await ensureTables();
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    const text = await req.text();
    await sql`INSERT INTO user_settings(user_id, system_prompt, updated_at) VALUES (${uid}, ${text || ""}, now())
      ON CONFLICT (user_id) DO UPDATE SET system_prompt = EXCLUDED.system_prompt, updated_at = now()`;
    const res = new NextResponse("ok", { status: 200 });
    if (!jar.get("uid")?.value) {
      res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    return res;
  } catch {
    return new NextResponse("error", { status: 500 });
  }
}

export const runtime = 'edge';
