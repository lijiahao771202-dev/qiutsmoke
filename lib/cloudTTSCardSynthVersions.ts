import { getApiUrl } from "./config.ts";
import type { TTSCardLocalSynthVersion } from "./tts-card-synth-local.ts";

function buildCloudTTSCardSynthVersionsUrl(cardId: string, cacheKey?: string) {
  const url = new URL(getApiUrl("/api/tts-card-synth-versions"), window.location.origin);
  url.searchParams.set("cardId", cardId);
  if (cacheKey) {
    url.searchParams.set("cacheKey", cacheKey);
  }
  const base = getApiUrl("/api/tts-card-synth-versions");
  const query = url.searchParams.toString();
  return query ? `${base}?${query}` : base;
}

function isVersionArray(value: unknown): value is TTSCardLocalSynthVersion[] {
  return Array.isArray(value);
}

export async function getCloudTTSCardSynthVersions(
  cardId: string,
): Promise<TTSCardLocalSynthVersion[]> {
  try {
    const res = await fetch(buildCloudTTSCardSynthVersionsUrl(cardId), {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    if (res.status === 401 || res.status === 404) return [];
    if (!res.ok) {
      console.warn(
        "[CloudTTSCardSynthVersions] 下载云端版本失败",
        res.status,
        await res.text().catch(() => ""),
      );
      return [];
    }

    const data = await res.json();
    return isVersionArray(data) ? data : [];
  } catch (error) {
    console.warn("[CloudTTSCardSynthVersions] 下载云端版本异常", error);
    return [];
  }
}

export async function saveCloudTTSCardSynthVersion(
  version: TTSCardLocalSynthVersion,
): Promise<boolean> {
  try {
    const res = await fetch(buildCloudTTSCardSynthVersionsUrl(version.cardId), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(version),
      credentials: "include",
    });

    if (!res.ok) {
      console.warn(
        "[CloudTTSCardSynthVersions] 上传云端版本失败",
        res.status,
        await res.text().catch(() => ""),
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[CloudTTSCardSynthVersions] 上传云端版本异常", error);
    return false;
  }
}

export async function deleteCloudTTSCardSynthVersion(
  cardId: string,
  cacheKey: string,
): Promise<boolean> {
  try {
    const res = await fetch(buildCloudTTSCardSynthVersionsUrl(cardId, cacheKey), {
      method: "DELETE",
      credentials: "include",
    });

    if (res.status === 401 || res.status === 404) return false;
    if (!res.ok) {
      console.warn(
        "[CloudTTSCardSynthVersions] 删除云端版本失败",
        res.status,
        await res.text().catch(() => ""),
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[CloudTTSCardSynthVersions] 删除云端版本异常", error);
    return false;
  }
}

export async function deleteCloudTTSCardSynthVersionsForCard(
  cardId: string,
): Promise<boolean> {
  try {
    const res = await fetch(buildCloudTTSCardSynthVersionsUrl(cardId), {
      method: "DELETE",
      credentials: "include",
    });

    if (res.status === 401 || res.status === 404) return false;
    if (!res.ok) {
      console.warn(
        "[CloudTTSCardSynthVersions] 删除整张卡云端版本失败",
        res.status,
        await res.text().catch(() => ""),
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[CloudTTSCardSynthVersions] 删除整张卡云端版本异常", error);
    return false;
  }
}
