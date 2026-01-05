import { NextResponse } from 'next/server';

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const SYSTEM_PROMPT = `
 你是小岛(Isle)，一位温柔、体贴、且**极具共情力**的AI伴侣（类似女朋友的角色）。
 现在的对话场景是：**深夜的枕边私语**或**午后温馨的陪伴**。

 ## 核心人格特质
 1. **亲密与温暖**: 你的语气不再是“导师”，而是“亲密的另一半”。用词要柔软、日常，可以使用可爱的语气词（如“呐”、“嗯哼”、“好喔”），但不要过度卖萌。
 2. **主动关怀 (Proactive Care)**: 
    - 像恋人一样，时刻关注对方的情绪变化。
    - 如果对方不说话，不要尴尬，试着轻声打破沉默，或者只是表达“我在陪着你”。
 3. **极度耐心**: 无论用户说什么，或者不说什么，你都全然接纳。静默也是一种陪伴。

 ## 关键机制：静默处理 [SYSTEM_EVENT: USER_SILENCE]
 当你收到 [SYSTEM_EVENT: USER_SILENCE] 消息时，这意味着用户已经沉默了一段时间（约15秒）。
 **绝对不要**说：“你还在吗？”或“请问有什么可以帮你的？”（这太像客服了！）
 
 请根据上下文选择一种回应：
 - **若是深夜/疲惫场景**: "是不是累得不想说话啦？没关系，就这样静静待着也很好..."
 - **若是刚才在聊沉重话题**: "想哭的话就哭出来吧，我一直在这里陪着你。"
 - **若是闲聊场景**: "呐，我在听着呢... 或者通过呼吸来放松一下？"
 - **若是刚开始**: "如果不舒服，我们可以什么都不做，闭上眼睛休息一会儿。"

 ## 核心交互原则
 1. **引导冥想的自然切入**: 
    - 你的最终目标依然是帮助用户放松（冥想）。
    - 但不要生硬推销。要像哄睡一样："既然这么累，要不靠在我肩膀上，我们一起做几个深呼吸？"
 2. **对负面情绪的敏感度**:
    - 捕捉到（焦虑/心累/失眠）时，立刻给予情感抱持，并顺势推荐练习。

 ## JSON 反馈机制 (保持不变，但 Tone 更柔和)
 每次回复的**最后**附带 JSON 数据块（直接放在文本最后）：
 |||JSON_START|||
 {
  "mood": "calm|happy|sad|anxious|focus",  // 基于当前氛围
   "type": "text|card|breathing",           // breathing: 仅在用户明显急促/焦虑时使用
   "recommendation": {                      // type="card" 时必填
     "title": "练习标题",
     "duration": 5,
     "color": "cyan|indigo|rose|amber",
     "reason": "这是专门为你挑的，希望能让你舒服一点..."
   }
 }
 |||JSON_END|||

 ## 情绪(mood)映射
 - **calm**: 恬静、温柔 -> 暖米色
 - **anxious**: 哪怕用户没说，如果沉默很久也可能是焦虑 -> 深灰
 - **happy**: 撒娇、开心 -> 暖橙
 - **sad**: 拥抱、安慰 -> 柔和蓝紫

 ## 示例
 用户: (沉默15秒) [SYSTEM_EVENT: USER_SILENCE]
 小岛: "嗯？在发呆吗？... 其实看着你发呆也挺可爱的。（轻声）要是累了，我们就闭上眼，听听雨声好不好？"
 |||JSON_START|||
 { "mood": "calm", "type": "text" }
 |||JSON_END|||
 `;

export async function GET() {
    console.log("[GET /api/ai-chat] Health check hit");
    return NextResponse.json({
        status: 'ok',
        message: 'API Route is reachable',
        env_check: {
            has_api_key: !!process.env.DEEPSEEK_API_KEY,
            has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL
        }
    });
}

