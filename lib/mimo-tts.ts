import type { MimoTTSModel, TTSSettings } from "./tts-settings";
import { extname, isAbsolute } from "node:path";

export const DEFAULT_MIMO_TTS_BASE_URL = "https://api.xiaomimimo.com/v1";
export const MIMO_TTS_COMPLETIONS_PATH = "/chat/completions";

export type MimoTTSMessage = {
  role: "user" | "assistant";
  content: string;
};

export type MimoTTSPayload = {
  model: MimoTTSModel;
  messages: MimoTTSMessage[];
  audio: {
    format: "wav";
    voice?: string;
  };
  stream: false;
};

let mimoTTSRequestQueue: Promise<void> = Promise.resolve();
let lastMimoTTSRequestFinishedAt = 0;
const localCloneVoiceDataUrlCache = new Map<string, { signature: string; dataUrl: string }>();
const localCloneVoiceDataUrlInflight = new Map<string, Promise<string>>();

function supportsFixedVoice(model: MimoTTSModel) {
  return model === "mimo-v2.5-tts";
}

function requiresCloneVoice(model: MimoTTSModel) {
  return model === "mimo-v2.5-tts-voiceclone";
}

function buildMimoTTSUserInstruction(settings: TTSSettings) {
  const instruction = settings.mimoTTSInstruction.trim();
  if (settings.mimoTTSModel !== "mimo-v2.5-tts-voicedesign") {
    return instruction;
  }

  const voiceDesign = settings.mimoTTSVoiceDesignPrompt.trim();
  return [
    voiceDesign ? `声音设计：${voiceDesign}` : "",
    instruction ? `朗读导演：\n${instruction}` : "",
  ].filter(Boolean).join("\n\n");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMimoTTSRequestGapMs(env: NodeJS.ProcessEnv = process.env) {
  const parsed = Number.parseInt(env.MIMO_TTS_REQUEST_GAP_MS || "", 10);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return 1600;
}

function shouldSerializeMimoTTSRequest(model: MimoTTSModel, env: NodeJS.ProcessEnv = process.env) {
  if (env.MIMO_TTS_SERIALIZE_ALL === "1") return true;
  if (model === "mimo-v2.5-tts-voiceclone" && env.MIMO_TTS_SERIALIZE_CLONE === "1") return true;
  return false;
}

async function runInMimoTTSRequestQueue<T>(work: () => Promise<T>, requestGapMs: number) {
  const queuedWork = mimoTTSRequestQueue.catch(() => undefined).then(async () => {
    const gapMs = requestGapMs;
    const elapsedMs = Date.now() - lastMimoTTSRequestFinishedAt;
    if (gapMs > 0 && elapsedMs < gapMs) {
      await sleep(gapMs - elapsedMs);
    }

    try {
      return await work();
    } finally {
      lastMimoTTSRequestFinishedAt = Date.now();
    }
  });

  mimoTTSRequestQueue = queuedWork.then(() => undefined, () => undefined);
  return queuedWork;
}

function guessAudioMimeTypeFromPath(pathname: string) {
  switch (extname(pathname).toLowerCase()) {
    case ".wav":
      return "audio/wav";
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".aac":
      return "audio/aac";
    case ".flac":
      return "audio/flac";
    case ".ogg":
      return "audio/ogg";
    default:
      return "application/octet-stream";
  }
}

async function readLocalCloneVoiceAsDataUrl(localPath: string) {
  const { readFile, stat } = await import("node:fs/promises");
  const fileStat = await stat(localPath);
  const signature = `${fileStat.size}:${fileStat.mtimeMs}`;
  const cacheKey = `${localPath}:${signature}`;
  const cached = localCloneVoiceDataUrlCache.get(localPath);
  if (cached?.signature === signature) {
    return cached.dataUrl;
  }
  const inflight = localCloneVoiceDataUrlInflight.get(cacheKey);
  if (inflight) return inflight;

  const work = (async () => {
    const originalBuffer = await readFile(localPath);
    if (originalBuffer.length === 0) {
      throw new Error("MiMo clone voice sample is empty.");
    }

    let dataUrl = `data:${guessAudioMimeTypeFromPath(localPath)};base64,${originalBuffer.toString("base64")}`;

    try {
      const { execFile } = await import("node:child_process");
      const { mkdtemp, readFile, rm } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");
      const tempDir = await mkdtemp(join(tmpdir(), "mimo-clone-"));
      const tempFile = join(tempDir, "voice-24k-mono.wav");

      try {
        const normalizedBuffer = await new Promise<Buffer>((resolve, reject) => {
          execFile(
            "ffmpeg",
            [
              "-y",
              "-v",
              "error",
              "-i",
              localPath,
              "-ar",
              "24000",
              "-ac",
              "1",
              "-sample_fmt",
              "s16",
              tempFile,
            ],
            {
              encoding: "utf8",
              maxBuffer: 20 * 1024 * 1024,
              timeout: 30000,
            },
            async (error) => {
              if (error) {
                reject(error);
                return;
              }
              try {
                resolve(await readFile(tempFile));
              } catch (readError) {
                reject(readError);
              }
            }
          );
        });

        if (normalizedBuffer.length > 0) {
          dataUrl = `data:audio/wav;base64,${normalizedBuffer.toString("base64")}`;
        }
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Fall back to the original file if ffmpeg is unavailable or cannot decode it.
    }

    localCloneVoiceDataUrlCache.set(localPath, { signature, dataUrl });
    return dataUrl;
  })();

  localCloneVoiceDataUrlInflight.set(cacheKey, work);
  try {
    return await work;
  } finally {
    localCloneVoiceDataUrlInflight.delete(cacheKey);
  }
}

export function getMimoTTSEndpoint(baseUrl = DEFAULT_MIMO_TTS_BASE_URL) {
  return `${baseUrl.replace(/\/$/, "")}${MIMO_TTS_COMPLETIONS_PATH}`;
}

export function getMimoTTSProxyUrl(env: NodeJS.ProcessEnv = process.env) {
  return env.MIMO_TTS_PROXY || "";
}

export function getMimoTTSCurlProxyArgs(env: NodeJS.ProcessEnv = process.env) {
  const proxy = getMimoTTSProxyUrl(env);
  return proxy ? ["--proxy", proxy] : [];
}

function shouldRetryMimoCurlError(message: string) {
  return /curl: \((52|56|28)\)|Empty reply from server|Connection reset|timed out/i.test(message);
}

export async function postMimoTTSJsonWithCurl(
  url: string,
  apiKey: string,
  payload: MimoTTSPayload,
  timeoutMs: number
) {
  const shouldSerialize = shouldSerializeMimoTTSRequest(payload.model);
  const defaultGapMs = 0;
  const requestGapMs = process.env.MIMO_TTS_REQUEST_GAP_MS
    ? getMimoTTSRequestGapMs()
    : defaultGapMs;

  const executeRequest = async () => {
    const { execFile } = await import("node:child_process");
    const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
    const body = JSON.stringify(payload);
    const maxAttempts = Math.max(1, Number.parseInt(process.env.MIMO_TTS_CURL_RETRIES || "5", 10));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const currentStdout = await new Promise<string>((resolve, reject) => {
          execFile(
            "curl",
            [
              "--http1.1",
              ...getMimoTTSCurlProxyArgs(),
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
              body,
            ],
            { encoding: "utf8", maxBuffer: 80 * 1024 * 1024 },
            (error, out, err) => {
              if (error && !out.trim()) {
                reject(new Error(String(err || error.message)));
                return;
              }
              resolve(out);
            }
          );
        });

        try {
          return JSON.parse(currentStdout);
        } catch (error) {
          const isLastAttempt = attempt === maxAttempts;
          if (isLastAttempt) {
            throw new Error(
              `MiMo curl JSON parse failed: ${error instanceof Error ? error.message : String(error)}`
            );
          }
          await sleep(1500 * attempt);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isLastAttempt = attempt === maxAttempts;
        if (!shouldRetryMimoCurlError(message) || isLastAttempt) {
          throw error;
        }
        await sleep(1500 * attempt);
      }
    }

    throw new Error("MiMo curl returned empty response after retries.");
  };

  return shouldSerialize
    ? runInMimoTTSRequestQueue(executeRequest, requestGapMs)
    : executeRequest();
}

export function buildMimoTTSPayload(
  text: string,
  settings: TTSSettings,
  resolvedCloneVoice?: string
): MimoTTSPayload {
  const model = settings.mimoTTSModel;
  const instruction = buildMimoTTSUserInstruction(settings);
  const messages: MimoTTSMessage[] = [];

  if (instruction) {
    messages.push({
      role: "user",
      content: instruction,
    });
  }

  messages.push({
    role: "assistant",
    content: text,
  });

  const audio: MimoTTSPayload["audio"] = {
    format: "wav",
  };

  if (supportsFixedVoice(model)) {
    audio.voice = settings.mimoTTSVoice;
  } else if (requiresCloneVoice(model)) {
    if (!resolvedCloneVoice) {
      throw new Error("MiMo voice clone mode requires a resolved clone voice sample.");
    }
    audio.voice = resolvedCloneVoice;
  }

  return {
    model,
    messages,
    audio,
    stream: false,
  };
}

export function buildMimoTTSInstructionWithRate(instruction: string, rate?: string) {
  const baseInstruction = instruction.trim();
  const match = String(rate || "").trim().match(/^([+-]?\d+)%$/);
  const percent = match ? Number.parseInt(match[1], 10) : 0;

  if (!Number.isFinite(percent) || percent === 0) {
    return baseInstruction;
  }

  const rateInstruction =
    percent < 0
      ? `本段请在保持自然连贯的前提下，把整体语速降低约 ${Math.abs(percent)}%，句尾更轻，句间留白更充分。`
      : `本段请在保持自然清晰的前提下，把整体语速提高约 ${percent}%，节奏更紧凑但不要急促。`;

  return baseInstruction ? `${baseInstruction}\n${rateInstruction}` : rateInstruction;
}

export async function resolveMimoTTSCloneVoiceSource(source: string) {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new Error("MiMo voice clone mode requires a voice sample path or URL.");
  }
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.startsWith("file://")) {
    const localPath = decodeURIComponent(trimmed.slice("file://".length));
    return readLocalCloneVoiceAsDataUrl(localPath);
  }
  if (isAbsolute(trimmed)) {
    return readLocalCloneVoiceAsDataUrl(trimmed);
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("MiMo voice clone sample must be a local absolute path, public HTTPS URL, or a data URL.");
  }

  const response = await fetch(trimmed, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to download MiMo clone voice sample: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("Content-Type") || "audio/wav";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("MiMo clone voice sample is empty.");
  }

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export function extractMimoTTSAudioBase64(data: unknown): string {
  if (!data || typeof data !== "object") return "";

  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";

  const message = (choices[0] as { message?: unknown })?.message;
  if (!message || typeof message !== "object") return "";

  const audio = (message as { audio?: unknown }).audio;
  if (!audio || typeof audio !== "object") return "";

  const base64 = (audio as { data?: unknown }).data;
  return typeof base64 === "string" ? base64 : "";
}

export function getMimoTTSResponseErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") return String(data || "");

  const error = (data as { error?: unknown }).error;
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    const message = (error as { message?: unknown }).message;
    const pieces = [
      typeof code === "string" || typeof code === "number" ? `code ${code}` : "",
      typeof message === "string" ? message : "",
    ].filter(Boolean);
    if (pieces.length > 0) return pieces.join(": ");
  }

  try {
    return JSON.stringify(data).slice(0, 1000);
  } catch {
    return String(data);
  }
}

export function shouldRetryMimoTTSResponse(data: unknown): boolean {
  const message = getMimoTTSResponseErrorMessage(data);
  return /code 5\d\d|Internal server error|loading multimodal data|temporarily|timeout|timed out|empty reply|connection reset/i.test(
    message
  );
}

export function decodeMimoTTSAudioBase64(base64: string) {
  if (!base64) {
    throw new Error("MiMo audio payload is empty.");
  }
  const audioBuffer = Buffer.from(base64, "base64");
  if (audioBuffer.length === 0) {
    throw new Error("MiMo audio payload decoded to an empty buffer.");
  }
  return audioBuffer;
}
