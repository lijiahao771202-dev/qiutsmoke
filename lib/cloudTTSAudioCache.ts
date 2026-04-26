import { getApiUrl } from "./config.ts";

function buildCloudTTSAudioCacheUrl(cacheKey: string) {
  return `${getApiUrl("/api/tts-audio-cache")}?cacheKey=${encodeURIComponent(cacheKey)}`;
}

export async function getCloudTTSAudioCache(cacheKey: string): Promise<Blob | null> {
  try {
    const res = await fetch(buildCloudTTSAudioCacheUrl(cacheKey), {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    if (res.status === 401 || res.status === 404) return null;
    if (!res.ok) {
      console.warn("[CloudTTSAudioCache] 下载云端音频失败", res.status, await res.text().catch(() => ""));
      return null;
    }

    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch (error) {
    console.warn("[CloudTTSAudioCache] 下载云端音频异常", error);
    return null;
  }
}

export async function saveCloudTTSAudioCache(cacheKey: string, blob: Blob): Promise<boolean> {
  try {
    const res = await fetch(buildCloudTTSAudioCacheUrl(cacheKey), {
      method: "PUT",
      headers: {
        "Content-Type": blob.type || "audio/wav",
      },
      body: blob,
      credentials: "include",
    });

    if (!res.ok) {
      console.warn("[CloudTTSAudioCache] 上传云端音频失败", res.status, await res.text().catch(() => ""));
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[CloudTTSAudioCache] 上传云端音频异常", error);
    return false;
  }
}

export async function deleteCloudTTSAudioCache(cacheKey: string): Promise<boolean> {
  try {
    const res = await fetch(buildCloudTTSAudioCacheUrl(cacheKey), {
      method: "DELETE",
      credentials: "include",
    });

    if (res.status === 401 || res.status === 404) return false;
    if (!res.ok) {
      console.warn("[CloudTTSAudioCache] 删除云端音频失败", res.status, await res.text().catch(() => ""));
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[CloudTTSAudioCache] 删除云端音频异常", error);
    return false;
  }
}
