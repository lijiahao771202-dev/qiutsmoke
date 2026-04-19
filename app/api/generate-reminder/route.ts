import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { normalizeAISettings } from "../../../lib/ai-models";
import { ensureTables, hasDb } from "@/lib/db";

async function resolveStoredAISettings() {
    const jar = await cookies();
    const cookieSettings = normalizeAISettings({
        provider: jar.get("ai_provider")?.value,
        model: jar.get("ai_model")?.value,
    });

    if (!hasDb()) {
        return cookieSettings;
    }

    const uid = jar.get("uid")?.value || "";
    if (!uid) {
        return cookieSettings;
    }

    await ensureTables();
    const rows = await sql`SELECT ai_provider, ai_model FROM user_settings WHERE user_id = ${uid}`;

    return normalizeAISettings({
        provider: jar.get("ai_provider")?.value || rows.rows?.[0]?.ai_provider,
        model: jar.get("ai_model")?.value || rows.rows?.[0]?.ai_model,
    });
}

function getUpstreamConfig(provider: "deepseek" | "nvidia", model: string, key: string) {
    const configWrapper = (messages: any[], tools?: any[], tool_choice?: any) => {
        const payload: any = {
            model,
            messages,
            temperature: provider === "nvidia" ? 1.2 : 0.6,
            frequency_penalty: provider === "nvidia" ? 0.6 : 0.2,
            presence_penalty: provider === "nvidia" ? 0.6 : 0.2,
            stream: tools ? false : true,
            max_tokens: tools ? 150 : undefined,
        };
        if (tools) {
            payload.tools = tools;
            payload.tool_choice = tool_choice;
        }
        return JSON.stringify(payload);
    };

    if (provider === "nvidia") {
        return {
            url: "https://integrate.api.nvidia.com/v1/chat/completions",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${key}`,
            },
            body: configWrapper
        };
    }

    return {
        url: "https://api.deepseek.com/chat/completions",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
        },
        body: configWrapper
    };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { mood, mode, elapsedTime, totalTime, sessionPhase = "middle", history = [], userAction, practiceCount = 0, diagnosisProfile = "" } = body;

        const storedSettings = await resolveStoredAISettings();
        const effectiveSettings = normalizeAISettings({
            provider: body?.provider ?? storedSettings.provider,
            model: body?.model ?? storedSettings.model,
        });

        const key =
            effectiveSettings.provider === "nvidia"
                ? process.env.NVIDIA_API_KEY
                : body?.apiKey || process.env.DEEPSEEK_API_KEY;

        if (!key) {
            return new Response(JSON.stringify({ error: "缺少 API Key" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Construct Prompts
        let systemPrompt = "";
        let rainStage = "";
        let rainCommand = "";
        let activeSkillFile = "";

        if (mode === 'urge_surfing') {
            console.log(`[SURF DEBUG] elapsedTime=${elapsedTime}, sessionPhase=${sessionPhase}, diagnosisProfile=${diagnosisProfile ? 'YES' : 'EMPTY'}`);
            
            // Fixed phase boundaries (optimized for open-ended count-up sessions)
            // Phase 0 (Diagnosis):   0 - 30s   → 1 heartbeat buffer after opening
            // Phase 1 (Recognize):  30 - 90s   → direct confrontation
            // Phase 2 (Allow):      90 - 150s  → surrender & accept
            // Phase 3 (Investigate):150 - 480s  → deep microscope deconstruction & body scan
            // Phase 4 (Non-ID):     480s+       → detachment & score review

            if (elapsedTime <= 40) {
                rainStage = "【第0阶段：D - Diagnosis 诊断与上板】（0-40秒）";
                activeSkillFile = "brewer_rain_stage_0.md";
            } else if (elapsedTime <= 180) {
                rainStage = "【第1阶段：R - Recognize 识别与认出】（45-180秒）";
                activeSkillFile = "brewer_rain_stage_1.md";
            } else if (elapsedTime <= 300) {
                rainStage = "【第2阶段：A - Allow 接纳与允许】（180-300秒）";
                activeSkillFile = "brewer_rain_stage_2.md";
            } else if (elapsedTime <= 600) {
                rainStage = "【第3阶段：I - Investigate 好奇探究】（300-600秒）";
                activeSkillFile = "brewer_rain_stage_3.md";
            } else {
                rainStage = "【第4阶段：N - Note 标记与觉察】（600秒以后）";
                activeSkillFile = "brewer_rain_stage_4.md";
            }

            // 动态加载对应的 Skill 教案（Node.js Runtime支持 fs 操作，Vercel建议配合静态路径）
            let rainCommand = "由于服务器未能找到对应的教案文件，请你仅遵循基础的冲浪和接纳理论进行干预。";
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const fs = require('fs');
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const path = require('path');
                const skillPath = path.join(process.cwd(), 'app', 'api', 'generate-reminder', 'skills', activeSkillFile);
                rainCommand = fs.readFileSync(skillPath, 'utf8');
            } catch (fsError) {
                console.error("Failed to load clinical skill md file:", fsError);
            }

            let stepGuidance = `
【当前教学阶段指示】你现在所处的急救阶段为：
${rainStage}

你接下来将仅针对该阶段发声。你必须严格、冷酷并且逐字逐句地执行以下《布鲁尔正念临床操作手册》中为该阶段指定的特殊指令：

======================
${rainCommand}
======================

**【严重警告：理论贯穿与阶段锁死机制】**：
1. 你的每一句话，都**必须带着浓厚的“冲浪（Urge Surfing）”意象体系**（海浪、冲浪板、深潜、水面起伏）。绝对不要用怪兽、拔河等破除沉浸感的比喻。
2. 绝对聚焦当前新阶段！你必须立刻与历史记录中的上一阶段划清界限！如果现在是I阶段，就必须抛弃R阶段的台词惯性，坚决执行当前阶段的新动作！
3. 只要用户没按下结束，**绝对不准**下定论说“最狂暴的时刻已经过去”，必须默认下一波风暴随时来临。`;

            systemPrompt = `# 交互背景与视觉形式（极度重要）
这是一场单向的音声指引，目标是对成瘾者做极度的理智打断。
【当前阶段】：${rainStage}，历时 ${elapsedTime} 秒
【临床情报】：${diagnosisProfile || "无"}

# 函数调用铁律（Function Calling）
1. 你的发话**必须且只能通过调用工具 'deliver_coach_speech' 返回**！绝对不可以直接在聊天窗口输出文字！
2. 'speech' 参数需提供不超过30个字的绝命指令，开头必须带有所属阶段标签（例如：【第1阶段】）。
3. 请依靠你的推理能力，仔细阅读下方本阶段的操作手册，提取其中某个合适的策略并作为语音参数输出。严禁复读你上一秒刚说过的句子。

========================================
# 【当前阶段操作手册本】
${stepGuidance}
========================================`;
        } else {
            systemPrompt = `你是一个拥有极高觉知力的专业正念导师。现在用户正在进行一段 ${totalTime} 分钟的打坐冥想。
当前时间点：处于第 ${elapsedTime} 秒（进度：${Math.round(elapsedTime / 60)}分钟）。
当前触发阶段：${sessionPhase}（首部/中途/尾声）。
用户当前的心境/状态识别为：【${mood || "平静"}】
用户选择的主题模式为：【${mode || "常规正念"}】。

${sessionPhase === 'start' ? '【当前为开场白】请生成具有包容感和建立初相意图的开场短句。引导用户闭上眼睛，专注于下一次呼吸，放下执念和对前事的牵挂。' : 
sessionPhase === 'end' ? '【当前为结束语】请生成温和的结语。引导用户慢慢唤醒身体，将过去 ${totalTime} 分钟里积聚的内在力量和觉察带回到现实生活中，并准备睁开双眼。' :
'【当前为中途提示】你需要极其敏锐地抓取时间和用户心理的交汇点，生成防走神的拉回提示语。'}

【绝对规则约束】
1. 不解释，不打招呼，直接输出纯正念短句文本。总字数严格控制在30字左右。
2. 绝对不可直接提到“烟”“抽烟”“戒烟”“游戏”“手机”等实体词刺激对方。可以把欲望隐喻为“一股升起的原始冲动”、“海浪般的执念”、“某个不属于你的抓取感”等。
3. 引导方式要符合 RAIN 模型（察觉-允许-探究-非认同）。比如：“察觉到那股想向外抓取的冲动了吗？不要抗拒，只是在呼吸中静静看着它起伏。”
4. 不要一次输出多句话，只输出唯一一句当前阶段该说的贴心指引。`;
        }

        const upstreamConfig = getUpstreamConfig(effectiveSettings.provider, effectiveSettings.model, key);
        
        let messages: any[] = [];
        let tools: any[] | undefined = undefined;
        let tool_choice: any = undefined;
        
        if (mode === 'urge_surfing') {
            // For Urge Surfing, we explicitly run a STATELESS architecture to prevent cross-stage contamination.
            messages = [ { role: "system", content: systemPrompt } ];
            tools = [{
                type: "function",
                "function": {
                    name: "deliver_coach_speech",
                    description: "Deliver a cold, objective, and forceful RAIN coaching instruction.",
                    parameters: {
                        type: "object",
                        properties: {
                            speech: {
                                type: "string",
                                description: "The exact 30-word instruction to be spoken to the user. MUST start with the stage prefix like 【第1阶段】."
                            }
                        },
                        required: ["speech"]
                    }
                }
            }];
            tool_choice = { type: "function", "function": { name: "deliver_coach_speech" } };
            
            if (userAction) {
                messages.push({
                    role: "user",
                    content: `【主动觉察报告】用户当前感受："${userAction}"\n请严格根据当前《阶段手册》回应。必须调用 deliver_coach_speech！`
                });
            } else {
                messages.push({ 
                    role: "user", 
                    content: `时间到了第 ${elapsedTime} 秒，用户没有屈服。请根据手册随机执行一条指令，必须调用 deliver_coach_speech！` 
                });
            }
        } else {
            // Normal Meditation Mode
            const normalizedHistory: any[] = [];
            for (let i = 0; i < history.length; i++) {
                const msg = history[i];
                if (msg.role === 'assistant' && (i === 0 || history[i-1].role === 'assistant')) {
                    normalizedHistory.push({ role: 'user', content: '（自动时间推移：此时用户仍在聆听，请依照教练规则继续发话。）' });
                }
                normalizedHistory.push(msg);
            }

            messages = [
                { role: "system", content: systemPrompt },
                ...normalizedHistory,
                { role: "user", content: userAction ? `我现在的感受/操作是：${userAction}` : "请根据此刻的时间点和我的心态特征，为我生成当下一句适时的冥想指导语。" }
            ];
        }

        const upstream = await fetch(upstreamConfig.url, {
            method: "POST",
            headers: upstreamConfig.headers,
            body: upstreamConfig.body(messages, tools, tool_choice),
        });

        if (!upstream.ok) {
            const status = upstream.status;
            const errorText = await upstream.text();
            console.error("[Generate-Reminder API] Upstream error:", status, errorText);
            return new Response(JSON.stringify({ error: `上游错误: HTTP ${status}` }), {
                status,
                headers: { "Content-Type": "application/json" },
            });
        }

        const encoder = new TextEncoder();
        
        let stream: ReadableStream;
        
        if (mode === 'urge_surfing') {
            const data = await upstream.json();
            const toolCalls = data.choices?.[0]?.message?.tool_calls;
            let speechContent = "";
            if (toolCalls && toolCalls.length > 0) {
                try {
                    const args = JSON.parse(toolCalls[0].function.arguments);
                    speechContent = args.speech;
                } catch(e) { console.error("Tool call parse error", e); }
            }
            if (!speechContent) speechContent = data.choices?.[0]?.message?.content || "好的。";
            
            stream = new ReadableStream({
                start(controller) {
                    const meta = JSON.stringify({ 
                        activeSkill: activeSkillFile, 
                        rainStage: rainStage,
                        toolCalled: true,
                        functionName: "deliver_coach_speech"
                    });
                    controller.enqueue(encoder.encode(`__META__=${meta}\n`));
                    controller.enqueue(encoder.encode(speechContent));
                    controller.close();
                }
            });
        } else {
            // Instead of waiting for full response, create a transform stream
            stream = new ReadableStream({
                async start(controller) {
                    // 1. Send the META block so frontend can update its UI instantly
                    const meta = JSON.stringify({ activeSkill: activeSkillFile, rainStage: rainStage });
                    controller.enqueue(encoder.encode(`__META__=${meta}\n`));
                    
                    // 2. Proxy and decode upstream SSE text deltas
                    if (!upstream.body) {
                        controller.close();
                        return;
                    }
                    
                    const reader = upstream.body.getReader();
                    const decoder = new TextDecoder("utf-8");
                    let buffer = "";
                    
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            
                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            // keep the last incomplete line in the buffer
                            buffer = lines.pop() || "";
                            
                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
                                    try {
                                        const json = JSON.parse(trimmed.slice(6));
                                        const content = json.choices?.[0]?.delta?.content;
                                        if (content) {
                                            controller.enqueue(encoder.encode(content));
                                        }
                                    } catch (e) {
                                        // ignore parse errors for partial/malformed chunk
                                    }
                                }
                            }
                        }
                    } finally {
                        reader.releaseLock();
                        controller.close();
                    }
                }
            });
        }

        return new Response(stream, {
            status: 200,
            headers: { 
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            },
        });

    } catch (error: any) {
        console.error("[Generate-Reminder API] Error:", error);
        
        // Always provide a graceful fallback stream to prevent JSON error strings in the UI
        const encoder = new TextEncoder();
        const fallbackStream = new ReadableStream({
            start(controller) {
                const meta = JSON.stringify({ 
                    activeSkill: "fallback", 
                    rainStage: "【紧急缓冲】",
                    toolCalled: false,
                    functionName: "fallback"
                });
                controller.enqueue(encoder.encode(`__META__=${meta}\n`));
                controller.enqueue(encoder.encode(`网络海浪稍微有些颠簸。深呼吸，去感受当下的存在，不要被杂念带走。[Debug: ${error?.message || error?.toString()}]`));
                controller.close();
            }
        });

        return new Response(fallbackStream, {
            status: 200,
            headers: { 
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            },
        });
    }
}

export const runtime = "edge";
