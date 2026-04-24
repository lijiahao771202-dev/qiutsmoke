import { getApiUrl } from "@/lib/config";

function buildCloudAudioCacheUrl(cacheKey: string) {
    return `${getApiUrl("/api/tts-cache")}?key=${encodeURIComponent(cacheKey)}`;
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
        console.warn("[CloudAudioCache] 检查云端缓存失败", error);
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
            console.warn("[CloudAudioCache] 下载云端缓存失败", res.status, await res.text().catch(() => ""));
            return null;
        }

        return await res.blob();
    } catch (error) {
        console.warn("[CloudAudioCache] 下载云端缓存异常", error);
        return null;
    }
}

export async function saveCloudAudioCache(cacheKey: string, blob: Blob): Promise<boolean> {
    try {
        const res = await fetch(buildCloudAudioCacheUrl(cacheKey), {
            method: "PUT",
            headers: {
                "Content-Type": blob.type || "audio/wav",
            },
            body: blob,
            credentials: "include",
        });

        if (!res.ok) {
            console.warn("[CloudAudioCache] 上传云端缓存失败", res.status, await res.text().catch(() => ""));
            return false;
        }

        console.log(`[CloudAudioCache] ✅ 已上传云端缓存: ${cacheKey}`);
        return true;
    } catch (error) {
        console.warn("[CloudAudioCache] 上传云端缓存异常", error);
        return false;
    }
}

export async function deleteCloudAudioCache(cacheKey: string): Promise<boolean> {
    try {
        const res = await fetch(buildCloudAudioCacheUrl(cacheKey), {
            method: "DELETE",
            credentials: "include",
        });

        if (res.status === 401 || res.status === 404) return false;
        if (!res.ok) {
            console.warn("[CloudAudioCache] 删除云端缓存失败", res.status, await res.text().catch(() => ""));
            return false;
        }

        return true;
    } catch (error) {
        console.warn("[CloudAudioCache] 删除云端缓存异常", error);
        return false;
    }
}
