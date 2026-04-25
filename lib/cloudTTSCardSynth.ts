import { getApiUrl } from "./config.ts";
import type { TTSCardSynthSnapshot } from "./tts-card-synth.ts";

function buildCloudTTSCardSynthUrl(cardId: string) {
  return `${getApiUrl("/api/tts-card-synth")}?cardId=${encodeURIComponent(cardId)}`;
}

function isSnapshotNotFoundPayload(status: number, bodyText: string) {
  return status === 500 && bodyText.toLowerCase().includes("snapshot not found");
}

export async function getCloudTTSCardSynthSnapshot(cardId: string): Promise<TTSCardSynthSnapshot | null> {
  try {
    const res = await fetch(buildCloudTTSCardSynthUrl(cardId), {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    if (res.status === 401 || res.status === 404) return null;
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      if (isSnapshotNotFoundPayload(res.status, bodyText)) {
        return null;
      }
      console.warn("[CloudTTSCardSynth] 下载云端快照失败", res.status, bodyText);
      return null;
    }

    const data = await res.json();
    return data as TTSCardSynthSnapshot;
  } catch (error) {
    console.warn("[CloudTTSCardSynth] 下载云端快照异常", error);
    return null;
  }
}

export async function saveCloudTTSCardSynthSnapshot(snapshot: TTSCardSynthSnapshot): Promise<boolean> {
  try {
    const res = await fetch(buildCloudTTSCardSynthUrl(snapshot.id), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(snapshot),
      credentials: "include",
    });

    if (!res.ok) {
      console.warn("[CloudTTSCardSynth] 上传云端快照失败", res.status, await res.text().catch(() => ""));
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[CloudTTSCardSynth] 上传云端快照异常", error);
    return false;
  }
}

export async function deleteCloudTTSCardSynthSnapshot(cardId: string): Promise<boolean> {
  try {
    const res = await fetch(buildCloudTTSCardSynthUrl(cardId), {
      method: "DELETE",
      credentials: "include",
    });

    if (res.status === 401 || res.status === 404) return false;
    if (!res.ok) {
      console.warn("[CloudTTSCardSynth] 删除云端快照失败", res.status, await res.text().catch(() => ""));
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[CloudTTSCardSynth] 删除云端快照异常", error);
    return false;
  }
}
