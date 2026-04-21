import { NextResponse } from "next/server";

const DEFAULT_COSYVOICE_BASE_URL = "http://127.0.0.1:50000";
const DEFAULT_TIMEOUT_MS = 8000;

export async function GET() {
  const baseUrl = process.env.COSYVOICE_BASE_URL || DEFAULT_COSYVOICE_BASE_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

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
        error: error instanceof Error ? error.message : String(error),
        upstream: baseUrl,
      },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const runtime = "nodejs";
