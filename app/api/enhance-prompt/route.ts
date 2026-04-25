import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { normalizeAISettings } from "../../../lib/ai-models";
import { buildDeepSeekChatCompletionBody } from "../../../lib/deepseek-chat";
import { ensureTables, hasDb } from "@/lib/db";

async function resolveStoredAISettings() {
  const jar = await cookies();
  const cookieSettings = normalizeAISettings({
    provider: jar.get("ai_provider")?.value,
    model: jar.get("ai_model")?.value,
    deepseekThinkingEnabled: jar.get("deepseek_thinking_enabled")?.value === "true",
    deepseekReasoningEffort: jar.get("deepseek_reasoning_effort")?.value,
  });

  if (!hasDb()) {
    return cookieSettings;
  }

  const uid = jar.get("uid")?.value || "";
  if (!uid) {
    return cookieSettings;
  }

  await ensureTables();
  const rows = await sql`
    SELECT ai_provider, ai_model, deepseek_thinking_enabled, deepseek_reasoning_effort
    FROM user_settings
    WHERE user_id = ${uid}
  `;

  return normalizeAISettings({
    provider: jar.get("ai_provider")?.value || rows.rows?.[0]?.ai_provider,
    model: jar.get("ai_model")?.value || rows.rows?.[0]?.ai_model,
    deepseekThinkingEnabled:
      jar.get("deepseek_thinking_enabled")?.value ?? rows.rows?.[0]?.deepseek_thinking_enabled,
    deepseekReasoningEffort:
      jar.get("deepseek_reasoning_effort")?.value || rows.rows?.[0]?.deepseek_reasoning_effort,
  });
}

function getUpstreamConfig(
  settings: ReturnType<typeof normalizeAISettings>,
  key: string,
  maxTokens: number
) {
  const { provider, model } = settings;
  if (provider === "nvidia") {
    return {
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${key}`,
      },
      body: (messages: Array<{ role: string; content: string }>) =>
        JSON.stringify({
          model,
          messages,
          temperature: 0.6,
          max_tokens: maxTokens,
          stream: true,
        }),
    };
  }

  return {
    url: "https://api.deepseek.com/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${key}`,
    },
    body: (messages: Array<{ role: string; content: string }>) =>
      JSON.stringify(
        buildDeepSeekChatCompletionBody({
          model,
          messages,
          stream: true,
          maxTokens,
          thinkingEnabled: false, // Force disable thinking for quick prompts
          reasoningEffort: "low",
          temperature: 0.6,
          frequencyPenalty: 0.1,
          presencePenalty: 0.1,
        })
      ),
  };
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  try {
    const body = await req.json();
    const topic = String(body?.topic || "").trim();
    
    if (!topic) {
      return new Response(JSON.stringify({ error: "缺少主题内容" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const storedSettings = await resolveStoredAISettings();
    const effectiveSettings = normalizeAISettings({
      provider: body?.provider ?? storedSettings.provider,
      model: body?.model ?? storedSettings.model,
    });

    const key =
      effectiveSettings.provider === "nvidia"
        ? process.env.NVIDIA_API_KEY
        : body?.apiKey || process.env.DEEPSEEK_API_KEY;

    console.log("[AI Request][enhance-prompt][start]", JSON.stringify({
      requestId,
      provider: effectiveSettings.provider,
      model: effectiveSettings.model,
      topicLength: topic.length,
      hasKey: Boolean(key),
    }));

    if (!key) {
      const label = effectiveSettings.provider === "nvidia" ? "NVIDIA_API_KEY" : "DeepSeek API Key";
      return new Response(JSON.stringify({ error: `缺少 ${label}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = "你是一个世界级的正念冥想导师和AI提示词专家。用户会提供一个冥想主题，请将其扩展为一段高度详细、充满画面感、具有情感深度和感官细节的生成要求，用于指导另一个AI撰写高质量的冥想引导词。\n\n要求：\n1. 详细描述场景设定（光线、温度、视觉/听觉/触觉体验）。\n2. 明确规定主播的语气语调（如：极致温柔、缓慢空灵、具有包裹感）。\n3. 设定结构和节奏（起伏、停顿、呼吸的指引）。\n4. 直接输出要求本身，绝对不要出现“好的”、“为你提供”等任何寒暄或解释说明。";
    const userPrompt = `需要扩展的冥想主题：${topic}`;
    const maxTokens = 300;
    
    const upstreamConfig = getUpstreamConfig(effectiveSettings, key, maxTokens);
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const upstream = await fetch(upstreamConfig.url, {
      method: "POST",
      headers: upstreamConfig.headers,
      body: upstreamConfig.body(messages),
    });

    if (!upstream.ok || !upstream.body) {
      const status = upstream.status || 500;
      const errorText = await upstream.text().catch(() => "");
      console.error("[AI Request][enhance-prompt][upstream_error]", {
        requestId,
        status,
        elapsedMs: Date.now() - startedAt,
        errorText,
      });
      return new Response(
        JSON.stringify({ error: `上游错误: HTTP ${status}` }),
        { status, headers: { "Content-Type": "application/json" } }
      );
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const json = JSON.parse(data);
              const content = json?.choices?.[0]?.delta?.content;
              if (content) {
                await writer.write(encoder.encode(content));
              }
            } catch (error) {
              // Ignore stream parse errors silently
            }
          }
        }
      } catch (error) {
        console.error("[AI Request][enhance-prompt][stream_error]", {
          requestId,
          elapsedMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        try {
          await writer.close();
        } catch {
          // Client already disconnected.
        }
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("[AI Request][enhance-prompt][request_error]", {
      requestId,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: "请求解析失败" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const runtime = "edge";
