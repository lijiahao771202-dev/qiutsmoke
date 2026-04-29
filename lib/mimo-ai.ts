export const DEFAULT_MIMO_AI_BASE_URL = "https://api.xiaomimimo.com/v1";
export const MIMO_AI_MAX_OUTPUT_TOKENS = 10000;

type EnvLike = Record<string, string | undefined>;

export type MimoAIChatMessage = {
  role: string;
  content: string;
};

export function getMimoAIBaseUrl(env: EnvLike = process.env) {
  return (env.MIMO_AI_BASE_URL || env.MIMO_BASE_URL || DEFAULT_MIMO_AI_BASE_URL).replace(/\/+$/, "");
}

export function getMimoChatCompletionsUrl(env: EnvLike = process.env) {
  return `${getMimoAIBaseUrl(env)}/chat/completions`;
}

export function resolveMimoAIKey(env: EnvLike = process.env) {
  return env.MIMO_API_KEY || env.MIMO_TTS_API_KEY || "";
}

export function getMimoSafeMaxTokens(maxTokens?: number) {
  if (typeof maxTokens !== "number" || !Number.isFinite(maxTokens)) {
    return undefined;
  }
  return Math.min(Math.max(1, Math.floor(maxTokens)), MIMO_AI_MAX_OUTPUT_TOKENS);
}

export function shouldRetryMimoAITransportError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|terminated|aborted|reset|timeout|timed out|UND_ERR|ECONNRESET|EPIPE/i.test(message);
}

export function buildMimoChatCompletionBody(options: {
  model: string;
  messages: MimoAIChatMessage[];
  maxTokens?: number;
  temperature?: number;
  stream: boolean;
  frequencyPenalty?: number;
  presencePenalty?: number;
  tools?: unknown[];
  toolChoice?: unknown;
}) {
  const payload: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.6,
    stream: options.stream,
  };

  if (typeof options.maxTokens === "number") {
    payload.max_tokens = getMimoSafeMaxTokens(options.maxTokens);
  }
  if (typeof options.frequencyPenalty === "number") {
    payload.frequency_penalty = options.frequencyPenalty;
  }
  if (typeof options.presencePenalty === "number") {
    payload.presence_penalty = options.presencePenalty;
  }
  if (options.tools) {
    payload.tools = options.tools;
    payload.tool_choice = options.toolChoice;
  }

  return payload;
}
