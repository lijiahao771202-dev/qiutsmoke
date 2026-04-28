import type {
  CosyVoice35Model,
  CosyVoice35PlusLanguageHint,
  CosyVoiceVoiceId,
  QwenTTSLanguageType,
  QwenTTSModel,
  QwenTTSVoice,
  QwenTTSVoiceMode,
  TTSProvider,
  TTSSettings,
} from "./tts-settings.ts";

export type TTSCardSynthSnapshot = {
  id: string;
  provider: TTSProvider;
  synthesizedAt: string;
  cosyvoiceVoiceId?: CosyVoiceVoiceId;
  cosyvoiceSpeed?: number;
  cosyvoiceInstruction?: string;
  cosyvoiceSeed?: number;
  qwenTTSModel?: QwenTTSModel;
  qwenTTSVoice?: QwenTTSVoice;
  qwenTTSVoiceMode?: QwenTTSVoiceMode;
  qwenTTSCloneVoiceId?: CosyVoiceVoiceId;
  qwenTTSCloneVoiceCloudId?: string;
  qwenTTSSpeed?: number;
  qwenTTSLanguageType?: QwenTTSLanguageType;
  qwenTTSInstructions?: string;
  cosyvoice35PlusModel?: CosyVoice35Model;
  cosyvoice35PlusVoiceId?: string;
  cosyvoice35FlashVoiceId?: string;
  cosyvoice35PlusVoiceProfileId?: CosyVoiceVoiceId;
  cosyvoice35PlusSpeed?: number;
  cosyvoice35PlusInstruction?: string;
  cosyvoice35PlusLanguageHint?: CosyVoice35PlusLanguageHint;
};

type TTSCardCacheInput = {
  id: string;
  content: string;
  voice_id: string;
  rate?: string;
};

