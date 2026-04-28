import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureTables, hasDb } from "@/lib/db";
import { normalizeTTSSettings, type TTSSettings } from "@/lib/tts-settings";

async function ensureUid() {
  const jar = await cookies();
  const existingUid = jar.get("uid")?.value || "";

  if (existingUid) {
    return { jar, uid: existingUid, created: false };
  }

  return { jar, uid: crypto.randomUUID(), created: true };
}

function readCookieSettings(jar: Awaited<ReturnType<typeof cookies>>) {
  return normalizeTTSSettings({
    provider: jar.get("tts_provider")?.value,
    cosyvoiceSpeed: jar.get("cosyvoice_speed")?.value,
    cosyvoiceInstruction: jar.get("cosyvoice_instruction")?.value,
    cosyvoiceSeed: jar.get("cosyvoice_seed")?.value,
    cosyvoiceVoiceId: jar.get("cosyvoice_voice_id")?.value,
    qwenTTSModel: jar.get("qwen_tts_model")?.value,
    qwenTTSVoice: jar.get("qwen_tts_voice")?.value,
    qwenTTSVoiceMode: jar.get("qwen_tts_voice_mode")?.value,
    qwenTTSCloneVoiceId: jar.get("qwen_tts_clone_voice_id")?.value,
    qwenTTSCloneVoiceCloudId: jar.get("qwen_tts_clone_voice_cloud_id")?.value,
    qwenTTSSpeed: jar.get("qwen_tts_speed")?.value,
    qwenTTSLanguageType: jar.get("qwen_tts_language_type")?.value,
    qwenTTSInstructions: jar.get("qwen_tts_instructions")?.value,
    cosyvoice35PlusModel: jar.get("cosyvoice_35_plus_model")?.value,
    cosyvoice35PlusVoiceId: jar.get("cosyvoice_35_plus_voice_id")?.value,
    cosyvoice35FlashVoiceId: jar.get("cosyvoice_35_flash_voice_id")?.value,
    cosyvoice35PlusVoiceProfileId: jar.get("cosyvoice_35_plus_voice_profile_id")?.value,
    cosyvoice35PlusSpeed: jar.get("cosyvoice_35_plus_speed")?.value,
    cosyvoice35PlusInstruction: jar.get("cosyvoice_35_plus_instruction")?.value,
    cosyvoice35PlusLanguageHint: jar.get("cosyvoice_35_plus_language_hint")?.value,
  });
}

function getEnvVoiceId(prefix: "COSYVOICE_35_PLUS" | "COSYVOICE_35_FLASH", profileId: string) {
  const profileKey = `${prefix}_${profileId.toUpperCase()}_VOICE_ID`;
  return process.env[profileKey] || process.env[`${prefix}_VOICE_ID`] || "";
}

function applyServerVoiceDefaults(settings: TTSSettings): TTSSettings {
  return {
    ...settings,
    cosyvoice35PlusVoiceId:
      settings.cosyvoice35PlusVoiceId || getEnvVoiceId("COSYVOICE_35_PLUS", settings.cosyvoice35PlusVoiceProfileId),
    cosyvoice35FlashVoiceId:
      settings.cosyvoice35FlashVoiceId || getEnvVoiceId("COSYVOICE_35_FLASH", settings.cosyvoice35PlusVoiceProfileId),
  };
}

function setTTSCookies(res: NextResponse, settings: ReturnType<typeof normalizeTTSSettings>) {
  const maxAge = 60 * 60 * 24 * 365 * 5;
  res.cookies.set("tts_provider", settings.provider, { path: "/", maxAge });
  res.cookies.set("cosyvoice_speed", String(settings.cosyvoiceSpeed), { path: "/", maxAge });
  res.cookies.set("cosyvoice_instruction", settings.cosyvoiceInstruction, { path: "/", maxAge });
  res.cookies.set("cosyvoice_seed", String(settings.cosyvoiceSeed), { path: "/", maxAge });
  res.cookies.set("cosyvoice_voice_id", settings.cosyvoiceVoiceId, { path: "/", maxAge });
  res.cookies.set("qwen_tts_model", settings.qwenTTSModel, { path: "/", maxAge });
  res.cookies.set("qwen_tts_voice", settings.qwenTTSVoice, { path: "/", maxAge });
  res.cookies.set("qwen_tts_voice_mode", settings.qwenTTSVoiceMode, { path: "/", maxAge });
  res.cookies.set("qwen_tts_clone_voice_id", settings.qwenTTSCloneVoiceId, { path: "/", maxAge });
  res.cookies.set("qwen_tts_clone_voice_cloud_id", settings.qwenTTSCloneVoiceCloudId, { path: "/", maxAge });
  res.cookies.set("qwen_tts_speed", String(settings.qwenTTSSpeed), { path: "/", maxAge });
  res.cookies.set("qwen_tts_language_type", settings.qwenTTSLanguageType, { path: "/", maxAge });
  res.cookies.set("qwen_tts_instructions", settings.qwenTTSInstructions, { path: "/", maxAge });
  res.cookies.set("cosyvoice_35_plus_model", settings.cosyvoice35PlusModel, { path: "/", maxAge });
  res.cookies.set("cosyvoice_35_plus_voice_id", settings.cosyvoice35PlusVoiceId, { path: "/", maxAge });
  res.cookies.set("cosyvoice_35_flash_voice_id", settings.cosyvoice35FlashVoiceId, { path: "/", maxAge });
  res.cookies.set("cosyvoice_35_plus_voice_profile_id", settings.cosyvoice35PlusVoiceProfileId, {
    path: "/",
    maxAge,
  });
  res.cookies.set("cosyvoice_35_plus_speed", String(settings.cosyvoice35PlusSpeed), { path: "/", maxAge });
  res.cookies.set("cosyvoice_35_plus_instruction", settings.cosyvoice35PlusInstruction, {
    path: "/",
    maxAge,
  });
  res.cookies.set("cosyvoice_35_plus_language_hint", settings.cosyvoice35PlusLanguageHint, {
    path: "/",
    maxAge,
  });
}

