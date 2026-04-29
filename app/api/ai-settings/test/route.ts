import { NextResponse } from "next/server";
import { normalizeAISettings } from "@/lib/ai-models";
import { buildDeepSeekChatCompletionBody } from "@/lib/deepseek-chat";
import {
  buildMimoChatCompletionBody,
  getMimoChatCompletionsUrl,
  resolveMimoAIKey,
} from "@/lib/mimo-ai";

function getUpstreamConfig(settings: ReturnType<typeof normalizeAISettings>, key: string) {
  const { provider, model } = settings;
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

  if (provider === "mimo") {
    return {
      url: getMimoChatCompletionsUrl(),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(
        buildMimoChatCompletionBody({
          model,
          messages: [{ role: "user", content: "Reply with OK only." }],
          maxTokens: 16,
          stream: false,
          temperature: 0,
        })
      ),
    };
  }

  return {
    url: "https://api.deepseek.com/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(
      buildDeepSeekChatCompletionBody({
        model,
        messages: [{ role: "user", content: "Reply with OK only." }],
        maxTokens: 16,
        stream: false,
        thinkingEnabled: settings.deepseekThinkingEnabled,
        reasoningEffort: settings.deepseekReasoningEffort,
        temperature: 0,
      })
    ),
  };
}

async function fetchWithProviderRetry(
  provider: ReturnType<typeof normalizeAISettings>["provider"],
  url: string,
  init: RequestInit
) {
  const maxAttempts = provider === "mimo" ? 3 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 650 * attempt));
      }
    }
  }

  throw lastError;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const settings = normalizeAISettings({
      provider: body?.provider,
      model: body?.model,
      deepseekThinkingEnabled: body?.deepseekThinkingEnabled,
      deepseekReasoningEffort: body?.deepseekReasoningEffort,
    });

    console.log("[AI Request][settings-test][start]", JSON.stringify({
      requestId,
      provider: settings.provider,
      model: settings.model,
      deepseekThinkingEnabled: settings.deepseekThinkingEnabled,
      deepseekReasoningEffort:
        settings.provider === "deepseek" && settings.deepseekThinkingEnabled
          ? settings.deepseekReasoningEffort
          : null,
    }));

    const key =
      settings.provider === "nvidia"
        ? process.env.NVIDIA_API_KEY
        : settings.provider === "mimo"
          ? resolveMimoAIKey()
        : body?.apiKey || process.env.DEEPSEEK_API_KEY;

    if (!key) {
      const label =
        settings.provider === "nvidia"
          ? "NVIDIA_API_KEY"
          : settings.provider === "mimo"
            ? "MIMO_API_KEY"
            : "DeepSeek API Key";
      return NextResponse.json(
        { ok: false, error: `缺少 ${label}` },
        { status: 400 }
      );
    }

    const upstream = getUpstreamConfig(settings, key);
    const res = await fetchWithProviderRetry(settings.provider, upstream.url, {
      method: "POST",
      headers: upstream.headers,
      body: upstream.body,
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("[AI Request][settings-test][upstream_error]", {
        requestId,
        provider: settings.provider,
        model: settings.model,
        status: res.status,
        elapsedMs: Date.now() - startedAt,
        error: text,
      });
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

    console.log("[AI Request][settings-test][done]", JSON.stringify({
      requestId,
      provider: settings.provider,
      model: settings.model,
      deepseekThinkingEnabled: settings.deepseekThinkingEnabled,
      deepseekReasoningEffort:
        settings.provider === "deepseek" && settings.deepseekThinkingEnabled
          ? settings.deepseekReasoningEffort
          : null,
      elapsedMs: Date.now() - startedAt,
    }));

    return NextResponse.json({
      ok: true,
      provider: settings.provider,
      model: settings.model,
      preview,
    });
  } catch (error) {
    console.error("[AI Request][settings-test][request_error]", {
      requestId,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "测试失败" }, { status: 500 });
  }
}

export const runtime = "edge";
