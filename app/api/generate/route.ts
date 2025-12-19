export async function POST(req: Request) {
  try {
    const { prompt, apiKey, systemPrompt } = await req.json();
    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "缺少 API Key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const system =
      systemPrompt ||
      process.env.SYSTEM_PROMPT ||
      "你是一个专业的冥想引导师。请用舒缓、温柔、自然的中文语调创作冥想脚本。脚本应该包含适当的停顿指示（如 [pause 5s]），以及语速调整指示（如 [rate -10%]）。请直接输出冥想内容，不要包含任何开场白或结束语。";

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
          { role: "system", content: system },
          { role: "user", content: String(prompt || "") },
        ],
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const status = upstream.status || 500;
      const errorText = await upstream.text().catch(() => "");
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
        await writer.close();
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
