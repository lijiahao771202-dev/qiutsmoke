import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureTables, hasDb } from "@/lib/db";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const jar = await cookies();
    let uid = jar.get("uid")?.value || "";
    if (!hasDb()) {
      const res = NextResponse.json({}, { status: 200 });
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
      const res = NextResponse.json({}, { status: 200 });
      res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      return res;
    }
    const res = await sql`SELECT topic_id, prompt FROM user_prompts WHERE user_id = ${uid}`;
    const obj: Record<string, string> = {};
    for (const row of res.rows || []) {
      obj[String(row.topic_id)] = String(row.prompt ?? "");
    }
    return NextResponse.json(obj, { status: 200 });
  } catch {
    return NextResponse.json({}, { status: 200 });
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
    const body = await req.json();
    const { id, prompt } = body;
    if (!id && body && typeof body === "object") {
      await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
      for (const [topicId, promptValue] of Object.entries(body)) {
        if (typeof promptValue !== "string") continue;
        await sql`INSERT INTO user_prompts(user_id, topic_id, prompt, updated_at) VALUES (${uid}, ${String(topicId)}, ${promptValue}, now())
          ON CONFLICT (user_id, topic_id) DO UPDATE SET prompt = EXCLUDED.prompt, updated_at = now()`;
      }
      const res = NextResponse.json({ ok: true }, { status: 200 });
      if (!jar.get("uid")?.value) {
        res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      }
      return res;
    }
    if (!id || typeof prompt !== "string") {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    await sql`INSERT INTO user_prompts(user_id, topic_id, prompt, updated_at) VALUES (${uid}, ${String(id)}, ${prompt}, now())
      ON CONFLICT (user_id, topic_id) DO UPDATE SET prompt = EXCLUDED.prompt, updated_at = now()`;
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
