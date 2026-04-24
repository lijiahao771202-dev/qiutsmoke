// IMPORTANT: This route must run in Node.js runtime.
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { ensureTables, hasDb } from "@/lib/db";
import {
  isCosyVoice35PlusLanguageHint,
  isCosyVoiceVoiceId,
  isQwenTTSLanguageType,
  isQwenTTSModel,
  isQwenTTSVoice,
  isQwenTTSVoiceMode,
  isTTSProvider,
  normalizeTTSSettings,
  type TTSSettings,
} from "@/lib/tts-settings";
import {
  buildQwenTTSPayload,
  downloadQwenTTSAudio,
  extractQwenTTSAudioUrl,
  fetchQwenTTS,
  getQwenTTSGenerationEndpoint,
  postQwenTTSJsonWithCurl,
  shouldUseQwenTTSCurl,
} from "@/lib/qwen-tts";
import {
  buildCosyVoice35PlusPayload,
  extractCosyVoiceCloudAudioUrl,
  fetchCosyVoiceCloud,
  getCosyVoiceCloudEndpoint,
  getCosyVoiceCloudErrorMessage,
  postCosyVoiceCloudJsonWithCurl,
  shouldUseCosyVoiceCloudCurl,
} from "@/lib/cosyvoice-cloud";

const DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural";
const DEFAULT_RATE = "0%";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_COSYVOICE_TIMEOUT_MS = 60000;

const GOOGLE_TTS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const GOOGLE_TTS_SPLIT_RE = /[\u3002\uFF0C\uFF01\uFF1F\uFF1B,.!?;\n]/;
const COSYVOICE_UNAVAILABLE_HINT =
  "CosyVoice local mode is selected. Start http://127.0.0.1:50000 or switch back to EdgeTTS.";

type TTSRequest = {
  text?: string;
  voice?: string;
  rate?: string;
  enableSSML?: unknown;
  provider?: unknown;
  cosyvoiceSpeed?: unknown;
  cosyvoiceInstruction?: unknown;
  cosyvoiceSeed?: unknown;
  cosyvoiceVoiceId?: unknown;
  qwenTTSModel?: unknown;
  qwenTTSVoice?: unknown;
  qwenTTSVoiceMode?: unknown;
  qwenTTSCloneVoiceId?: unknown;
  qwenTTSCloneVoiceCloudId?: unknown;
  qwenTTSSpeed?: unknown;
  qwenTTSLanguageType?: unknown;
  qwenTTSInstructions?: unknown;
  cosyvoice35PlusVoiceId?: unknown;
  cosyvoice35PlusVoiceProfileId?: unknown;
  cosyvoice35PlusSpeed?: unknown;
  cosyvoice35PlusInstruction?: unknown;
  cosyvoice35PlusLanguageHint?: unknown;
};

function getLangFromVoice(voice: string): string {
  const match = voice.match(/^([a-z]{2,3}-[A-Z]{2})/);
  return match?.[1] || "zh-CN";
}

