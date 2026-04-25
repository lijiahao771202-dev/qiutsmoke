import { buildAIGenerationTargets } from "./meditation-script-duration.ts";

type MeditationPromptInput = {
  topic: string;
  durationMinutes: number;
  guidanceLevel: string;
  styleOverride?: string;
};

type MeditationPhase = {
  name: string;
  objective: string;
  durationSeconds: number;
  pauseSeconds: number;
  blockCount: number;
};

const GUIDANCE_LABELS: Record<string, string> = {
  light: "轻引导",
  medium: "中引导",
  heavy: "多引导",
};

const PHASE_TEMPLATES: Record<
  string,
  Array<{ name: string; objective: string; ratio: number; pauseWeight: number }>
> = {
  light: [
    { name: "安顿进入", objective: "帮助用户放下外界刺激，建立安全感与容器感。", ratio: 0.12, pauseWeight: 0.12 },
    { name: "呼吸锚定", objective: "只给极少量呼吸提示，避免过度讲话。", ratio: 0.18, pauseWeight: 0.2 },
    { name: "主体静默", objective: "以长停顿为主，只在必要时轻轻提醒回到呼吸。", ratio: 0.42, pauseWeight: 0.4 },
    { name: "温柔陪伴", objective: "偶尔提供防走神提醒与简短身体觉察。", ratio: 0.18, pauseWeight: 0.18 },
    { name: "回到当下", objective: "缓慢收束，不要突然结束。", ratio: 0.1, pauseWeight: 0.1 },
  ],
  medium: [
    { name: "安顿进入", objective: "放慢节奏，让用户从日常状态过渡到练习状态。", ratio: 0.12, pauseWeight: 0.1 },
    { name: "呼吸落地", objective: "建立呼吸锚点，给出稳定、明确但不过密的引导。", ratio: 0.18, pauseWeight: 0.16 },
    { name: "身体扫描", objective: "从头到脚或从呼吸到身体逐步展开体感觉察。", ratio: 0.28, pauseWeight: 0.28 },
    { name: "持续练习", objective: "在引导与静默之间保持平衡，加入走神回归提示。", ratio: 0.24, pauseWeight: 0.24 },
    { name: "整合扩展", objective: "让用户感受整体身体与当下环境的联系。", ratio: 0.1, pauseWeight: 0.12 },
    { name: "温柔收束", objective: "缓慢结束，帮助用户平稳回到当下。", ratio: 0.08, pauseWeight: 0.1 },
  ],
  heavy: [
    { name: "到达与安顿", objective: "快速建立安全感，降低外界干扰，明确开始练习。", ratio: 0.08, pauseWeight: 0.08 },
    { name: "呼吸落地", objective: "用连续引导帮助用户稳定呼吸与注意力。", ratio: 0.12, pauseWeight: 0.12 },
    { name: "面部与上半身扫描", objective: "细致引导额头、眼周、下颌、颈肩、胸腔的放松。", ratio: 0.16, pauseWeight: 0.15 },
    { name: "腹部与下半身扫描", objective: "细致引导腹部、骨盆、双腿、双脚的体感变化。", ratio: 0.16, pauseWeight: 0.15 },
    { name: "呼吸与全身同步", objective: "把呼吸和整体身体联结起来，形成连续的陪伴感。", ratio: 0.14, pauseWeight: 0.14 },
    { name: "开放觉察与回神", objective: "处理走神、杂念、情绪波动，并温柔拉回。", ratio: 0.14, pauseWeight: 0.14 },
    { name: "深化停留", objective: "在保持陪伴的同时，安排自然的整合停顿与沉浸感。", ratio: 0.12, pauseWeight: 0.14 },
    { name: "回归与收束", objective: "让用户平稳结束，不仓促、不突然。", ratio: 0.08, pauseWeight: 0.08 },
  ],
};

