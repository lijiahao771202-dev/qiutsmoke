import { getApiUrl } from "./config.ts";

const CLOUD_AUDIO_UPLOAD_RETRY_DELAY_MS = 600;

function buildCloudAudioCacheUrl(cacheKey: string) {
  return `${getApiUrl("/api/tts-cache")}?key=${encodeURIComponent(cacheKey)}`;
}

function shouldRetryCloudAudioUpload(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function hasCloudAudioCache(cacheKey: string): Promise<boolean> {
  try {
    const res = await fetch(buildCloudAudioCacheUrl(cacheKey), {
      method: "HEAD",
      cache: "no-store",
      credentials: "include",
    });
    return res.ok;
  } catch (error) {
    console.warn("[CloudAudioCache] failed to check cache", error);
    return false;
  }
}

export async function getCloudAudioCache(cacheKey: string): Promise<Blob | null> {
  try {
    const res = await fetch(buildCloudAudioCacheUrl(cacheKey), {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    if (res.status === 401 || res.status === 404) return null;
    if (!res.ok) {
      console.warn(
        "[CloudAudioCache] failed to download cache",
        res.status,
        await res.text().catch(() => "")
      );
      return null;
    }

    return await res.blob();
  } catch (error) {
    console.warn("[CloudAudioCache] download threw", error);
    return null;
  }
}

export async function saveCloudAudioCache(cacheKey: string, blob: Blob): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(buildCloudAudioCacheUrl(cacheKey), {
        method: "PUT",
        headers: {
          "Content-Type": blob.type || "audio/wav",
        },
        body: blob,
        credentials: "include",
      });

      if (res.ok) {
        console.log(`[CloudAudioCache] uploaded ${cacheKey}`);
        return true;
      }

      const details = await res.text().catch(() => "");
      if (attempt < 2 && shouldRetryCloudAudioUpload(res.status)) {
        console.warn("[CloudAudioCache] upload failed, retrying", res.status, details);
        await delay(CLOUD_AUDIO_UPLOAD_RETRY_DELAY_MS);
        continue;
      }

      console.warn("[CloudAudioCache] upload failed", res.status, details);
      return false;
    } catch (error) {
      if (attempt < 2) {
        console.warn("[CloudAudioCache] upload threw, retrying", error);
        await delay(CLOUD_AUDIO_UPLOAD_RETRY_DELAY_MS);
        continue;
      }

      console.warn("[CloudAudioCache] upload threw", error);
      return false;
    }
  }

  return false;
}

export async function deleteCloudAudioCache(cacheKey: string): Promise<boolean> {
  try {
    const res = await fetch(buildCloudAudioCacheUrl(cacheKey), {
      method: "DELETE",
      credentials: "include",
    });

    if (res.status === 401 || res.status === 404) return false;
    if (!res.ok) {
      console.warn(
        "[CloudAudioCache] failed to delete cache",
        res.status,
        await res.text().catch(() => "")
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[CloudAudioCache] delete threw", error);
    return false;
  }
}
