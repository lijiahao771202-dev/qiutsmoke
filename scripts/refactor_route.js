const fs = require('fs');

let content = fs.readFileSync('app/api/generate-reminder/route.ts', 'utf-8');

// 1. We replace the large system prompt block for urge_surfing (lines 153-210)
const systemPromptRegex = /(systemPrompt = `# 交互背景与视觉形式（极度重要）)[\s\S]*?(========================================`;)/;
content = content.replace(systemPromptRegex, `$1
这是一场单向的语音旁白引导。你必须绝对服从当前阶段《操作手册》。
【临床档案】：${diagnosisProfile || "无"}
【当前理论耗时】：第 ${elapsedTime} 秒

# 绝对原则（全阶段通用底线）
1. 你的每一次发话，**必须且只能**通过调用工具 \`deliver_coach_speech\` 来返回！绝对不可以直接在对话里输出文本。
2. 你的台词将直接送入 TTS 系统。必须以第一人称对用户直接下达绝命指令，简短有力，最多 30 个字。开头必须带有类似【第1阶段】的标签。
3. 杜绝复读。依靠随机性和你的创造力，从本阶段手册里挑选或者衍生全新的角度。

# 【最高铁律：当前执行阶段手册】
下方是对当前这几十秒内的操作规范，仔细阅读并提取你想发送的台词：
${stepGuidance}
$2`);

// 2. We replace the message construction and upstream logic for urge_surfing (lines 228-247)
const messagesRegex = /const upstreamConfig = getUpstreamConfig[\s\S]*?\} else \{/m;
content = content.replace(messagesRegex, `
        const upstreamConfig = getUpstreamConfig(effectiveSettings.provider, effectiveSettings.model, key);
        
        let messages: any[] = [];
        let tools: any[] | undefined = undefined;
        let tool_choice: any = undefined;
        
        if (mode === 'urge_surfing') {
            messages = [ { role: "system", content: systemPrompt } ];
            tools = [{
                type: "function",
                function: {
                    name: "deliver_coach_speech",
                    description: "Deliver a cold, objective, and forceful RAIN coaching instruction.",
                    parameters: {
                        type: "object",
                        properties: {
                            speech: {
                                type: "string",
                                description: "The exact 30-word instruction to be spoken to the user. MUST start with the stage prefix like 【第1阶段】"
                            }
                        },
                        required: ["speech"]
                    }
                }
            }];
            tool_choice = { type: "function", function: { name: "deliver_coach_speech" } };
            
            if (userAction) {
                messages.push({
                    role: "user",
                    content: \`【主动觉察报告】用户当前感受："\${userAction}"\\n请严格根据当前《阶段手册》回应。必须调用 deliver_coach_speech！\`
                });
            } else {
                messages.push({ 
                    role: "user", 
                    content: \`时间到了第 \${elapsedTime} 秒，用户没有屈服。请根据手册随机执行一条指令，必须调用 deliver_coach_speech！\` 
                });
            }
        } else {
`);

fs.writeFileSync('app/api/generate-reminder/route.ts', content);
console.log("Replaced system prompt and messages construction.");