function splitSeconds(totalSeconds: number, ratios: number[]) {
  const raw = ratios.map((ratio) => totalSeconds * ratio);
  const rounded = raw.map((value) => Math.max(1, Math.floor(value)));
  let remainder = totalSeconds - rounded.reduce((sum, value) => sum + value, 0);

  const indexesByFraction = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  let cursor = 0;
  while (remainder > 0 && indexesByFraction.length > 0) {
    rounded[indexesByFraction[cursor % indexesByFraction.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return rounded;
}

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`;
}

function normalizeTopic(topic: string) {
  return topic.replace(/[（(]目标时长：\d+分钟[)）]/g, "").trim();
}

function getPromptLengthMultiplier(guidanceLevel: string) {
  if (guidanceLevel === "heavy") return 1.32;
  if (guidanceLevel === "light") return 1.04;
  return 1.16;
}

function getRecommendedParagraphBlocks(durationMinutes: number, guidanceLevel: string) {
  if (guidanceLevel === "heavy") return Math.max(10, Math.ceil(durationMinutes * 0.7));
  if (guidanceLevel === "light") return Math.max(5, Math.ceil(durationMinutes * 0.28));
  return Math.max(7, Math.ceil(durationMinutes * 0.48));
}

function getClosingBlocks(durationMinutes: number, guidanceLevel: string) {
  if (guidanceLevel === "heavy") return durationMinutes >= 20 ? 3 : 2;
  if (guidanceLevel === "light") return 1;
  return durationMinutes >= 15 ? 2 : 1;
}

function getBlockRules(guidanceLevel: string) {
  if (guidanceLevel === "heavy") {
    return `- 建议拆成多个短节奏块：每个自然段/节奏块通常 2-4 句，让声音持续陪伴，但每一小段都要给真实停留空间。\n- 每完成 2-4 个节奏块，安排一次更完整的整合停顿，让体验真正落到身体里。\n- 单个 [pause] 在多引导模式下通常不超过 12 秒，极少数深停留也不要超过 15 秒。\n- 主题简单时，优先通过呼吸层次、身体扫描、走神回归、开放觉察、整合停留来自然拓展，而不是重复空话。`;
  }

  if (guidanceLevel === "light") {
    return `- 节奏块可以更稀疏，每段只说必要的话，把更多篇幅交给沉默体验。\n- 长停顿要自然落在关键提示之后，不要用频繁发言打断练习。\n- 单个 [pause] 一般不超过 45 秒，避免用机械堆叠停顿代替真实引导。`;
  }

  return `- 建议每个自然段/节奏块 2-4 句，在引导与停留之间保持稳定呼吸感。\n- 每完成 2-3 个节奏块，安排一次较完整的体验停顿，让用户真正感受身体变化。\n- 单个 [pause] 一般不超过 18 秒。`;
}

function buildPhasePlan(
  durationMinutes: number,
  guidanceLevel: string,
  targetPauseSeconds: number,
  totalBlocks: number
) {
  const templates = PHASE_TEMPLATES[guidanceLevel] || PHASE_TEMPLATES.medium;
  const phaseDurations = splitSeconds(
    durationMinutes * 60,
    templates.map((template) => template.ratio)
  );
  const phasePauseBudgets = splitSeconds(
    targetPauseSeconds,
    templates.map((template) => template.pauseWeight)
  );
  const phaseBlockBudgets = splitSeconds(
    totalBlocks,
    templates.map((template) => template.ratio)
  );

  return templates.map((template, index) => ({
    name: template.name,
    objective: template.objective,
    durationSeconds: phaseDurations[index],
    pauseSeconds: phasePauseBudgets[index],
    blockCount: phaseBlockBudgets[index],
  })) satisfies MeditationPhase[];
}

export function buildMeditationGenerationSystemPrompt(input: Omit<MeditationPromptInput, "topic">) {
  const { durationMinutes, guidanceLevel, styleOverride } = input;
  const { totalSeconds, targetTextSeconds, targetPauseSeconds, estimatedChars } =
    buildAIGenerationTargets(durationMinutes, guidanceLevel);
  const guidanceLabel = GUIDANCE_LABELS[guidanceLevel] || GUIDANCE_LABELS.medium;
  const promptEstimatedChars = Math.round(estimatedChars * getPromptLengthMultiplier(guidanceLevel));
  const minChars = Math.round(promptEstimatedChars * 0.95);
  const maxChars = Math.round(promptEstimatedChars * 1.1);
  const paragraphBlocks = getRecommendedParagraphBlocks(durationMinutes, guidanceLevel);
  const closingBlocks = getClosingBlocks(durationMinutes, guidanceLevel);
  const phases = buildPhasePlan(
    durationMinutes,
    guidanceLevel,
    targetPauseSeconds,
    paragraphBlocks
  );
  const pauseFloorSeconds = Math.round(targetPauseSeconds * 0.8);
  const blockRules = getBlockRules(guidanceLevel);
  const minCharsPerBlock = Math.max(70, Math.round(minChars / paragraphBlocks));
  const maxCharsPerBlock = Math.max(minCharsPerBlock + 40, Math.round(maxChars / paragraphBlocks));

  const phaseLines = phases
    .map(
      (phase, index) =>
        `${index + 1}. ${phase.name}：约 ${formatSeconds(phase.durationSeconds)}，约 ${phase.blockCount} 个节奏块，其中 [pause] 预算约 ${formatSeconds(phase.pauseSeconds)}。目标：${phase.objective}`
    )
    .join("\n");

  const pauseRules =
    guidanceLevel === "heavy"
      ? `- 高频自然停顿：多数 2-4 秒，整合停顿 5-9 秒，少量深停顿 10-15 秒。\n- 停顿要均匀分布在全文中，不能把大部分停顿集中到最后。\n- 多引导不是一直说话，必须让用户在关键体感处真正停留。`
      : guidanceLevel === "light"
        ? `- 允许大量长停顿：10-45 秒为常态，必要时可更长。\n- 语言必须克制，避免为了凑字数而频繁说话。`
        : `- 常规停顿 3-6 秒，整合停顿 8-15 秒。\n- 在引导语和停留体验之间保持平衡，不要过密也不要过空。`;

  const styleBlock = styleOverride?.trim()
    ? `\n【附加风格偏好】\n${styleOverride.trim()}\n`
    : "";

  return `你是一位顶级中文冥想脚本设计师，同时兼顾四个目标：文本质量高、引导准确、时长符合、停顿自然。你写的不是普通散文，而是“可直接用于 TTS 合成的冥想引导脚本”。\n\n【输出契约】\n1. 只输出脚本文本，禁止标题、解释、章节名、前言、总结说明。\n2. 只允许使用两种控制标记：\`[rate ±N%]\` 与 \`[pause Xs]\`。\n3. 开头只能出现一次 \`[rate -10%]\`。\n4. 禁止 Markdown、表情符号、舞台提示、括号式表演说明。\n5. 不要输出“第一阶段 / 第二阶段”这类结构词；结构只允许在内部遵守，不允许显性写出来。\n6. 请自然分段输出；每个自然段就是一个节奏块，段落之间允许空行。\n\n【成品要求】\n- 这必须是一篇完整成品，不是示例片段，不是摘要，不是提纲，也不是未写完的半成品。\n- 必须一次性写完整篇，不能写到一半就突然进入“慢慢准备结束”。\n- 必须至少写出 ${paragraphBlocks} 个自然段 / 节奏块；只有最后 ${closingBlocks} 个节奏块才允许进入收束。\n- 大多数节奏块必须是完整展开的段落，通常需要 3-5 句，建议单段展开到约 ${minCharsPerBlock}-${maxCharsPerBlock} 字，不要只写一两句就匆匆换段。\n- 每个节奏块都必须包含真实可朗读的正文，不能出现只包含 \`[pause]\` 的空段落。\n- 在前面的节奏块中，禁止出现“现在慢慢准备结束”“最后让我们回来”“练习即将结束”等提前收尾信号。\n- 如果主题本身较简单，也要通过更细的呼吸层次、身体扫描、走神回归、开放觉察与整合停留，把时长自然写满。\n\n【文本质量标准】\n- 语言要自然、具体、低刺激、可被身体感知，避免空泛鸡汤。\n- 以第二人称直接引导，优先写呼吸、重量、温度、触感、空间感、下沉感、展开感等体感线索。\n- 每一句都必须有功能：安顿、引导注意、描述体感、容纳走神、自然过渡中的至少一种。\n- 避免连续重复同一句式，不要机械反复“放松”“平静”“此刻”。\n- 允许温柔诗意，但不能虚浮；比起华丽意象，更重视身体可执行性与真实陪伴感。\n- 结束段必须落地、具体、贴近身体与环境；不要写“愿你充满爱与光明”“宇宙能量”“一切都会好起来”这类悬浮祝福句。\n\n【节奏与停顿标准】\n- 停顿必须自然服务于冥想体验，而不是机械插入。\n${pauseRules}\n${blockRules}\n- [pause] 总时长至少要接近预算的 80%，并尽量均匀分布在全文，而不是集中到末尾。\n- 禁止连续输出两个或以上的 \`[pause]\`；每一个 \`[pause]\` 都必须紧跟在真实引导语之后，不能靠重复停顿标签凑时长。\n- 如果还没接近目标时长，绝对不要提前收尾、提前升华、提前祝福结束。\n- 宁可整体略长 5%-10%，也不要明显短于目标时长。\n\n【本次任务参数】\n- 目标总时长：${durationMinutes} 分钟（${totalSeconds} 秒）\n- 引导模式：${guidanceLabel}\n- 文本朗读目标：约 ${targetTextSeconds} 秒\n- [pause] 总预算：约 ${targetPauseSeconds} 秒（至少不要明显低于 ${pauseFloorSeconds} 秒）\n- 建议文本量：约 ${promptEstimatedChars} 字，可在 ${minChars}-${maxChars} 字范围内自然浮动\n\n【内部阶段蓝图（只允许内部遵守，不允许显式输出标题）】\n${phaseLines}\n\n【强制要求】\n- 先安顿，再深化，再整合，最后缓慢收束。\n- 每个内部阶段都要写够对应节奏块数量，再进入下一阶段。\n- 在完成全部内部阶段之前，不允许进入结束段。\n- 对走神要温柔接纳并轻轻带回，不要说教，不要训斥。\n- 输出前请自行检查：是否写完全部内部阶段、是否达到完整篇幅、文本时长 + 停顿时长 是否已经接近目标总时长。${styleBlock}`.trim();
}

export function buildMeditationGenerationUserPrompt(input: MeditationPromptInput) {
  const { topic, durationMinutes, guidanceLevel, styleOverride } = input;
  const cleanTopic = normalizeTopic(topic);
  const guidanceLabel = GUIDANCE_LABELS[guidanceLevel] || GUIDANCE_LABELS.medium;
  const paragraphBlocks = getRecommendedParagraphBlocks(durationMinutes, guidanceLevel);
  const closingBlocks = getClosingBlocks(durationMinutes, guidanceLevel);
  const styleBlock = styleOverride?.trim() ? `\n额外风格偏好：${styleOverride.trim()}` : "";

  return `请围绕下面的主题，直接写一篇适合 TTS 朗读的中文冥想引导脚本。\n\n主题：${cleanTopic}\n目标时长：${durationMinutes} 分钟\n引导强度：${guidanceLabel}\n目标用户：容易走神、需要被稳定陪伴带领进入练习的人\n写作目标：文本质量高、引导准确、节奏自然、停顿真实、时长尽量贴合目标${styleBlock}\n\n创作提醒：\n- 一次性写完整篇成品，不要只给示例片段。\n- 请明确分成多段输出，至少写出 ${paragraphBlocks} 个自然段 / 节奏块。\n- 每个自然段都必须有实际引导内容，不能只输出 \`[pause]\`。\n- 只有最后 ${closingBlocks} 个节奏块才允许进入结束。\n- 如果内容还没接近目标时长，不要提前总结或提前收束。\n\n请直接开始输出脚本正文。`;
}
