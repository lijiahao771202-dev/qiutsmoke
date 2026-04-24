import type { TTSSettings } from "./tts-settings";

export const DEFAULT_COSYVOICE_CLOUD_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";
export const COSYVOICE_CLOUD_TTS_PATH = "/services/audio/tts/SpeechSynthesizer";
export const COSYVOICE_35_PLUS_CLOUD_MODEL = "cosyvoice-v3.5-plus";

export type CosyVoiceCloudPayload = {
  model: string;
  input: {
    text: string;
    voice: string;
    format: "wav";
    sample_rate: 24000;
    rate: number;
    language_hints: string[];
    instruction: string;
    enable_ssml?: boolean;
  };
};

type BuildCosyVoice35PlusPayloadOptions = {
  enableSSML?: boolean;
};

export function getCosyVoiceCloudEndpoint(baseUrl = DEFAULT_COSYVOICE_CLOUD_BASE_URL) {
  return `${baseUrl.replace(/\/$/, "")}${COSYVOICE_CLOUD_TTS_PATH}`;
}

export function shouldUseCosyVoiceCloudCurl(env: NodeJS.ProcessEnv = process.env) {
  return env.COSYVOICE_CLOUD_TRANSPORT === "curl" || env.QWEN_TTS_TRANSPORT === "curl";
}

export function getCosyVoiceCloudProxyUrl(env: NodeJS.ProcessEnv = process.env) {
  return env.COSYVOICE_CLOUD_PROXY || env.QWEN_TTS_PROXY || env.TTS_PROXY || "";
}

export function getCosyVoiceCloudCurlProxyArgs(env: NodeJS.ProcessEnv = process.env) {
  const proxy = getCosyVoiceCloudProxyUrl(env);
  return proxy ? ["--proxy", proxy] : [];
}

export function getCosyVoice35PlusVoiceId(
  settings: TTSSettings,
  env: NodeJS.ProcessEnv = process.env
) {
  const envProfileKey = `COSYVOICE_35_PLUS_${settings.cosyvoice35PlusVoiceProfileId.toUpperCase()}_VOICE_ID`;
  return (
    settings.cosyvoice35PlusVoiceId ||
    env[envProfileKey] ||
    env.COSYVOICE_35_PLUS_VOICE_ID ||
    settings.cosyvoice35PlusVoiceProfileId
  );
}

export function buildCosyVoice35PlusPayload(
  text: string,
  settings: TTSSettings,
  voiceId = getCosyVoice35PlusVoiceId(settings),
  options: BuildCosyVoice35PlusPayloadOptions = {}
): CosyVoiceCloudPayload {
  return {
    model: COSYVOICE_35_PLUS_CLOUD_MODEL,
    input: {
      text,
      voice: voiceId,
      format: "wav",
      sample_rate: 24000,
      rate: settings.cosyvoice35PlusSpeed,
      language_hints: [settings.cosyvoice35PlusLanguageHint],
      instruction: settings.cosyvoice35PlusInstruction,
      ...(options.enableSSML ? { enable_ssml: true } : {}),
    },
  };
}

export async function postCosyVoiceCloudJsonWithCurl(
  url: string,
  apiKey: string,
  payload: CosyVoiceCloudPayload,
  timeoutMs: number
) {
  const configuredAttempts = Number(process.env.COSYVOICE_CLOUD_CURL_ATTEMPTS || 4);
  const maxAttempts = Number.isFinite(configuredAttempts)
    ? Math.max(1, Math.floor(configuredAttempts))
    : 4;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await postCosyVoiceCloudJsonWithCurlOnce(url, apiKey, payload, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  throw lastError;
}

async function postCosyVoiceCloudJsonWithCurlOnce(
  url: string,
  apiKey: string,
  payload: CosyVoiceCloudPayload,
  timeoutMs: number
) {
  const { spawn } = await import("node:child_process");
  const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  const body = JSON.stringify(payload);

  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn("curl", [
      "--http1.1",
      ...getCosyVoiceCloudCurlProxyArgs(),
      "-sS",
      "--max-time",
      String(timeoutSeconds),
      "-X",
      "POST",
      url,
      "-H",
      `Authorization: Bearer ${apiKey}`,
      "-H",
      "Content-Type: application/json",
      "--data-binary",
      "@-",
    ]);

    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      out += chunk;
    });
    child.stderr.on("data", (chunk) => {
      err += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(err || `curl exited with ${code}`));
        return;
      }
      resolve(out);
    });
    child.stdin.end(Buffer.from(body, "utf8"));
  });

  return JSON.parse(stdout);
}

export async function fetchCosyVoiceCloud(url: string, init: RequestInit = {}) {
  const proxy = getCosyVoiceCloudProxyUrl();
  if (!proxy) return fetch(url, init);

  const { ProxyAgent } = await import("undici");
  return fetch(url, {
    ...init,
    dispatcher: new ProxyAgent(proxy),
  } as RequestInit & { dispatcher: unknown });
}

export function extractCosyVoiceCloudAudioUrl(data: unknown): string {
  if (!data || typeof data !== "object") return "";

  const output = (data as { output?: unknown }).output;
  if (!output || typeof output !== "object") return "";

  const audio = (output as { audio?: unknown }).audio;
  if (!audio || typeof audio !== "object") return "";

  const url = (audio as { url?: unknown }).url;
  return typeof url === "string" ? url : "";
}

export function getCosyVoiceCloudErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const code = (data as { code?: unknown }).code;
  const message = (data as { message?: unknown }).message;
  return [code, message]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(": ");
}
