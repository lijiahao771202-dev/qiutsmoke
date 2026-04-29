export const GENERATE_RAG_START = "__RAG_START__";
export const GENERATE_RAG_END = "__RAG_END__";
export const GENERATE_REPLACE = "__GEN_REPLACE__";
export const GENERATE_ERROR_START = "__GEN_ERROR_START__";
export const GENERATE_ERROR_END = "__GEN_ERROR_END__";

export type GenerateStreamState<T = unknown> = {
  raw: string;
  text: string;
  ragDebug: T | null;
  error: string | null;
  wasReplaced: boolean;
};

export function createGenerateStreamState<T = unknown>(): GenerateStreamState<T> {
  return {
    raw: "",
    text: "",
    ragDebug: null,
    error: null,
    wasReplaced: false,
  };
}

function parseRagPayload<T>(raw: string, fallback: T | null) {
  if (!raw.startsWith(GENERATE_RAG_START)) {
    return { content: raw, ragDebug: fallback, waitingForRag: false };
  }

  const endIndex = raw.indexOf(GENERATE_RAG_END);
  if (endIndex < 0) {
    return { content: "", ragDebug: fallback, waitingForRag: true };
  }

  const payload = raw.slice(GENERATE_RAG_START.length, endIndex);
  let ragDebug = fallback;
  try {
    ragDebug = JSON.parse(payload) as T;
  } catch {
    ragDebug = fallback;
  }

  return {
    content: raw.slice(endIndex + GENERATE_RAG_END.length),
    ragDebug,
    waitingForRag: false,
  };
}

function stripErrorPayload(content: string) {
  const startIndex = content.indexOf(GENERATE_ERROR_START);
  if (startIndex < 0) {
    return { content, error: null };
  }

  const endIndex = content.indexOf(GENERATE_ERROR_END, startIndex + GENERATE_ERROR_START.length);
  if (endIndex < 0) {
    return { content: content.slice(0, startIndex), error: null };
  }

  const before = content.slice(0, startIndex);
  const payload = content.slice(startIndex + GENERATE_ERROR_START.length, endIndex);
  const after = content.slice(endIndex + GENERATE_ERROR_END.length);
  let error = payload;
  try {
    const parsed = JSON.parse(payload);
    error = String(parsed?.details || parsed?.error || parsed?.message || payload);
  } catch {
    error = payload;
  }

  return { content: before + after, error };
}

export function appendGenerateStreamChunk<T = unknown>(
  state: GenerateStreamState<T>,
  chunk: string
): GenerateStreamState<T> {
  const raw = state.raw + chunk;
  const parsedRag = parseRagPayload<T>(raw, state.ragDebug);
  if (parsedRag.waitingForRag) {
    return { ...state, raw };
  }

  const stripped = stripErrorPayload(parsedRag.content);
  const lastReplaceIndex = stripped.content.lastIndexOf(GENERATE_REPLACE);
  const wasReplaced = state.wasReplaced || lastReplaceIndex >= 0;
  const text =
    lastReplaceIndex >= 0
      ? stripped.content.slice(lastReplaceIndex + GENERATE_REPLACE.length)
      : stripped.content;

  return {
    raw,
    text,
    ragDebug: parsedRag.ragDebug,
    error: stripped.error || state.error,
    wasReplaced,
  };
}

