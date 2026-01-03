export async function POST(req: Request) {
  try {
    const { prompt, apiKey, systemPrompt, duration, guidanceLevel } = await req.json();
    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    console.log("[Generate API] Key present:", !!key, "Duration:", duration, "Guidance:", guidanceLevel);

    if (!key) {
      console.error("[Generate API] Missing API Key");
      return new Response(JSON.stringify({ error: "缺少 API Key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ============================================
    // 🏗️ 三层提示词架构（分层优先级）
    // ============================================

    // 📌 层级 1：不可变核心规则（AI 必须遵守）
    const IMMUTABLE_RULES = `## 🔒 不可变输出规则（必须严格遵守）
1. 只输出纯脚本文本，禁止标题、前言、结尾解释、章节编号
2. 停顿使用 [pause Xs] 格式（X 为整数秒，如 [pause 5s]）
3. 语速调整使用 [rate ±N%] 格式（如 [rate -10%]）
4. 🚫 禁止输出任何舞台指示，如："（轻柔地）"、"（缓慢地说）"
5. 🚫 禁止使用 Markdown 格式（不要 **加粗** 或 *斜体*）
6. 🚫 禁止使用表情符号或特殊符号
7. 直接以冥想引导词开始，不要任何开场白`;

    // 📐 层级 2：动态参数（采用声波工坊经过验证的计算公式）
    const buildDynamicRules = (dur: number, level: string) => {
      // ============================================
      // 🧮 时长计算公式（来自声波工坊，已验证准确）
      // ============================================

      // 1. 朗读速度：260 字/分钟（声波工坊经验值，已验证准确）
      const CHARS_PER_MINUTE = 260;

      // 2. 引导模式决定文本 vs 静默的比例
      const guidanceRatios: Record<string, number> = {
        light: 0.10,   // 轻引导：10% 文本，90% pause
        medium: 0.50,  // 中引导：50% 文本，50% pause
        heavy: 0.70    // 多引导：70% 文本，30% pause
      };
      const textRatio = guidanceRatios[level] || 0.50;

      // 3. 计算时间预算
      const totalSeconds = dur * 60;
      const targetTextSeconds = Math.round(totalSeconds * textRatio);     // 文本朗读时长
      const targetPauseSeconds = Math.round(totalSeconds * (1 - textRatio)); // [pause] 总和

      // 4. 计算目标字数
      const estimatedWords = Math.round(targetTextSeconds * (CHARS_PER_MINUTE / 60));

      // 5. 根据引导模式生成结构要求
      const structureTemplates: Record<string, string> = {
        light: `【结构要求：轻引导】
- 仅保留简短开场 + 防走神提醒 + 结束
- 大量使用 [pause 60s], [pause 120s] 等超长停顿
- 让静默占据主导，像一个安静的陪伴者`,

        medium: `【结构要求：中引导】
- 分为 ${Math.max(3, Math.floor(dur / 3))} 个引导段落
- 段落间使用 [pause 15s] 到 [pause 30s]
- 句子间可用 [pause 3s] 到 [pause 5s]
- 引导语与静默保持 1:1 平衡`,

        heavy: `【结构要求：多引导】
- 持续语音引导，分为多个短段落
- 每句后短停 [pause 2s] 到 [pause 4s]
- 段落间 [pause 6s] 到 [pause 10s]
- 用连续声音牵引注意力`
      };

      return `## 📐 本次生成参数
- ⏱️ 目标总时长：${dur} 分钟（${totalSeconds} 秒）
- 🎙️ 引导模式：${level === 'light' ? '轻引导' : level === 'heavy' ? '多引导' : '中引导'}

【时长分配】
- 📝 文本朗读时长：约 ${targetTextSeconds} 秒
- ⏸️ [pause] 总时长：约 ${targetPauseSeconds} 秒
- 🔢 目标字数：约 ${estimatedWords} 字

${structureTemplates[level] || structureTemplates.medium}

【强制约束 - 必须遵守】
1. 开头使用 [rate -10%] 设置舒缓语速
2. 最终字数必须约 ${estimatedWords} 字
3. 所有 [pause Xs] 的总和必须约 ${targetPauseSeconds} 秒
4. 直接输出脚本，不要任何解释或前言`;
    };

    // 🎨 层级 3：用户自定义系统提示词（作为风格建议，优先级最低）
    const userGuidance = (systemPrompt && systemPrompt.trim())
      ? `## 🎨 风格偏好（可适当参考，但不得违反上述规则）
${systemPrompt}`
      : '';

    // 组合最终系统提示词
    const finalSystemPrompt = `${IMMUTABLE_RULES}

${buildDynamicRules(duration || 10, guidanceLevel || 'medium')}

${userGuidance}`.trim();

    console.log("[Generate API] System prompt length:", finalSystemPrompt.length);

    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: String(prompt || "") },
        ],
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const status = upstream.status || 500;
      const errorText = await upstream.text().catch(() => "");
      console.error(`[Generate API] Upstream Error: HTTP ${status}`, errorText);
      return new Response(JSON.stringify({ error: `上游错误: HTTP ${status}`, details: errorText }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Use TransformStream for Edge Runtime compatibility
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Process stream in background
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
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const content = json?.choices?.[0]?.delta?.content;
                if (content) {
                  await writer.write(encoder.encode(content));
                }
              } catch { }
            }
          }
        }
      } catch (e) {
        console.error("Stream processing error:", e);
      } finally {
        try {
          await writer.close();
        } catch {
          // Writer already closed (client disconnected)
        }
      }
    })();

    return new Response(readable, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    console.error("Request parsing error:", e);
    return new Response(JSON.stringify({ error: "请求解析失败" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const runtime = 'edge';
