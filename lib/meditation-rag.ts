import bundledVectors from "./data/meditation_vectors.json" with { type: "json" };

export type GuidanceLevel = "light" | "medium" | "heavy";

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
};

export type MeditationChunk = {
  id: string;
  sampleId: string;
  title: string;
  content: string;
  searchableText: string;
  metadata: {
    guidanceLevel: GuidanceLevel;
    durationMinutes: number;
    themes: string[];
    styleTags: string[];
    audience: string;
    summary: string;
    source: string;
  };
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

export const NVIDIA_EMBEDDING_MODEL = "baai/bge-m3";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;
const CONTROL_DIRECTIVE_RE = /\[(?:pause|rate)[^\]]+\]/gi;
const MARKDOWN_RE = /[*#>`_-]/g;

function getFileStem(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function splitCommaList(value: string) {
  return value
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
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
  };
}

function buildSearchableText(sample: MeditationSample, content: string) {
  return [
    `标题：${sample.title}`,
    `适合主题：${sample.themes.join("、") || "通用冥想"}`,
    `引导强度：${sample.guidanceLevel}`,
    `建议时长：${sample.durationMinutes} 分钟`,
    `风格标签：${sample.styleTags.join("、") || "温柔、具体、稳定"}`,
    `适合人群：${sample.audience}`,
    `摘要：${sample.summary}`,
    `正文：${sanitizeRetrievalText(content)}`,
  ].join("\n");
}

export function chunkMeditationSample(sample: MeditationSample) {
  const paragraphs = sample.content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: MeditationChunk[] = [];
  const minChunkLength = 260;
  const maxChunkLength = 720;
  let buffer: string[] = [];
  let bufferLength = 0;

  const makeChunk = (content: string) => ({
    id: `${sample.id}#${chunks.length + 1}`,
    sampleId: sample.id,
    title: sample.title,
    content,
    searchableText: buildSearchableText(sample, content),
    metadata: {
      guidanceLevel: sample.guidanceLevel,
      durationMinutes: sample.durationMinutes,
      themes: sample.themes,
      styleTags: sample.styleTags,
      audience: sample.audience,
      summary: sample.summary,
      source: sample.source,
    },
  });

  for (const paragraph of paragraphs) {
    const shouldFlush =
      bufferLength >= minChunkLength && bufferLength + paragraph.length > maxChunkLength;
    if (shouldFlush) {
      const content = buffer.join("\n\n").trim();
      chunks.push(makeChunk(content));
      buffer = buffer.slice(-1);
      bufferLength = buffer.reduce((sum, item) => sum + item.length, 0);
    }

    buffer.push(paragraph);
    bufferLength += paragraph.length;
  }

  if (buffer.length > 0) {
    const content = buffer.join("\n\n").trim();
    chunks.push(makeChunk(content));
  }

  const unique = new Map<string, MeditationChunk>();
  for (const chunk of chunks) {
    unique.set(chunk.id, chunk);
  }
  return Array.from(unique.values());
}

export function buildMeditationQueryText(input: {
  topic: string;
  durationMinutes: number;
  guidanceLevel: string;
}) {
  return [
    `主题：${input.topic.trim()}`,
    `目标时长：${input.durationMinutes} 分钟`,
    `引导强度：${input.guidanceLevel}`,
    "目标：检索最贴近该主题、语气、引导密度与身体感的高质量中文冥想样本片段。",
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

function scoreMetadataBonus(
  query: { topic: string; durationMinutes: number; guidanceLevel: string },
  chunk: MeditationChunk
) {
  let bonus = 0;
  const normalizedTopic = query.topic.toLowerCase();

  if (chunk.metadata.guidanceLevel === clampGuidanceLevel(query.guidanceLevel)) {
    bonus += 0.06;
  }

  const durationDelta = Math.abs(chunk.metadata.durationMinutes - query.durationMinutes);
  if (durationDelta <= 5) bonus += 0.04;
  else if (durationDelta <= 10) bonus += 0.02;

  for (const keyword of [...chunk.metadata.themes, ...chunk.metadata.styleTags]) {
    if (keyword && normalizedTopic.includes(keyword.toLowerCase())) {
      bonus += 0.015;
    }
  }

  return bonus;
}

function buildReferenceReason(
  query: { topic: string; durationMinutes: number; guidanceLevel: string },
  chunk: MeditationChunk
) {
  const reasons: string[] = [];
  if (chunk.metadata.guidanceLevel === clampGuidanceLevel(query.guidanceLevel)) {
    reasons.push(`引导强度匹配 ${chunk.metadata.guidanceLevel}`);
  }
  const durationDelta = Math.abs(chunk.metadata.durationMinutes - query.durationMinutes);
  if (durationDelta <= 5) {
    reasons.push(`时长接近 ${chunk.metadata.durationMinutes} 分钟`);
  }
  const matchedTags = [...chunk.metadata.themes, ...chunk.metadata.styleTags].filter(
    (keyword) => keyword && query.topic.includes(keyword)
  );
  if (matchedTags.length > 0) {
    reasons.push(`主题贴近 ${matchedTags.slice(0, 3).join("、")}`);
  }
  return reasons.join("；") || `风格接近 ${chunk.metadata.summary}`;
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
  return Array.isArray(bundledVectors) ? (bundledVectors as MeditationVectorRecord[]) : [];
}

function lexicalFallbackRetrieve(
  query: { topic: string; durationMinutes: number; guidanceLevel: string },
  chunks: MeditationChunk[]
) {
  const tokens = query.topic
    .split(/[\s，。,、；：!！?？/]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return chunks
    .map((chunk) => {
      const haystack = `${chunk.title}\n${chunk.searchableText}`;
      let score = scoreMetadataBonus(query, chunk);
      for (const token of tokens) {
        if (haystack.includes(token)) {
          score += Math.max(0.03, token.length * 0.005);
        }
      }
      return {
        id: chunk.id,
        title: chunk.title,
        excerpt: summarizeExcerpt(chunk.content, 280),
        score,
        reason: buildReferenceReason(query, chunk),
        metadata: chunk.metadata,
      } satisfies RetrievedMeditationReference;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
}

export async function retrieveMeditationReferences(query: {
  topic: string;
  durationMinutes: number;
  guidanceLevel: string;
}) {
  const storedVectors = loadMeditationVectors();
  if (storedVectors.length === 0) {
    return [] as RetrievedMeditationReference[];
  }

  try {
    const [queryEmbedding] = await embedTextsWithNvidia([buildMeditationQueryText(query)]);
    const bestBySample = new Map<string, RetrievedMeditationReference>();

    for (const chunk of storedVectors) {
      if (!Array.isArray(chunk.embedding) || chunk.embedding.length === 0) continue;
      const baseScore = dotProduct(queryEmbedding, chunk.embedding);
      const score = baseScore + scoreMetadataBonus(query, chunk);
      const current = bestBySample.get(chunk.sampleId);
      const next: RetrievedMeditationReference = {
        id: chunk.id,
        title: chunk.title,
        excerpt: summarizeExcerpt(chunk.content, 280),
        score,
        reason: buildReferenceReason(query, chunk),
        metadata: chunk.metadata,
      };
      if (!current || next.score > current.score) {
        bestBySample.set(chunk.sampleId, next);
      }
    }

    return Array.from(bestBySample.values())
      .sort((left, right) => right.score - left.score)
      .slice(0, 4);
  } catch (error) {
    console.warn("[Meditation RAG] Falling back to lexical retrieval", error);
    return lexicalFallbackRetrieve(
      query,
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