async function getPersistedTTSSettings(): Promise<TTSSettings> {
  const jar = await cookies();
  const cookieValues = {
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
    cosyvoice35PlusVoiceId: jar.get("cosyvoice_35_plus_voice_id")?.value,
    cosyvoice35PlusVoiceProfileId: jar.get("cosyvoice_35_plus_voice_profile_id")?.value,
    cosyvoice35PlusSpeed: jar.get("cosyvoice_35_plus_speed")?.value,
    cosyvoice35PlusInstruction: jar.get("cosyvoice_35_plus_instruction")?.value,
    cosyvoice35PlusLanguageHint: jar.get("cosyvoice_35_plus_language_hint")?.value,
  };

  if (!hasDb()) {
    return normalizeTTSSettings(cookieValues);
  }

  const uid = jar.get("uid")?.value || "";
  if (!uid) {
    return normalizeTTSSettings(cookieValues);
  }

  await ensureTables();
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
      cosyvoice_35_plus_voice_id,
      cosyvoice_35_plus_voice_profile_id,
      cosyvoice_35_plus_speed,
      cosyvoice_35_plus_instruction,
      cosyvoice_35_plus_language_hint
    FROM user_settings
    WHERE user_id = ${uid}
  `;
  return normalizeTTSSettings({
    provider: cookieValues.provider || rows.rows?.[0]?.tts_provider,
    cosyvoiceSpeed: cookieValues.cosyvoiceSpeed || rows.rows?.[0]?.cosyvoice_speed,
    cosyvoiceInstruction: cookieValues.cosyvoiceInstruction || rows.rows?.[0]?.cosyvoice_instruction,
    cosyvoiceSeed: cookieValues.cosyvoiceSeed || rows.rows?.[0]?.cosyvoice_seed,
    cosyvoiceVoiceId: cookieValues.cosyvoiceVoiceId || rows.rows?.[0]?.cosyvoice_voice_id,
    qwenTTSModel: cookieValues.qwenTTSModel || rows.rows?.[0]?.qwen_tts_model,
    qwenTTSVoice: cookieValues.qwenTTSVoice || rows.rows?.[0]?.qwen_tts_voice,
    qwenTTSVoiceMode: cookieValues.qwenTTSVoiceMode || rows.rows?.[0]?.qwen_tts_voice_mode,
    qwenTTSCloneVoiceId:
      cookieValues.qwenTTSCloneVoiceId || rows.rows?.[0]?.qwen_tts_clone_voice_id,
    qwenTTSCloneVoiceCloudId:
      cookieValues.qwenTTSCloneVoiceCloudId || rows.rows?.[0]?.qwen_tts_clone_voice_cloud_id,
    qwenTTSSpeed: cookieValues.qwenTTSSpeed || rows.rows?.[0]?.qwen_tts_speed,
    qwenTTSLanguageType:
      cookieValues.qwenTTSLanguageType || rows.rows?.[0]?.qwen_tts_language_type,
    qwenTTSInstructions:
      cookieValues.qwenTTSInstructions || rows.rows?.[0]?.qwen_tts_instructions,
    cosyvoice35PlusVoiceId:
      cookieValues.cosyvoice35PlusVoiceId || rows.rows?.[0]?.cosyvoice_35_plus_voice_id,
    cosyvoice35PlusVoiceProfileId:
      cookieValues.cosyvoice35PlusVoiceProfileId || rows.rows?.[0]?.cosyvoice_35_plus_voice_profile_id,
    cosyvoice35PlusSpeed:
      cookieValues.cosyvoice35PlusSpeed || rows.rows?.[0]?.cosyvoice_35_plus_speed,
    cosyvoice35PlusInstruction:
      cookieValues.cosyvoice35PlusInstruction || rows.rows?.[0]?.cosyvoice_35_plus_instruction,
    cosyvoice35PlusLanguageHint:
      cookieValues.cosyvoice35PlusLanguageHint || rows.rows?.[0]?.cosyvoice_35_plus_language_hint,
  });
}

function splitForGoogleTTS(input: string, maxLen = 180): string[] {
  const text = input.trim();
  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const out: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = maxLen;
    for (let i = maxLen; i > Math.floor(maxLen * 0.6); i--) {
      const ch = rest[i];
      if (ch && GOOGLE_TTS_SPLIT_RE.test(ch)) {
        cut = i + 1;
        break;
      }
    }
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

async function synthesizeGoogleTTS(text: string, lang: string): Promise<Buffer> {
  const chunks = splitForGoogleTTS(text);
  if (chunks.length === 0) throw new Error("Empty text for Google fallback");

  const parts: Buffer[] = [];
  for (const chunk of chunks) {
    const qs = new URLSearchParams({
      ie: "UTF-8",
      client: "tw-ob",
      tl: lang,
      q: chunk,
    });
    const url = `https://translate.googleapis.com/translate_tts?${qs.toString()}`;
    const res = await fetch(url, {
      headers: { "User-Agent": GOOGLE_TTS_UA },
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Google fallback failed: ${res.status} ${txt.slice(0, 120)}`);
    }
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length < 100) throw new Error("Google fallback returned empty audio");
    parts.push(buf);
  }

  return Buffer.concat(parts);
}

async function synthesizeEdgeTTS(text: string, voice: string, rate: string) {
  const lang = getLangFromVoice(voice);
  const timeout = Number(process.env.TTS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const proxy = process.env.TTS_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "";
  const enableGoogleFallback = process.env.ENABLE_GOOGLE_TTS_FALLBACK === "true";

  const { EdgeTTS } = await import("node-edge-tts");
  const fs = await import("fs");
  const path = await import("path");
  const os = await import("os");

  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);

  const minExpectedBytes = Math.max(100, text.length * 80);
  const maxRetries = 2;
  let audioBuffer: Buffer | null = null;
  let edgeErr: string | null = null;

  const tryVoices = voice === DEFAULT_VOICE ? [voice] : [voice, DEFAULT_VOICE];
  for (const tryVoice of tryVoices) {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const tts = new EdgeTTS({
          voice: tryVoice,
          lang: getLangFromVoice(tryVoice),
          outputFormat: "audio-24khz-48kbitrate-mono-mp3",
          rate,
          timeout,
          proxy,
        });

        await tts.ttsPromise(text, tempFile);
        if (!fs.existsSync(tempFile)) throw new Error("No output file generated");

        const size = fs.statSync(tempFile).size;
        if (size < minExpectedBytes) {
          throw new Error(`Audio too short: ${size} bytes`);
        }

        audioBuffer = fs.readFileSync(tempFile);
        break;
      } catch (error) {
        edgeErr = error instanceof Error ? error.message : String(error);
        if (i < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 700 * (i + 1)));
        }
      } finally {
        if (fs.existsSync(tempFile)) {
          try {
            fs.unlinkSync(tempFile);
          } catch {}
        }
      }
    }
    if (audioBuffer) break;
  }

  if (audioBuffer) {
    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "X-TTS-Impl": "edge",
      },
    });
  }

  if (enableGoogleFallback) {
    const googleAudio = await synthesizeGoogleTTS(text, lang);
    return new Response(new Uint8Array(googleAudio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "X-TTS-Impl": "google-fallback",
      },
    });
  }

  return new Response(
    JSON.stringify({
      error: "TTS Implementation failure",
      details: edgeErr || "EdgeTTS failed",
      provider: "edge",
      fallback: "disabled",
      hint: "Set TTS_PROXY in env if your network cannot reach Edge TTS.",
    }),
    {
      status: 502,
      headers: { "Content-Type": "application/json" },
    }
  );
}

async function synthesizeCosyVoiceTTS(text: string, settings: TTSSettings) {
  const baseUrl = process.env.COSYVOICE_BASE_URL || "http://127.0.0.1:50000";
  const timeoutMs = Number(process.env.COSYVOICE_TIMEOUT_MS || DEFAULT_COSYVOICE_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/cosyvoice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        speed: settings.cosyvoiceSpeed,
        instruct_text: settings.cosyvoiceInstruction,
        seed: settings.cosyvoiceSeed,
        voice_id: settings.cosyvoiceVoiceId,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return new Response(
        JSON.stringify({
          error: "CosyVoice service unavailable",
          details: details.slice(0, 500) || `HTTP ${response.status}`,
          provider: "cosyvoice",
          hint: COSYVOICE_UNAVAILABLE_HINT,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "audio/wav",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "X-TTS-Impl": "cosyvoice-local",
        "X-CosyVoice-Upstream": baseUrl,
        "X-CosyVoice-Voice": settings.cosyvoiceVoiceId,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: "CosyVoice service unavailable",
        details,
        provider: "cosyvoice",
        hint: COSYVOICE_UNAVAILABLE_HINT,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function synthesizeQwenTTSAudio(text: string, settings: TTSSettings) {
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_TTS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "缺少 DASHSCOPE_API_KEY", provider: "qwentts" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const endpoint = getQwenTTSGenerationEndpoint();
  const payload = buildQwenTTSPayload(text, settings);
  const timeoutMs = Number(process.env.QWEN_TTS_TIMEOUT_MS || 120000);

  let data: unknown;
  if (shouldUseQwenTTSCurl()) {
    data = await postQwenTTSJsonWithCurl(endpoint, apiKey, payload, timeoutMs);
  } else {
    const response = await fetchQwenTTS(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    data = await response.json().catch(() => ({}));
  }

  const audioUrl = extractQwenTTSAudioUrl(data);
  if (!audioUrl) {
    return new Response(
      JSON.stringify({
        error: "Qwen-TTS synthesis failed",
        provider: "qwentts",
        details: typeof data === "object" ? JSON.stringify(data).slice(0, 500) : String(data),
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const audioBuffer = await downloadQwenTTSAudio(audioUrl, timeoutMs);
  return new Response(new Uint8Array(audioBuffer), {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      "X-TTS-Impl": "qwentts",
      "X-TTS-Model": settings.qwenTTSModel,
    },
  });
}

async function synthesizeCosyVoice35PlusTTS(
  text: string,
  settings: TTSSettings,
  options: { enableSSML?: boolean } = {}
) {
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.COSYVOICE_CLOUD_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "缺少 DASHSCOPE_API_KEY", provider: "cosyvoice35plus" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const endpoint = getCosyVoiceCloudEndpoint();
  const payload = buildCosyVoice35PlusPayload(text, settings, undefined, {
    enableSSML: Boolean(options.enableSSML),
  });
  const timeoutMs = Number(process.env.COSYVOICE_CLOUD_TIMEOUT_MS || 120000);

  let data: unknown;
  if (shouldUseCosyVoiceCloudCurl()) {
    data = await postCosyVoiceCloudJsonWithCurl(endpoint, apiKey, payload, timeoutMs);
  } else {
    const response = await fetchCosyVoiceCloud(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    data = await response.json().catch(() => ({}));
  }

  const audioUrl = extractCosyVoiceCloudAudioUrl(data);
  if (!audioUrl) {
    return new Response(
      JSON.stringify({
        error: "CosyVoice 3.5 Plus synthesis failed",
        provider: "cosyvoice35plus",
        details:
          getCosyVoiceCloudErrorMessage(data) ||
          (typeof data === "object" ? JSON.stringify(data).slice(0, 500) : String(data)),
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const audioBuffer = await downloadQwenTTSAudio(audioUrl, timeoutMs);
  return new Response(new Uint8Array(audioBuffer), {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      "X-TTS-Impl": "cosyvoice35plus",
    },
  });
}

export async function POST(req: Request) {
  try {
    let body: TTSRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON body",
          details: "Request body must be valid JSON",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const text = String(body.text || "").trim();
    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const persistedSettings = await getPersistedTTSSettings();
    const settings = normalizeTTSSettings({
      provider: isTTSProvider(body.provider) ? body.provider : persistedSettings.provider,
      cosyvoiceSpeed: body.cosyvoiceSpeed ?? persistedSettings.cosyvoiceSpeed,
      cosyvoiceInstruction: body.cosyvoiceInstruction ?? persistedSettings.cosyvoiceInstruction,
      cosyvoiceSeed: body.cosyvoiceSeed ?? persistedSettings.cosyvoiceSeed,
      cosyvoiceVoiceId: body.cosyvoiceVoiceId ?? persistedSettings.cosyvoiceVoiceId,
      qwenTTSModel: isQwenTTSModel(body.qwenTTSModel) ? body.qwenTTSModel : persistedSettings.qwenTTSModel,
      qwenTTSVoice: isQwenTTSVoice(body.qwenTTSVoice) ? body.qwenTTSVoice : persistedSettings.qwenTTSVoice,
      qwenTTSVoiceMode: isQwenTTSVoiceMode(body.qwenTTSVoiceMode)
        ? body.qwenTTSVoiceMode
        : persistedSettings.qwenTTSVoiceMode,
      qwenTTSCloneVoiceId: isCosyVoiceVoiceId(body.qwenTTSCloneVoiceId)
        ? body.qwenTTSCloneVoiceId
        : persistedSettings.qwenTTSCloneVoiceId,
      qwenTTSCloneVoiceCloudId:
        typeof body.qwenTTSCloneVoiceCloudId === "string"
          ? body.qwenTTSCloneVoiceCloudId
          : persistedSettings.qwenTTSCloneVoiceCloudId,
      qwenTTSSpeed: body.qwenTTSSpeed ?? persistedSettings.qwenTTSSpeed,
      qwenTTSLanguageType: isQwenTTSLanguageType(body.qwenTTSLanguageType)
        ? body.qwenTTSLanguageType
        : persistedSettings.qwenTTSLanguageType,
      qwenTTSInstructions:
        typeof body.qwenTTSInstructions === "string"
          ? body.qwenTTSInstructions
          : persistedSettings.qwenTTSInstructions,
      cosyvoice35PlusVoiceId:
        typeof body.cosyvoice35PlusVoiceId === "string"
          ? body.cosyvoice35PlusVoiceId
          : persistedSettings.cosyvoice35PlusVoiceId,
      cosyvoice35PlusVoiceProfileId: isCosyVoiceVoiceId(body.cosyvoice35PlusVoiceProfileId)
        ? body.cosyvoice35PlusVoiceProfileId
        : persistedSettings.cosyvoice35PlusVoiceProfileId,
      cosyvoice35PlusSpeed: body.cosyvoice35PlusSpeed ?? persistedSettings.cosyvoice35PlusSpeed,
      cosyvoice35PlusInstruction:
        typeof body.cosyvoice35PlusInstruction === "string"
          ? body.cosyvoice35PlusInstruction
          : persistedSettings.cosyvoice35PlusInstruction,
      cosyvoice35PlusLanguageHint: isCosyVoice35PlusLanguageHint(body.cosyvoice35PlusLanguageHint)
        ? body.cosyvoice35PlusLanguageHint
        : persistedSettings.cosyvoice35PlusLanguageHint,
    });
    const provider = settings.provider;
    if (provider === "cosyvoice") {
      return synthesizeCosyVoiceTTS(text, settings);
    }
    if (provider === "qwentts") {
      return synthesizeQwenTTSAudio(text, settings);
    }
    if (provider === "cosyvoice35plus") {
      return synthesizeCosyVoice35PlusTTS(text, settings, {
        enableSSML: body.enableSSML === true,
      });
    }

    const voice = String(body.voice || DEFAULT_VOICE).trim() || DEFAULT_VOICE;
    const rate = String(body.rate || DEFAULT_RATE).trim() || DEFAULT_RATE;
    return synthesizeEdgeTTS(text, voice, rate);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "TTS Implementation failure",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
