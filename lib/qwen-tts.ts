import type { TTSSettings } from "./tts-settings";

export const DEFAULT_QWEN_TTS_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";
export const QWEN_TTS_GENERATION_PATH = "/services/aigc/multimodal-generation/generation";

export type QwenTTSPayload = {
  model: string;
  input: {
    text: string;
    voice: string;
    language_type: string;
    instructions?: string;
    optimize_instructions?: boolean;
  };
};

function getCloudCloneEnvKey(prefix: string, profileId: string) {
  return `${prefix}_${profileId.toUpperCase()}_VOICE_ID`;
}

function isQwenTTSCloneModel(model: TTSSettings["qwenTTSModel"]) {
  return model === "qwen3-tts-vc-2026-01-22";
}

export function getQwenTTSResolvedVoice(settings: TTSSettings, env: NodeJS.ProcessEnv = process.env) {
  if (!isQwenTTSCloneModel(settings.qwenTTSModel)) {
    return settings.qwenTTSVoice;
  }

  return (
    settings.qwenTTSCloneVoiceCloudId ||
    env[getCloudCloneEnvKey("QWEN_TTS", settings.qwenTTSCloneVoiceId)] ||
    env.QWEN_TTS_CLONE_VOICE_ID ||
    settings.qwenTTSCloneVoiceId
  );
}

function getQwenTTSSpeedInstruction(speed: number) {
  if (speed <= 0.7) {
    return `语速请显著放慢到默认的大约 ${speed.toFixed(1)} 倍，句间停顿明显拉长。`;
  }
  if (speed < 1) {
    return `语速请放慢到默认的大约 ${speed.toFixed(1)} 倍，句间停顿更充分。`;
  }
  if (speed >= 1.3) {
    return `语速请加快到默认的大约 ${speed.toFixed(1)} 倍，句间停顿缩短但保持清晰稳定。`;
  }
  if (speed > 1) {
    return `语速请略微加快到默认的大约 ${speed.toFixed(1)} 倍，同时保持温和稳定。`;
  }
  return "";
}

export function getQwenTTSGenerationEndpoint(baseUrl = DEFAULT_QWEN_TTS_BASE_URL) {
  return `${baseUrl.replace(/\/$/, "")}${QWEN_TTS_GENERATION_PATH}`;
}

export function getQwenTTSProxyUrl(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.QWEN_TTS_PROXY ||
    env.TTS_PROXY ||
    env.HTTPS_PROXY ||
    env.HTTP_PROXY ||
    ""
  );
}

export function shouldUseQwenTTSCurl(env: NodeJS.ProcessEnv = process.env) {
  return env.QWEN_TTS_TRANSPORT === "curl";
}

export function getQwenTTSCurlProxyArgs(env: NodeJS.ProcessEnv = process.env) {
  const proxy = getQwenTTSProxyUrl(env);
  return proxy ? ["--proxy", proxy] : [];
}

export async function fetchQwenTTS(url: string, init: RequestInit = {}) {
  const proxy = getQwenTTSProxyUrl();
  if (!proxy) return fetch(url, init);

  const { ProxyAgent } = await import("undici");
  return fetch(url, {
    ...init,
    dispatcher: new ProxyAgent(proxy),
  } as RequestInit & { dispatcher: unknown });
}

export async function postQwenTTSJsonWithCurl(
  url: string,
  apiKey: string,
  payload: QwenTTSPayload,
  timeoutMs: number
) {
  const configuredAttempts = Number(process.env.QWEN_TTS_CURL_ATTEMPTS || 4);
  const maxAttempts = Number.isFinite(configuredAttempts)
    ? Math.max(1, Math.floor(configuredAttempts))
    : 4;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await postQwenTTSJsonWithCurlOnce(url, apiKey, payload, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  throw lastError;
}

async function postQwenTTSJsonWithCurlOnce(
  url: string,
  apiKey: string,
  payload: QwenTTSPayload,
  timeoutMs: number
) {
  const { spawn } = await import("node:child_process");
  const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  const body = JSON.stringify(payload);

  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn(
      "curl",
      [
        "--http1.1",
        ...getQwenTTSCurlProxyArgs(),
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
      ]
    );

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

export async function downloadQwenTTSAudioWithCurl(url: string, timeoutMs: number) {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await downloadQwenTTSAudioWithCurlOnce(url, timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }

  throw lastError;
}

async function downloadQwenTTSAudioWithCurlOnce(url: string, timeoutMs: number) {
  const { execFile } = await import("node:child_process");
  const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));

  return new Promise<Buffer>((resolve, reject) => {
    execFile(
      "curl",
      [
        "--http1.1",
        ...getQwenTTSCurlProxyArgs(),
        "-sS",
        "--location",
        "--max-time",
        String(timeoutSeconds),
        url,
      ],
      { encoding: "buffer", maxBuffer: 80 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(String(stderr || error.message)));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function downloadQwenTTSAudio(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    if (audioBuffer.length === 0) {
      throw new Error("empty audio response");
    }
    return audioBuffer;
  } catch (fetchError) {
    try {
      return await downloadQwenTTSAudioWithCurl(url, timeoutMs);
    } catch (curlError) {
      throw new Error(
        `fetch=${getErrorMessage(fetchError)}; curl=${getErrorMessage(curlError)}`
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

export function buildQwenTTSPayload(text: string, settings: TTSSettings): QwenTTSPayload {
  const input: QwenTTSPayload["input"] = {
    text,
    voice: getQwenTTSResolvedVoice(settings),
    language_type: settings.qwenTTSLanguageType,
  };

  if (settings.qwenTTSModel === "qwen3-tts-instruct-flash") {
    const speedInstruction = getQwenTTSSpeedInstruction(settings.qwenTTSSpeed);
    input.instructions = [settings.qwenTTSInstructions, speedInstruction]
      .filter(Boolean)
      .join(" ");
    input.optimize_instructions = true;
  }

  return {
    model: settings.qwenTTSModel,
    input,
  };
}

export function extractQwenTTSAudioUrl(data: unknown): string {
  if (!data || typeof data !== "object") return "";

  const output = (data as { output?: unknown }).output;
  if (!output || typeof output !== "object") return "";

  const audio = (output as { audio?: unknown }).audio;
  if (!audio || typeof audio !== "object") return "";

  const url = (audio as { url?: unknown }).url;
  return typeof url === "string" ? url : "";
}
