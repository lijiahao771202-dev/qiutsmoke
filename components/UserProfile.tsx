"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogOut, ChevronDown, Image as ImageIcon, Check, Shuffle, User, Pencil, Trash2, Bell, Bot, Cpu, Loader2, Volume2, RefreshCw, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBackground, WALLPAPERS } from "./BackgroundContext";
import { cn } from "@/lib/utils";
import { AVATAR_PRESETS, getAvatarById } from "@/lib/avatars";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { getApiUrl } from "@/lib/config";
import { syncAll } from "@/lib/hooks/useSync";
import { deleteAllMeditationSessions } from "@/lib/hooks/useData";
import {
    getLocalSingleton,
    saveLocalSingleton,
    LOCAL_AI_SETTINGS_ID,
    LOCAL_PROFILE_ID,
    LOCAL_TTS_SETTINGS_ID,
} from "@/lib/local-settings";
import ReminderSettings from "./ReminderSettings";
import {
    AI_MODEL_FAMILY_OPTIONS,
    AI_MODEL_OPTIONS,
    DEEPSEEK_REASONING_EFFORT_OPTIONS,
    AI_PROVIDER_LABELS,
    DEFAULT_AI_MODEL_BY_PROVIDER,
    getAIModelFamilies,
    getAIModelFamilyByModel,
    getDefaultAIModelFamily,
    isAIProvider,
    type AIModelFamily,
    type AIProvider,
    type AIReasoningEffort,
} from "@/lib/ai-models";
import {
    COSYVOICE_INSTRUCTION_PRESETS,
    COSYVOICE_PROFILE,
    COSYVOICE_VOICE_PROFILES,
    DEFAULT_COSYVOICE_35_PLUS_INSTRUCTION,
    DEFAULT_COSYVOICE_35_FLASH_VOICE_ID,
    DEFAULT_COSYVOICE_35_PLUS_LANGUAGE_HINT,
    DEFAULT_COSYVOICE_35_PLUS_MODEL,
    DEFAULT_COSYVOICE_35_PLUS_SPEED,
    DEFAULT_COSYVOICE_35_PLUS_VOICE_ID,
    DEFAULT_COSYVOICE_35_PLUS_VOICE_PROFILE_ID,
    DEFAULT_COSYVOICE_VOICE_ID,
    DEFAULT_MIMO_TTS_CLONE_VOICE_URL,
    DEFAULT_MIMO_TTS_INSTRUCTION,
    DEFAULT_MIMO_TTS_MODEL,
    DEFAULT_MIMO_TTS_VOICE,
    DEFAULT_MIMO_TTS_VOICE_DESIGN_PROMPT,
    DEFAULT_QWEN_TTS_CLONE_VOICE_CLOUD_ID,
    DEFAULT_QWEN_TTS_CLONE_VOICE_ID,
    DEFAULT_QWEN_TTS_INSTRUCTIONS,
    DEFAULT_QWEN_TTS_LANGUAGE_TYPE,
    DEFAULT_QWEN_TTS_MODEL,
    DEFAULT_QWEN_TTS_SPEED,
    DEFAULT_QWEN_TTS_VOICE,
    DEFAULT_QWEN_TTS_VOICE_MODE,
    DEFAULT_TTS_PROVIDER,
    MIMO_TTS_INSTRUCTION_PRESETS,
    MIMO_TTS_VOICE_DESIGN_PRESETS,
    MIMO_TTS_MODELS,
    MIMO_TTS_VOICES,
    TTS_SETTINGS_PROVIDER_OPTIONS,
    TTS_PROVIDER_DESCRIPTIONS,
    TTS_PROVIDER_LABELS,
    isCosyVoice35PlusLanguageHint,
    isCosyVoice35Model,
    isCosyVoiceVoiceId,
    isMimoTTSModel,
    isMimoTTSVoice,
    isQwenTTSLanguageType,
    isQwenTTSModel,
    isQwenTTSVoice,
    isQwenTTSVoiceMode,
    isSelectableTTSProvider,
    normalizeTTSSettings,
    type CosyVoice35PlusLanguageHint,
    type CosyVoice35Model,
    type CosyVoiceVoiceId,
    type MimoTTSModel,
    type MimoTTSVoice,
    type QwenTTSLanguageType,
    type QwenTTSModel,
    type QwenTTSVoice,
    type QwenTTSVoiceMode,
    type TTSSettings,
    type TTSProvider,
} from "@/lib/tts-settings";

const AUTH_CACHE_KEY = "rain_auth_cache";

