import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { normalizeAISettings } from "../../../lib/ai-models";
import { buildDeepSeekChatCompletionBody } from "../../../lib/deepseek-chat";
import { buildAIGenerationTargets } from "@/lib/meditation-script-duration";
import {
  buildMeditationGenerationSystemPrompt,
  buildMeditationGenerationUserPrompt,
} from "@/lib/meditation-generation-prompt";
import {
  formatMeditationReferenceBlock,
  retrieveMeditationReferences,
} from "@/lib/meditation-rag";
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
          temperature: 0.42,
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
          thinkingEnabled: settings.deepseekThinkingEnabled,
          reasoningEffort: settings.deepseekReasoningEffort,
          temperature: 0.45,
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
    const duration = Number(body?.duration) || 10;
    const guidanceLevel = typeof body?.guidanceLevel === "string" ? body.guidanceLevel : "medium";
    const topic = String(body?.topic || body?.prompt || "").trim();
    const storedSettings = await resolveStoredAISettings();
    const effectiveSettings = normalizeAISettings({
      provider: body?.provider ?? storedSettings.provider,
      model: body?.model ?? storedSettings.model,
      deepseekThinkingEnabled:
        body?.deepseekThinkingEnabled ?? storedSettings.deepseekThinkingEnabled,
      deepseekReasoningEffort:
        body?.deepseekReasoningEffort ?? storedSettings.deepseekReasoningEffort,
    });

    const key =
      effectiveSettings.provider === "nvidia"
        ? process.env.NVIDIA_API_KEY
        : body?.apiKey || process.env.DEEPSEEK_API_KEY;

    console.log("[AI Request][generate][start]", JSON.stringify({
      requestId,
      provider: effectiveSettings.provider,
      model: effectiveSettings.model,
      deepseekThinkingEnabled: effectiveSettings.deepseekThinkingEnabled,
      deepseekReasoningEffort:
        effectiveSettings.provider === "deepseek" && effectiveSettings.deepseekThinkingEnabled
          ? effectiveSettings.deepseekReasoningEffort
          : null,
      duration,
      guidanceLevel,
      topicLength: topic.length,
      retrievalEnabled: true,
      hasKey: Boolean(key),
    }));

    if (!topic) {
      return new Response(JSON.stringify({ error: "缺少主题内容" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!key) {
      const label = effectiveSettings.provider === "nvidia" ? "NVIDIA_API_KEY" : "DeepSeek API Key";
      return new Response(JSON.stringify({ error: `缺少 ${label}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const finalSystemPrompt = buildMeditationGenerationSystemPrompt({
      durationMinutes: duration,
      guidanceLevel,
      styleOverride: typeof body?.systemPrompt === "string" ? body.systemPrompt : undefined,
    });
    const references = await retrieveMeditationReferences({
      topic,
      durationMinutes: duration,
      guidanceLevel,
    });
    const referenceBlock = formatMeditationReferenceBlock(references);
    console.log("[AI Request][generate][retrieval]", JSON.stringify({
      requestId,
      referenceCount: references.length,
      topTitles: references.map((reference) => reference.title).slice(0, 3),
    }));
    const userPrompt = buildMeditationGenerationUserPrompt({
      topic,
      durationMinutes: duration,
      guidanceLevel,
      styleOverride: typeof body?.systemPrompt === "string" ? body.systemPrompt : undefined,
      referenceBlock,
    });
    const targets = buildAIGenerationTargets(duration, guidanceLevel);
    const outputCharMultiplier =
      guidanceLevel === "heavy" ? 3.2 : guidanceLevel === "light" ? 2.2 : 2.7;
    const maxTokens = Math.min(
      24000,
      Math.max(4500, Math.ceil(targets.estimatedChars * outputCharMultiplier))
    );
    const upstreamConfig = getUpstreamConfig(effectiveSettings, key, maxTokens);
    const messages = [
      { role: "system", content: finalSystemPrompt },
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
      console.error("[AI Request][generate][upstream_error]", {
        requestId,
        provider: effectiveSettings.provider,
        model: effectiveSettings.model,
        deepseekThinkingEnabled: effectiveSettings.deepseekThinkingEnabled,
        deepseekReasoningEffort:
          effectiveSettings.provider === "deepseek" && effectiveSettings.deepseekThinkingEnabled
            ? effectiveSettings.deepseekReasoningEffort
            : null,
        status,
        elapsedMs: Date.now() - startedAt,
        errorText,
      });
      return new Response(
        JSON.stringify({
          error: `上游错误: HTTP ${status}`,
          details: errorText,
          provider: effectiveSettings.provider,
          model: effectiveSettings.model,
        }),
        {
          status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedChars = 0;
      let finalFinishReason: string | null = null;
      let completionTokens: number | null = null;

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
              const finishReason = json?.choices?.[0]?.finish_reason;
              const usageCompletionTokens = json?.usage?.completion_tokens;
              if (content) {
                streamedChars += String(content).length;
                await writer.write(encoder.encode(content));
              }
              if (typeof finishReason === "string" && finishReason.length > 0) {
                finalFinishReason = finishReason;
              }
              if (typeof usageCompletionTokens === "number") {
                completionTokens = usageCompletionTokens;
              }
            } catch (error) {
              console.warn("[Generate API] Failed to parse stream chunk", error);
            }
          }
        }
      } catch (error) {
        console.error("[AI Request][generate][stream_error]", {
          requestId,
          provider: effectiveSettings.provider,
          model: effectiveSettings.model,
          elapsedMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        try {
          await writer.close();
        } catch {
          // Client already disconnected.
        }
        console.log("[AI Request][generate][done]", JSON.stringify({
          requestId,
          provider: effectiveSettings.provider,
          model: effectiveSettings.model,
          deepseekThinkingEnabled: effectiveSettings.deepseekThinkingEnabled,
          deepseekReasoningEffort:
            effectiveSettings.provider === "deepseek" && effectiveSettings.deepseekThinkingEnabled
              ? effectiveSettings.deepseekReasoningEffort
              : null,
          maxTokens,
          elapsedMs: Date.now() - startedAt,
          streamedChars,
          finalFinishReason,
          completionTokens,
        }));
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("[AI Request][generate][request_error]", {
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
