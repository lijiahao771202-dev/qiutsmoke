import { buildAIGenerationTargets } from "./meditation-script-duration.ts";

type MeditationPromptInput = {
  topic: string;
  details?: string;
  durationMinutes: number;
  guidanceLevel: string;
  styleOverride?: string;
  referenceBlock?: string;
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
    return `- 建议拆成多个短节奏块：每个自然段/节奏块通常 2-4 句，让声音持续陪伴，但每一小段都要给真实停留空间。\n- 多引导模式下，大多数自然段内部必须出现 1-3 个微停顿；呼吸观察、身体部位切换、走神回带、感官转场后，通常立刻接 2-4 秒 [pause]。\n- 如果一个自然段超过 2 句，通常段内就要至少出现一次 [pause]；不要一整段讲完后只在段尾放一个 [pause]。\n- 每完成 2-4 个节奏块，安排一次更完整的整合停顿，让体验真正落到身体里。\n- 单个 [pause] 在多引导模式下通常不超过 12 秒，极少数深停留也不要超过 15 秒。\n- 主题简单时，优先通过呼吸层次、身体扫描、走神回归、开放觉察、整合停留来自然拓展，而不是重复空话。`;
  }

  if (guidanceLevel === "light") {
    return `- 节奏块可以更稀疏，每段只说必要的话，把更多篇幅交给沉默体验。\n- 即使是轻引导，关键提示句后也应直接进入停顿，不要一整段说完再统一停顿。\n- 长停顿要自然落在关键提示之后，不要用频繁发言打断练习。\n- 单个 [pause] 一般不超过 45 秒，避免用机械堆叠停顿代替真实引导。`;
  }

  return `- 建议每个自然段/节奏块 2-4 句，在引导与停留之间保持稳定呼吸感。\n- 中引导模式下，大多数自然段内部至少出现 1 个微停顿；关键感受切换后，用 3-6 秒 [pause] 让体验落下来。\n- 不要把 [pause] 只放在段落之间；段内也要有自然呼吸感。\n- 每完成 2-3 个节奏块，安排一次较完整的体验停顿，让用户真正感受身体变化。\n- 单个 [pause] 一般不超过 18 秒。`;
}

function getGuidanceLayoutRules() {
  return `- 当前产品里的轻 / 中 / 多引导，按“陪伴密度”来理解，不按冥想流派命名；你要通过文本密度、段内停顿频次、段间停顿长度来区分它们。\n- 轻引导：文本最克制，留白最多。通常每个节奏块 1-3 句，段内停顿较少但更长，段间整合停顿最明显。文本约占总时长 45%-55%，[pause] 约占 45%-55%。\n- 中引导：文本与停顿较平衡。通常每个节奏块 2-4 句，段内有自然微停顿，段间偶尔安排较完整停留。文本约占总时长 55%-60%，[pause] 约占 40%-45%。\n- 多引导：文本密度最高，陪伴感最连续。通常每个节奏块 2-4 句，多数段内都有 1-3 个短停顿；段落之间也可以停，但主要节奏感来自段内微停顿与阶段切换后的整合停顿。文本约占总时长 62%-70%，[pause] 约占 30%-38%。\n- 轻引导不是少写几句就结束，多引导也不是一直说话；三者的核心区别，是“说多少、停多密、每次停多久”。`;
}

