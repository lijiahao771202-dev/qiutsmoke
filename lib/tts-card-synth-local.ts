"use client";

import { getAll, getById, put, remove } from "./localDB";
import { deleteCloudTTSAudioCache } from "./cloudTTSAudioCache";
import {
  deleteCloudTTSCardSynthVersion,
  deleteCloudTTSCardSynthVersionsForCard,
  getCloudTTSCardSynthVersions,
  saveCloudTTSCardSynthVersion,
} from "./cloudTTSCardSynthVersions";
import {
  buildTTSCardAudioCacheKey,
  getSynthModelBadgeLabel,
  type TTSCardSynthSnapshot,
} from "./tts-card-synth";
import type { TTSSettings } from "./tts-settings";

const STORE_NAME = "tts_card_synth_versions";
const LEGACY_STORE_NAME = "tts_card_synth_meta";

type TTSCardCacheInput = {
  id: string;
  content: string;
  voice_id: string;
  rate?: string;
};

export type TTSCardLocalSynthVersion = {
  id: string;
  cardId: string;
  cacheKey: string;
  synthesizedAt: string;
  snapshot: TTSCardSynthSnapshot;
  modelLabel: string;
};

export type ResolvedLocalTTSCardVersion = {
  desiredCacheKey: string;
  compatibleVersions: TTSCardLocalSynthVersion[];
  selectedVersion: TTSCardLocalSynthVersion | null;
  matchedVersion: TTSCardLocalSynthVersion | null;
  legacySnapshot: TTSCardSynthSnapshot | null;
  snapshot: TTSCardSynthSnapshot | null;
  cacheKey: string;
  source: "manual" | "matched" | "legacy" | "current";
};

function sortVersionsByNewest(
  versions: TTSCardLocalSynthVersion[],
): TTSCardLocalSynthVersion[] {
  return [...versions].sort((left, right) => {
    const leftTime = Date.parse(left.synthesizedAt);
    const rightTime = Date.parse(right.synthesizedAt);

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;

    return rightTime - leftTime;
  });
}

export function formatLocalSynthVersionTime(isoString: string) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "未知时间";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export async function listLocalTTSCardSynthVersions(cardId: string) {
  const localVersions = sortVersionsByNewest(
    (await getAll<TTSCardLocalSynthVersion>(STORE_NAME)).filter((item) => item.cardId === cardId),
  );

  if (typeof window === "undefined") {
    return localVersions;
  }

  const cloudVersions = await getCloudTTSCardSynthVersions(cardId);
  if (cloudVersions.length === 0) {
    return localVersions;
  }

  const merged = new Map<string, TTSCardLocalSynthVersion>();
  for (const version of [...localVersions, ...cloudVersions]) {
    const current = merged.get(version.cacheKey);
    if (!current) {
      merged.set(version.cacheKey, version);
      continue;
    }

    const currentTime = Date.parse(current.synthesizedAt);
    const nextTime = Date.parse(version.synthesizedAt);
    if (Number.isNaN(currentTime) || (!Number.isNaN(nextTime) && nextTime >= currentTime)) {
      merged.set(version.cacheKey, version);
    }
  }

  const mergedVersions = sortVersionsByNewest([...merged.values()]);
  await Promise.all(mergedVersions.map((version) => put(STORE_NAME, version)));
  return mergedVersions;
}

export async function saveLocalTTSCardSynthVersion(
  cardId: string,
  cacheKey: string,
  snapshot: TTSCardSynthSnapshot,
) {
  const record = buildLocalTTSCardSynthVersion(cardId, cacheKey, snapshot);

  await put(STORE_NAME, record);
  if (typeof window !== "undefined") {
    void saveCloudTTSCardSynthVersion(record);
  }
  return record;
}

export async function deleteLocalTTSCardSynthVersion(cacheKey: string, cardId?: string) {
  await remove(STORE_NAME, cacheKey);
  if (typeof window !== "undefined" && cardId) {
    void deleteCloudTTSAudioCache(cacheKey);
    void deleteCloudTTSCardSynthVersion(cardId, cacheKey);
  }
}

