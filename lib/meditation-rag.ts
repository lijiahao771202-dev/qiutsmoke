import bundledVectors from "./data/meditation_vectors.json" with { type: "json" };

export type GuidanceLevel = "light" | "medium" | "heavy";
export type MeditationChunkKind = "window" | "stage";
export type MeditationStage =
  | "arrival"
  | "breath"
  | "body_scan"
  | "emotion"
  | "open_awareness"
  | "compassion"
  | "closing"
  | "general";
export type SilenceStyle = "少留白" | "平衡留白" | "多留白";

export type MeditationSample = {
  id: string;
  title: string;
  guidanceLevel: GuidanceLevel;
  durationMinutes: number;
  themes: string[];
  styleTags: string[];
  audience: string;
  summary: string;
  content: string;
  source: string;
  sceneTags?: string[];
  emotionTags?: string[];
  techniques?: string[];
  practiceModes?: string[];
  endingStyle?: string;
  silenceStyle?: SilenceStyle;
};

export type MeditationChunkMetadata = {
  guidanceLevel: GuidanceLevel;
  durationMinutes: number;
  themes: string[];
  styleTags: string[];
  audience: string;
  summary: string;
  source: string;
  chunkKind: MeditationChunkKind;
  stage: MeditationStage;
  sceneTags: string[];
  emotionTags: string[];
  techniques: string[];
  practiceModes: string[];
  endingStyle: string;
  silenceStyle: SilenceStyle;
};

export type MeditationChunk = {
  id: string;
  sampleId: string;
  title: string;
  content: string;
  searchableText: string;
  metadata: MeditationChunkMetadata;
};

export type MeditationVectorRecord = MeditationChunk & {
  embedding: number[];
};

export type RetrievedMeditationReference = {
  id: string;
  title: string;
  excerpt: string;
  score: number;
  reason: string;
  metadata: MeditationChunk["metadata"];
};

type MeditationQuery = {
  topic: string;
  durationMinutes: number;
  guidanceLevel: string;
};

type MeditationQueryProfile = MeditationQuery & {
  normalizedTopic: string;
  sceneTags: string[];
  emotionTags: string[];
  techniques: string[];
  practiceModes: string[];
  preferredStages: MeditationStage[];
  silenceStyle: SilenceStyle;
};

type ParagraphSlice = {
  text: string;
  stage: MeditationStage;
};

type RetrievalMatcher = {
  tag: string;
  patterns: RegExp[];
};