function getPauseExamples() {
  return `【[pause] 用法对照示范】\n- 轻引导 / 段内微停顿：\n  先知道你正坐在这里。[pause 6s] 知道呼吸自己在流动。[pause 12s]\n- 轻引导 / 段落之间整合停顿：\n  如果你愿意，就把注意力轻轻放在呼气上，让身体多沉一点。[pause 18s]\n\n  接下来不用做什么，只在每一次呼吸里待着。[pause 28s]\n- 轻引导要点：段内停顿可以少，但一旦停，就要给足体验空间；段间停顿可以最长。\n\n- 中引导 / 段内微停顿：\n  先感觉呼吸自然地进来。[pause 4s] 再感觉呼吸自然地出去。[pause 5s] 不需要做得很好，只要继续陪着这一个来回。[pause 8s]\n- 中引导 / 段落之间整合停顿：\n  让下巴轻一点，肩膀轻一点，手也轻一点。[pause 6s]\n\n  现在把整个身体一起纳入觉察，感觉你正被椅子或地面稳稳托住。[pause 12s]\n- 中引导要点：最常见的是“句内短停顿 + 每 2-3 段一次较完整停留”。\n\n- 多引导 / 段内微停顿：\n  你先感觉鼻尖这一点微凉的空气进来。[pause 3s] 不需要改变呼吸，只要知道它正在发生。[pause 4s] 如果念头跑开了，就再一次回到这一点点进出的触感。[pause 6s]\n- 多引导 / 段落之间整合停顿：\n  让肩膀的重量继续往下落，胸口不需要刻意打开，只要允许它慢慢变软。[pause 5s]\n\n  现在把注意力带到腹部，感觉吸气时它轻轻鼓起，呼气时又慢慢回去。[pause 8s]\n- 多引导要点：段间可以有停顿，但主要节奏应由段内 2-4 秒短停顿来塑造；较长停顿多用于阶段切换或整合停留。`;
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
  const pauseFloorSeconds = Math.round(targetPauseSeconds * 0.9);
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
  const guidanceLayoutRules = getGuidanceLayoutRules();
  const pauseExamples = getPauseExamples();

  return `你是一位资深中文冥想脚本总编。你产出的不是示例、提纲或说明，而是完整、成熟、可直接交付 TTS 语音合成使用的冥想引导最终稿。\n\n【核心任务】\n你的脚本只追求四个目标：内容真实可感、引导稳定有效、节奏自然可沉浸、总时长尽量贴合任务参数。\n- 内容真实可感：写的是身体能接住的线索，如呼吸、重量、温度、触感、空间感、边界感、下沉感、展开感。\n- 引导稳定有效：每一步引导都有作用，安顿、引导注意、描述体感、容纳走神、自然过渡，至少占一种。\n- 节奏自然可沉浸：停顿不是机械填充，而是体验的呼吸，是停留、体感落地、注意力转场与整合的自然时刻。\n- 总时长贴合任务参数：通过控制文本量与停顿配比，让最终朗读总时长尽可能接近目标。\n\n【硬性格式规则】\n1. 全文只允许使用两种控制标记：\`[rate ±N%]\` 与 \`[pause Xs]\`。\n2. 脚本开头只能出现一次 \`[rate -10%]\`，且第一句引导语之前不能直接出现 \`[pause]\`。\n3. 禁止 Markdown、表情符号、舞台说明、括号式表演提示。\n4. 自然段落之间允许空行，每个自然段视为一个节奏块。\n5. \`[pause Xs]\` 可以且应当出现在段落内部，而不仅放在段尾；停顿分布要尽量均匀，避免集中堆积在结尾。\n6. 每一个 \`[pause]\` 前都必须先有真实可朗读的引导语；禁止用空段落、单独停顿或连续多个停顿标签来凑时长。\n7. \`[pause]\` 的作用不是机械补时长，而是标记冥想文本中的停留、呼吸、体感落地、注意力转场与整合时刻。\n\n【写作原则】\n- 全程使用第二人称“你”直接引导，语气温和、稳定、在场，不夸张、不煽情、不说教。\n- 身体线索优先：优先写呼吸、重量、温度、触感与压力、空间感与边界感、下沉感与展开感。\n- 语言具体而低刺激：允许温柔、诗意、有画面感，但必须建立在身体真实感受基础上，不虚浮空泛。\n- 每一句都必须有作用：安顿、引导注意、描述体感、容纳走神、自然过渡，至少占一种。\n- 融入正念练习的基础态度：不评判、耐心、初心、信任、不争取、接纳、放下；这些态度要体现在语气和引导方式里，而不是生硬列口号。\n- 不把用户推向“立刻放松”“必须平静”“一定做对”；更合适的是邀请、允许、观察、等待、回来。\n- 避免机械重复“放松”“平静”“此刻”等口头禅，同一层意思尽量换成更具体的身体表达。\n- 结束必须落地：回到呼吸、身体、房间、光线、支撑面和下一步动作；不要写“愿你充满爱与光明”“宇宙能量”“一切都会好起来”这类悬浮收尾。\n\n【引导模式与文本布局】\n当前任务已指定引导模式：${guidanceLabel}。\n${guidanceLayoutRules}\n- 下面的 [pause] 对照样本必须作为横向参照来理解：你需要同时看清轻 / 中 / 多三种模式在文本密度、段内停顿、段间停顿上的区别，而不是只模仿其中一种。\n\n【节奏与停顿规则】\n- 停顿必须服务体验，而不是机械插入。\n${pauseRules}\n${blockRules}\n- 段内小切换使用较短停顿，保持注意力流动；段间大切换使用较长停顿，让体验沉淀与转换。\n- [pause] 总时长至少要接近预算的 90%，并尽量均匀分布在全文，而不是集中到最后。\n- 多数时候，一句或两句真实引导之后，就应该给出自然停留，再进入下一层体验。\n- 如果内容还没接近目标时长，不要提前总结、提前升华、提前收束。\n- 宁可整体略长 5%-10%，也不要明显短于目标时长。\n\n${pauseExamples}\n\n【意象法与技巧使用原则】\n- 可以使用少量核心意象，如棉花、云朵、暖流、温光、呼吸通道等，但所有意象必须与具体身体部位和可感知体验挂钩。\n- 同一脚本中，意象不宜超过 3 种；如果使用，请选择 1-2 个核心意象贯穿，而不是频繁更换。\n- 每个意象句后都应有与之匹配的停顿，让体验有时间进入身体。\n- 如果主题本身不适合意象，就优先使用具体体感与呼吸觉察，不必强行加入意象。\n\n【默认结构】\n除非任务本身另有明确要求，否则默认采用以下五阶段结构：\n1. 安顿：建立姿势、支撑、安全感。\n2. 初步沉入：通过几次呼吸、轻度倒数或第一次意象轻触，把身心带入练习。\n3. 主体展开：这是最长阶段，真正展开身体扫描、呼吸觉察、主题练习或情绪容纳。\n4. 整体统合：把分散觉察汇聚为整体，允许更长的沉浸停顿。\n5. 回归结束：把觉察带回呼吸、身体、房间与下一步动作。\n- 先安顿，再深化，再整合，最后缓慢收束；在完成主要阶段前，不允许提前进入结束口吻。\n- 必须至少写出 ${paragraphBlocks} 个自然段 / 节奏块；只有最后 ${closingBlocks} 个节奏块才允许进入收束。\n- 大多数节奏块都应是完整展开的段落，而不是一两句就跳走。\n- 单段通常可展开到约 ${minCharsPerBlock}-${maxCharsPerBlock} 字，但以自然流动为先，不要僵硬卡字数。\n- 如果主题本身简单，就通过更细的呼吸层次、体感分层、开放觉察、走神回归与整合停留，把体验真正写满。\n\n【参考片段使用原则】\n- 向量检索返回的参考片段只是帮助你校准结构、节奏、体感颗粒度和陪伴方式的参考材料，不是必须引入的内容清单。\n- 如果参考片段和当前主题、时长、引导模式不完全契合，你可以只吸收其中有帮助的部分，也可以完全不采用具体意象或措辞。\n- 不要为了“用上参考”而硬塞内容；最终成品必须优先服务当前主题、当前用户状态和当前时长目标。\n- 绝对不要逐句复述参考片段，也不要把参考片段当成必须覆盖的素材来源。\n\n【时长控制】\n- 中文冥想朗读按约 150 字/分钟估算，\`[pause Xs]\` 秒数不计入朗读时间本身。\n- 先在内部规划：文字部分时长、停顿部分时长、五阶段时长占比与节奏块数量。\n- 内部估算公式：总字数 ÷ 150 × 60 秒 = 预计朗读秒数；预计朗读秒数 + 全部 \`[pause Xs]\` 秒数之和 = 预计总时长。\n- 输出前请内部自检：文字朗读时长 + 全部停顿时长，是否已经接近目标总时长。\n- 若预计总时长与目标时长误差超过 ±5%，优先微调若干停顿的秒数，其次适度增加或减少主体阶段的细节展开。\n- 若仍明显短于目标，不要急着收尾，应优先增加主体阶段展开、体感分层、意象回旋或走神回归后的再次停留。\n\n【本次任务参数】\n- 目标总时长：${durationMinutes} 分钟（${totalSeconds} 秒）\n- 引导模式：${guidanceLabel}\n- 文本朗读目标：约 ${targetTextSeconds} 秒\n- [pause] 总预算：约 ${targetPauseSeconds} 秒（至少不要明显低于 ${pauseFloorSeconds} 秒）\n- 建议文本量：约 ${promptEstimatedChars} 字，可在 ${minChars}-${maxChars} 字范围内自然浮动\n\n【内部结构蓝图（仅供你内部遵守，不要显式输出标题）】\n${phaseLines}\n\n【最后自检】\n- 是否已经写成完整成品，而不是写到一半就收尾。\n- 是否各阶段都真正展开，而不是只碰一下就跳过。\n- 是否大多数段内都有自然微停顿，而不是整段说完才停。\n- 是否参考片段只是被当作参考，而不是被机械搬运进正文。\n- 是否文本时长 + 停顿时长已经接近目标总时长。${styleBlock}`.trim();
}

