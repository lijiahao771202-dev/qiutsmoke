import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { normalizeAISettings } from "../../../lib/ai-models";
import { buildDeepSeekChatCompletionBody } from "../../../lib/deepseek-chat";
import {
    buildMimoChatCompletionBody,
    getMimoChatCompletionsUrl,
    resolveMimoAIKey,
} from "../../../lib/mimo-ai";
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

function getUpstreamConfig(settings: ReturnType<typeof normalizeAISettings>, key: string) {
    const { provider, model } = settings;
    const configWrapper = (messages: any[], tools?: any[], tool_choice?: any) => {
        const payload: any =
            provider === "nvidia"
                ? {
                    model,
                    messages,
                    temperature: 1.2,
                    frequency_penalty: 0.6,
                    presence_penalty: 0.6,
                    stream: tools ? false : true,
                    max_tokens: tools ? 150 : undefined,
                }
                : provider === "mimo"
                    ? buildMimoChatCompletionBody({
                        model,
                        messages,
                        stream: tools ? false : true,
                        maxTokens: tools ? 150 : undefined,
                        temperature: 0.6,
                        frequencyPenalty: 0.2,
                        presencePenalty: 0.2,
                    })
                    : buildDeepSeekChatCompletionBody({
                        model,
                        messages,
                        stream: tools ? false : true,
                        thinkingEnabled: settings.deepseekThinkingEnabled,
                        reasoningEffort: settings.deepseekReasoningEffort,
                        maxTokens: tools ? 150 : undefined,
                        temperature: 0.6,
                        frequencyPenalty: 0.2,
                        presencePenalty: 0.2,
                    });
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

    if (provider === "mimo") {
        return {
            url: getMimoChatCompletionsUrl(),
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
    const requestId = crypto.randomUUID().slice(0, 8);
    const startedAt = Date.now();
    try {
        const body = await req.json();
        const { mood, mode, elapsedTime, totalTime, sessionPhase = "middle", history = [], userAction, practiceCount = 0, diagnosisProfile = "", customSystemPrompt, customSurfPrompts } = body;

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

        console.log("[AI Request][generate-reminder][start]", JSON.stringify({
            requestId,
            provider: effectiveSettings.provider,
            model: effectiveSettings.model,
            deepseekThinkingEnabled: effectiveSettings.deepseekThinkingEnabled,
            deepseekReasoningEffort:
                effectiveSettings.provider === "deepseek" && effectiveSettings.deepseekThinkingEnabled
                    ? effectiveSettings.deepseekReasoningEffort
                    : null,
            mode,
            sessionPhase,
            elapsedTime,
            hasKey: Boolean(key),
        }));

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

        // Construct Prompts
        let systemPrompt = "";
        let rainStage = "";
        let rainCommand = "";
        let activeSkillFile = "";

        if (mode === 'urge_surfing') {
            activeSkillFile = "urge_surfing_rain";
            if (customSurfPrompts && customSurfPrompts.stages && customSurfPrompts.stages.length > 0) {
                const stage = customSurfPrompts.stages.find((s: any) => elapsedTime <= s.maxTime) || customSurfPrompts.stages[customSurfPrompts.stages.length - 1];
                rainStage = stage.stageName;
                rainCommand = stage.command;
                systemPrompt = customSurfPrompts.systemPrompt;
            } else {
                if (elapsedTime <= 40) {
                    rainStage = "【第0阶段：准备上板】";
                    rainCommand = "引导用户做深呼吸，稳住重心，准备迎接海浪。";
                } else if (elapsedTime <= 180) {
                    rainStage = "【第1阶段：R - Recognize 认出渴望】";
                    rainCommand = "请严格按照系统提示词中【R (Recognize) 认出】的操作和样例进行引导。";
                } else if (elapsedTime <= 300) {
                    rainStage = "【第2阶段：A - Allow 允许不适存在】";
                    rainCommand = "请严格按照系统提示词中【A (Allow) 允许】的操作和样例进行引导。";
                } else if (elapsedTime <= 600) {
                    rainStage = "【第3阶段：I - Investigate 探究躯体感受】";
                    rainCommand = "请严格按照系统提示词中【I (Investigate) 探究】的操作和样例进行引导。";
                } else {
                    rainStage = "【第4阶段：N - Note 记录生灭与非认同】";
                    rainCommand = "请严格按照系统提示词中【N (Note / Non-identify) 记录与非认同】的操作和样例进行引导。";
                }

                const DEFAULT_SURF_SYSTEM_PROMPT = `你是一位深谙 Judson Brewer（贾德森·布鲁尔）博士成瘾机制与《欲望的博弈》理论的专业正念冥想教练。我们的最终目的是通过"欲望冲浪（Urge Surfing）"与 RAIN 冥想，帮助用户打破成瘾习惯回路，成功戒烟。

# 布鲁尔 RAIN 戒断法详细操作与样例

## R (Recognize) 认出：标签与打分
操作：引导用户认出渴望。运用【标签法】给冲动命名（"啊，这是尼古丁的冲动"）。运用【打分法】客观评估当前的渴望强度，从而将其客体化。
样例：
- "觉察到冲动升起了吗？在心里给它贴个标签：'嗨，欲望。'如果给这股渴望打个分，1到10分，现在是几分？"
- "给当前的冲动打个分吧。把它当成一个客观的数据，单纯地认出它现在的强度。"

## A (Allow) 允许：友善与接纳
操作：放弃对抗，以【绝对友善和接纳】的态度为渴望腾出空间。不加评判地允许躯体不适感流淌，像招待一位暂时的访客一样接纳它。
样例：
- "带着友善的态度，允许这股冲动在体内存在。不要推开它，也不要满足它，就让它待在那里。"
- "大脑可能会烦躁，但请温柔地对这股感觉说：'你可以待在这里，我为你腾出空间。'"

## I (Investigate) 探究：动态的温和好奇心
操作：唤醒"温和的好奇心"，向内极其细致地探索躯体感觉。引导用户抓住最细微的感觉，并去发现【欲望不是一成不变的，它是动态流动的】。同时觉察并旁观大脑产生的想法。
样例：
- "带着好奇心，找找身体哪里最难受？是喉咙干痒还是胸口紧绷？它是在发热还是发紧？是在微微跳动还是移动？"
- "注意观察，这种紧绷感不是固定不变的，它在微妙地变化。如果大脑在找借口，把想法当做云朵看着它飘过。"

## N (Note / Non-identify) 解离与非认同
操作：进入【解离阶段】。告知烟瘾如同海浪，必然会经历上升、冲顶、然后下降的过程。建立解离认知："我有渴望，但我不是渴望本身。我可以有冲动，但我【不必采取行动】。"
样例：
- "冲动就像海浪，会上升、冲顶，然后终将消退。看着它起伏，告诉自己：'我不必采取任何行动。'"
- "你不是你的欲望，你只是在岸边观察海浪的人。感受这股力量正在自行解体、消散。"

# 铁律约束
1. 你的回复必须且只能是一句不超过30字的短句，**直接输出纯文本**。不要任何Markdown、标签或多余解释。
2. **拒绝机械复述**：当用户反馈感受时，绝对不要像客服一样只会说"我理解"、"我听到了"。你必须像一位真正的大师，立刻用【极具洞察力的疑问句或祈使句】将用户拉入更深的觉察。
3. 必须紧密承接前文历史，自然地顺着上一句话给出下一句引导，保持对话行云流水。
4. 语气沉稳、友善、充满穿透力且极其富有好奇心。每一句话都应该像是在幽暗中点亮一盏灯。
5. 绝对不可直接说出"烟"、"抽烟"等触发词。用"海浪"、"冲动"、"原始的能量"来指代。
6. 严格根据当前传入的【当前所处阶段】进行针对性发言，步步深入。`;

                systemPrompt = customSystemPrompt || DEFAULT_SURF_SYSTEM_PROMPT;
            }

            console.log("[SURF DEBUG] elapsedTime=" + elapsedTime + ", sessionPhase=" + sessionPhase + ", diagnosisProfile=" + (diagnosisProfile ? "YES" : "EMPTY"));
        } else {
            systemPrompt = `你是一个拥有极高觉知力的专业正念导师。现在用户正在进行一段 ${totalTime} 分钟的打坐冥想。
当前时间点：处于第 ${elapsedTime} 秒（进度：${Math.round(elapsedTime / 60)}分钟）。
当前触发阶段：${sessionPhase}（首部/中途/尾声）。
用户当前的心境/状态识别为：【${mood || "平静"}】
用户选择的主题模式为：【${mode || "常规正念"}】。

${sessionPhase === 'start' ? '【当前为开场白】请生成具有包容感和建立初相意图的开场短句。引导用户闭上眼睛，专注于下一次呼吸，放下执念和对前事的牵挂。' : 
sessionPhase === 'end' ? '【当前为结束语】请生成温和的结语。引导用户慢慢唤醒身体，将觉察带回到现实生活中，并准备睁开双眼。' :
'【当前为中途提示】你需要极其敏锐地抓取时间和用户心理的交汇点，生成防走神的拉回提示语。'}

【绝对规则约束】
1. 不解释，不打招呼，直接输出纯正念短句文本。总字数严格控制在30字左右。
2. 绝对不可直接提到"烟""抽烟""戒烟""游戏""手机"等实体词刺激对方。可以把欲望隐喻为"一股升起的原始冲动"、"海浪般的执念"、"某个不属于你的抓取感"等。
3. 引导方式要符合 RAIN 模型（察觉-允许-探究-非认同）。比如："察觉到那股想向外抓取的冲动了吗？不要抗拒，只是在呼吸中静静看着它起伏。"
4. 不要一次输出多句话，只输出唯一一句当前阶段该说的贴心指引。`;
        }

        const upstreamConfig = getUpstreamConfig(effectiveSettings, key);
        
        let messages: any[] = [];
        let tools: any[] | undefined = undefined;
        let tool_choice: any = undefined;
        
if (mode === 'urge_surfing') {
            // Semi-Stateful Architecture for Urge Surfing
            // We pass the history for continuity, but heavily anchor the AI to the current stage.
            let systemInstruction = `【临床情报】：${diagnosisProfile || "无"}\n\n`;
            systemInstruction += `【当前所处阶段】：${rainStage}\n`;
            systemInstruction += `【当前阶段教练操作手册】：${rainCommand}\n\n`;
            systemInstruction += `【最高优先级铁律】：无论之前的历史对话是什么，你现在必须立刻、绝对地进入【${rainStage}】。不可倒退回上一个阶段。严格按照上述《当前阶段教练操作手册》执行接下来的对话。`;

            const normalizedHistory: any[] = [];
            for (let i = 0; i < history.length; i++) {
                const msg = history[i];
                if (msg.role === 'assistant' && (i === 0 || history[i-1].role === 'assistant')) {
                    normalizedHistory.push({ role: 'user', content: '（时间推移，用户保持沉默，请继续发话。）' });
                }
                normalizedHistory.push(msg);
            }

            let currentUserMessage = "";
            if (body.surfStyle === 'immersive') {
                systemInstruction += `【沉浸模式特殊指令】：不要限制字数。请一次性生成 3~4 句连贯、递进的指导语（构成一个小节的剧本）。每一句必须用单独的换行符 "\\n" 隔开。`;
                if (userAction) {
                    currentUserMessage = `【用户反馈】："${userAction}"\n请立刻生成第 1 句短句作为安抚/追问，并紧接着换行生成后续 2~3 句剧本来进一步探究。`;
                } else {
                    currentUserMessage = `（用户正在沉默中体验，或者刚刚进入新阶段。请自然承接，为当前阶段生成一整段 3~4 句的连贯剧本。历时 ${elapsedTime} 秒。当前阶段：${rainStage}。注意每句之间用换行符隔开。）`;
                }
            } else {
                // Interactive Mode (Default)
                if (userAction) {
                    currentUserMessage = `【用户反馈】："${userAction}"\n请结合前文，严格根据《当前阶段教练操作手册》给出一句回应。不要超过30个字。`;
                } else {
                    currentUserMessage = `（用户正在沉默中体验。请自然地承接你上一句话的方向，继续给出下一步引导。历时 ${elapsedTime} 秒。当前阶段：${rainStage}。不要超过30个字。）`;
                }
            }

            messages = [
                { role: "system", content: systemPrompt + "\n\n" + systemInstruction },
                ...normalizedHistory,
                { role: "user", content: currentUserMessage }
            ];
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
            console.error("[AI Request][generate-reminder][upstream_error]", {
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
            return new Response(JSON.stringify({ error: `上游错误: HTTP ${status}` }), {
                status,
                headers: { "Content-Type": "application/json" },
            });
        }

        const encoder = new TextEncoder();
        
        let stream: ReadableStream;
        
        // Use the same streaming parser for all modes since we removed function calling.
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
                let streamedChars = 0;
                
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
                                        streamedChars += String(content).length;
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
                    console.log("[AI Request][generate-reminder][done]", JSON.stringify({
                        requestId,
                        provider: effectiveSettings.provider,
                        model: effectiveSettings.model,
                        deepseekThinkingEnabled: effectiveSettings.deepseekThinkingEnabled,
                        deepseekReasoningEffort:
                            effectiveSettings.provider === "deepseek" && effectiveSettings.deepseekThinkingEnabled
                                ? effectiveSettings.deepseekReasoningEffort
                                : null,
                        elapsedMs: Date.now() - startedAt,
                        streamedChars,
                    }));
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            status: 200,
            headers: { 
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            },
        });

    } catch (error: any) {
        console.error("[AI Request][generate-reminder][request_error]", {
            requestId,
            elapsedMs: Date.now() - startedAt,
            error: error?.message || error?.toString?.() || String(error),
        });
        
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