function hashCacheSignature(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

export function buildSynthSnapshot(
  cardId: string,
  settings: TTSSettings,
  synthesizedAt = new Date().toISOString()
): TTSCardSynthSnapshot {
  const base = {
    id: cardId,
    provider: settings.provider,
    synthesizedAt,
  } satisfies Pick<TTSCardSynthSnapshot, "id" | "provider" | "synthesizedAt">;

  if (settings.provider === "cosyvoice") {
    return {
      ...base,
      cosyvoiceVoiceId: settings.cosyvoiceVoiceId,
      cosyvoiceSpeed: settings.cosyvoiceSpeed,
      cosyvoiceInstruction: settings.cosyvoiceInstruction.trim(),
      cosyvoiceSeed: settings.cosyvoiceSeed,
    };
  }

  if (settings.provider === "qwentts") {
    return {
      ...base,
      qwenTTSModel: settings.qwenTTSModel,
      qwenTTSVoice: settings.qwenTTSVoice,
      qwenTTSVoiceMode: settings.qwenTTSVoiceMode,
      qwenTTSCloneVoiceId: settings.qwenTTSCloneVoiceId,
      qwenTTSCloneVoiceCloudId: settings.qwenTTSCloneVoiceCloudId.trim(),
      qwenTTSSpeed: settings.qwenTTSSpeed,
      qwenTTSLanguageType: settings.qwenTTSLanguageType,
      qwenTTSInstructions: settings.qwenTTSInstructions.trim(),
    };
  }

  if (settings.provider === "cosyvoice35plus") {
    return {
      ...base,
      cosyvoice35PlusModel: settings.cosyvoice35PlusModel,
      cosyvoice35PlusVoiceId: settings.cosyvoice35PlusVoiceId.trim(),
      cosyvoice35FlashVoiceId: settings.cosyvoice35FlashVoiceId.trim(),
      cosyvoice35PlusVoiceProfileId: settings.cosyvoice35PlusVoiceProfileId,
      cosyvoice35PlusSpeed: settings.cosyvoice35PlusSpeed,
      cosyvoice35PlusInstruction: settings.cosyvoice35PlusInstruction.trim(),
      cosyvoice35PlusLanguageHint: settings.cosyvoice35PlusLanguageHint,
    };
  }

  return base;
}

function buildProviderSignature(
  activeSettings: TTSSettings,
  snapshot: TTSCardSynthSnapshot | null | undefined
) {
  const provider = snapshot?.provider || activeSettings.provider;

  if (snapshot) {
    if (provider === "cosyvoice") {
      return {
        provider,
        speed: snapshot.cosyvoiceSpeed,
        instruction: snapshot.cosyvoiceInstruction || "",
        seed: snapshot.cosyvoiceSeed,
        voiceId: snapshot.cosyvoiceVoiceId,
      };
    }

    if (provider === "qwentts") {
      return {
        provider,
        model: snapshot.qwenTTSModel,
        voice: snapshot.qwenTTSVoice,
        voiceMode: snapshot.qwenTTSVoiceMode,
        cloneVoiceId: snapshot.qwenTTSCloneVoiceId,
        cloneVoiceCloudId: snapshot.qwenTTSCloneVoiceCloudId || "",
        speed: snapshot.qwenTTSSpeed,
        languageType: snapshot.qwenTTSLanguageType,
        instructions: snapshot.qwenTTSInstructions || "",
      };
    }

    if (provider === "cosyvoice35plus") {
      return {
        provider,
        model: snapshot.cosyvoice35PlusModel,
        plusVoiceId: snapshot.cosyvoice35PlusVoiceId || "",
        flashVoiceId: snapshot.cosyvoice35FlashVoiceId || "",
        voiceProfileId: snapshot.cosyvoice35PlusVoiceProfileId,
        speed: snapshot.cosyvoice35PlusSpeed,
        instruction: snapshot.cosyvoice35PlusInstruction || "",
        languageHint: snapshot.cosyvoice35PlusLanguageHint,
      };
    }

    return { provider };
  }

  if (provider === "cosyvoice") {
    return {
      provider,
      speed: activeSettings.cosyvoiceSpeed,
      instruction: activeSettings.cosyvoiceInstruction.trim(),
      seed: activeSettings.cosyvoiceSeed,
      voiceId: activeSettings.cosyvoiceVoiceId,
    };
  }

  if (provider === "qwentts") {
    return {
      provider,
      model: activeSettings.qwenTTSModel,
      voice: activeSettings.qwenTTSVoice,
      voiceMode: activeSettings.qwenTTSVoiceMode,
      cloneVoiceId: activeSettings.qwenTTSCloneVoiceId,
      cloneVoiceCloudId: activeSettings.qwenTTSCloneVoiceCloudId.trim(),
      speed: activeSettings.qwenTTSSpeed,
      languageType: activeSettings.qwenTTSLanguageType,
      instructions: activeSettings.qwenTTSInstructions.trim(),
    };
  }

  if (provider === "cosyvoice35plus") {
    return {
      provider,
      model: activeSettings.cosyvoice35PlusModel,
      plusVoiceId: activeSettings.cosyvoice35PlusVoiceId.trim(),
      flashVoiceId: activeSettings.cosyvoice35FlashVoiceId.trim(),
      voiceProfileId: activeSettings.cosyvoice35PlusVoiceProfileId,
      speed: activeSettings.cosyvoice35PlusSpeed,
      instruction: activeSettings.cosyvoice35PlusInstruction.trim(),
      languageHint: activeSettings.cosyvoice35PlusLanguageHint,
    };
  }

  return { provider };
}

export function buildTTSCardAudioCacheKey(
  card: TTSCardCacheInput,
  activeSettings: TTSSettings,
  snapshot?: TTSCardSynthSnapshot | null
) {
  const baseSignature = {
    provider: snapshot?.provider || activeSettings.provider,
    contentHash: hashCacheSignature(card.content),
    cardVoiceId: card.voice_id,
    cardRate: card.rate || "0%",
  };
  const providerSignature = buildProviderSignature(activeSettings, snapshot);
  const signature = hashCacheSignature(
    JSON.stringify({
      ...baseSignature,
      ...providerSignature,
    })
  );

  return `${baseSignature.provider}:${signature}:${card.id}`;
}

export function getSynthModelBadgeLabel(snapshot?: TTSCardSynthSnapshot | null) {
  if (!snapshot) return "";

  if (snapshot.provider === "cosyvoice") return "3.0local";
  if (snapshot.provider === "edge") return "edgetts";
  if (snapshot.provider === "cosyvoice35plus") {
    return snapshot.cosyvoice35PlusModel === "cosyvoice-v3.5-flash"
      ? "cy3.5-flash"
      : "3.5plus";
  }
  if (snapshot.provider === "qwentts") {
    if (snapshot.qwenTTSModel === "qwen3-tts-vc-2026-01-22") return "qwen-vc";
    if (snapshot.qwenTTSModel === "qwen3-tts-flash") return "qwen-flash";
    return "qwen-instruct";
  }

  return snapshot.provider;
}

export function getTTSSettingsModelBadgeLabel(settings: TTSSettings) {
  if (settings.provider === "cosyvoice") return "3.0local";
  if (settings.provider === "edge") return "edgetts";
  if (settings.provider === "cosyvoice35plus") {
    return settings.cosyvoice35PlusModel === "cosyvoice-v3.5-flash"
      ? "cy3.5-flash"
      : "3.5plus";
  }
  if (settings.provider === "qwentts") {
    if (settings.qwenTTSModel === "qwen3-tts-vc-2026-01-22") return "qwen-vc";
    if (settings.qwenTTSModel === "qwen3-tts-flash") return "qwen-flash";
    return "qwen-instruct";
  }

  return settings.provider;
}

export function isTTSCardSynthSnapshotNewer(
  candidate?: TTSCardSynthSnapshot | null,
  current?: TTSCardSynthSnapshot | null
) {
  if (!candidate) return false;
  if (!current) return true;

  const candidateTime = Date.parse(candidate.synthesizedAt);
  const currentTime = Date.parse(current.synthesizedAt);

  if (Number.isNaN(candidateTime)) return false;
  if (Number.isNaN(currentTime)) return true;

  return candidateTime > currentTime;
}

export function applySynthSnapshotToSettings(
  activeSettings: TTSSettings,
  snapshot?: TTSCardSynthSnapshot | null
) {
  if (!snapshot) return activeSettings;

  if (snapshot.provider === "cosyvoice") {
    return {
      ...activeSettings,
      provider: snapshot.provider,
      cosyvoiceVoiceId: snapshot.cosyvoiceVoiceId || activeSettings.cosyvoiceVoiceId,
      cosyvoiceSpeed: snapshot.cosyvoiceSpeed ?? activeSettings.cosyvoiceSpeed,
      cosyvoiceInstruction: snapshot.cosyvoiceInstruction || activeSettings.cosyvoiceInstruction,
      cosyvoiceSeed: snapshot.cosyvoiceSeed ?? activeSettings.cosyvoiceSeed,
    };
  }

  if (snapshot.provider === "qwentts") {
    return {
      ...activeSettings,
      provider: snapshot.provider,
      qwenTTSModel: snapshot.qwenTTSModel || activeSettings.qwenTTSModel,
      qwenTTSVoice: snapshot.qwenTTSVoice || activeSettings.qwenTTSVoice,
      qwenTTSVoiceMode: snapshot.qwenTTSVoiceMode || activeSettings.qwenTTSVoiceMode,
      qwenTTSCloneVoiceId: snapshot.qwenTTSCloneVoiceId || activeSettings.qwenTTSCloneVoiceId,
      qwenTTSCloneVoiceCloudId:
        snapshot.qwenTTSCloneVoiceCloudId || activeSettings.qwenTTSCloneVoiceCloudId,
      qwenTTSSpeed: snapshot.qwenTTSSpeed ?? activeSettings.qwenTTSSpeed,
      qwenTTSLanguageType: snapshot.qwenTTSLanguageType || activeSettings.qwenTTSLanguageType,
      qwenTTSInstructions: snapshot.qwenTTSInstructions || activeSettings.qwenTTSInstructions,
    };
  }

  if (snapshot.provider === "cosyvoice35plus") {
    return {
      ...activeSettings,
      provider: snapshot.provider,
      cosyvoice35PlusModel:
        snapshot.cosyvoice35PlusModel || activeSettings.cosyvoice35PlusModel,
      cosyvoice35PlusVoiceId:
        snapshot.cosyvoice35PlusVoiceId || activeSettings.cosyvoice35PlusVoiceId,
      cosyvoice35FlashVoiceId:
        snapshot.cosyvoice35FlashVoiceId || activeSettings.cosyvoice35FlashVoiceId,
      cosyvoice35PlusVoiceProfileId:
        snapshot.cosyvoice35PlusVoiceProfileId || activeSettings.cosyvoice35PlusVoiceProfileId,
      cosyvoice35PlusSpeed:
        snapshot.cosyvoice35PlusSpeed ?? activeSettings.cosyvoice35PlusSpeed,
      cosyvoice35PlusInstruction:
        snapshot.cosyvoice35PlusInstruction || activeSettings.cosyvoice35PlusInstruction,
      cosyvoice35PlusLanguageHint:
        snapshot.cosyvoice35PlusLanguageHint || activeSettings.cosyvoice35PlusLanguageHint,
    };
  }

  return {
    ...activeSettings,
    provider: snapshot.provider,
  };
}
