import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { normalizeAISettings } from "../../../lib/ai-models";
import { buildDeepSeekChatCompletionBody } from "../../../lib/deepseek-chat";
import { buildAIGenerationTargets } from "@/lib/meditation-script-duration";
import { ensureTables, hasDb } from "@/lib/db";

function buildDynamicRules(durationMinutes: number, guidanceLevel: string) {
  const charsPerMinute = 260;
  const guidanceRatios: Record<string, number> = {
    light: 0.1,
    medium: 0.5,
    heavy: 0.7,
  };

  const textRatio = guidanceRatios[guidanceLevel] ?? guidanceRatios.medium;
  const totalSeconds = durationMinutes * 60;
  const targetTextSeconds = Math.round(totalSeconds * textRatio);
  const targetPauseSeconds = Math.round(totalSeconds * (1 - textRatio));
  const estimatedWords = Math.round(targetTextSeconds * (charsPerMinute / 60));

  const structureTemplates: Record<string, string> = {
    light: `【结构要求：轻引导】
- 仅保留简短开场 + 防走神提醒 + 结束
- 大量使用 [pause 60s], [pause 120s] 等超长停顿
- 让静默占据主导，像一个安静的陪伴者`,
    medium: `【结构要求：中引导】
- 分为 ${Math.max(3, Math.floor(durationMinutes / 3))} 个引导段落
- 段落间使用 [pause 15s] 到 [pause 30s]
- 句子间可用 [pause 3s] 到 [pause 5s]
- 引导语与静默保持 1:1 平衡`,
    heavy: `【结构要求：多引导】
- 持续语音引导，分为多个短段落
- 至少 ${Math.max(12, durationMinutes * 2)} 个引导段，避免过早结束
- 每句后短停 [pause 2s] 到 [pause 4s]
- 段落间 [pause 6s] 到 [pause 10s]
- 用连续声音牵引注意力
- 如果内容还未接近目标时长，不要提前收尾，继续展开身体扫描、呼吸、觉察与感官描绘`,
  };

  return `## 📐 本次生成参数
- ⏱️ 目标总时长：${durationMinutes} 分钟（${totalSeconds} 秒）
- 🎙️ 引导模式：${guidanceLevel === "light" ? "轻引导" : guidanceLevel === "heavy" ? "多引导" : "中引导"}

【时长分配】
- 📝 文本朗读时长：约 ${targetTextSeconds} 秒
- ⏸️ [pause] 总时长：约 ${targetPauseSeconds} 秒
- 🔢 目标字数：约 ${estimatedWords} 字

${structureTemplates[guidanceLevel] || structureTemplates.medium}

【强制约束 - 必须遵守】
1. 开头使用 [rate -10%] 设置舒缓语速
2. 最终字数必须约 ${estimatedWords} 字
3. 所有 [pause Xs] 的总和必须约 ${targetPauseSeconds} 秒
4. 直接输出脚本，不要任何解释或前言
5. 在达到目标时长之前，禁止提前总结、提前结束或快速收尾`;
}

function buildSystemPrompt(durationMinutes: number, guidanceLevel: string, systemPrompt?: string) {
  const immutableRules = `## 🔒 不可变输出规则（必须严格遵守）
1. 只输出纯脚本文本，禁止标题、前言、结尾解释、章节编号
2. 停顿使用 [pause Xs] 格式（X 为整数秒，如 [pause 5s]）
3. 语速调整使用 [rate ±N%] 格式（如 [rate -10%]）
4. 🚫 禁止输出任何舞台指示，如："（轻柔地）"、"（缓慢地说）"
5. 🚫 禁止使用 Markdown 格式（不要 **加粗** 或 *斜体*）
6. 🚫 禁止使用表情符号或特殊符号
7. 直接以冥想引导词开始，不要任何开场白`;

  const userGuidance = systemPrompt?.trim()
    ? `## 🎨 风格偏好（可适当参考，但不得违反上述规则）
${systemPrompt.trim()}`
    : "";

  return `${immutableRules}

${buildDynamicRules(durationMinutes, guidanceLevel)}

${userGuidance}`.trim();
}

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
          temperature: 0.5,
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
          temperature: 0.6,
          frequencyPenalty: 0.2,
          presencePenalty: 0.2,
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
    const prompt = String(body?.prompt || "");
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
      hasKey: Boolean(key),
    }));

    if (!key) {
      const label = effectiveSettings.provider === "nvidia" ? "NVIDIA_API_KEY" : "DeepSeek API Key";
      return new Response(JSON.stringify({ error: `缺少 ${label}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const finalSystemPrompt = buildSystemPrompt(duration, guidanceLevel, body?.systemPrompt);
    const targets = buildAIGenerationTargets(duration, guidanceLevel);
    const maxTokens = Math.min(
      24000,
      Math.max(4000, Math.ceil(targets.estimatedChars * 2.2))
    );
    const upstreamConfig = getUpstreamConfig(effectiveSettings, key, maxTokens);
    const messages = [
      { role: "system", content: finalSystemPrompt },
      { role: "user", content: prompt },
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