export async function GET() {
  try {
    const { jar, uid, created } = await ensureUid();
    const cookieSettings = applyServerVoiceDefaults(readCookieSettings(jar));

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
      SELECT
        tts_provider,
        cosyvoice_speed,
        cosyvoice_instruction,
        cosyvoice_seed,
        cosyvoice_voice_id,
        qwen_tts_model,
        qwen_tts_voice,
        qwen_tts_voice_mode,
        qwen_tts_clone_voice_id,
        qwen_tts_clone_voice_cloud_id,
        qwen_tts_speed,
        qwen_tts_language_type,
        qwen_tts_instructions,
        cosyvoice_35_plus_model,
        cosyvoice_35_plus_voice_id,
        cosyvoice_35_flash_voice_id,
        cosyvoice_35_plus_voice_profile_id,
        cosyvoice_35_plus_speed,
        cosyvoice_35_plus_instruction,
        cosyvoice_35_plus_language_hint
      FROM user_settings
      WHERE user_id = ${uid}
    `;

    const row = rows.rows?.[0] || {};
    const settings = applyServerVoiceDefaults(normalizeTTSSettings({
      provider: jar.get("tts_provider")?.value || row.tts_provider,
      cosyvoiceSpeed: jar.get("cosyvoice_speed")?.value || row.cosyvoice_speed,
      cosyvoiceInstruction: jar.get("cosyvoice_instruction")?.value || row.cosyvoice_instruction,
      cosyvoiceSeed: jar.get("cosyvoice_seed")?.value || row.cosyvoice_seed,
      cosyvoiceVoiceId: jar.get("cosyvoice_voice_id")?.value || row.cosyvoice_voice_id,
      qwenTTSModel: jar.get("qwen_tts_model")?.value || row.qwen_tts_model,
      qwenTTSVoice: jar.get("qwen_tts_voice")?.value || row.qwen_tts_voice,
      qwenTTSVoiceMode: jar.get("qwen_tts_voice_mode")?.value || row.qwen_tts_voice_mode,
      qwenTTSCloneVoiceId: jar.get("qwen_tts_clone_voice_id")?.value || row.qwen_tts_clone_voice_id,
      qwenTTSCloneVoiceCloudId:
        jar.get("qwen_tts_clone_voice_cloud_id")?.value || row.qwen_tts_clone_voice_cloud_id,
      qwenTTSSpeed: jar.get("qwen_tts_speed")?.value || row.qwen_tts_speed,
      qwenTTSLanguageType: jar.get("qwen_tts_language_type")?.value || row.qwen_tts_language_type,
      qwenTTSInstructions: jar.get("qwen_tts_instructions")?.value || row.qwen_tts_instructions,
      cosyvoice35PlusModel: jar.get("cosyvoice_35_plus_model")?.value || row.cosyvoice_35_plus_model,
      cosyvoice35PlusVoiceId:
        jar.get("cosyvoice_35_plus_voice_id")?.value || row.cosyvoice_35_plus_voice_id,
      cosyvoice35FlashVoiceId:
        jar.get("cosyvoice_35_flash_voice_id")?.value || row.cosyvoice_35_flash_voice_id,
      cosyvoice35PlusVoiceProfileId:
        jar.get("cosyvoice_35_plus_voice_profile_id")?.value || row.cosyvoice_35_plus_voice_profile_id,
      cosyvoice35PlusSpeed: jar.get("cosyvoice_35_plus_speed")?.value || row.cosyvoice_35_plus_speed,
      cosyvoice35PlusInstruction:
        jar.get("cosyvoice_35_plus_instruction")?.value || row.cosyvoice_35_plus_instruction,
      cosyvoice35PlusLanguageHint:
        jar.get("cosyvoice_35_plus_language_hint")?.value || row.cosyvoice_35_plus_language_hint,
    }));

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
    const settings = normalizeTTSSettings(body || {});

    if (!hasDb()) {
      const res = NextResponse.json({ ok: true, ...settings }, { status: 200 });
      if (created || !jar.get("uid")?.value) {
        res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
      }
      setTTSCookies(res, settings);
      return res;
    }

    await ensureTables();
    await sql`INSERT INTO users(id) VALUES (${uid}) ON CONFLICT (id) DO NOTHING`;
    await sql`
      INSERT INTO user_settings(
        user_id,
        tts_provider,
        cosyvoice_speed,
        cosyvoice_instruction,
        cosyvoice_seed,
        cosyvoice_voice_id,
        qwen_tts_model,
        qwen_tts_voice,
        qwen_tts_voice_mode,
        qwen_tts_clone_voice_id,
        qwen_tts_clone_voice_cloud_id,
        qwen_tts_speed,
        qwen_tts_language_type,
        qwen_tts_instructions,
        cosyvoice_35_plus_model,
        cosyvoice_35_plus_voice_id,
        cosyvoice_35_flash_voice_id,
        cosyvoice_35_plus_voice_profile_id,
        cosyvoice_35_plus_speed,
        cosyvoice_35_plus_instruction,
        cosyvoice_35_plus_language_hint,
        updated_at
      )
      VALUES (
        ${uid},
        ${settings.provider},
        ${settings.cosyvoiceSpeed},
        ${settings.cosyvoiceInstruction},
        ${settings.cosyvoiceSeed},
        ${settings.cosyvoiceVoiceId},
        ${settings.qwenTTSModel},
        ${settings.qwenTTSVoice},
        ${settings.qwenTTSVoiceMode},
        ${settings.qwenTTSCloneVoiceId},
        ${settings.qwenTTSCloneVoiceCloudId},
        ${settings.qwenTTSSpeed},
        ${settings.qwenTTSLanguageType},
        ${settings.qwenTTSInstructions},
        ${settings.cosyvoice35PlusModel},
        ${settings.cosyvoice35PlusVoiceId},
        ${settings.cosyvoice35FlashVoiceId},
        ${settings.cosyvoice35PlusVoiceProfileId},
        ${settings.cosyvoice35PlusSpeed},
        ${settings.cosyvoice35PlusInstruction},
        ${settings.cosyvoice35PlusLanguageHint},
        now()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET tts_provider = EXCLUDED.tts_provider,
          cosyvoice_speed = EXCLUDED.cosyvoice_speed,
          cosyvoice_instruction = EXCLUDED.cosyvoice_instruction,
          cosyvoice_seed = EXCLUDED.cosyvoice_seed,
          cosyvoice_voice_id = EXCLUDED.cosyvoice_voice_id,
          qwen_tts_model = EXCLUDED.qwen_tts_model,
          qwen_tts_voice = EXCLUDED.qwen_tts_voice,
          qwen_tts_voice_mode = EXCLUDED.qwen_tts_voice_mode,
          qwen_tts_clone_voice_id = EXCLUDED.qwen_tts_clone_voice_id,
          qwen_tts_clone_voice_cloud_id = EXCLUDED.qwen_tts_clone_voice_cloud_id,
          qwen_tts_speed = EXCLUDED.qwen_tts_speed,
          qwen_tts_language_type = EXCLUDED.qwen_tts_language_type,
          qwen_tts_instructions = EXCLUDED.qwen_tts_instructions,
          cosyvoice_35_plus_model = EXCLUDED.cosyvoice_35_plus_model,
          cosyvoice_35_plus_voice_id = EXCLUDED.cosyvoice_35_plus_voice_id,
          cosyvoice_35_flash_voice_id = EXCLUDED.cosyvoice_35_flash_voice_id,
          cosyvoice_35_plus_voice_profile_id = EXCLUDED.cosyvoice_35_plus_voice_profile_id,
          cosyvoice_35_plus_speed = EXCLUDED.cosyvoice_35_plus_speed,
          cosyvoice_35_plus_instruction = EXCLUDED.cosyvoice_35_plus_instruction,
          cosyvoice_35_plus_language_hint = EXCLUDED.cosyvoice_35_plus_language_hint,
          updated_at = now()
    `;

    const res = NextResponse.json({ ok: true, ...settings }, { status: 200 });
    setTTSCookies(res, settings);
    if (created || !jar.get("uid")?.value) {
      res.cookies.set("uid", uid, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
    }
    return res;
  } catch (error) {
    console.error("POST tts-settings error:", error);
    return NextResponse.json({ error: "淇濆瓨澶辫触" }, { status: 500 });
  }
}

export const runtime = "edge";