export async function deleteLocalTTSCardSynthVersionsForCard(cardId: string) {
  const versions = await listLocalTTSCardSynthVersions(cardId);
  await Promise.all(versions.map((version) => remove(STORE_NAME, version.id)));
  if (typeof window !== "undefined") {
    for (const version of versions) {
      void deleteCloudTTSAudioCache(version.cacheKey);
    }
    void deleteCloudTTSCardSynthVersionsForCard(cardId);
  }
}

export async function getLocalLegacyTTSCardSynthSnapshot(cardId: string) {
  return (await getById<TTSCardSynthSnapshot>(
    LEGACY_STORE_NAME,
    cardId,
  )) ?? null;
}

export function buildLocalTTSCardSynthVersion(
  cardId: string,
  cacheKey: string,
  snapshot: TTSCardSynthSnapshot,
): TTSCardLocalSynthVersion {
  return {
    id: cacheKey,
    cardId,
    cacheKey,
    synthesizedAt: snapshot.synthesizedAt,
    snapshot,
    modelLabel: getSynthModelBadgeLabel(snapshot) || snapshot.provider,
  };
}

export function isLocalTTSCardSynthVersionCompatible(
  card: TTSCardCacheInput,
  settings: TTSSettings,
  version: TTSCardLocalSynthVersion,
) {
  return (
    version.cacheKey ===
    buildTTSCardAudioCacheKey(card, settings, version.snapshot)
  );
}

export function resolveLocalTTSCardVersion({
  card,
  settings,
  localVersions,
  selectedVersionCacheKey,
  legacySnapshot,
}: {
  card: TTSCardCacheInput;
  settings: TTSSettings;
  localVersions: TTSCardLocalSynthVersion[];
  selectedVersionCacheKey?: string | null;
  legacySnapshot?: TTSCardSynthSnapshot | null;
}): ResolvedLocalTTSCardVersion {
  const desiredCacheKey = buildTTSCardAudioCacheKey(card, settings);
  const legacyVersion =
    legacySnapshot
      ? buildLocalTTSCardSynthVersion(
          card.id,
          buildTTSCardAudioCacheKey(card, settings, legacySnapshot),
          legacySnapshot,
        )
      : null;
  const mergedVersions = [...localVersions];

  if (
    legacyVersion &&
    !mergedVersions.some((version) => version.cacheKey === legacyVersion.cacheKey)
  ) {
    mergedVersions.push(legacyVersion);
  }

  const compatibleVersions = sortVersionsByNewest(
    mergedVersions.filter((version) =>
      isLocalTTSCardSynthVersionCompatible(card, settings, version),
    ),
  );
  const selectedVersion =
    compatibleVersions.find(
      (version) => version.cacheKey === selectedVersionCacheKey,
    ) ?? null;
  const matchedVersion =
    compatibleVersions.find((version) => version.cacheKey === desiredCacheKey) ??
    null;
  const resolvedLegacySnapshot =
    legacySnapshot &&
    buildTTSCardAudioCacheKey(card, settings, legacySnapshot) === desiredCacheKey
      ? legacySnapshot
      : null;

  if (selectedVersion) {
    return {
      desiredCacheKey,
      compatibleVersions,
      selectedVersion,
      matchedVersion,
      legacySnapshot: resolvedLegacySnapshot,
      snapshot: selectedVersion.snapshot,
      cacheKey: selectedVersion.cacheKey,
      source: "manual",
    };
  }

  if (matchedVersion) {
    return {
      desiredCacheKey,
      compatibleVersions,
      selectedVersion: null,
      matchedVersion,
      legacySnapshot: resolvedLegacySnapshot,
      snapshot: matchedVersion.snapshot,
      cacheKey: matchedVersion.cacheKey,
      source: "matched",
    };
  }

  if (resolvedLegacySnapshot) {
    return {
      desiredCacheKey,
      compatibleVersions,
      selectedVersion: null,
      matchedVersion: null,
      legacySnapshot: resolvedLegacySnapshot,
      snapshot: resolvedLegacySnapshot,
      cacheKey: desiredCacheKey,
      source: "legacy",
    };
  }

  return {
    desiredCacheKey,
    compatibleVersions,
    selectedVersion: null,
    matchedVersion: null,
    legacySnapshot: null,
    snapshot: null,
    cacheKey: desiredCacheKey,
    source: "current",
  };
}
