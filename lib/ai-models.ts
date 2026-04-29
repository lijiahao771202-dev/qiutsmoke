export type AIProvider = "deepseek" | "nvidia" | "mimo";
export type AIReasoningEffort = "high" | "max";

export type AIModelFamily =
  | "deepseek"
  | "qwen"
  | "meta"
  | "google"
  | "glm"
  | "moonshot"
  | "openai-oss"
  | "mimo";

export interface AIModelOption {
  id: string;
  provider: AIProvider;
  family: AIModelFamily;
  label: string;
  description: string;
}

export interface AIModelFamilyOption {
  id: AIModelFamily;
  provider: AIProvider;
  label: string;
  description: string;
  emptyMessage?: string;
}

export interface AISettings {
  provider: AIProvider;
  model: string;
  deepseekThinkingEnabled: boolean;
  deepseekReasoningEffort: AIReasoningEffort;
}

export const DEFAULT_AI_PROVIDER: AIProvider = "deepseek";
export const DEFAULT_DEEPSEEK_REASONING_EFFORT: AIReasoningEffort = "high";

export const DEFAULT_AI_MODEL_BY_PROVIDER: Record<AIProvider, string> = {
  deepseek: "deepseek-v4-flash",
  nvidia: "moonshotai/kimi-k2-instruct",
  mimo: "mimo-v2.5",
};

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  deepseek: "DeepSeek 官方 API",
  nvidia: "NVIDIA NIM API",
  mimo: "小米 MiMo 官方 API",
};

export const DEEPSEEK_REASONING_EFFORT_OPTIONS: Array<{
  id: AIReasoningEffort;
  label: string;
  description: string;
}> = [
  {
    id: "high",
    label: "High",
    description: "标准深度思考，速度和质量更平衡。",
  },
  {
    id: "max",
    label: "Max",
    description: "更强推理强度，通常更慢。",
  },
];

export const AI_MODEL_FAMILY_OPTIONS: AIModelFamilyOption[] = [
  {
    id: "deepseek",
    provider: "deepseek",
    label: "DeepSeek 系列",
    description: "官方 API，支持 V4 与深度思考。",
  },
  {
    id: "qwen",
    provider: "nvidia",
    label: "千问系列",
    description: "中文能力和复杂推理都比较稳。",
  },
  {
    id: "meta",
    provider: "nvidia",
    label: "Meta 系列",
    description: "Llama 系模型，适合通用文本生成。",
  },
  {
    id: "google",
    provider: "nvidia",
    label: "谷歌系列",
    description: "Gemma 系模型，适合轻量与多模态方向。",
  },
  {
    id: "glm",
    provider: "nvidia",
    label: "GLM 系列",
    description: "Z.ai / GLM 系列。",
    emptyMessage: "当前这把 NVIDIA key 下，GLM 系列暂无可用 hosted 模型。",
  },
  {
    id: "moonshot",
    provider: "nvidia",
    label: "Moonshot 系列",
    description: "Kimi 系列，中文表现好。",
  },
  {
    id: "openai-oss",
    provider: "nvidia",
    label: "OpenAI OSS",
    description: "开源大模型，适合通用文本与推理。",
  },
  {
    id: "mimo",
    provider: "mimo",
    label: "MiMo 系列",
    description: "小米官方 OpenAI 兼容接口，支持 MiMo V2.5 系列。",
  },
];