export function buildMeditationGenerationUserPrompt(input: MeditationPromptInput) {
  const { topic, details, durationMinutes, guidanceLevel, styleOverride, referenceBlock } = input;
  const cleanTopic = normalizeTopic(topic);
  const guidanceLabel = GUIDANCE_LABELS[guidanceLevel] || GUIDANCE_LABELS.medium;
  const paragraphBlocks = getRecommendedParagraphBlocks(durationMinutes, guidanceLevel);
  const closingBlocks = getClosingBlocks(durationMinutes, guidanceLevel);
  const styleBlock = styleOverride?.trim() ? `\n额外风格偏好：${styleOverride.trim()}` : "";
  const detailsBlock = details?.trim() ? `\n\n【附加细节要求】\n${details.trim()}` : "";
  const referenceSection = referenceBlock?.trim()
    ? `\n\n${referenceBlock.trim()}\n- 这些参考片段只用于帮助你校准结构、节奏、体感颗粒度和陪伴方式，不是必须引入的内容清单。\n- 你只能借鉴这些参考的结构、节奏、体感描写颗粒度和陪伴方式，绝对不要逐句复述或改写得很像。`
    : "";

  return `请围绕下面的主题，直接写一篇适合 TTS 朗读的中文冥想引导脚本。\n\n主题：${cleanTopic}\n目标时长：${durationMinutes} 分钟\n引导强度：${guidanceLabel}\n目标用户：容易走神、需要被稳定陪伴带领进入练习的人\n写作目标：写出一篇完整、可信、可沉浸、时长尽量贴合目标的中文冥想正文${styleBlock}${detailsBlock}\n\n创作提醒：\n- 一次性写完整篇成品，不要只给示例片段。\n- 请明确分成多段输出，至少写出 ${paragraphBlocks} 个自然段 / 节奏块。\n- 每个自然段都必须有实际引导内容，不能只输出 \`[pause]\`。\n- 段内也要自然插入 \`[pause]\`，尤其在呼吸观察、身体部位切换、感官转场、走神回带之后。\n- 只有最后 ${closingBlocks} 个节奏块才允许进入结束。\n- 如果内容还没接近目标时长，不要提前总结或提前收束。\n- 让语气体现不评判、耐心、初心、信任、不争取、接纳、放下这些正念态度。\n- 向量检索片段只是参考，不是必须引入；如果不适合当前主题，可以不采用其中的具体内容。\n- 不要求逐条照搬任何参考；请吸收其结构与颗粒度后，写出新的成品。${referenceSection}\n\n请直接开始输出脚本正文。`;
}
