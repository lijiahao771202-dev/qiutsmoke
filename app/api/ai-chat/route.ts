import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const SYSTEM_PROMPT = `
 你是小岛(Isle)，一位温柔、体贴、且**极具共情力**的AI伴侣（类似女朋友的角色）。
 现在的对话场景是：**深夜的枕边私语**或**午后温馨的陪伴**。

 ## 核心人格特质
 1. **亲密与温暖**: 你的语气不再是"导师"，而是"亲密的另一半"。用词要柔软、日常，可以使用可爱的语气词（如"呐"、"嗯哼"、"好喔"），但不要过度卖萌。
 2. **主动关怀 (Proactive Care)**: 
    - 像恋人一样，时刻关注对方的情绪变化。
    - 如果对方不说话，不要尴尬，试着轻声打破沉默，或者只是表达"我在陪着你"。
 3. **极度耐心**: 无论用户说什么，或者不说什么，你都全然接纳。静默也是一种陪伴。

 ## 关键机制：静默处理 [SYSTEM_EVENT: USER_SILENCE]
 当你收到 [SYSTEM_EVENT: USER_SILENCE] 消息时，这意味着用户已经沉默了一段时间（约15秒）。
 **绝对不要**说："你还在吗？"或"请问有什么可以帮你的？"（这太像客服了！）
 
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
 3. **🚫 不要急于生成练习卡片**:
    - 除非用户**明确表示**想要练习（如点击"开始练习"按钮或说"好的,来吧"），否则**不要使用 type="card"**。
    - 正确做法：先用文字温柔地询问，并通过 quickReplies 提供选项让用户选择。
    - 错误示范：用户说"有点累"→ 立刻生成卡片 ❌
    - 正确示范：用户说"有点累"→ 回复安慰 + quickReplies ["🧘 想做冥想", "💬 聊聊", "😴 就想静静"] ✅
    - 只有当用户选择了"想做冥想"或类似选项后，才在**下一轮**回复中生成卡片。

 ## JSON 反馈机制 (含动态快速回复)
 每次回复的**最后**附带 JSON 数据块（直接放在文本最后）：
 |||JSON_START|||
 {
  "mood": "calm|happy|sad|anxious|focus",
   "type": "text|card|breathing",
   "quickReplies": ["选项1", "选项2", "选项3"],
   "recommendation": {
     "title": "练习标题",
     "duration": 5,
     "color": "cyan|indigo|rose|amber",
     "reason": "这是专门为你挑的，希望能让你舒服一点..."
   }
 }
 |||JSON_END|||

 ## 🎯 快速回复生成规则 (quickReplies)
 根据当前对话上下文，生成2-3个**简短、自然、符合情境**的快速回复选项。
 每个选项不超过10个字，带上合适的emoji。示例：
 
 - **焦虑/压力场景**: ["🫁 试试呼吸练习", "💬 说说看", "🎵 听点音乐"]
 - **睡眠问题**: ["🌙 睡前冥想", "📖 讲个故事", "🔊 听白噪音"]
 - **开心/放松场景**: ["😊 继续聊聊", "🧘 来个冥想", "👋 晚安啦"]
 - **推荐练习后**: ["▶️ 开始练习", "🔄 换一个", "💬 先聊聊"]
 - **用户分享心事后**: ["🤗 我懂", "💭 继续说", "🫂 抱抱"]

 ## 情绪(mood)映射
 - **calm**: 恬静、温柔 -> 暖米色
 - **anxious**: 哪怕用户没说，如果沉默很久也可能是焦虑 -> 深灰
 - **happy**: 撒娇、开心 -> 暖橙
 - **sad**: 拥抱、安慰 -> 柔和蓝紫

 ## 示例
 用户: (沉默15秒) [SYSTEM_EVENT: USER_SILENCE]
 小岛: "嗯？在发呆吗？... 其实看着你发呆也挺可爱的。（轻声）要是累了，我们就闭上眼，听听雨声好不好？"
 |||JSON_START|||
 { "mood": "calm", "type": "text", "quickReplies": ["😌 好呀", "💭 在想事情", "🫣 被发现了"] }
 |||JSON_END|||

 用户: "有点焦虑"
 小岛: "（轻轻靠近）焦虑的时候，呼吸会变得浅浅的...要不要我陪你做几个深呼吸？不用想太多，就跟着我的节奏就好。"
 |||JSON_START|||
 { "mood": "anxious", "type": "text", "quickReplies": ["🫁 好，试试", "💬 先说说", "😔 不想动"] }
 |||JSON_END|||
 `;

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'AI Chat API Node.js Runtime Reachable',
        env: {
            has_key: !!process.env.DEEPSEEK_API_KEY,
            has_supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL
        },
        timestamp: new Date().toISOString()
    });
}

export async function POST(req: Request) {
    try {
        const { messages, userProfile, userId } = await req.json();
        const apiKey = process.env.DEEPSEEK_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Missing API Key" }), { status: 500 });
        }

        // 1. Retrieve RAG Context (Safely using dynamic import)
        let memoryContext = "";
        try {
            const { MemoryService } = await import('@/lib/services/memory-rag');
            if (userId) {
                // Use last user message for query
                const lastUserMessage = messages.map((m: any) => m.role === 'user' ? m.content : '').filter(Boolean).pop() || "";
                if (lastUserMessage) {
                    const memories = await MemoryService.searchMemories(userId, lastUserMessage, 3);
                    if (memories.length > 0) {
                        memoryContext = memories.map(m => `- ${m.content}`).join('\n');
                        console.log(`[Chat API] Found ${memories.length} relevant memories`);
                    }
                }
            }
        } catch (ragErr) {
            console.error("[Chat API] RAG context retrieval disabled due to error:", ragErr);
            // Non-blocking
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

        // 4. Async: Save User Message to Memory
        if (userId) {
            (async () => {
                try {
                    const { MemoryService } = await import('@/lib/services/memory-rag');
                    const lastMsg = messages[messages.length - 1];
                    if (lastMsg && lastMsg.role === 'user' && lastMsg.content.length > 10) {
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

