type AIReasoningEffort = "high" | "max";

type ChatMessage = {
  role: string;
  content?: string;
  [key: string]: unknown;
};

type DeepSeekChatCompletionOptions = {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  thinkingEnabled: boolean;
  reasoningEffort: AIReasoningEffort;
  maxTokens?: number;
  temperature?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  tools?: unknown[];
  toolChoice?: unknown;
};

function isDeepSeekReasonerAliasModel(model: string) {
  return model === "deepseek-reasoner";
}

export function getEffectiveDeepSeekThinking(model: string, requestedThinkingEnabled: boolean) {
  return isDeepSeekReasonerAliasModel(model) ? true : requestedThinkingEnabled;
}

export function buildDeepSeekChatCompletionBody(options: DeepSeekChatCompletionOptions) {
  const payload: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    stream: options.stream,
  };
  const effectiveThinkingEnabled = getEffectiveDeepSeekThinking(
    options.model,
    options.thinkingEnabled
  );

  if (typeof options.maxTokens === "number") {
    payload.max_tokens = options.maxTokens;
  }
  if (options.tools) {
    payload.tools = options.tools;
  }
  if (typeof options.toolChoice !== "undefined") {
    payload.tool_choice = options.toolChoice;
  }

  if (effectiveThinkingEnabled) {
    payload.thinking = { type: "enabled" };
    payload.reasoning_effort = options.reasoningEffort;
  } else {
    payload.thinking = { type: "disabled" };

    if (typeof options.temperature === "number") {
      payload.temperature = options.temperature;
    }
    if (typeof options.frequencyPenalty === "number") {
      payload.frequency_penalty = options.frequencyPenalty;
    }
    if (typeof options.presencePenalty === "number") {
      payload.presence_penalty = options.presencePenalty;
    }
  }

  return payload;
}
