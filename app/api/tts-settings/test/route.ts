import { NextResponse } from "next/server";
import {
  normalizeTTSSettings,
  type TTSSettings,
} from "@/lib/tts-settings";
import {
  buildMimoTTSPayload,
  decodeMimoTTSAudioBase64,
  extractMimoTTSAudioBase64,
  getMimoTTSEndpoint,
  postMimoTTSJsonWithCurl,
  resolveMimoTTSCloneVoiceSource,
} from "@/lib/mimo-tts";
import {
  buildQwenTTSPayload,
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

const DEFAULT_COSYVOICE_BASE_URL = "http://127.0.0.1:50000";
const DEFAULT_TIMEOUT_MS = 30000;

async function testLocalCosyVoice() {
  const baseUrl = process.env.COSYVOICE_BASE_URL || DEFAULT_COSYVOICE_BASE_URL;
  const timeoutMs = Number(process.env.COSYVOICE_HEALTH_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/cosyvoice/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.detail || data?.error || `HTTP ${response.status}`,
          upstream: baseUrl,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      provider: "cosyvoice",
      upstream: baseUrl,
      model_dir: data?.model_dir || "",
      mode: data?.mode || "",
      sample_rate: data?.sample_rate || 0,
      is_cosyvoice3: Boolean(data?.is_cosyvoice3),
      app_tts_ready: Boolean(data?.app_tts_ready),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider: "cosyvoice",
        error: error instanceof Error ? error.message : String(error),
        upstream: baseUrl,
      },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function testQwenTTS(settings: TTSSettings) {
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_TTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, provider: "qwentts", error: "缺少 DASHSCOPE_API_KEY" }, { status: 400 });
  }

  const payload = buildQwenTTSPayload("这是一条连通性测试。", settings);
  const endpoint = getQwenTTSGenerationEndpoint();
  const timeoutMs = Number(process.env.QWEN_TTS_TIMEOUT_MS || 120000);
  const data = shouldUseQwenTTSCurl()
    ? await postQwenTTSJsonWithCurl(endpoint, apiKey, payload, timeoutMs)
    : await fetchQwenTTS(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      }).then((response) => response.json().catch(() => ({})));

  const audioUrl = extractQwenTTSAudioUrl(data);
  if (!audioUrl) {
    return NextResponse.json(
      {
        ok: false,
        provider: "qwentts",
        model: settings.qwenTTSModel,
        error: typeof data === "object" ? JSON.stringify(data).slice(0, 500) : String(data),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    provider: "qwentts",
    model: settings.qwenTTSModel,
    voice: settings.qwenTTSVoice,
    audioUrl,
  });
}

async function testMimoTTS(settings: TTSSettings) {
  const apiKey = process.env.MIMO_API_KEY || process.env.MIMO_TTS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, provider: "mimotts", error: "缺少 MIMO_API_KEY" }, { status: 400 });
  }

  const endpoint = getMimoTTSEndpoint(process.env.MIMO_TTS_BASE_URL);
  const effectiveSettings =
    settings.mimoTTSModel === "mimo-v2.5-tts-voiceclone" &&
    !settings.mimoTTSCloneVoiceUrl.trim() &&
    process.env.DEFAULT_MIMO_TTS_CLONE_VOICE_URL
      ? { ...settings, mimoTTSCloneVoiceUrl: process.env.DEFAULT_MIMO_TTS_CLONE_VOICE_URL }
      : settings;

  if (effectiveSettings.mimoTTSModel === "mimo-v2.5-tts-voiceclone" && !effectiveSettings.mimoTTSCloneVoiceUrl.trim()) {
    return NextResponse.json(
      {
        ok: false,
        provider: "mimotts",
        model: effectiveSettings.mimoTTSModel,
        error: "缺少 MiMo 克隆音色参考音频路径或 URL",
      },
      { status: 400 }
    );
  }

  const timeoutMs = Number(process.env.MIMO_TTS_TIMEOUT_MS || 120000);
  const testText = "慢慢吸气，慢慢呼气。";

  try {
    const resolvedCloneVoice = effectiveSettings.mimoTTSModel === "mimo-v2.5-tts-voiceclone"
      ? await resolveMimoTTSCloneVoiceSource(effectiveSettings.mimoTTSCloneVoiceUrl)
      : undefined;
    const payload = buildMimoTTSPayload(testText, effectiveSettings, resolvedCloneVoice);
    const data = await postMimoTTSJsonWithCurl(endpoint, apiKey, payload, timeoutMs);
    const audioBase64 = extractMimoTTSAudioBase64(data);
    if (!audioBase64) {
      return NextResponse.json(
        {
          ok: false,
          provider: "mimotts",
          model: effectiveSettings.mimoTTSModel,
          error: typeof data === "object" ? JSON.stringify(data).slice(0, 500) : "MiMo 返回中缺少音频数据",
        },
        { status: 502 }
      );
    }

    const audioBuffer = decodeMimoTTSAudioBase64(audioBase64);
    return NextResponse.json({
      ok: true,
      provider: "mimotts",
      model: effectiveSettings.mimoTTSModel,
      voice: effectiveSettings.mimoTTSModel === "mimo-v2.5-tts" ? effectiveSettings.mimoTTSVoice : "",
      bytes: audioBuffer.byteLength,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider: "mimotts",
        model: effectiveSettings.mimoTTSModel,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}

async function testCosyVoice35Plus(settings: TTSSettings) {
  const apiKey = process.env.DASHSCOPE_API_KEY || process.env.COSYVOICE_CLOUD_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, provider: "cosyvoice35plus", error: "缺少 DASHSCOPE_API_KEY" },
      { status: 400 }
    );
  }

  const payload = buildCosyVoice35PlusPayload("这是一条连通性测试。", settings);
  const endpoint = getCosyVoiceCloudEndpoint();
  const timeoutMs = Number(process.env.COSYVOICE_CLOUD_TIMEOUT_MS || 120000);
  const data = shouldUseCosyVoiceCloudCurl()
    ? await postCosyVoiceCloudJsonWithCurl(endpoint, apiKey, payload, timeoutMs)
    : await fetchCosyVoiceCloud(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      }).then((response) => response.json().catch(() => ({})));

  const audioUrl = extractCosyVoiceCloudAudioUrl(data);
  if (!audioUrl) {
    return NextResponse.json(
      {
        ok: false,
        provider: "cosyvoice35plus",
        model: settings.cosyvoice35PlusModel,
        error:
          getCosyVoiceCloudErrorMessage(data) ||
          (typeof data === "object" ? JSON.stringify(data).slice(0, 500) : String(data)),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    provider: "cosyvoice35plus",
    model: settings.cosyvoice35PlusModel,
    audioUrl,
  });
}

async function handle(settings: TTSSettings) {
  if (settings.provider === "edge") {
    return NextResponse.json({
      ok: true,
      provider: "edge",
      message: "EdgeTTS 无需单独连通性测试。",
    });
  }
  if (settings.provider === "qwentts") {
    return testQwenTTS(settings);
  }
  if (settings.provider === "mimotts") {
    return testMimoTTS(settings);
  }
  if (settings.provider === "cosyvoice35plus") {
    return testCosyVoice35Plus(settings);
  }
  return testLocalCosyVoice();
}

export async function GET() {
  return handle(normalizeTTSSettings({ provider: "cosyvoice" }));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return handle(normalizeTTSSettings(body || {}));
}

export const runtime = "nodejs";
