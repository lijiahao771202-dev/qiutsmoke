import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { normalizeAISettings } from "../../../lib/ai-models";
import { buildDeepSeekChatCompletionBody } from "../../../lib/deepseek-chat";
import { ensureTables, hasDb } from "@/lib/db";
import {
  formatMeditationReferenceBlock,
  retrieveMeditationReferences,
} from "@/lib/meditation-rag";

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
    const style = String(body?.style || "standard");
    const duration = Number(body?.duration || 5);
    const guidanceLevel = String(body?.guidanceLevel || "medium");
    
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

    const references = await retrieveMeditationReferences({
      topic,
      durationMinutes: duration,
      guidanceLevel,
    });
    const referenceBlock = formatMeditationReferenceBlock(references);

    let styleInstruction = "";
    switch (style) {
      case "clinical":
        styleInstruction = "【风格要求：心理治愈】\n采用认知行为疗法（CBT）或接纳承诺疗法（ACT）的专业意象。隐喻要贴近心理疏导（如“将焦虑看作水面飘过的落叶”），注重情绪的抱持与接纳，不要过度追求画面华丽，而是追求深层的心理安全感。";
        break;
      case "poetic":
        styleInstruction = "【风格要求：散文诗意】\n语言必须像优美的现代诗或散文，辞藻丰富且感性。运用大量细腻、浪漫且具有张力的比喻（如“月光像融化的银水流入你的掌心”）。注重营造梦幻、唯美且极具艺术感的氛围。";
        break;
      case "cosmic":
        styleInstruction = "【风格要求：宇宙观想】\n将意识尺度无限放大，融入星辰、银河、深空或宏大的自然法则。意象要磅礴、空灵且带有哲思（如“你是由星尘构成的”、“感受地球的引力像温柔的手托举着你”）。";
        break;
      case "standard":
      default:
        styleInstruction = "【风格要求：自然正念】\n注重最纯粹的自然意象（如：森林、溪流、晨光、微风）。语言清晰自然、朴实且接地气，帮助用户快速将注意力锚定在物理世界的感官上。";
        break;
    }

    const systemPrompt = `你是一个世界级的正念冥想导师和AI提示词专家。用户会提供一个冥想主题，请将其扩展为一段高度详细、充满画面感、具有情感深度和感官细节的冥想意象设定，用于指导另一个AI撰写高质量的冥想正文。

${styleInstruction}

要求：
1. 采用模块化的结构输出，必须包含以下部分：
   - 【核心意境】（一句话概括整体氛围）
   - 【感官锚点】（分别描写视觉、听觉、触觉的细节）
   - 【情绪流淌】（描述从开始到结束的情绪转变过程）
   - 【呼吸隐喻】（描述呼吸与场景的互动关系）
2. 请仔细阅读下方的【知识库参考】，提取其中有价值的心理学隐喻、正念技巧或指导语，并将其巧妙地融入到你的【核心意境】和【情绪流淌】设计中，使得你的扩展提示词不仅好听，而且具有真实的心理疗效。
3. 绝对不要提及任何关于“语速”、“语调”、“主播声音”、“停顿”等语音演播相关的要求。
4. 直接输出意象设定本身，绝对不要出现“好的”、“为你提供”等任何寒暄或解释说明。

${referenceBlock}`;

    const userPrompt = `需要扩展的冥想主题：${topic}\n时长设定：${duration}分钟\n引导强度：${guidanceLevel === 'heavy' ? '多引导' : guidanceLevel === 'light' ? '轻引导' : '中引导'}`;
    const maxTokens = 600;
    
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
