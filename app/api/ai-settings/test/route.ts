import { NextResponse } from "next/server";
import { normalizeAISettings } from "@/lib/ai-models";

function getUpstreamConfig(provider: "deepseek" | "nvidia", model: string, key: string) {
  if (provider === "nvidia") {
    return {
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with OK only." }],
        max_tokens: 16,
        stream: false,
        temperature: 0,
      }),
    };
  }

  return {
    url: "https://api.deepseek.com/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with OK only." }],
      max_tokens: 16,
      stream: false,
      temperature: 0,
    }),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const settings = normalizeAISettings({
      provider: body?.provider,
      model: body?.model,
    });

    const key =
      settings.provider === "nvidia"
        ? process.env.NVIDIA_API_KEY
        : body?.apiKey || process.env.DEEPSEEK_API_KEY;

    if (!key) {
      return NextResponse.json(
        { ok: false, error: settings.provider === "nvidia" ? "缺少 NVIDIA_API_KEY" : "缺少 DeepSeek API Key" },
        { status: 400 }
      );
    }

    const upstream = getUpstreamConfig(settings.provider, settings.model, key);
    const res = await fetch(upstream.url, {
      method: "POST",
      headers: upstream.headers,
      body: upstream.body,
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          provider: settings.provider,
          model: settings.model,
          status: res.status,
          error: text,
        },
        { status: res.status }
      );
    }

    let preview = "";
    try {
      const json = JSON.parse(text);
      preview =
        json?.choices?.[0]?.message?.content ||
        json?.choices?.[0]?.message?.reasoning_content ||
        json?.choices?.[0]?.message?.reasoning ||
        "";
    } catch {
      preview = text.slice(0, 120);
    }

    return NextResponse.json({
      ok: true,
      provider: settings.provider,
      model: settings.model,
      preview,
    });
  } catch (error) {
    console.error("POST ai-settings/test error:", error);
    return NextResponse.json({ ok: false, error: "测试失败" }, { status: 500 });
  }
}

export const runtime = "edge";