export const NVIDIA_EMBEDDING_MODEL = "baai/bge-m3";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const CONTROL_DIRECTIVE_RE = /\[(?:pause|rate)[^\]]+\]/gi;
const MARKDOWN_RE = /[*#>`_-]/g;

const STAGE_LABELS: Record<MeditationStage, string> = {
  arrival: "安顿进入",
  breath: "呼吸锚定",
  body_scan: "身体扫描",
  emotion: "情绪容纳",
  open_awareness: "开放觉察",
  compassion: "慈心陪伴",
  closing: "收束结束",
  general: "通用片段",
};

const SCENE_MATCHERS: RetrievalMatcher[] = [
  { tag: "睡前", patterns: [/睡前|临睡前|夜晚|入睡|睡眠|躺下/i] },
  { tag: "晨间", patterns: [/晨间|早晨|清晨|醒来|起床/i] },
  { tag: "通勤", patterns: [/通勤|地铁|公交|路上/i] },
  { tag: "午休", patterns: [/午休|中午|午间/i] },
  { tag: "下班后", patterns: [/下班|工作模式|工作后/i] },
  { tag: "社交后", patterns: [/社交之后|社交后/i] },
  { tag: "出门前", patterns: [/出门前/i] },
  { tag: "面试前", patterns: [/面试前/i] },
  { tag: "考试前", patterns: [/考试前/i] },
  { tag: "公开表达前", patterns: [/公开演讲前|表达前|上台前/i] },
];

const EMOTION_MATCHERS: RetrievalMatcher[] = [
  { tag: "焦虑", patterns: [/焦虑|心慌|慌|紧张/i] },
  { tag: "悲伤", patterns: [/悲伤|难过|想哭|心碎|失恋/i] },
  { tag: "愤怒", patterns: [/愤怒|生气|火气|冲突/i] },
  { tag: "委屈", patterns: [/委屈|被忽略|受伤/i] },
  { tag: "孤独", patterns: [/孤独|一个人|没人陪/i] },
  { tag: "自责", patterns: [/自责|自我批评|羞耻|失败/i] },
  { tag: "倦怠", patterns: [/倦怠|疲惫|很累|耗竭/i] },
  { tag: "过度思考", patterns: [/过度思考|反刍|想太多|停不下来/i] },
  { tag: "压力", patterns: [/压力|工作压力|压得喘不过气/i] },
  { tag: "麻木", patterns: [/麻木|空掉|感觉不到/i] },
  { tag: "创伤敏感", patterns: [/创伤敏感|安全感|选择权|不舒服就停/i] },
];

const TECHNIQUE_MATCHERS: RetrievalMatcher[] = [
  { tag: "呼吸", patterns: [/呼吸|吸气|呼气|鼻尖/i] },
  { tag: "身体扫描", patterns: [/身体扫描|上半身|下半身|肩膀|下巴|坐骨|手掌|脚底|小腿|膝盖|大腿/i] },
  { tag: "RAIN", patterns: [/RAIN|识别|允许|探询|滋养/i] },
  { tag: "开放觉察", patterns: [/开放觉察|更宽的觉察|声音|空间|念头来来去去/i] },
  { tag: "慈心", patterns: [/慈心|愿我|愿你|祝福/i] },
  { tag: "命名", patterns: [/命名|叫出.*名字|取一个名字/i] },
  { tag: "落地", patterns: [/落地|支撑|脚底|地面|房间|外部世界/i] },
  { tag: "边界", patterns: [/边界/i] },
  { tag: "回神", patterns: [/走神|回来|带回|回到呼吸/i] },
];

function getFileStem(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function splitCommaList(value: string) {
  return value
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function clampGuidanceLevel(value: string): GuidanceLevel {
  if (value === "light" || value === "medium" || value === "heavy") return value;
  return "medium";
}

function sanitizeRetrievalText(value: string) {
  return value
    .replace(FRONTMATTER_RE, "")
    .replace(CONTROL_DIRECTIVE_RE, " ")
    .replace(MARKDOWN_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeExcerpt(value: string, maxLength = 220) {
  const text = sanitizeRetrievalText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

function collectMatchedTags(text: string, matchers: RetrievalMatcher[]) {
  return uniqueStrings(
    matchers.flatMap((matcher) =>
      matcher.patterns.some((pattern) => pattern.test(text)) ? [matcher.tag] : []
    )
  );
}

function inferSilenceStyle(sample: MeditationSample, lookupText: string): SilenceStyle {
  if (sample.silenceStyle) return sample.silenceStyle;
  if (/留白|静默|稀疏引导/i.test(lookupText)) return "多留白";
  if (sample.guidanceLevel === "light") return "多留白";
  if (sample.guidanceLevel === "heavy") return "少留白";
  return "平衡留白";
}

function inferPracticeModes(sample: MeditationSample, lookupText: string, sceneTags: string[]) {
  const modes = [...(sample.practiceModes || [])];
  if (sample.durationMinutes >= 20 || /正式练习|长时练习|静坐/i.test(lookupText)) {
    modes.push("正式练习");
  }
  if (/创伤敏感|安全感|选择权/i.test(lookupText)) {
    modes.push("创伤敏感");
  }
  if (sceneTags.length > 0 && !modes.includes("正式练习")) {
    modes.push("生活场景");
  }
  return uniqueStrings(modes);
}

function inferEndingStyle(sample: MeditationSample, lookupText: string, sceneTags: string[]) {
  if (sample.endingStyle) return sample.endingStyle;
  if (sceneTags.includes("睡前")) return "安睡收束";
  if (/留白|静默/i.test(lookupText) && sample.guidanceLevel === "light") return "留白收束";
  if (/带回.*生活|带回.*日常|回到.*生活|回到.*日常/i.test(sample.content)) {
    return "回到日常";
  }
  if (/边界/i.test(lookupText)) return "边界收束";
  return "渐进落地";
}

function resolveChunkMetadata(
  sample: MeditationSample,
  options: {
    chunkKind: MeditationChunkKind;
    stage: MeditationStage;
  }
): MeditationChunkMetadata {
  const lookupText = [
    sample.title,
    sample.themes.join(" "),
    sample.styleTags.join(" "),
    sample.audience,
    sample.summary,
    sample.content,
  ].join("\n");

  const sceneTags = uniqueStrings([
    ...(sample.sceneTags || []),
    ...collectMatchedTags(lookupText, SCENE_MATCHERS),
  ]);
  const emotionTags = uniqueStrings([
    ...(sample.emotionTags || []),
    ...collectMatchedTags(lookupText, EMOTION_MATCHERS),
  ]);
  const techniques = uniqueStrings([
    ...(sample.techniques || []),
    ...collectMatchedTags(lookupText, TECHNIQUE_MATCHERS),
  ]);
  const practiceModes = inferPracticeModes(sample, lookupText, sceneTags);
  const silenceStyle = inferSilenceStyle(sample, lookupText);
  const endingStyle = inferEndingStyle(sample, lookupText, sceneTags);

  return {
    guidanceLevel: sample.guidanceLevel,
    durationMinutes: sample.durationMinutes,
    themes: sample.themes,
    styleTags: sample.styleTags,
    audience: sample.audience,
    summary: sample.summary,
    source: sample.source,
    chunkKind: options.chunkKind,
    stage: options.stage,
    sceneTags,
    emotionTags,
    techniques,
    practiceModes,
    endingStyle,
    silenceStyle,
  };
}

function buildSearchableText(
  sample: MeditationSample,
  content: string,
  metadata: MeditationChunkMetadata
) {
  return [
    `标题：${sample.title}`,
    `片段类型：${metadata.chunkKind === "stage" ? "阶段切片" : "滑窗切片"}`,
    `阶段标签：${STAGE_LABELS[metadata.stage]}`,
    `适合主题：${sample.themes.join("、") || "通用冥想"}`,
    `引导强度：${sample.guidanceLevel}`,
    `建议时长：${sample.durationMinutes} 分钟`,
    `场景标签：${metadata.sceneTags.join("、") || "通用场景"}`,
    `情绪标签：${metadata.emotionTags.join("、") || "稳定、放松"}`,
    `技法标签：${metadata.techniques.join("、") || "温柔陪伴"}`,
    `练习模式：${metadata.practiceModes.join("、") || "通用练习"}`,
    `留白风格：${metadata.silenceStyle}`,
    `收束风格：${metadata.endingStyle}`,
    `风格标签：${sample.styleTags.join("、") || "温柔、具体、稳定"}`,
    `适合人群：${sample.audience}`,
    `摘要：${sample.summary}`,
    `正文：${sanitizeRetrievalText(content)}`,
  ].join("\n");
}

function inferChunkStageFromContent(content: string) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return "general" as MeditationStage;
  return dominantStage(
    paragraphs.map((paragraph, index) => detectParagraphStage(paragraph, index, paragraphs.length))
  );
}

function normalizeStoredVectorRecord(record: MeditationVectorRecord): MeditationVectorRecord {
  const legacyMetadata = (record.metadata || {}) as Partial<MeditationChunkMetadata>;
  const sample: MeditationSample = {
    id: record.sampleId || record.id.split("#")[0] || "bundled-sample",
    title: record.title,
    guidanceLevel: clampGuidanceLevel(legacyMetadata.guidanceLevel || "medium"),
    durationMinutes: Number(legacyMetadata.durationMinutes || 10) || 10,
    themes: Array.isArray(legacyMetadata.themes) ? legacyMetadata.themes : [],
    styleTags: Array.isArray(legacyMetadata.styleTags) ? legacyMetadata.styleTags : [],
    audience: legacyMetadata.audience || "需要稳定、具体、温柔陪伴的练习者",
    summary: legacyMetadata.summary || summarizeExcerpt(record.content, 90),
    content: record.content,
    source: legacyMetadata.source || "bundled-vector",
    sceneTags: Array.isArray(legacyMetadata.sceneTags) ? legacyMetadata.sceneTags : [],
    emotionTags: Array.isArray(legacyMetadata.emotionTags) ? legacyMetadata.emotionTags : [],
    techniques: Array.isArray(legacyMetadata.techniques) ? legacyMetadata.techniques : [],
    practiceModes: Array.isArray(legacyMetadata.practiceModes) ? legacyMetadata.practiceModes : [],
    endingStyle: legacyMetadata.endingStyle,
    silenceStyle:
      legacyMetadata.silenceStyle === "少留白" ||
      legacyMetadata.silenceStyle === "平衡留白" ||
      legacyMetadata.silenceStyle === "多留白"
        ? legacyMetadata.silenceStyle
        : undefined,
  };

  const chunkKind: MeditationChunkKind =
    legacyMetadata.chunkKind === "stage" || record.id.includes("#stage-") ? "stage" : "window";
  const stage =
    legacyMetadata.stage && STAGE_LABELS[legacyMetadata.stage]
      ? legacyMetadata.stage
      : inferChunkStageFromContent(record.content);
  const metadata = resolveChunkMetadata(sample, {
    chunkKind,
    stage,
  });

  return {
    ...record,
    id: record.id || `${sample.id}#${chunkKind}-1`,
    sampleId: sample.id,
    searchableText:
      typeof record.searchableText === "string" && record.searchableText.includes("片段类型：")
        ? record.searchableText
        : buildSearchableText(sample, record.content, metadata),
    metadata,
    embedding: Array.isArray(record.embedding) ? record.embedding : [],
  };
}

export function parseMeditationSampleFile(fileName: string, raw: string): MeditationSample {
  const match = raw.match(FRONTMATTER_RE);
  const frontmatter = match?.[1] || "";
  const content = raw.replace(FRONTMATTER_RE, "").trim();
  const meta: Record<string, string> = {};

  for (const line of frontmatter.split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!key || !value) continue;
    meta[key] = value;
  }

  const id = getFileStem(fileName);
  return {
    id,
    title: meta.title || id,
    guidanceLevel: clampGuidanceLevel(meta.guidanceLevel || "medium"),
    durationMinutes: Number.parseInt(meta.durationMinutes || "10", 10) || 10,
    themes: splitCommaList(meta.themes || meta.theme || ""),
    styleTags: splitCommaList(meta.styleTags || ""),
    audience: meta.audience || "需要稳定、具体、温柔陪伴的练习者",
    summary: meta.summary || summarizeExcerpt(content, 90),
    content,
    source: meta.source || "curated-original",
    sceneTags: splitCommaList(meta.sceneTags || meta.scenes || ""),
    emotionTags: splitCommaList(meta.emotionTags || meta.emotionTargets || ""),
    techniques: splitCommaList(meta.techniques || ""),
    practiceModes: splitCommaList(meta.practiceModes || ""),
    endingStyle: meta.endingStyle || undefined,
    silenceStyle:
      meta.silenceStyle === "少留白" || meta.silenceStyle === "平衡留白" || meta.silenceStyle === "多留白"
        ? (meta.silenceStyle as SilenceStyle)
        : undefined,
  };
}

function detectParagraphStage(
  paragraph: string,
  index: number,
  totalParagraphs: number
): MeditationStage {
  const text = sanitizeRetrievalText(paragraph);

  if (
    /最后|准备结束|结束时|慢慢从静默里出来|带回.*生活|带回.*日常|回到.*生活|回到.*日常/i.test(
      text
    ) ||
    index === totalParagraphs - 1
  ) {
    return "closing";
  }
  if (/愿我|愿你|慈心|祝福/i.test(text)) return "compassion";
  if (/开放觉察|更宽的觉察|声音|空间|念头来来去去/i.test(text)) return "open_awareness";
  if (/情绪|焦虑|委屈|难过|害怕|愤怒|悲伤|命名|名字|允许/i.test(text)) return "emotion";
  if (/身体扫描|上半身|下半身|肩膀|下巴|坐骨|手掌|脚底|小腿|膝盖|大腿/i.test(text)) {
    return "body_scan";
  }
  if (/呼吸|吸气|呼气|鼻尖/i.test(text)) return "breath";
  if (index <= 1 || /姿势|坐好|停下来|支撑|看看你所在的空间|先感觉/i.test(text)) {
    return "arrival";
  }
  return "general";
}

function dominantStage(stages: MeditationStage[]) {
  const counts = new Map<MeditationStage, number>();
  for (const stage of stages) {
    counts.set(stage, (counts.get(stage) || 0) + 1);
  }

  const ranked = Array.from(counts.entries()).sort((left, right) => {
    if (left[0] === "general") return 1;
    if (right[0] === "general") return -1;
    return right[1] - left[1];
  });
  return ranked[0]?.[0] || "general";
}

function paragraphLength(paragraphs: string[]) {
  return paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
}

function buildWindowChunkSlices(slices: ParagraphSlice[]) {
  const chunks: Array<{ content: string; stage: MeditationStage }> = [];
  const minChunkLength = 260;
  const maxChunkLength = 720;
  let buffer: ParagraphSlice[] = [];
  let bufferLength = 0;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    chunks.push({
      content: buffer.map((slice) => slice.text).join("\n\n").trim(),
      stage: dominantStage(buffer.map((slice) => slice.stage)),
    });
  };

  for (const slice of slices) {
    const shouldFlush = bufferLength >= minChunkLength && bufferLength + slice.text.length > maxChunkLength;
    if (shouldFlush) {
      flushBuffer();
      buffer = buffer.slice(-1);
      bufferLength = buffer.reduce((sum, item) => sum + item.text.length, 0);
    }

    buffer.push(slice);
    bufferLength += slice.text.length;
  }

  flushBuffer();
  return chunks;
}

function buildStageChunkSlices(sample: MeditationSample, slices: ParagraphSlice[]) {
  if (slices.length < 4 && sample.durationMinutes < 18) {
    return [] as Array<{ content: string; stage: MeditationStage }>;
  }

  const minStageChunkLength = 180;
  const rawGroups: Array<{ stage: MeditationStage; paragraphs: string[] }> = [];
  let currentStage = slices[0]?.stage || "general";
  let buffer: string[] = [];
  let bufferLength = 0;

  const flushGroup = () => {
    if (buffer.length === 0) return;
    rawGroups.push({
      stage: currentStage,
      paragraphs: [...buffer],
    });
  };

  for (const slice of slices) {
    const nextStage = slice.stage;
    const shouldFlush =
      buffer.length > 0 &&
      bufferLength >= minStageChunkLength &&
      nextStage !== currentStage &&
      nextStage !== "general";

    if (shouldFlush) {
      flushGroup();
      buffer = [];
      bufferLength = 0;
      currentStage = nextStage;
    }

    if (buffer.length === 0) {
      currentStage = nextStage;
    } else if (currentStage === "general" && nextStage !== "general" && bufferLength < 140) {
      currentStage = nextStage;
    }

    buffer.push(slice.text);
    bufferLength += slice.text.length;
  }

  flushGroup();

  const mergedGroups: Array<{ stage: MeditationStage; paragraphs: string[] }> = [];
  for (const group of rawGroups) {
    if (mergedGroups.length > 0 && paragraphLength(group.paragraphs) < 120) {
      const previous = mergedGroups[mergedGroups.length - 1];
      previous.paragraphs.push(...group.paragraphs);
      if (previous.stage === "general" && group.stage !== "general") {
        previous.stage = group.stage;
      }
      continue;
    }
    mergedGroups.push({
      stage: group.stage,
      paragraphs: [...group.paragraphs],
    });
  }

  if (mergedGroups.length < 2) {
    return [] as Array<{ content: string; stage: MeditationStage }>;
  }

  return mergedGroups.map((group) => ({
    content: group.paragraphs.join("\n\n").trim(),
    stage: group.stage,
  }));
}

function createChunk(
  sample: MeditationSample,
  kind: MeditationChunkKind,
  index: number,
  content: string,
  stage: MeditationStage
): MeditationChunk {
  const metadata = resolveChunkMetadata(sample, {
    chunkKind: kind,
    stage,
  });

  return {
    id: `${sample.id}#${kind}-${index}`,
    sampleId: sample.id,
    title: sample.title,
    content,
    searchableText: buildSearchableText(sample, content, metadata),
    metadata,
  };
}

export function chunkMeditationSample(sample: MeditationSample) {
  const paragraphs = sample.content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const slices = paragraphs.map((paragraph, index) => ({
    text: paragraph,
    stage: detectParagraphStage(paragraph, index, paragraphs.length),
  }));

  const windowChunks = buildWindowChunkSlices(slices).map((chunk, index) =>
    createChunk(sample, "window", index + 1, chunk.content, chunk.stage)
  );
  const stageChunks = buildStageChunkSlices(sample, slices).map((chunk, index) =>
    createChunk(sample, "stage", index + 1, chunk.content, chunk.stage)
  );

  const unique = new Map<string, MeditationChunk>();
  for (const chunk of [...windowChunks, ...stageChunks]) {
    const key = `${chunk.metadata.chunkKind}:${sanitizeRetrievalText(chunk.content)}`;
    if (!unique.has(key)) {
      unique.set(key, chunk);
    }
  }
  return Array.from(unique.values());
}

function buildQueryProfile(input: MeditationQuery): MeditationQueryProfile {
  const normalizedTopic = sanitizeRetrievalText(input.topic).toLowerCase();
  const sceneTags = collectMatchedTags(input.topic, SCENE_MATCHERS);
  const emotionTags = collectMatchedTags(input.topic, EMOTION_MATCHERS);
  const techniques = collectMatchedTags(input.topic, TECHNIQUE_MATCHERS);
  const practiceModes = uniqueStrings([
    ...(input.durationMinutes >= 20 || /正式练习|长时练习|静坐/i.test(input.topic) ? ["正式练习"] : []),
    ...(sceneTags.length > 0 ? ["生活场景"] : []),
    ...(/创伤敏感|安全感|选择权/i.test(input.topic) ? ["创伤敏感"] : []),
  ]);

  const preferredStages = uniqueStrings(
    [
      ...(techniques.includes("呼吸") ? ["breath"] : []),
      ...(techniques.includes("身体扫描") ? ["body_scan"] : []),
      ...(emotionTags.length > 0 || techniques.includes("RAIN") || techniques.includes("命名")
        ? ["emotion"]
        : []),
      ...(techniques.includes("开放觉察") ? ["open_awareness"] : []),
      ...(techniques.includes("慈心") ? ["compassion"] : []),
      ...(/准备结束|收束|带回日常|带回生活/i.test(input.topic) ? ["closing"] : []),
      "arrival",
    ] as MeditationStage[]
  ) as MeditationStage[];

  const silenceStyle =
    /留白|静默|轻引导/i.test(input.topic)
      ? "多留白"
      : /多引导|详细引导/i.test(input.topic) || clampGuidanceLevel(input.guidanceLevel) === "heavy"
        ? "少留白"
        : clampGuidanceLevel(input.guidanceLevel) === "light"
          ? "多留白"
          : "平衡留白";

  return {
    ...input,
    normalizedTopic,
    sceneTags,
    emotionTags,
    techniques,
    practiceModes,
    preferredStages,
    silenceStyle,
  };
}

export function buildMeditationQueryText(input: MeditationQuery) {
  const profile = buildQueryProfile(input);

  return [
    `主题：${input.topic.trim()}`,
    `目标时长：${input.durationMinutes} 分钟`,
    `引导强度：${input.guidanceLevel}`,
    `场景偏好：${profile.sceneTags.join("、") || "通用"}`,
    `情绪偏好：${profile.emotionTags.join("、") || "稳定、放松"}`,
    `技法偏好：${profile.techniques.join("、") || "温柔陪伴"}`,
    `练习模式：${profile.practiceModes.join("、") || "通用"}`,
    `留白偏好：${profile.silenceStyle}`,
    `阶段偏好：${profile.preferredStages.map((stage) => STAGE_LABELS[stage]).join("、")}`,
    "目标：检索最贴近该主题、场景、情绪、引导密度与练习阶段的高质量中文冥想样本片段。",
  ].join("\n");
}

function dotProduct(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let total = 0;
  for (let index = 0; index < length; index += 1) {
    total += a[index] * b[index];
  }
  return total;
}

function countOverlap(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return 0;
  const set = new Set(right);
  return left.filter((item) => set.has(item)).length;
}

function scoreMetadataBonus(query: MeditationQueryProfile, chunk: MeditationChunk) {
  let bonus = 0;

  if (chunk.metadata.guidanceLevel === clampGuidanceLevel(query.guidanceLevel)) {
    bonus += 0.06;
  }

  const durationDelta = Math.abs(chunk.metadata.durationMinutes - query.durationMinutes);
  if (durationDelta <= 5) bonus += 0.04;
  else if (durationDelta <= 10) bonus += 0.02;

  if (chunk.metadata.silenceStyle === query.silenceStyle) {
    bonus += 0.03;
  }

  const sceneMatches = countOverlap(query.sceneTags, chunk.metadata.sceneTags);
  const emotionMatches = countOverlap(query.emotionTags, chunk.metadata.emotionTags);
  const techniqueMatches = countOverlap(query.techniques, chunk.metadata.techniques);
  const practiceMatches = countOverlap(query.practiceModes, chunk.metadata.practiceModes);

  bonus += Math.min(0.08, sceneMatches * 0.03);
  bonus += Math.min(0.07, emotionMatches * 0.028);
  bonus += Math.min(0.07, techniqueMatches * 0.025);
  bonus += Math.min(0.05, practiceMatches * 0.022);

  if (query.sceneTags.length > 0 && sceneMatches === 0) {
    bonus -= 0.03;
  }
  if (query.emotionTags.length > 0 && emotionMatches === 0) {
    bonus -= 0.02;
  }
  if (query.practiceModes.length > 0 && practiceMatches === 0) {
    bonus -= 0.02;
  }

  if (query.preferredStages.includes(chunk.metadata.stage)) {
    bonus += chunk.metadata.chunkKind === "stage" ? 0.05 : 0.03;
  } else if (chunk.metadata.chunkKind === "window") {
    bonus += 0.01;
  }

  for (const keyword of [...chunk.metadata.themes, ...chunk.metadata.styleTags]) {
    if (keyword && query.normalizedTopic.includes(keyword.toLowerCase())) {
      bonus += 0.012;
    }
  }

  return bonus;
}

function buildReferenceReason(query: MeditationQueryProfile, chunk: MeditationChunk) {
  const reasons: string[] = [];

  if (chunk.metadata.guidanceLevel === clampGuidanceLevel(query.guidanceLevel)) {
    reasons.push(`引导强度匹配 ${chunk.metadata.guidanceLevel}`);
  }

  const durationDelta = Math.abs(chunk.metadata.durationMinutes - query.durationMinutes);
  if (durationDelta <= 5) {
    reasons.push(`时长接近 ${chunk.metadata.durationMinutes} 分钟`);
  }

  const matchedScenes = chunk.metadata.sceneTags.filter((tag) => query.sceneTags.includes(tag));
  if (matchedScenes.length > 0) {
    reasons.push(`场景贴近 ${matchedScenes.slice(0, 2).join("、")}`);
  }

  const matchedEmotions = chunk.metadata.emotionTags.filter((tag) => query.emotionTags.includes(tag));
  if (matchedEmotions.length > 0) {
    reasons.push(`情绪贴近 ${matchedEmotions.slice(0, 2).join("、")}`);
  }

  const matchedTechniques = chunk.metadata.techniques.filter((tag) => query.techniques.includes(tag));
  if (matchedTechniques.length > 0) {
    reasons.push(`技法贴近 ${matchedTechniques.slice(0, 2).join("、")}`);
  }

  if (query.preferredStages.includes(chunk.metadata.stage)) {
    reasons.push(`阶段贴近 ${STAGE_LABELS[chunk.metadata.stage]}`);
  }

  return reasons.slice(0, 4).join("；") || `风格接近 ${chunk.metadata.summary}`;
}

export async function embedTextsWithNvidia(texts: string[], apiKey = process.env.NVIDIA_API_KEY) {
  if (!apiKey) {
    throw new Error("缺少 NVIDIA_API_KEY，无法生成向量。");
  }
  if (texts.length === 0) return [] as number[][];

  const response = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: NVIDIA_EMBEDDING_MODEL,
      input: texts,
      encoding_format: "float",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`NVIDIA embeddings 请求失败: HTTP ${response.status} ${errorText}`.trim());
  }

  const json = (await response.json()) as {
    data?: Array<{ index: number; embedding: number[] }>;
  };
  return (json.data || [])
    .slice()
    .sort((left, right) => left.index - right.index)
    .map((item) => item.embedding);
}

export function loadMeditationVectors() {
  if (!Array.isArray(bundledVectors)) return [];
  return (bundledVectors as MeditationVectorRecord[]).map(normalizeStoredVectorRecord);
}

function lexicalFallbackRetrieve(query: MeditationQueryProfile, chunks: MeditationChunk[]) {
  const tokens = query.topic
    .split(/[\s，。,、；：!！?？/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const bestBySample = new Map<string, RetrievedMeditationReference>();

  for (const chunk of chunks) {
    let score = scoreMetadataBonus(query, chunk);
    const haystack = `${chunk.title}\n${chunk.searchableText}`;
    for (const token of tokens) {
      if (haystack.includes(token)) {
        score += Math.max(0.03, token.length * 0.005);
      }
    }
    const next = {
      id: chunk.id,
      title: chunk.title,
      excerpt: summarizeExcerpt(chunk.content, 280),
      score,
      reason: buildReferenceReason(query, chunk),
      metadata: chunk.metadata,
    } satisfies RetrievedMeditationReference;
    const current = bestBySample.get(chunk.sampleId);
    if (!current || next.score > current.score) {
      bestBySample.set(chunk.sampleId, next);
    }
  }

  return Array.from(bestBySample.values())
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
}

export async function retrieveMeditationReferences(query: MeditationQuery) {
  const storedVectors = loadMeditationVectors();
  if (storedVectors.length === 0) {
    return [] as RetrievedMeditationReference[];
  }

  const queryProfile = buildQueryProfile(query);

  try {
    const [queryEmbedding] = await embedTextsWithNvidia([buildMeditationQueryText(query)]);
    const bestBySample = new Map<string, RetrievedMeditationReference>();

    for (const chunk of storedVectors) {
      if (!Array.isArray(chunk.embedding) || chunk.embedding.length === 0) continue;
      const baseScore = dotProduct(queryEmbedding, chunk.embedding);
      const score = baseScore + scoreMetadataBonus(queryProfile, chunk);
      const current = bestBySample.get(chunk.sampleId);
      const next: RetrievedMeditationReference = {
        id: chunk.id,
        title: chunk.title,
        excerpt: summarizeExcerpt(chunk.content, 280),
        score,
        reason: buildReferenceReason(queryProfile, chunk),
        metadata: chunk.metadata,
      };
      if (!current || next.score > current.score) {
        bestBySample.set(chunk.sampleId, next);
      }
    }

    const ranked = Array.from(bestBySample.values())
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);

    if (ranked.length === 0) {
      return lexicalFallbackRetrieve(
        queryProfile,
        storedVectors.map((vector) => ({
          id: vector.id,
          sampleId: vector.sampleId,
          title: vector.title,
          content: vector.content,
          searchableText: vector.searchableText,
          metadata: vector.metadata,
        }))
      );
    }

    return ranked;
  } catch (error) {
    console.warn("[Meditation RAG] Falling back to lexical retrieval", error);
    return lexicalFallbackRetrieve(
      queryProfile,
      storedVectors.map((vector) => ({
        id: vector.id,
        sampleId: vector.sampleId,
        title: vector.title,
        content: vector.content,
        searchableText: vector.searchableText,
        metadata: vector.metadata,
      }))
    );
  }
}

export function formatMeditationReferenceBlock(references: RetrievedMeditationReference[]) {
  if (references.length === 0) return "";

  const lines = references.map(
    (reference, index) =>
      `${index + 1}. ${reference.title}\n- 可借鉴点：${reference.reason}\n- 片段：${reference.excerpt}`
  );

  return `【高质量样本参考（只借鉴结构、节奏、体感颗粒度和陪伴方式，禁止照抄）】\n${lines.join("\n")}`;
}
