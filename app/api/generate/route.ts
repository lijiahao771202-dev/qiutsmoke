import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { normalizeAISettings } from "../../../lib/ai-models";
import { buildDeepSeekChatCompletionBody } from "../../../lib/deepseek-chat";
import {
  buildMimoChatCompletionBody,
  getMimoChatCompletionsUrl,
  resolveMimoAIKey,
  shouldRetryMimoAITransportError,
} from "../../../lib/mimo-ai";
import {
  buildAIGenerationTargets,
  estimateMeditationScriptDurationSeconds,
  formatDurationMinutes,
} from "@/lib/meditation-script-duration";
import {
  buildMeditationGenerationSystemPrompt,
  buildMeditationGenerationUserPrompt,
} from "@/lib/meditation-generation-prompt";
import {
  formatMeditationReferenceBlock,
  retrieveMeditationReferences,
} from "@/lib/meditation-rag";
import { ensureTables, hasDb } from "@/lib/db";
import {
  GENERATE_ERROR_END,
  GENERATE_ERROR_START,
  GENERATE_RAG_END,
  GENERATE_RAG_START,
  GENERATE_REPLACE,
} from "@/lib/generate-stream-protocol";
import {
  buildRevisionGenerationUserPrompt,
  normalizeGenerateRevision,
} from "@/lib/generate-revision";

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
      provider,
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

  if (provider === "mimo") {
    return {
      provider,
      url: getMimoChatCompletionsUrl(),
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${key}`,
      },
      body: (messages: Array<{ role: string; content: string }>) =>
        JSON.stringify(
          buildMimoChatCompletionBody({
            model,
            messages,
            temperature: 0.45,
            maxTokens,
            frequencyPenalty: 0.1,
            presencePenalty: 0.1,
            stream: true,
          })
        ),
    };
  }

  return {
    provider,
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

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CompletionFetchResult =
  | {
      ok: true;
      text: string;
      finalFinishReason: string | null;
      completionTokens: number | null;
      attempts: number;
    }
  | {
      ok: false;
      status: number;
      errorText: string;
      attempts: number;
    };

async function streamCompletionText(
  upstreamConfig: ReturnType<typeof getUpstreamConfig>,
  messages: ChatMessage[],
  onText: (text: string) => Promise<void>
): Promise<CompletionFetchResult> {
  const maxAttempts = upstreamConfig.provider === "mimo" ? 3 : 1;
  let lastErrorText = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let wroteContent = false;

    try {
      const upstream = await fetch(upstreamConfig.url, {
        method: "POST",
        headers: upstreamConfig.headers,
        body: upstreamConfig.body(messages),
      });

      if (!upstream.ok || !upstream.body) {
        return {
          ok: false,
          status: upstream.status || 500,
          errorText: await upstream.text().catch(() => ""),
          attempts: attempt,
        };
      }

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      let finalFinishReason: string | null = null;
      let completionTokens: number | null = null;

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
              const chunk = String(content);
              wroteContent = true;
              text += chunk;
              await onText(chunk);
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

      return {
        ok: true,
        text,
        finalFinishReason,
        completionTokens,
        attempts: attempt,
      };
    } catch (error) {
      const retryable =
        upstreamConfig.provider === "mimo" &&
        !wroteContent &&
        shouldRetryMimoAITransportError(error);
      lastErrorText = error instanceof Error ? error.message : String(error);
      if (!retryable || attempt >= maxAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, 900 * attempt));
    }
  }

  return {
    ok: false,
    status: 502,
    errorText: `上游连接中断：${lastErrorText || "unknown transport error"}`,
    attempts: maxAttempts,
  };
}

function buildGenerateStreamErrorPayload(error: string, details?: string) {
  return `${GENERATE_ERROR_START}${JSON.stringify({ error, details: details || error })}${GENERATE_ERROR_END}`;
}

function shouldRetryShortDraft(estimatedSeconds: number, targetSeconds: number) {
  return estimatedSeconds < targetSeconds * 0.95;
}

function buildDurationRetryPrompt(
  baseUserPrompt: string,
  estimatedSeconds: number,
  targetSeconds: number
) {
  const missingMinutes = formatDurationMinutes(Math.max(0, targetSeconds - estimatedSeconds));
  return `${baseUserPrompt}

【时长纠偏指令】
上一版预计仅约 ${formatDurationMinutes(estimatedSeconds)} 分钟，明显短于目标 ${formatDurationMinutes(targetSeconds)} 分钟，缺口约 ${missingMinutes} 分钟。
请重新从头生成一版完整成品，不要续写旧稿，不要解释原因，不要引用“上一版”。
这次必须通过增加主体阶段展开、体感分层、走神回归后的再次停留、自然停顿与整合停留，把全文时长拉近目标。
宁可略长，不可明显短；在未接近目标前，绝对不要提前收束。`;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  try {
    const body = await req.json();
    const duration = Number(body?.duration) || 10;
    const guidanceLevel = typeof body?.guidanceLevel === "string" ? body.guidanceLevel : "medium";
    const topic = String(body?.topic || body?.prompt || "").trim();
    const details = String(body?.details || "").trim();
    const revision = normalizeGenerateRevision(body?.revision);
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
        : effectiveSettings.provider === "mimo"
          ? resolveMimoAIKey()
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
      detailsLength: details.length,
      revisionEnabled: Boolean(revision),
      revisionFeedbackLength: revision?.feedback.length || 0,
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
      const label =
        effectiveSettings.provider === "nvidia"
          ? "NVIDIA_API_KEY"
          : effectiveSettings.provider === "mimo"
            ? "MIMO_API_KEY"
            : "DeepSeek API Key";
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
    const references = await retrieveMeditationReferences(
      {
        topic,
        durationMinutes: duration,
        guidanceLevel,
      },
      {
        limit: 8,
        perSampleLimit: 2,
      }
    );
    const promptReferenceCount = Math.min(references.length, 6);
    const referenceBlock = formatMeditationReferenceBlock(references, {
      maxReferences: promptReferenceCount,
      excerptLength: 420,
    });
    console.log("[AI Request][generate][retrieval]", JSON.stringify({
      requestId,
      referenceCount: references.length,
      promptReferenceCount,
      topTitles: references.map((reference) => `${reference.title}:${reference.id}`).slice(0, 5),
    }));
    const baseUserPrompt = buildMeditationGenerationUserPrompt({
      topic,
      details,
      durationMinutes: duration,
      guidanceLevel,
      styleOverride: typeof body?.systemPrompt === "string" ? body.systemPrompt : undefined,
      referenceBlock,
    });
    const userPrompt = revision
      ? buildRevisionGenerationUserPrompt(baseUserPrompt, revision)
      : baseUserPrompt;
    const targets = buildAIGenerationTargets(duration, guidanceLevel);
    const outputCharMultiplier =
      guidanceLevel === "heavy" ? 3.2 : guidanceLevel === "light" ? 2.2 : 2.7;
    const maxTokens = Math.min(
      24000,
      Math.max(4500, Math.ceil(targets.estimatedChars * outputCharMultiplier))
    );
    const upstreamConfig = getUpstreamConfig(effectiveSettings, key, maxTokens);
    const messages: ChatMessage[] = [
      { role: "system", content: finalSystemPrompt },
      { role: "user", content: userPrompt },
    ];

    const referencesPayload = JSON.stringify({
      query: {
        topic,
        durationMinutes: duration,
        guidanceLevel,
      },
      promptReferenceCount,
      references: references.map((reference) => ({
        id: reference.id,
        title: reference.title,
        content: reference.content,
        excerpt: reference.excerpt,
        reason: reference.reason,
        score: Number(reference.score.toFixed(4)),
        stage: reference.metadata.stage,
        chunkKind: reference.metadata.chunkKind,
        durationMinutes: reference.metadata.durationMinutes,
        guidanceLevel: reference.metadata.guidanceLevel,
        sceneTags: reference.metadata.sceneTags,
        emotionTags: reference.metadata.emotionTags,
        techniques: reference.metadata.techniques,
        practiceModes: reference.metadata.practiceModes,
        silenceStyle: reference.metadata.silenceStyle,
      })),
    });

    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const writeText = async (chunk: string) => {
      await writer.write(encoder.encode(chunk));
    };

    (async () => {
      try {
        await writeText(`${GENERATE_RAG_START}${referencesPayload}${GENERATE_RAG_END}`);

        const initialResult = await streamCompletionText(upstreamConfig, messages, writeText);

        if (initialResult.ok === false) {
          const status = initialResult.status || 500;
          const errorText = initialResult.errorText;
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
          await writeText(buildGenerateStreamErrorPayload(`上游错误: HTTP ${status}`, errorText));
          return;
        }

        const initialEstimatedSeconds = estimateMeditationScriptDurationSeconds(initialResult.text);
        let finalDraft = {
          text: initialResult.text,
          estimatedSeconds: initialEstimatedSeconds,
          finalFinishReason: initialResult.finalFinishReason,
          completionTokens: initialResult.completionTokens,
          source: "initial",
        };

        if (shouldRetryShortDraft(initialEstimatedSeconds, targets.totalSeconds)) {
          const retryMaxTokens = Math.min(24000, Math.max(maxTokens + 2000, Math.ceil(maxTokens * 1.35)));
          const retryUpstreamConfig = getUpstreamConfig(effectiveSettings, key, retryMaxTokens);
          const retryMessages: ChatMessage[] = [
            { role: "system", content: finalSystemPrompt },
            {
              role: "user",
              content: buildDurationRetryPrompt(
                userPrompt,
                initialEstimatedSeconds,
                targets.totalSeconds
              ),
            },
          ];
          let didReplace = false;
          const retryResult = await streamCompletionText(retryUpstreamConfig, retryMessages, async (chunk) => {
            if (!didReplace) {
              await writeText(GENERATE_REPLACE);
              didReplace = true;
            }
            await writeText(chunk);
          });

          if (retryResult.ok === true) {
            const retryEstimatedSeconds = estimateMeditationScriptDurationSeconds(retryResult.text);
            finalDraft = {
              text: retryResult.text,
              estimatedSeconds: retryEstimatedSeconds,
              finalFinishReason: retryResult.finalFinishReason,
              completionTokens: retryResult.completionTokens,
              source: "retry",
            };

            console.log("[AI Request][generate][retry]", JSON.stringify({
              requestId,
              targetMinutes: formatDurationMinutes(targets.totalSeconds),
              initialMinutes: formatDurationMinutes(initialEstimatedSeconds),
              retryMinutes: formatDurationMinutes(retryEstimatedSeconds),
              chosenSource: "retry",
              retryMaxTokens,
            }));
          } else {
            console.warn("[AI Request][generate][retry_failed]", JSON.stringify({
              requestId,
              status: retryResult.status,
              errorText: retryResult.errorText,
            }));
            if (didReplace) {
              await writeText(buildGenerateStreamErrorPayload("重试生成中断", retryResult.errorText));
            }
          }
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
          finalFinishReason: finalDraft.finalFinishReason,
          completionTokens: finalDraft.completionTokens,
          finalDraftMinutes: formatDurationMinutes(finalDraft.estimatedSeconds),
          targetMinutes: formatDurationMinutes(targets.totalSeconds),
          source: finalDraft.source,
        }));
      } catch (error) {
        console.error("[AI Request][generate][stream_error]", {
          requestId,
          elapsedMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        });
        await writeText(buildGenerateStreamErrorPayload("生成流中断", error instanceof Error ? error.message : String(error))).catch(() => undefined);
      } finally {
        await writer.close().catch(() => undefined);
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
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