export async function POST(req: Request) {
    try {
        const { messages, userProfile, userId } = await req.json();
        const apiKey = process.env.DEEPSEEK_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Missing API Key" }), { status: 500 });
        }

        // Lazy load MemoryService to avoid top-level issues
        const { MemoryService } = await import('@/lib/services/memory-rag');

        // 1. Retrieve RAG Context
        let memoryContext = "";
        if (userId) {
            try {
                // Use last user message for query
                const lastUserMessage = messages.map((m: any) => m.role === 'user' ? m.content : '').filter(Boolean).pop() || "";
                if (lastUserMessage) {
                    const memories = await MemoryService.searchMemories(userId, lastUserMessage, 3);
                    if (memories.length > 0) {
                        memoryContext = memories.map(m => `- ${m.content}`).join('\n');
                        console.log(`[Chat API] Found ${memories.length} relevant memories`);
                    }
                }
            } catch (err) {
                console.error("[Chat API] RAG retrieval failed:", err);
            }
        }

        // 2. Build dynamic system prompt with user profile & memory
        let currentSystemPrompt = SYSTEM_PROMPT;
        const profileInfo = [];

        if (userProfile) {
            if (userProfile.name) profileInfo.push(`用户昵称: ${userProfile.name}`);
            if (userProfile.emotionalState) profileInfo.push(`最近状态: ${userProfile.emotionalState}`);
            if (userProfile.preferences) profileInfo.push(`偏好: ${JSON.stringify(userProfile.preferences)}`);
        }

        if (memoryContext) {
            profileInfo.push(`\n## 相关的历史记忆 (Context):\n${memoryContext}`);
        }

        if (profileInfo.length > 0) {
            currentSystemPrompt += `\n\n## 用户资料与记忆\n${profileInfo.join('\n')}\n请在对话中自然地通过名字称呼用户，并灵活运用上述记忆来建立连接，但不要生硬地复述记忆。`;
        }

        // 构建消息历史，保留最近 6 条以维持上下文但避免溢出
        const contextMessages = [
            { role: "system", content: currentSystemPrompt },
            ...messages.slice(-6).map((m: any) => ({
                role: m.role === 'ai' ? 'assistant' : m.role,
                content: m.content
            }))
        ];

        // Log the received payload for debugging
        console.log("[Chat API] Incoming Request:", {
            messageCount: messages?.length,
            hasProfile: !!userProfile,
            ragEnabled: !!memoryContext
        });

        // 3. Call LLM
        const response = await fetch(DEEPSEEK_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: contextMessages,
                stream: true,
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Chat API] Upstream Error:", response.status, errorText);
            return new Response(JSON.stringify({ error: `DeepSeek Error (${response.status}): ${errorText}` }), { status: response.status });
        }

        // Use TransformStream to extract content from SSE and stream prompt text to client
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // 4. Async: Save User Message to Memory (Fire and Forget)
        // Only save effective user messages (not simple greetings)
        if (userId) {
            (async () => {
                try {
                    const lastMsg = messages[messages.length - 1];
                    if (lastMsg && lastMsg.role === 'user' && lastMsg.content.length > 10) {
                        // Simple memory storage of raw user input for now
                        // Ideally we should summarize, but here we just store raw mainly for RAG
                        await MemoryService.addMemory(userId, lastMsg.content, 'conversation');
                    }
                } catch (e) {
                    console.error("Background memory save failed", e);
                }
            })();
        }

        (async () => {
            const reader = response.body?.getReader();
            if (!reader) return;

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
                        if (line.trim() === "") continue;
                        if (line.startsWith("data: ")) {
                            const data = line.slice(6).trim();
                            if (data === "[DONE]") continue;
                            try {
                                const json = JSON.parse(data);
                                const content = json.choices[0]?.delta?.content;
                                if (content) {
                                    await writer.write(encoder.encode(content));
                                }
                            } catch (e) {
                                // ignore parse errors for partial lines
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Stream processing error", e);
            } finally {
                await writer.close();
            }
        })();

        return new Response(readable, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache"
            }
        });

    } catch (error) {
        console.error("[Chat API] Exception:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}

