const fs = require('fs');

let content = fs.readFileSync('app/api/generate-reminder/route.ts', 'utf-8');

const targetStr = `        // Instead of waiting for full response, create a transform stream
        const encoder = new TextEncoder();
        
        const stream = new ReadableStream({
            async start(controller) {
                // 1. Send the META block so frontend can update its UI instantly
                const meta = JSON.stringify({ activeSkill: activeSkillFile, rainStage: rainStage });
                controller.enqueue(encoder.encode(\`__META__=\${meta}\\n\`));
                
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
                        const lines = buffer.split('\\n');
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
        });`;

const replacement = `        const encoder = new TextEncoder();
        
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
            if (!speechContent) speechContent = data.choices?.[0]?.message?.content || "（暂无指南）";
            
            stream = new ReadableStream({
                start(controller) {
                    const meta = JSON.stringify({ activeSkill: activeSkillFile, rainStage: rainStage });
                    controller.enqueue(encoder.encode(\`__META__=\${meta}\\n\`));
                    controller.enqueue(encoder.encode(speechContent));
                    controller.close();
                }
            });
        } else {
            // Instead of waiting for full response, proxy stream
            stream = new ReadableStream({
                async start(controller) {
                    const meta = JSON.stringify({ activeSkill: activeSkillFile, rainStage: rainStage });
                    controller.enqueue(encoder.encode(\`__META__=\${meta}\\n\`));
                    
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
                            const lines = buffer.split('\\n');
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
                                    } catch (e) { }
                                }
                            }
                        }
                    } finally {
                        reader.releaseLock();
                        controller.close();
                    }
                }
            });
        }`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('app/api/generate-reminder/route.ts', content);
console.log("Updated response stream block.");
