const fs = require('fs');
const file = 'c:/岛屿/qiutsmoke/app/practice/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace 1: Add DEFAULT_SURF_SYSTEM_PROMPT
code = code.replace(
  'function formatTime(seconds: number): string {\n    const mins = Math.floor(seconds / 60);\n    const secs = seconds % 60;\n    return `${mins}:${secs.toString().padStart(2, \'0\')}`;\n}',
  'function formatTime(seconds: number): string {\n    const mins = Math.floor(seconds / 60);\n    const secs = seconds % 60;\n    return `${mins}:${secs.toString().padStart(2, \'0\')}`;\n}\n\nconst DEFAULT_SURF_SYSTEM_PROMPT = `你是一位冷酷、专业、充满力量的冲浪教练。这是一场针对戒断反应（如戒断烟瘾、网瘾等）的“欲望冲浪”急救指引。\\n\\n# 铁律约束\\n1. 你的回复必须且只能是一句不超过30字的短句指导语，**直接输出文本**，绝对不要输出任何标签、格式或多余解释。\\n2. 语言风格必须像一位冷酷、专业、充满力量的冲浪教练。\\n3. 必须贯穿“冲浪（Urge Surfing）”意象（如：海浪、冲浪板、风暴、水面）。绝不要用拔河、怪兽等比喻。\\n4. 绝对不可直接说出“烟”、“抽烟”这类触发词。用“海浪”、“冲动”、“极度的渴望”来指代烟瘾。\\n5. 每次发话只针对当前时间阶段，绝不复读上一句。`;'
);

// Replace 2: Add State and useEffect
code = code.replace(
  '    const [surfMentalTrap, setSurfMentalTrap] = useState<string>("");',
  '    const [surfMentalTrap, setSurfMentalTrap] = useState<string>("");\n    const [surfSystemPrompt, setSurfSystemPrompt] = useState<string>(DEFAULT_SURF_SYSTEM_PROMPT);\n\n    useEffect(() => {\n        if (typeof window !== "undefined") {\n            const savedPrompt = localStorage.getItem("surfSystemPrompt");\n            if (savedPrompt) setSurfSystemPrompt(savedPrompt);\n        }\n    }, []);'
);

// Replace 3: Add Textarea in PREP_SURF
code = code.replace(
  '                                        <button\n                                            onClick={async () => {',
  '                                        <div className="w-full mt-4">\n                                            <div className="text-sm text-white/60 mb-2">教练核心指令（高级设定）</div>\n                                            <textarea\n                                                value={surfSystemPrompt}\n                                                onChange={(e) => {\n                                                    setSurfSystemPrompt(e.target.value);\n                                                    if (typeof window !== \'undefined\') localStorage.setItem(\'surfSystemPrompt\', e.target.value);\n                                                }}\n                                                className="w-full h-32 bg-white/5 border border-white/20 rounded-xl p-3 text-white/80 text-sm focus:outline-none focus:border-red-500/50 resize-none font-mono"\n                                                placeholder="在此输入自定义系统提示词..."\n                                            />\n                                        </div>\n\n                                        <button\n                                            onClick={async () => {'
);

// Replace 4: Pass customSystemPrompt to all streamAiReminder
code = code.replace(/await streamAiReminder\({/g, 'await streamAiReminder({\n                                                        customSystemPrompt: surfSystemPrompt,');

fs.writeFileSync(file, code);
console.log('page.tsx updated successfully');