export const AI_MODEL_OPTIONS: AIModelOption[] = [
  {
    id: "deepseek-v4-flash",
    provider: "deepseek",
    family: "deepseek",
    label: "DeepSeek V4 Flash",
    description: "V4 快速版，适合日常冥想脚本生成。",
  },
  {
    id: "deepseek-v4-pro",
    provider: "deepseek",
    family: "deepseek",
    label: "DeepSeek V4 Pro",
    description: "V4 高质量版，适合更复杂、更长的脚本生成。",
  },
  {
    id: "deepseek-chat",
    provider: "deepseek",
    family: "deepseek",
    label: "DeepSeek Chat",
    description: "旧兼容别名，保留以兼容历史设置。",
  },
  {
    id: "deepseek-reasoner",
    provider: "deepseek",
    family: "deepseek",
    label: "DeepSeek Reasoner",
    description: "旧兼容别名，强制开启深度思考。",
  },
  {
    id: "qwen/qwen3.5-122b-a10b",
    provider: "nvidia",
    family: "qwen",
    label: "Qwen 3.5 122B A10B",
    description: "中文、长文本和通用对话表现稳定。",
  },
  {
    id: "qwen/qwen3.5-397b-a17b",
    provider: "nvidia",
    family: "qwen",
    label: "Qwen 3.5 397B A17B",
    description: "更大规模的 Qwen 3.5 模型，适合高质量复杂生成。",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-thinking",
    provider: "nvidia",
    family: "qwen",
    label: "Qwen3-Next 80B Thinking",
    description: "偏推理，适合更复杂的结构化生成。",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct",
    provider: "nvidia",
    family: "qwen",
    label: "Qwen3-Next 80B Instruct",
    description: "偏指令遵循和通用对话，适合日常生成。",
  },
  {
    id: "qwen/qwen3-coder-480b-a35b-instruct",
    provider: "nvidia",
    family: "qwen",
    label: "Qwen3 Coder 480B Instruct",
    description: "更适合编码和 agentic 任务。",
  },
  {
    id: "qwen/qwen2.5-coder-32b-instruct",
    provider: "nvidia",
    family: "qwen",
    label: "Qwen2.5 Coder 32B Instruct",
    description: "Qwen 2.5 代码模型。",
  },
  {
    id: "meta/llama-3.2-3b-instruct",
    provider: "nvidia",
    family: "meta",
    label: "Llama 3.2 3B Instruct",
    description: "轻量的 Meta 模型，适合通用文本任务。",
  },
  {
    id: "meta/llama-3.1-70b-instruct",
    provider: "nvidia",
    family: "meta",
    label: "Llama 3.1 70B Instruct",
    description: "更强的通用大模型，适合长文本与复杂生成。",
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    provider: "nvidia",
    family: "meta",
    label: "Llama 3.3 70B Instruct",
    description: "当前更强的 Llama 文本模型之一。",
  },
  {
    id: "meta/llama-4-maverick-17b-128e-instruct",
    provider: "nvidia",
    family: "meta",
    label: "Llama 4 Maverick 17B 128E",
    description: "Meta 新一代模型，也支持聊天生成。",
  },
  {
    id: "google/gemma-3-27b-it",
    provider: "nvidia",
    family: "google",
    label: "Gemma 3 27B IT",
    description: "Google Gemma 系的强选项。",
  },
  {
    id: "google/gemma-4-31b-it",
    provider: "nvidia",
    family: "google",
    label: "Gemma 4 31B IT",
    description: "Gemma 4 新一代 31B 模型。",
  },
  {
    id: "google/gemma-2-2b-it",
    provider: "nvidia",
    family: "google",
    label: "Gemma 2 2B IT",
    description: "更轻量的 Google Gemma 模型。",
  },
  {
    id: "moonshotai/kimi-k2-instruct",
    provider: "nvidia",
    family: "moonshot",
    label: "Kimi K2 Instruct",
    description: "通用能力强，中文表现好。",
  },
  {
    id: "moonshotai/kimi-k2-thinking",
    provider: "nvidia",
    family: "moonshot",
    label: "Kimi K2 Thinking",
    description: "偏推理型，适合更复杂的长链思考。",
  },
  {
    id: "openai/gpt-oss-120b",
    provider: "nvidia",
    family: "openai-oss",
    label: "GPT OSS 120B",
    description: "大体量开源推理模型。",
  },
  {
    id: "openai/gpt-oss-20b",
    provider: "nvidia",
    family: "openai-oss",
    label: "GPT OSS 20B",
    description: "更轻更快，适合低延迟体验。",
  },
  {
    id: "mimo-v2.5",
    provider: "mimo",
    family: "mimo",
    label: "MiMo V2.5",
    description: "小米 MiMo V2.5 通用模型，官方标注支持 1M 上下文。",
  },
  {
    id: "mimo-v2.5-pro",
    provider: "mimo",
    family: "mimo",
    label: "MiMo V2.5 Pro",
    description: "小米 MiMo V2.5 Pro，高质量生成选项。",
  },
];

function isDeepSeekAliasThatForcesThinking(model: string) {
  return model === "deepseek-reasoner";
}

export function isAIProvider(value: unknown): value is AIProvider {
  return value === "deepseek" || value === "nvidia" || value === "mimo";
}

export function isAIReasoningEffort(value: unknown): value is AIReasoningEffort {
  return value === "high" || value === "max";
}

export function isValidAIModelForProvider(provider: AIProvider, model: unknown) {
  return typeof model === "string" && getAIModelOptions(provider).some((option) => option.id === model);
}

export function getDefaultAIModel(provider: AIProvider) {
  return DEFAULT_AI_MODEL_BY_PROVIDER[provider];
}

export function getAIModelOptions(provider: AIProvider) {
  return AI_MODEL_OPTIONS.filter((option) => option.provider === provider);
}

export function getAIModelFamilies(provider: AIProvider) {
  return AI_MODEL_FAMILY_OPTIONS.filter((family) => family.provider === provider);
}

export function getAIModelFamilyByModel(model: string | undefined) {
  return AI_MODEL_OPTIONS.find((option) => option.id === model)?.family;
}

export function getDefaultAIModelFamily(provider: AIProvider) {
  return getAIModelFamilyByModel(getDefaultAIModel(provider)) || getAIModelFamilies(provider)[0]?.id || "deepseek";
}

export function normalizeAISettings(input: {
  provider?: unknown;
  model?: unknown;
  deepseekThinkingEnabled?: unknown;
  deepseekReasoningEffort?: unknown;
}): AISettings {
  const provider = isAIProvider(input.provider) ? input.provider : DEFAULT_AI_PROVIDER;
  const model = isValidAIModelForProvider(provider, input.model)
    ? input.model
    : getDefaultAIModel(provider);
  const requestedThinkingEnabled = Boolean(input.deepseekThinkingEnabled);
  const deepseekThinkingEnabled =
    provider === "deepseek" ? isDeepSeekAliasThatForcesThinking(model) || requestedThinkingEnabled : false;
  const deepseekReasoningEffort = isAIReasoningEffort(input.deepseekReasoningEffort)
    ? input.deepseekReasoningEffort
    : DEFAULT_DEEPSEEK_REASONING_EFFORT;

  return {
    provider,
    model,
    deepseekThinkingEnabled,
    deepseekReasoningEffort,
  };
}