function getCachedUser() {
    try {
        const cached = localStorage.getItem(AUTH_CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch {
        return null;
    }
}

export default function UserProfile() {
    const [user, setUser] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);

    const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [showReminderSettings, setShowReminderSettings] = useState(false);
    const [showAISettings, setShowAISettings] = useState(false);
    const [showTTSSettings, setShowTTSSettings] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // 用户资料状态
    const [nickname, setNickname] = useState("");
    const [avatarId, setAvatarId] = useState("cat");
    const [isSaving, setIsSaving] = useState(false);
    const [aiProvider, setAIProvider] = useState<AIProvider>("deepseek");
    const [aiModel, setAIModel] = useState(DEFAULT_AI_MODEL_BY_PROVIDER.deepseek);
    const [aiFamily, setAIFamily] = useState<AIModelFamily>(getDefaultAIModelFamily("deepseek"));
    const [deepseekThinkingEnabled, setDeepseekThinkingEnabled] = useState(false);
    const [deepseekReasoningEffort, setDeepseekReasoningEffort] = useState<AIReasoningEffort>("high");
    const [isLoadingAISettings, setIsLoadingAISettings] = useState(true);
    const [isSavingAISettings, setIsSavingAISettings] = useState(false);
    const [isTestingAISettings, setIsTestingAISettings] = useState(false);
    const [aiTestResult, setAITestResult] = useState<{ ok: boolean; message: string } | null>(null);
    const [ttsProvider, setTTSProvider] = useState<TTSProvider>(DEFAULT_TTS_PROVIDER);
    const [cosyvoiceSpeed, setCosyvoiceSpeed] = useState<number>(COSYVOICE_PROFILE.speed);
    const [cosyvoiceSpeedInput, setCosyvoiceSpeedInput] = useState(String(COSYVOICE_PROFILE.speed));
    const [cosyvoiceInstruction, setCosyvoiceInstruction] = useState<string>(COSYVOICE_PROFILE.instruction);
    const [cosyvoiceSeed, setCosyvoiceSeed] = useState<number>(COSYVOICE_PROFILE.seed);
    const [cosyvoiceVoiceId, setCosyvoiceVoiceId] = useState<CosyVoiceVoiceId>(DEFAULT_COSYVOICE_VOICE_ID);
    const [mimoTTSModel, setMimoTTSModel] = useState<MimoTTSModel>(DEFAULT_MIMO_TTS_MODEL);
    const [mimoTTSVoice, setMimoTTSVoice] = useState<MimoTTSVoice>(DEFAULT_MIMO_TTS_VOICE);
    const [mimoTTSInstruction, setMimoTTSInstruction] = useState<string>(DEFAULT_MIMO_TTS_INSTRUCTION);
    const [mimoTTSVoiceDesignPrompt, setMimoTTSVoiceDesignPrompt] = useState<string>(DEFAULT_MIMO_TTS_VOICE_DESIGN_PROMPT);
    const [mimoTTSCloneVoiceUrl, setMimoTTSCloneVoiceUrl] = useState<string>(DEFAULT_MIMO_TTS_CLONE_VOICE_URL);
    const [qwenTTSModel, setQwenTTSModel] = useState<QwenTTSModel>(DEFAULT_QWEN_TTS_MODEL);
    const [qwenTTSVoice, setQwenTTSVoice] = useState<QwenTTSVoice>(DEFAULT_QWEN_TTS_VOICE);
    const [qwenTTSVoiceMode, setQwenTTSVoiceMode] = useState<QwenTTSVoiceMode>(DEFAULT_QWEN_TTS_VOICE_MODE);
    const [qwenTTSCloneVoiceId, setQwenTTSCloneVoiceId] = useState<CosyVoiceVoiceId>(DEFAULT_QWEN_TTS_CLONE_VOICE_ID);
    const [qwenTTSCloneVoiceCloudId, setQwenTTSCloneVoiceCloudId] = useState<string>(DEFAULT_QWEN_TTS_CLONE_VOICE_CLOUD_ID);
    const [qwenTTSSpeed, setQwenTTSSpeed] = useState<number>(DEFAULT_QWEN_TTS_SPEED);
    const [qwenTTSSpeedInput, setQwenTTSSpeedInput] = useState(String(DEFAULT_QWEN_TTS_SPEED));
    const [qwenTTSLanguageType, setQwenTTSLanguageType] = useState<QwenTTSLanguageType>(DEFAULT_QWEN_TTS_LANGUAGE_TYPE);
    const [qwenTTSInstructions, setQwenTTSInstructions] = useState<string>(DEFAULT_QWEN_TTS_INSTRUCTIONS);
    const [cosyvoice35PlusModel, setCosyvoice35PlusModel] = useState<CosyVoice35Model>(DEFAULT_COSYVOICE_35_PLUS_MODEL);
    const [cosyvoice35PlusVoiceId, setCosyvoice35PlusVoiceId] = useState<string>(DEFAULT_COSYVOICE_35_PLUS_VOICE_ID);
    const [cosyvoice35FlashVoiceId, setCosyvoice35FlashVoiceId] = useState<string>(DEFAULT_COSYVOICE_35_FLASH_VOICE_ID);
    const [cosyvoice35PlusVoiceProfileId, setCosyvoice35PlusVoiceProfileId] = useState<CosyVoiceVoiceId>(DEFAULT_COSYVOICE_35_PLUS_VOICE_PROFILE_ID);
    const [cosyvoice35PlusSpeed, setCosyvoice35PlusSpeed] = useState<number>(DEFAULT_COSYVOICE_35_PLUS_SPEED);
    const [cosyvoice35PlusSpeedInput, setCosyvoice35PlusSpeedInput] = useState(String(DEFAULT_COSYVOICE_35_PLUS_SPEED));
    const [cosyvoice35PlusInstruction, setCosyvoice35PlusInstruction] = useState<string>(DEFAULT_COSYVOICE_35_PLUS_INSTRUCTION);
    const [cosyvoice35PlusLanguageHint, setCosyvoice35PlusLanguageHint] = useState<CosyVoice35PlusLanguageHint>(DEFAULT_COSYVOICE_35_PLUS_LANGUAGE_HINT);
    const [isLoadingTTSSettings, setIsLoadingTTSSettings] = useState(true);
    const [isSavingTTSSettings, setIsSavingTTSSettings] = useState(false);
    const [isTestingTTSSettings, setIsTestingTTSSettings] = useState(false);
    const [ttsTestResult, setTTSTestResult] = useState<{ ok: boolean; message: string } | null>(null);
    const [ttsSaveResult, setTTSSaveResult] = useState<{ ok: boolean; message: string } | null>(null);

    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = useMemo(() => createClient(), []);
    const { setWallpaper, wallpaperId } = useBackground();

    const normalizeSpeedInput = (value: string, fallback: number) => {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) return fallback;
        const clamped = Math.min(2, Math.max(0.5, parsed));
        return Math.round(clamped * 20) / 20;
    };

    useEffect(() => {
        // 使用 getSession 读取本地 cookie，不发网络请求
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const cachedUser = getCachedUser();
            setUser(session?.user ?? cachedUser ?? null);

            // 从 user_metadata 加载头像和昵称
            const baseUser = session?.user ?? cachedUser;
            if (baseUser) {
                setNickname(baseUser.user_metadata?.nickname || "");
                setAvatarId(baseUser.user_metadata?.avatar_id || "cat");
            }
            const localProfile = await getLocalSingleton("user_profile", LOCAL_PROFILE_ID, {
                nickname: baseUser?.user_metadata?.nickname || "",
                avatarId: baseUser?.user_metadata?.avatar_id || "cat",
            });
            setNickname(localProfile.nickname || "");
            setAvatarId(localProfile.avatarId || "cat");
        };
        getInitialSession();
        void loadAISettings(false);
        void loadTTSSettings(false);

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                setNickname(session.user.user_metadata?.nickname || "");
                setAvatarId(session.user.user_metadata?.avatar_id || "cat");
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (showAISettings) void loadAISettings(true);
    }, [showAISettings]);

    useEffect(() => {
        if (showTTSSettings) void loadTTSSettings(true);
    }, [showTTSSettings]);

    const applyAISettings = (data: any) => {
        if (isAIProvider(data?.provider)) {
            setAIProvider(data.provider);
        }
        if (typeof data?.model === "string") {
            setAIModel(data.model);
            const family = getAIModelFamilyByModel(data.model);
            if (family) {
                setAIFamily(family);
            }
        }
        setDeepseekThinkingEnabled(Boolean(data?.deepseekThinkingEnabled));
        if (data?.deepseekReasoningEffort === "high" || data?.deepseekReasoningEffort === "max") {
            setDeepseekReasoningEffort(data.deepseekReasoningEffort);
        }
    };

    const loadAISettings = async (refreshCloud = false) => {
        try {
            const fallback = {
                provider: aiProvider,
                model: aiModel,
                deepseekThinkingEnabled,
                deepseekReasoningEffort,
            };
            const localSettings = await getLocalSingleton("user_settings", LOCAL_AI_SETTINGS_ID, fallback);
            applyAISettings(localSettings);
            setIsLoadingAISettings(false);

            if (!refreshCloud || !navigator.onLine) return;
            const res = await fetch(getApiUrl("/api/ai-settings"), {
                method: "GET",
                cache: "no-store",
            });
            if (!res.ok) return;

            const data = await res.json();
            await saveLocalSingleton("user_settings", LOCAL_AI_SETTINGS_ID, data);
            applyAISettings(data);
        } catch (error) {
            console.error("Load ai settings failed:", error);
        } finally {
            setIsLoadingAISettings(false);
        }
    };

    const applyTTSSettings = (data: any) => {
        if (isSelectableTTSProvider(data?.provider)) {
            setTTSProvider(data.provider);
        }
        if (typeof data?.cosyvoiceSpeed === "number") {
            setCosyvoiceSpeed(data.cosyvoiceSpeed);
            setCosyvoiceSpeedInput(String(data.cosyvoiceSpeed));
        }
        if (typeof data?.cosyvoiceInstruction === "string") {
            setCosyvoiceInstruction(data.cosyvoiceInstruction);
        }
        if (typeof data?.cosyvoiceSeed === "number") {
            setCosyvoiceSeed(data.cosyvoiceSeed);
        }
        if (data?.cosyvoiceVoiceId === "yupinglu" || data?.cosyvoiceVoiceId === "tea") {
            setCosyvoiceVoiceId(data.cosyvoiceVoiceId);
        }
        if (isMimoTTSModel(data?.mimoTTSModel)) {
            setMimoTTSModel(data.mimoTTSModel);
        }
        if (isMimoTTSVoice(data?.mimoTTSVoice)) {
            setMimoTTSVoice(data.mimoTTSVoice);
        }
        if (typeof data?.mimoTTSInstruction === "string") {
            setMimoTTSInstruction(data.mimoTTSInstruction);
        }
        if (typeof data?.mimoTTSVoiceDesignPrompt === "string") {
            setMimoTTSVoiceDesignPrompt(data.mimoTTSVoiceDesignPrompt);
        }
        if (typeof data?.mimoTTSCloneVoiceUrl === "string") {
            setMimoTTSCloneVoiceUrl(data.mimoTTSCloneVoiceUrl);
        }
        if (isQwenTTSModel(data?.qwenTTSModel)) {
            setQwenTTSModel(data.qwenTTSModel);
        }
        if (isQwenTTSVoice(data?.qwenTTSVoice)) {
            setQwenTTSVoice(data.qwenTTSVoice);
        }
        if (isQwenTTSVoiceMode(data?.qwenTTSVoiceMode)) {
            setQwenTTSVoiceMode(data.qwenTTSVoiceMode);
        }
        if (isCosyVoiceVoiceId(data?.qwenTTSCloneVoiceId)) {
            setQwenTTSCloneVoiceId(data.qwenTTSCloneVoiceId);
        }
        if (typeof data?.qwenTTSCloneVoiceCloudId === "string") {
            setQwenTTSCloneVoiceCloudId(data.qwenTTSCloneVoiceCloudId);
        }
        if (typeof data?.qwenTTSSpeed === "number") {
            setQwenTTSSpeed(data.qwenTTSSpeed);
            setQwenTTSSpeedInput(String(data.qwenTTSSpeed));
        }
        if (isQwenTTSLanguageType(data?.qwenTTSLanguageType)) {
            setQwenTTSLanguageType(data.qwenTTSLanguageType);
        }
        if (typeof data?.qwenTTSInstructions === "string") {
            setQwenTTSInstructions(data.qwenTTSInstructions);
        }
        if (isCosyVoice35Model(data?.cosyvoice35PlusModel)) {
            setCosyvoice35PlusModel(data.cosyvoice35PlusModel);
        }
        if (typeof data?.cosyvoice35PlusVoiceId === "string") {
            setCosyvoice35PlusVoiceId(data.cosyvoice35PlusVoiceId);
        }
        if (typeof data?.cosyvoice35FlashVoiceId === "string") {
            setCosyvoice35FlashVoiceId(data.cosyvoice35FlashVoiceId);
        }
        if (isCosyVoiceVoiceId(data?.cosyvoice35PlusVoiceProfileId)) {
            setCosyvoice35PlusVoiceProfileId(data.cosyvoice35PlusVoiceProfileId);
        }
        if (typeof data?.cosyvoice35PlusSpeed === "number") {
            setCosyvoice35PlusSpeed(data.cosyvoice35PlusSpeed);
            setCosyvoice35PlusSpeedInput(String(data.cosyvoice35PlusSpeed));
        }
        if (typeof data?.cosyvoice35PlusInstruction === "string") {
            setCosyvoice35PlusInstruction(data.cosyvoice35PlusInstruction);
        }
        if (isCosyVoice35PlusLanguageHint(data?.cosyvoice35PlusLanguageHint)) {
            setCosyvoice35PlusLanguageHint(data.cosyvoice35PlusLanguageHint);
        }
    };

    const getCurrentTTSSettings = () => normalizeTTSSettings({
        provider: ttsProvider,
        cosyvoiceSpeed,
        cosyvoiceInstruction,
        cosyvoiceSeed,
        cosyvoiceVoiceId,
        mimoTTSModel,
        mimoTTSVoice,
        mimoTTSInstruction,
        mimoTTSVoiceDesignPrompt,
        mimoTTSCloneVoiceUrl,
        qwenTTSModel,
        qwenTTSVoice,
        qwenTTSVoiceMode,
        qwenTTSCloneVoiceId,
        qwenTTSCloneVoiceCloudId,
        qwenTTSSpeed,
        qwenTTSLanguageType,
        qwenTTSInstructions,
        cosyvoice35PlusModel,
        cosyvoice35PlusVoiceId,
        cosyvoice35FlashVoiceId,
        cosyvoice35PlusVoiceProfileId,
        cosyvoice35PlusSpeed,
        cosyvoice35PlusInstruction,
        cosyvoice35PlusLanguageHint,
    });

    const loadTTSSettings = async (refreshCloud = false) => {
        try {
            const localSettings = await getLocalSingleton("user_settings", LOCAL_TTS_SETTINGS_ID, getCurrentTTSSettings());
            applyTTSSettings(localSettings);
            setIsLoadingTTSSettings(false);

            if (!refreshCloud || !navigator.onLine) return;
            const res = await fetch(getApiUrl("/api/tts-settings"), {
                method: "GET",
                cache: "no-store",
            });
            if (!res.ok) return;

            const data = await res.json();
            const normalized = normalizeTTSSettings(data);
            await saveLocalSingleton("user_settings", LOCAL_TTS_SETTINGS_ID, normalized);
            applyTTSSettings(normalized);
        } catch (error) {
            console.error("Load tts settings failed:", error);
        } finally {
            setIsLoadingTTSSettings(false);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setIsOpen(false);
        router.refresh();
        router.push("/auth");
    };

    const handleRandomWallpaper = () => {
        const available = WALLPAPERS.filter(w => w.id !== wallpaperId);
        const random = available[Math.floor(Math.random() * available.length)];
        setWallpaper(random.id);
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const profile = { nickname, avatarId };
            await saveLocalSingleton("user_profile", LOCAL_PROFILE_ID, profile, {
                apiPath: "/api/profile",
            });
            setUser((current: any) => current ? {
                ...current,
                user_metadata: {
                    ...(current.user_metadata || {}),
                    nickname,
                    avatar_id: avatarId,
                },
            } : current);
            setShowProfileEditor(false);
        } catch (e) {
            console.error("Save profile failed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMeditationData = async () => {
        setIsDeleting(true);
        try {
            await deleteAllMeditationSessions();
            setShowDeleteConfirm(false);
        } catch (e) {
            console.error("Delete meditation data failed:", e);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleProviderChange = (provider: AIProvider) => {
        setAIProvider(provider);
        setAIModel(DEFAULT_AI_MODEL_BY_PROVIDER[provider]);
        setAIFamily(getDefaultAIModelFamily(provider));
        if (provider !== "deepseek") {
            setDeepseekThinkingEnabled(false);
        }
        setAITestResult(null);
    };

    const handleFamilyChange = (family: AIModelFamily) => {
        setAIFamily(family);
        setAITestResult(null);
        const firstModel = AI_MODEL_OPTIONS.find((option) => option.provider === aiProvider && option.family === family);
        if (firstModel) {
            setAIModel(firstModel.id);
        }
    };

    const handleTestAISettings = async () => {
        setIsTestingAISettings(true);
        setAITestResult(null);

        try {
            const deepseekApiKey =
                aiProvider === "deepseek" && typeof window !== "undefined"
                    ? localStorage.getItem("deepseek_api_key") || undefined
                    : undefined;

            const res = await fetch(getApiUrl("/api/ai-settings/test"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: aiProvider,
                    model: aiModel,
                    deepseekThinkingEnabled,
                    deepseekReasoningEffort,
                    apiKey: deepseekApiKey,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                setAITestResult({
                    ok: false,
                    message: data?.error || data?.details || `HTTP ${res.status}`,
                });
                return;
            }

            setAITestResult({
                ok: true,
                message: data?.preview ? `测试成功：${String(data.preview).slice(0, 120)}` : "测试成功，接口可用。",
            });
        } catch (error: any) {
            setAITestResult({
                ok: false,
                message: error?.message || "测试失败",
            });
        } finally {
            setIsTestingAISettings(false);
        }
    };

    const handleSaveAISettings = async () => {
        setIsSavingAISettings(true);
        try {
            await saveLocalSingleton("user_settings", LOCAL_AI_SETTINGS_ID, {
                provider: aiProvider,
                model: aiModel,
                deepseekThinkingEnabled,
                deepseekReasoningEffort,
            }, {
                apiPath: "/api/ai-settings",
            });
            setShowAISettings(false);
        } catch (error) {
            console.error("Save ai settings failed:", error);
        } finally {
            setIsSavingAISettings(false);
        }
    };

    const handleSaveTTSSettings = async () => {
        setIsSavingTTSSettings(true);
        setTTSSaveResult(null);
        try {
            const normalizedCosyvoiceSpeed = normalizeSpeedInput(cosyvoiceSpeedInput, cosyvoiceSpeed);
            const normalizedQwenTTSSpeed = normalizeSpeedInput(qwenTTSSpeedInput, qwenTTSSpeed);
            const normalizedCosyvoice35PlusSpeed = normalizeSpeedInput(cosyvoice35PlusSpeedInput, cosyvoice35PlusSpeed);
            setCosyvoiceSpeed(normalizedCosyvoiceSpeed);
            setCosyvoiceSpeedInput(String(normalizedCosyvoiceSpeed));
            setQwenTTSSpeed(normalizedQwenTTSSpeed);
            setQwenTTSSpeedInput(String(normalizedQwenTTSSpeed));
            setCosyvoice35PlusSpeed(normalizedCosyvoice35PlusSpeed);
            setCosyvoice35PlusSpeedInput(String(normalizedCosyvoice35PlusSpeed));

            const nextSettings = normalizeTTSSettings({
                provider: ttsProvider,
                cosyvoiceSpeed: normalizedCosyvoiceSpeed,
                cosyvoiceInstruction,
                cosyvoiceSeed,
                cosyvoiceVoiceId,
                mimoTTSModel,
                mimoTTSVoice,
                mimoTTSInstruction,
                mimoTTSVoiceDesignPrompt,
                mimoTTSCloneVoiceUrl,
                qwenTTSModel,
                qwenTTSVoice,
                qwenTTSVoiceMode,
                qwenTTSCloneVoiceId,
                qwenTTSCloneVoiceCloudId,
                qwenTTSSpeed: normalizedQwenTTSSpeed,
                qwenTTSLanguageType,
                qwenTTSInstructions,
                cosyvoice35PlusModel,
                cosyvoice35PlusVoiceId,
                cosyvoice35FlashVoiceId,
                cosyvoice35PlusVoiceProfileId,
                cosyvoice35PlusSpeed: normalizedCosyvoice35PlusSpeed,
                cosyvoice35PlusInstruction,
                cosyvoice35PlusLanguageHint,
            });
            await saveLocalSingleton("user_settings", LOCAL_TTS_SETTINGS_ID, nextSettings, {
                apiPath: "/api/tts-settings",
            });
            const savedSettings = nextSettings;
            setTTSProvider(savedSettings.provider);
            setCosyvoiceSpeed(savedSettings.cosyvoiceSpeed);
            setCosyvoiceSpeedInput(String(savedSettings.cosyvoiceSpeed));
                setCosyvoiceInstruction(savedSettings.cosyvoiceInstruction);
                setCosyvoiceSeed(savedSettings.cosyvoiceSeed);
                setCosyvoiceVoiceId(savedSettings.cosyvoiceVoiceId);
                setMimoTTSModel(savedSettings.mimoTTSModel);
                setMimoTTSVoice(savedSettings.mimoTTSVoice);
                setMimoTTSInstruction(savedSettings.mimoTTSInstruction);
                setMimoTTSVoiceDesignPrompt(savedSettings.mimoTTSVoiceDesignPrompt);
                setMimoTTSCloneVoiceUrl(savedSettings.mimoTTSCloneVoiceUrl);
                setQwenTTSModel(savedSettings.qwenTTSModel);
                setQwenTTSVoice(savedSettings.qwenTTSVoice);
                setQwenTTSVoiceMode(savedSettings.qwenTTSVoiceMode);
                setQwenTTSCloneVoiceId(savedSettings.qwenTTSCloneVoiceId);
                setQwenTTSCloneVoiceCloudId(savedSettings.qwenTTSCloneVoiceCloudId);
            setQwenTTSSpeed(savedSettings.qwenTTSSpeed);
            setQwenTTSSpeedInput(String(savedSettings.qwenTTSSpeed));
                setQwenTTSLanguageType(savedSettings.qwenTTSLanguageType);
                setQwenTTSInstructions(savedSettings.qwenTTSInstructions);
                setCosyvoice35PlusModel(savedSettings.cosyvoice35PlusModel);
                setCosyvoice35PlusVoiceId(savedSettings.cosyvoice35PlusVoiceId);
                setCosyvoice35FlashVoiceId(savedSettings.cosyvoice35FlashVoiceId);
                setCosyvoice35PlusVoiceProfileId(savedSettings.cosyvoice35PlusVoiceProfileId);
            setCosyvoice35PlusSpeed(savedSettings.cosyvoice35PlusSpeed);
            setCosyvoice35PlusSpeedInput(String(savedSettings.cosyvoice35PlusSpeed));
                setCosyvoice35PlusInstruction(savedSettings.cosyvoice35PlusInstruction);
                setCosyvoice35PlusLanguageHint(savedSettings.cosyvoice35PlusLanguageHint);
                if (typeof window !== "undefined") {
                    localStorage.setItem("tts_provider", savedSettings.provider);
                    window.dispatchEvent(new CustomEvent("tts-provider-changed", {
                        detail: savedSettings,
                    }));
                }
                setTTSSaveResult({ ok: true, message: "已保存，新的 TTS 设置会立即用于合成。" });
                window.setTimeout(() => setShowTTSSettings(false), 450);
        } catch (error) {
            console.error("Save tts settings failed:", error);
            setTTSSaveResult({
                ok: false,
                message: error instanceof Error ? error.message : "保存失败，请检查网络后重试。",
            });
        } finally {
            setIsSavingTTSSettings(false);
        }
    };

    const handleTestTTSSettings = async () => {
        setIsTestingTTSSettings(true);
        setTTSTestResult(null);

        const nextSettings = normalizeTTSSettings({
            provider: ttsProvider,
            cosyvoiceSpeed,
            cosyvoiceInstruction,
            cosyvoiceSeed,
            cosyvoiceVoiceId,
            mimoTTSModel,
            mimoTTSVoice,
            mimoTTSInstruction,
            mimoTTSVoiceDesignPrompt,
            mimoTTSCloneVoiceUrl,
            qwenTTSModel,
            qwenTTSVoice,
            qwenTTSVoiceMode,
            qwenTTSCloneVoiceId,
            qwenTTSCloneVoiceCloudId,
            qwenTTSSpeed,
            qwenTTSLanguageType,
            qwenTTSInstructions,
            cosyvoice35PlusModel,
            cosyvoice35PlusVoiceId,
            cosyvoice35FlashVoiceId,
            cosyvoice35PlusVoiceProfileId,
            cosyvoice35PlusSpeed,
            cosyvoice35PlusInstruction,
            cosyvoice35PlusLanguageHint,
        });

        if (nextSettings.provider === "edge") {
            setTTSTestResult({
                ok: true,
                message: "当前选择的是 EdgeTTS，无需云端或本地连通性测试。",
            });
            setIsTestingTTSSettings(false);
            return;
        }

        try {
            const res = await fetch(getApiUrl("/api/tts-settings/test"), {
                method: "POST",
                cache: "no-store",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nextSettings),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data?.ok) {
                const modelHint = typeof data?.model === "string" ? `模型 ${data.model} | ` : "";
                setTTSTestResult({
                    ok: false,
                    message: `${modelHint}${data?.error || `HTTP ${res.status}`}`,
                });
                return;
            }

            const summary = [
                data?.provider ? `${TTS_PROVIDER_LABELS[data.provider as TTSProvider]} 连通成功` : "TTS 连通成功",
                data?.model ? `模型 ${data.model}` : "",
                data?.voice ? `音色 ${data.voice}` : "",
                data?.mode ? `模式 ${data.mode}` : "",
                data?.sample_rate ? `采样率 ${data.sample_rate}Hz` : "",
            ].filter(Boolean).join(" | ");

            setTTSTestResult({
                ok: true,
                message: summary || "TTS 连通成功",
            });
        } catch (error: any) {
            setTTSTestResult({
                ok: false,
                message: error?.message || "TTS 连通失败",
            });
        } finally {
            setIsTestingTTSSettings(false);
        }
    };

    const handleRandomCosyvoiceSeed = () => {
        setCosyvoiceSeed(Math.floor(Math.random() * 2147483647));
        setTTSTestResult(null);
    };

    const { triggerLight } = useHaptics();

    if (!user) return null;

    const currentAvatar = getAvatarById(avatarId);
    const displayName = nickname || user.email?.split("@")[0] || "用户";
    const visibleFamilies = getAIModelFamilies(aiProvider);
    const visibleModels = AI_MODEL_OPTIONS.filter((option) => option.provider === aiProvider && option.family === aiFamily);
    const selectedModelMeta = AI_MODEL_OPTIONS.find((option) => option.id === aiModel);
    const selectedFamilyMeta = AI_MODEL_FAMILY_OPTIONS.find((family) => family.provider === aiProvider && family.id === aiFamily);
    const canSubmitAISettings = visibleModels.length > 0;
    const mimoInstructionPlaceholder =
        "角色：中文正念冥想指导者...\n\n场景：听众正在闭眼练习...\n\n指导：整体极其缓慢、柔和、低刺激...";
    return (
        <>
            <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] right-6 z-50" ref={dropdownRef}>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        triggerLight();
                        setIsOpen(!isOpen);
                    }}
                    className="flex items-center gap-2 p-1.5 pr-3 rounded-full glass-panel border border-white/10 bg-white/5 hover:bg-white/10 transition-colors shadow-lg"
                >
                    {/* 使用选择的头像 */}
                    <div className={cn(
                        "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-lg shadow-inner",
                        currentAvatar.bgGradient
                    )}>
                        {currentAvatar.emoji}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 top-full mt-2 w-72 glass-panel rounded-2xl p-2 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-3xl bg-black/40"
                        >
                            {/* Header with Avatar and Name */}
                            <div className="px-4 py-4 border-b border-white/5 mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-2xl shadow-lg",
                                        currentAvatar.bgGradient
                                    )}>
                                        {currentAvatar.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-base font-medium text-white/90 truncate">{displayName}</div>
                                        <div className="text-xs text-white/40 truncate">{user.email}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="space-y-1">
                                {/* Edit Profile */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowProfileEditor(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-violet-400 hover:text-violet-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">编辑资料</span>
                                </button>

                                {/* Wallpaper Picker */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowWallpaperPicker(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                                        <ImageIcon className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">更换壁纸</span>
                                </button>

                                {/* Reminder Settings */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowReminderSettings(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-amber-400 hover:text-amber-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">提醒设置</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowAISettings(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-fuchsia-400 hover:text-fuchsia-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-fuchsia-500/10 group-hover:bg-fuchsia-500/20 transition-colors">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-light">AI 模型</div>
                                        <div className="text-xs text-white/35 truncate">
                                            {isLoadingAISettings ? "加载中..." : `${selectedFamilyMeta?.label || AI_PROVIDER_LABELS[aiProvider]} · ${selectedModelMeta?.label || aiModel}`}
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowTTSSettings(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                                        <Volume2 className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-light">TTS 引擎</div>
                                        <div className="text-xs text-white/35 truncate">
                                            {isLoadingTTSSettings ? "加载中..." : TTS_PROVIDER_LABELS[ttsProvider]}
                                        </div>
                                    </div>
                                </button>

                                {/* Vector DB Admin */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        router.push("/admin/vectors");
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-indigo-400 hover:text-indigo-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                                        <Database className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">向量库管理</span>
                                </button>

                                {/* Delete Meditation Data */}
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowDeleteConfirm(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-orange-400 hover:text-orange-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">清除冥想数据</span>
                                </button>

                                {/* Manual Sync */}
                                <button
                                    onClick={async () => {
                                        setIsSyncing(true);
                                        try {
                                            await syncAll();
                                        } finally {
                                            setIsSyncing(false);
                                        }
                                    }}
                                    disabled={isSyncing}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-emerald-400 hover:text-emerald-300 transition-colors text-sm text-left group disabled:opacity-50"
                                >
                                    <div className="p-1.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                                        <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                    </div>
                                    <span className="font-light">{isSyncing ? "同步中..." : "同步数据"}</span>
                                </button>

                                {/* Sign Out */}
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-rose-400 hover:text-rose-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                                        <LogOut className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">退出登录</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Profile Editor Modal */}
            <AnimatePresence>
                {showProfileEditor && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowProfileEditor(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md max-h-[85vh] overflow-hidden glass-panel rounded-3xl border border-white/10 shadow-2xl"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-white/10">
                                <h2 className="text-lg font-medium text-white/90">编辑资料</h2>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
                                {/* Current Avatar Preview */}
                                <div className="flex flex-col items-center">
                                    <div className={cn(
                                        "w-24 h-24 rounded-full bg-gradient-to-br flex items-center justify-center text-5xl shadow-xl mb-3",
                                        getAvatarById(avatarId).bgGradient
                                    )}>
                                        {getAvatarById(avatarId).emoji}
                                    </div>
                                    <div className="text-white/60 text-sm">{getAvatarById(avatarId).name}</div>
                                </div>

                                {/* Nickname Input */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-2">昵称</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            placeholder="输入你的昵称..."
                                            maxLength={20}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                        />
                                        <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    </div>
                                </div>

                                {/* Avatar Selection */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-3">选择头像</label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {AVATAR_PRESETS.map((avatar) => (
                                            <motion.button
                                                key={avatar.id}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setAvatarId(avatar.id)}
                                                className={cn(
                                                    "relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all",
                                                    `bg-gradient-to-br ${avatar.bgGradient}`,
                                                    avatarId === avatar.id
                                                        ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-black/50"
                                                        : "opacity-70 hover:opacity-100"
                                                )}
                                                title={avatar.name}
                                            >
                                                {avatar.emoji}
                                                {avatarId === avatar.id && (
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                                <button
                                    onClick={() => setShowProfileEditor(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-medium transition-all disabled:opacity-50"
                                >
                                    {isSaving ? "保存中..." : "保存"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Reminder Settings Modal */}
            <AnimatePresence>
                {showReminderSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowReminderSettings(false)}
                    >
                        <ReminderSettings onClose={() => setShowReminderSettings(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAISettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowAISettings(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-xl max-h-[85vh] overflow-hidden glass-panel rounded-3xl border border-white/10 shadow-2xl"
                        >
                            <div className="px-6 py-4 border-b border-white/10">
                                <h2 className="text-lg font-medium text-white/90">AI 模型选择</h2>
                                <p className="text-sm text-white/45 mt-1">
                                    这里的选择会直接作用到冥想生成和 TTS Studio 的 `/api/generate`。
                                </p>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
                                <div>
                                    <label className="block text-sm text-white/60 mb-3">服务提供方</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {(["deepseek", "nvidia", "mimo"] as AIProvider[]).map((provider) => {
                                            const active = aiProvider === provider;
                                            const ProviderIcon = provider === "deepseek" ? Bot : provider === "nvidia" ? Cpu : Database;
                                            return (
                                                <button
                                                    key={provider}
                                                    type="button"
                                                    onClick={() => handleProviderChange(provider)}
                                                    className={cn(
                                                        "rounded-2xl border px-4 py-4 text-left transition-all",
                                                        active
                                                            ? "border-fuchsia-400/70 bg-fuchsia-500/10 shadow-lg shadow-fuchsia-500/10"
                                                            : "border-white/10 bg-white/5 hover:bg-white/10"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "flex h-10 w-10 items-center justify-center rounded-xl",
                                                            active ? "bg-fuchsia-500/20 text-fuchsia-300" : "bg-white/10 text-white/60"
                                                        )}>
                                                            <ProviderIcon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-white/90 text-sm">{AI_PROVIDER_LABELS[provider]}</div>
                                                            <div className="text-xs text-white/45 mt-1">
                                                                {provider === "deepseek"
                                                                    ? "保持当前默认链路"
                                                                    : provider === "nvidia"
                                                                        ? "走 NVIDIA OpenAI 兼容接口"
                                                                        : "走小米 MiMo 官方接口"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-white/60 mb-3">模型系列</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {visibleFamilies.map((family) => {
                                            const active = aiFamily === family.id;
                                            const familyCount = AI_MODEL_OPTIONS.filter(
                                                (option) => option.provider === aiProvider && option.family === family.id
                                            ).length;

                                            return (
                                                <button
                                                    key={family.id}
                                                    type="button"
                                                    onClick={() => handleFamilyChange(family.id)}
                                                    className={cn(
                                                        "rounded-2xl border px-4 py-4 text-left transition-all",
                                                        active
                                                            ? "border-amber-400/70 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                                                            : "border-white/10 bg-white/5 hover:bg-white/10"
                                                    )}
                                                >
                                                    <div className="text-sm text-white/90">{family.label}</div>
                                                    <div className="text-xs text-white/45 mt-1">{family.description}</div>
                                                    <div className="text-[11px] text-white/35 mt-2">
                                                        {familyCount > 0 ? `${familyCount} 个可选模型` : "当前暂无可选模型"}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-white/60 mb-3">具体模型</label>
                                    {visibleModels.length === 0 && (
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/60">
                                            {selectedFamilyMeta?.emptyMessage || "当前这个系列下没有可用模型。"}
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {visibleModels.map((option) => {
                                            const active = aiModel === option.id;
                                            return (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => setAIModel(option.id)}
                                                    className={cn(
                                                        "w-full rounded-2xl border px-4 py-4 text-left transition-all",
                                                        active
                                                            ? "border-cyan-400/70 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                                                            : "border-white/10 bg-white/5 hover:bg-white/10"
                                                    )}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={cn(
                                                            "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border",
                                                            active ? "border-cyan-400 bg-cyan-400/20" : "border-white/20"
                                                        )}>
                                                            {active && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm text-white/90">{option.label}</div>
                                                            <div className="text-xs text-white/45 mt-1 break-all">{option.id}</div>
                                                            <div className="text-xs text-white/55 mt-2">{option.description}</div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {aiProvider === "deepseek" && (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 space-y-4">
                                        <div>
                                            <div className="text-sm text-white/90">深度思考</div>
                                            <div className="text-xs text-white/45 mt-1">
                                                V4 Flash / Pro 可手动开关，`deepseek-reasoner` 会强制开启。
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                                            <div>
                                                <div className="text-sm text-white/85">开启深度思考</div>
                                                <div className="text-[11px] text-white/40 mt-1">关闭时按普通聊天参数生成。</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setDeepseekThinkingEnabled((prev) => !prev)}
                                                className={cn(
                                                    "relative h-7 w-12 rounded-full transition-colors",
                                                    deepseekThinkingEnabled ? "bg-cyan-500" : "bg-white/15"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "absolute top-1 h-5 w-5 rounded-full bg-white transition-transform",
                                                        deepseekThinkingEnabled ? "translate-x-6" : "translate-x-1"
                                                    )}
                                                />
                                            </button>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-white/85 mb-2">推理强度</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {DEEPSEEK_REASONING_EFFORT_OPTIONS.map((option) => {
                                                    const active = deepseekReasoningEffort === option.id;
                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            disabled={!deepseekThinkingEnabled}
                                                            onClick={() => setDeepseekReasoningEffort(option.id)}
                                                            className={cn(
                                                                "rounded-xl border px-3 py-3 text-left transition-all disabled:opacity-40",
                                                                active
                                                                    ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                                                                    : "border-white/10 bg-black/10 text-white/70 hover:bg-white/10"
                                                            )}
                                                        >
                                                            <div className="text-sm">{option.label}</div>
                                                            <div className="mt-1 text-[11px] text-white/40">{option.description}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {aiTestResult && (
                                    <div
                                        className={cn(
                                            "rounded-2xl border px-4 py-3 text-sm",
                                            aiTestResult.ok
                                                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                                                : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                                        )}
                                    >
                                        {aiTestResult.message}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                                <button
                                    onClick={() => setShowAISettings(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleTestAISettings}
                                    disabled={isTestingAISettings || !canSubmitAISettings}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isTestingAISettings && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{isTestingAISettings ? "测试中..." : "测试连通性"}</span>
                                </button>
                                <button
                                    onClick={handleSaveAISettings}
                                    disabled={isSavingAISettings || !canSubmitAISettings}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-400 hover:to-cyan-400 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSavingAISettings && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{isSavingAISettings ? "保存中..." : "保存"}</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showTTSSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowTTSSettings(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-[min(88dvh,760px)] w-full max-w-lg flex-col overflow-hidden glass-panel rounded-3xl border border-white/10 shadow-2xl sm:h-auto sm:max-h-[85vh]"
                        >
                            <div className="shrink-0 px-5 py-4 sm:px-6 border-b border-white/10">
                                <h2 className="text-lg font-medium text-white/90">TTS 引擎选择</h2>
                                <p className="text-sm text-white/45 mt-1">
                                    首页、冥想和 TTS Studio 的语音合成都走这里的全局设置。
                                </p>
                            </div>

                            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 pb-6 sm:px-6 sm:py-6">
                                {TTS_SETTINGS_PROVIDER_OPTIONS.map((provider) => {
                                    const active = ttsProvider === provider;
                                    return (
                                        <button
                                            key={provider}
                                            type="button"
                                            onClick={() => {
                                                setTTSProvider(provider);
                                                setTTSTestResult(null);
                                                setTTSSaveResult(null);
                                            }}
                                            className={cn(
                                                "w-full rounded-2xl border px-4 py-4 text-left transition-all",
                                                active
                                                    ? "border-cyan-400/70 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                                                    : "border-white/10 bg-white/5 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    "mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl",
                                                    active ? "bg-cyan-500/20 text-cyan-300" : "bg-white/10 text-white/60"
                                                )}>
                                                    <Volume2 className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm text-white/90">{TTS_PROVIDER_LABELS[provider]}</div>
                                                        {active && (
                                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200">
                                                                当前
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-white/45 mt-1">
                                                        {TTS_PROVIDER_DESCRIPTIONS[provider]}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                {ttsProvider === "cosyvoice" && (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm text-white/90">CosyVoice 全局参数</div>
                                            <div className="text-xs text-white/45 mt-1">
                                                这些参数会影响首页、冥想和 TTS Studio 的 CosyVoice 合成。
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/60">
                                            {COSYVOICE_PROFILE.mode} | stream={String(COSYVOICE_PROFILE.stream)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                                            <div className="text-xs text-white/45 mb-1">克隆音频</div>
                                            <div className="text-sm text-white/85">
                                                {COSYVOICE_VOICE_PROFILES.find((profile) => profile.id === cosyvoiceVoiceId)?.cloneAudioName || COSYVOICE_PROFILE.cloneAudioName}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                                            <div className="text-xs text-white/45 mb-1">当前模式</div>
                                            <div className="text-sm text-white/85">{COSYVOICE_PROFILE.mode}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm text-white/85">克隆音色</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {COSYVOICE_VOICE_PROFILES.map((profile) => {
                                                const active = cosyvoiceVoiceId === profile.id;
                                                return (
                                                    <button
                                                        key={profile.id}
                                                        type="button"
                                                        onClick={() => setCosyvoiceVoiceId(profile.id)}
                                                        disabled={ttsProvider !== "cosyvoice"}
                                                        className={cn(
                                                            "rounded-xl border px-3 py-3 text-left transition-all disabled:opacity-50",
                                                            active
                                                                ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                                                                : "border-white/10 bg-black/10 text-white/70 hover:bg-white/10"
                                                        )}
                                                    >
                                                        <div className="text-sm">{profile.label}</div>
                                                        <div className="mt-1 text-[11px] text-white/40">{profile.cloneAudioName}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm text-white/85">倍速</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={cosyvoiceSpeedInput}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[，,]/g, ".");
                                                if (!/^\d*(?:\.\d*)?$/.test(value)) return;
                                                setCosyvoiceSpeedInput(value);
                                                const parsed = Number.parseFloat(value);
                                                if (Number.isFinite(parsed)) {
                                                    setCosyvoiceSpeed(Math.min(2, Math.max(0.5, parsed)));
                                                }
                                            }}
                                            onBlur={() => {
                                                const normalized = normalizeSpeedInput(cosyvoiceSpeedInput, cosyvoiceSpeed);
                                                setCosyvoiceSpeed(normalized);
                                                setCosyvoiceSpeedInput(String(normalized));
                                            }}
                                            disabled={ttsProvider !== "cosyvoice"}
                                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none disabled:opacity-50"
                                        />
                                        <div className="text-xs text-white/40">范围 0.5 - 2.0，步进 0.05，默认 {COSYVOICE_PROFILE.speed}</div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm text-white/85">自然语言控制指令</label>
                                        <div className="mb-3 space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-[11px] text-white/45">指令预设</div>
                                                <div className="text-[11px] text-white/35">点击后会填充到文本框</div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {COSYVOICE_INSTRUCTION_PRESETS.map((preset) => {
                                                    const active = cosyvoiceInstruction.trim() === preset.prompt;
                                                    return (
                                                        <button
                                                            key={preset.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setCosyvoiceInstruction(preset.prompt);
                                                                setTTSTestResult(null);
                                                            }}
                                                            disabled={ttsProvider !== "cosyvoice"}
                                                            className={cn(
                                                                "rounded-xl border px-3 py-3 text-left transition-all disabled:opacity-50",
                                                                active
                                                                    ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                                                                    : "border-white/10 bg-black/10 text-white/70 hover:bg-white/10"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="text-sm">{preset.label}</div>
                                                                <div className="text-[10px] text-white/40">{preset.description}</div>
                                                            </div>
                                                            <div className="mt-2 text-[11px] leading-5 text-white/45 line-clamp-3">
                                                                {preset.prompt}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <textarea
                                            value={cosyvoiceInstruction}
                                            onChange={(e) => setCosyvoiceInstruction(e.target.value)}
                                            disabled={ttsProvider !== "cosyvoice"}
                                            rows={4}
                                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none resize-none disabled:opacity-50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm text-white/85">随机推理种子</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={cosyvoiceSeed}
                                                onChange={(e) => {
                                                    const digits = e.target.value.replace(/\D/g, "");
                                                    setCosyvoiceSeed(digits === "" ? 0 : Number.parseInt(digits, 10));
                                                }}
                                                disabled={ttsProvider !== "cosyvoice"}
                                                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none disabled:opacity-50"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleRandomCosyvoiceSeed}
                                                disabled={ttsProvider !== "cosyvoice"}
                                                className="shrink-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-white/80 hover:bg-white/15 disabled:opacity-50"
                                                title="随机种子"
                                            >
                                                <Shuffle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    </div>
                                )}

                                {ttsProvider === "edge" && (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm text-white/90">EdgeTTS 说明</div>
                                                <div className="text-xs text-white/45 mt-1">
                                                    当前模式不需要额外云端参数或本地服务，直接使用浏览器侧默认链路。
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/60">
                                                零配置
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-xs leading-6 text-white/55">
                                            如果你只想快速试听或不依赖 DashScope、本地 CosyVoice 服务，可以直接用 EdgeTTS。
                                        </div>
                                    </div>
                                )}

                                {ttsProvider === "mimotts" && (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 space-y-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm text-white/90">MiMo 全局参数</div>
                                                <div className="text-xs text-white/45 mt-1">
                                                    这里会直接影响首页、冥想和 TTS Studio 的 MiMo 合成。
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/60">
                                                OpenAI 兼容接口
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm text-white/85">模型模式</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {MIMO_TTS_MODELS.map((model) => {
                                                    const active = mimoTTSModel === model.id;
                                                    return (
                                                        <button
                                                            key={model.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setMimoTTSModel(model.id);
                                                                setTTSTestResult(null);
                                                            }}
                                                            disabled={ttsProvider !== "mimotts"}
                                                            className={cn(
                                                                "rounded-xl border px-3 py-3 text-left transition-all disabled:opacity-50",
                                                                active
                                                                    ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                                                                    : "border-white/10 bg-black/10 text-white/70 hover:bg-white/10"
                                                            )}
                                                        >
                                                            <div className="text-sm">{model.label}</div>
                                                            <div className="mt-1 text-[11px] leading-5 text-white/45">{model.description}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {mimoTTSModel === "mimo-v2.5-tts" && (
                                            <div className="space-y-2">
                                                <label className="block text-sm text-white/85">系统音色</label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {MIMO_TTS_VOICES.map((voice) => {
                                                        const active = mimoTTSVoice === voice.id;
                                                        return (
                                                            <button
                                                                key={voice.id}
                                                                type="button"
                                                                onClick={() => setMimoTTSVoice(voice.id)}
                                                                disabled={ttsProvider !== "mimotts"}
                                                                className={cn(
                                                                    "rounded-xl border px-3 py-3 text-left transition-all disabled:opacity-50",
                                                                    active
                                                                        ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                                                                        : "border-white/10 bg-black/10 text-white/70 hover:bg-white/10"
                                                                )}
                                                            >
                                                                <div className="text-sm">{voice.label}</div>
                                                                <div className="mt-1 text-[11px] text-white/40">{voice.description}</div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {mimoTTSModel === "mimo-v2.5-tts-voiceclone" && (
                                            <div className="space-y-2">
                                                <label className="block text-sm text-white/85">参考音频路径 / URL</label>
                                                <input
                                                    type="text"
                                                    value={mimoTTSCloneVoiceUrl}
                                                    onChange={(e) => setMimoTTSCloneVoiceUrl(e.target.value)}
                                                    placeholder="/Users/you/Desktop/voice-sample.wav 或 https://example.com/voice-sample.wav"
                                                    disabled={ttsProvider !== "mimotts"}
                                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none disabled:opacity-50"
                                                />
                                                <div className="text-xs text-white/40">
                                                    本机使用时可直接填绝对路径；如果之后部署到服务器，请改成可公开访问的 HTTPS 音频地址。服务端会自动转成 MiMo 需要的 data URL。
                                                </div>
                                            </div>
                                        )}

                                        {mimoTTSModel === "mimo-v2.5-tts-voicedesign" && (
                                            <div className="space-y-2 rounded-2xl border border-amber-300/15 bg-amber-300/5 p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <label className="block text-sm text-white/90">声音设计</label>
                                                        <div className="mt-1 text-xs text-white/45">
                                                            只描述“声音本身”：年龄、性别、音色、共鸣、语速和情绪底色。不要把朗读方式、pause 或导演指令写在这里。
                                                        </div>
                                                    </div>
                                                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] text-amber-100">
                                                        VoiceDesign
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {MIMO_TTS_VOICE_DESIGN_PRESETS.map((preset) => {
                                                        const active = mimoTTSVoiceDesignPrompt.trim() === preset.prompt;
                                                        return (
                                                            <button
                                                                key={preset.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setMimoTTSVoiceDesignPrompt(preset.prompt);
                                                                    setTTSTestResult(null);
                                                                }}
                                                                disabled={ttsProvider !== "mimotts"}
                                                                className={cn(
                                                                    "rounded-xl border px-3 py-3 text-left transition-all disabled:opacity-50",
                                                                    active
                                                                        ? "border-amber-300/70 bg-amber-300/15 text-amber-50"
                                                                        : "border-white/10 bg-black/10 text-white/70 hover:bg-white/10"
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="text-sm">{preset.label}</div>
                                                                    <div className="text-[10px] text-white/40">{preset.description}</div>
                                                                </div>
                                                                <div className="mt-2 text-[11px] leading-5 text-white/45 line-clamp-3">
                                                                    {preset.prompt}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <textarea
                                                    value={mimoTTSVoiceDesignPrompt}
                                                    onChange={(e) => setMimoTTSVoiceDesignPrompt(e.target.value)}
                                                    disabled={ttsProvider !== "mimotts"}
                                                    rows={3}
                                                    placeholder="成年女性，声线温柔偏低，气息松弛，语速慢。"
                                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none resize-none disabled:opacity-50"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="block text-sm text-white/85">自然指令 / 导演模式</label>
                                            <div className="mb-3 space-y-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-[11px] text-white/45">朗读方式预设</div>
                                                    <div className="text-[11px] text-white/35">每段合成都会带上</div>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {MIMO_TTS_INSTRUCTION_PRESETS.map((preset) => {
                                                        const active = mimoTTSInstruction.trim() === preset.prompt;
                                                        return (
                                                            <button
                                                                key={preset.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setMimoTTSInstruction(preset.prompt);
                                                                    setTTSTestResult(null);
                                                                }}
                                                                disabled={ttsProvider !== "mimotts"}
                                                                className={cn(
                                                                    "rounded-xl border px-3 py-3 text-left transition-all disabled:opacity-50",
                                                                    active
                                                                        ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                                                                        : "border-white/10 bg-black/10 text-white/70 hover:bg-white/10"
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="text-sm">{preset.label}</div>
                                                                    <div className="text-[10px] text-white/40">{preset.description}</div>
                                                                </div>
                                                                <div className="mt-2 text-[11px] leading-5 text-white/45 line-clamp-3">
                                                                    {preset.prompt}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <textarea
                                                value={mimoTTSInstruction}
                                                onChange={(e) => setMimoTTSInstruction(e.target.value)}
                                                disabled={ttsProvider !== "mimotts"}
                                                rows={4}
                                                placeholder={mimoInstructionPlaceholder}
                                                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none resize-none disabled:opacity-50"
                                            />
                                            <div className="text-xs text-white/40">
                                                这里控制朗读方式和导演语气；VoiceDesign 模式下它会与上面的“声音设计”分开送入 MiMo，不再混成一个字段。
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm text-white/90">TTS 连通性测试</div>
                                            <div className="text-xs text-white/45 mt-1">
                                                CosyVoice 会检查本机服务，MiMo 会请求官方 Open Platform，EdgeTTS 当前不需要额外连通性测试。
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleTestTTSSettings}
                                            disabled={isTestingTTSSettings}
                                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isTestingTTSSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            <span>{isTestingTTSSettings ? "测试中..." : "测试连通性"}</span>
                                        </button>
                                    </div>

                                    {ttsTestResult && (
                                        <div
                                            className={cn(
                                                "mt-3 rounded-xl border px-3 py-2 text-xs",
                                                ttsTestResult.ok
                                                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                                                    : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                                            )}
                                        >
                                            {ttsTestResult.message}
                                        </div>
                                    )}

                                    {ttsSaveResult && (
                                        <div
                                            className={cn(
                                                "mt-3 rounded-xl border px-3 py-2 text-xs",
                                                ttsSaveResult.ok
                                                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                                                    : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                                            )}
                                        >
                                            {ttsSaveResult.message}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="shrink-0 border-t border-white/10 bg-black/20 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-4">
                                <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
                                <button
                                    onClick={() => setShowTTSSettings(false)}
                                    className="min-h-11 flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleTestTTSSettings}
                                    disabled={isTestingTTSSettings}
                                    className="min-h-11 flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isTestingTTSSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{isTestingTTSSettings ? "测试中..." : "测试连通性"}</span>
                                </button>
                                <button
                                    onClick={handleSaveTTSSettings}
                                    disabled={isSavingTTSSettings}
                                    className="col-span-2 min-h-12 flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 sm:col-span-1"
                                >
                                    {isSavingTTSSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{isSavingTTSSettings ? "保存中..." : "保存"}</span>
                                </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Wallpaper Picker Modal */}
            <AnimatePresence>
                {showWallpaperPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowWallpaperPicker(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-4xl max-h-[80vh] overflow-hidden glass-panel rounded-3xl border border-white/10 shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                <h2 className="text-lg font-medium text-white/90">壁纸选择</h2>
                                <button
                                    onClick={handleRandomWallpaper}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm text-white/80"
                                >
                                    <Shuffle className="w-4 h-4" />
                                    <span>随机壁纸</span>
                                </button>
                            </div>

                            {/* Grid */}
                            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {WALLPAPERS.map((wp) => (
                                        <motion.button
                                            key={wp.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setWallpaper(wp.id);
                                            }}
                                            className={cn(
                                                "relative aspect-video rounded-xl overflow-hidden border-2 transition-all duration-200",
                                                wallpaperId === wp.id
                                                    ? "border-cyan-400 shadow-lg shadow-cyan-500/30"
                                                    : "border-white/10 hover:border-white/30"
                                            )}
                                        >
                                            {/* Wallpaper Preview */}
                                            {wp.type === 'dynamic' ? (
                                                <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-indigo-900 to-cyan-900">
                                                    <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">
                                                        ✨ 动态
                                                    </div>
                                                </div>
                                            ) : wp.url ? (
                                                <img
                                                    src={wp.url}
                                                    alt={wp.name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-white/40 text-xs">
                                                    无预览
                                                </div>
                                            )}

                                            {/* Name Overlay */}
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                                <div className="text-xs text-white/90 text-center truncate">{wp.name}</div>
                                            </div>

                                            {/* Selected Indicator */}
                                            {wallpaperId === wp.id && (
                                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
                                                    <Check className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm glass-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-white/10 text-center">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-500/20 flex items-center justify-center">
                                    <Trash2 className="w-6 h-6 text-orange-400" />
                                </div>
                                <h2 className="text-lg font-medium text-white/90">清除冥想数据</h2>
                            </div>

                            {/* Content */}
                            <div className="p-6 text-center">
                                <p className="text-white/60 text-sm mb-2">
                                    确定要删除所有冥想记录吗？
                                </p>
                                <p className="text-orange-400/80 text-xs">
                                    ⚠️ 此操作不可撤销，莲花花园也将清空
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleDeleteMeditationData}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white text-sm font-medium transition-all disabled:opacity-50"
                                >
                                    {isDeleting ? "删除中..." : "确认删除"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
