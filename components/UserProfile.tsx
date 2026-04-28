"use client";

import { useEffect, useState, useRef } from "react";
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
    type AIModelFamily,
    type AIProvider,
    type AIReasoningEffort,
} from "@/lib/ai-models";
import {
    COSYVOICE_INSTRUCTION_PRESETS,
    COSYVOICE_35_MODELS,
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
    DEFAULT_QWEN_TTS_CLONE_VOICE_CLOUD_ID,
    DEFAULT_QWEN_TTS_CLONE_VOICE_ID,
    DEFAULT_QWEN_TTS_INSTRUCTIONS,
    DEFAULT_QWEN_TTS_LANGUAGE_TYPE,
    DEFAULT_QWEN_TTS_MODEL,
    DEFAULT_QWEN_TTS_SPEED,
    DEFAULT_QWEN_TTS_VOICE,
    DEFAULT_QWEN_TTS_VOICE_MODE,
    DEFAULT_TTS_PROVIDER,
    QWEN_TTS_MODELS,
    QWEN_TTS_VOICES,
    TTS_PROVIDER_DESCRIPTIONS,
    TTS_PROVIDER_LABELS,
    isCosyVoice35PlusLanguageHint,
    isCosyVoice35Model,
    isCosyVoiceVoiceId,
    isQwenTTSCloneModel,
    isQwenTTSInstructionModel,
    isQwenTTSLanguageType,
    isQwenTTSModel,
    isQwenTTSVoice,
    isQwenTTSVoiceMode,
    isTTSProvider,
    normalizeTTSSettings,
    type CosyVoice35PlusLanguageHint,
    type CosyVoice35Model,
    type CosyVoiceVoiceId,
    type QwenTTSLanguageType,
    type QwenTTSModel,
    type QwenTTSVoice,
    type QwenTTSVoiceMode,
    type TTSSettings,
    type TTSProvider,
} from "@/lib/tts-settings";

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

    // 鐢ㄦ埛璧勬枡鐘舵€?
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
    const supabase = createClient();
    const { setWallpaper, wallpaperId } = useBackground();

    const normalizeSpeedInput = (value: string, fallback: number) => {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) return fallback;
        const clamped = Math.min(2, Math.max(0.5, parsed));
        return Math.round(clamped * 20) / 20;
    };

    useEffect(() => {
        // 浣跨敤 getSession 璇诲彇鏈湴 cookie锛屼笉鍙戠綉缁滆姹?
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            // 浠?user_metadata 鍔犺浇澶村儚鍜屾樀绉?
            if (session?.user) {
                setNickname(session.user.user_metadata?.nickname || "");
                setAvatarId(session.user.user_metadata?.avatar_id || "cat");
            }
        };
        getInitialSession();
        void loadAISettings();
        void loadTTSSettings();

        // 鐩戝惉璁よ瘉鐘舵€佸彉鍖?
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                setNickname(session.user.user_metadata?.nickname || "");
                setAvatarId(session.user.user_metadata?.avatar_id || "cat");
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadAISettings = async () => {
        try {
            const res = await fetch(getApiUrl("/api/ai-settings"), {
                method: "GET",
                cache: "no-store",
            });
            if (!res.ok) return;

            const data = await res.json();
            if (data?.provider === "deepseek" || data?.provider === "nvidia") {
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
        } catch (error) {
            console.error("Load ai settings failed:", error);
        } finally {
            setIsLoadingAISettings(false);
        }
    };

    const loadTTSSettings = async () => {
        try {
            const res = await fetch(getApiUrl("/api/tts-settings"), {
                method: "GET",
                cache: "no-store",
            });
            if (!res.ok) return;

            const data = await res.json();
            if (isTTSProvider(data?.provider)) {
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
            const res = await fetch(getApiUrl("/api/profile"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname, avatarId }),
            });
            if (res.ok) {
                // 鍒锋柊鐢ㄦ埛鏁版嵁
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    // 鎵嬪姩鍒锋柊 user_metadata
                    await supabase.auth.refreshSession();
                }
                setShowProfileEditor(false);
            }
        } catch (e) {
            console.error("Save profile failed:", e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMeditationData = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(getApiUrl("/api/meditation/sessions?all=true"), {
                method: "DELETE",
            });
            if (res.ok) {
                setShowDeleteConfirm(false);
                // 鍒锋柊椤甸潰浠ユ洿鏂版暟鎹?
                router.refresh();
                window.location.reload();
            }
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
                message: data?.preview
                    ? `Test succeeded: ${String(data.preview).slice(0, 120)}`
                    : "Test succeeded. The endpoint is available.",
            });
        } catch (error: any) {
            setAITestResult({
                ok: false,
                message: error?.message || "娴嬭瘯澶辫触",
            });
        } finally {
            setIsTestingAISettings(false);
        }
    };

    const handleSaveAISettings = async () => {
        setIsSavingAISettings(true);
        try {
            const res = await fetch(getApiUrl("/api/ai-settings"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: aiProvider,
                    model: aiModel,
                    deepseekThinkingEnabled,
                    deepseekReasoningEffort,
                }),
            });
            if (res.ok) {
                setShowAISettings(false);
            }
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
            const res = await fetch(getApiUrl("/api/tts-settings"), {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nextSettings),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setTTSSaveResult({
                    ok: false,
                    message: typeof data?.error === "string" ? data.error : `Save failed (HTTP ${res.status})`,
                });
                return;
            }

            if (res.ok) {
                const savedSettings = normalizeTTSSettings({ ...nextSettings, ...data });
            setTTSProvider(savedSettings.provider);
            setCosyvoiceSpeed(savedSettings.cosyvoiceSpeed);
            setCosyvoiceSpeedInput(String(savedSettings.cosyvoiceSpeed));
                setCosyvoiceInstruction(savedSettings.cosyvoiceInstruction);
                setCosyvoiceSeed(savedSettings.cosyvoiceSeed);
                setCosyvoiceVoiceId(savedSettings.cosyvoiceVoiceId);
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
                setTTSSaveResult({ ok: true, message: "Saved. The new TTS settings will be used for synthesis immediately." });
                window.setTimeout(() => setShowTTSSettings(false), 450);
            }
        } catch (error) {
            console.error("Save tts settings failed:", error);
            setTTSSaveResult({
                ok: false,
                message: error instanceof Error ? error.message : "Save failed. Check the network and try again.",
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
                message: "EdgeTTS is selected. No cloud or local connectivity test is needed.",
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
                const modelHint = typeof data?.model === "string" ? `妯″瀷 ${data.model} | ` : "";
                setTTSTestResult({
                    ok: false,
                    message: `${modelHint}${data?.error || `HTTP ${res.status}`}`,
                });
                return;
            }

            const summary = [
                data?.provider ? `${TTS_PROVIDER_LABELS[data.provider as TTSProvider]} connectivity succeeded` : "TTS connectivity succeeded",
                data?.model ? `妯″瀷 ${data.model}` : "",
                data?.voice ? `闊宠壊 ${data.voice}` : "",
                data?.mode ? `妯″紡 ${data.mode}` : "",
                data?.sample_rate ? `閲囨牱鐜?${data.sample_rate}Hz` : "",
            ].filter(Boolean).join(" | ");

            setTTSTestResult({
                ok: true,
                message: summary || "TTS connectivity succeeded",
            });
        } catch (error: any) {
            setTTSTestResult({
                ok: false,
                message: error?.message || "TTS connectivity failed",
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
    const displayName = nickname || user.email?.split("@")[0] || "鐢ㄦ埛";
    const visibleFamilies = getAIModelFamilies(aiProvider);
    const visibleModels = AI_MODEL_OPTIONS.filter((option) => option.provider === aiProvider && option.family === aiFamily);
    const selectedModelMeta = AI_MODEL_OPTIONS.find((option) => option.id === aiModel);
    const selectedFamilyMeta = AI_MODEL_FAMILY_OPTIONS.find((family) => family.provider === aiProvider && family.id === aiFamily);
    const canSubmitAISettings = visibleModels.length > 0;
    const qwenIsInstructionModel = isQwenTTSInstructionModel(qwenTTSModel);
    const qwenIsCloneModel = isQwenTTSCloneModel(qwenTTSModel);

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
                    {/* 浣跨敤閫夋嫨鐨勫ご鍍?*/}
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
                                    <span className="font-light">缂栬緫璧勬枡</span>
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
                                    <span className="font-light">鏇存崲澹佺焊</span>
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
                                    <span className="font-light">鎻愰啋璁剧疆</span>
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
                                        <div className="font-light">AI 妯″瀷</div>
                                        <div className="text-xs text-white/35 truncate">
                                            {isLoadingAISettings ? "鍔犺浇涓?.." : `${selectedFamilyMeta?.label || AI_PROVIDER_LABELS[aiProvider]} 路 ${selectedModelMeta?.label || aiModel}`}
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
                                        <div className="font-light">TTS 寮曟搸</div>
                                        <div className="text-xs text-white/35 truncate">
                                            {isLoadingTTSSettings ? "鍔犺浇涓?.." : TTS_PROVIDER_LABELS[ttsProvider]}
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
                                    <span className="font-light">Vector DB Admin</span>
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
                                    <span className="font-light">娓呴櫎鍐ユ兂鏁版嵁</span>
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
                                    <span className="font-light">{isSyncing ? "鍚屾涓?.." : "鍚屾鏁版嵁"}</span>
                                </button>

                                {/* Sign Out */}
                                <button
                                    onClick={handleSignOut}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/10 text-rose-400 hover:text-rose-300 transition-colors text-sm text-left group"
                                >
                                    <div className="p-1.5 rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
                                        <LogOut className="w-4 h-4" />
                                    </div>
                                    <span className="font-light">Sign Out</span>
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
                                <h2 className="text-lg font-medium text-white/90">缂栬緫璧勬枡</h2>
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
                                    <label className="block text-sm text-white/60 mb-2">鏄电О</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            placeholder="杈撳叆浣犵殑鏄电О..."
                                            maxLength={20}
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                        />
                                        <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    </div>
                                </div>

                                {/* Avatar Selection */}
                                <div>
                                    <label className="block text-sm text-white/60 mb-3">閫夋嫨澶村儚</label>
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
                                    鍙栨秷
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-medium transition-all disabled:opacity-50"
                                >
                                    {isSaving ? "淇濆瓨涓?.." : "淇濆瓨"}
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
                                <h2 className="text-lg font-medium text-white/90">AI 妯″瀷閫夋嫨</h2>
                                <p className="text-sm text-white/45 mt-1">
                                    杩欓噷鐨勯€夋嫨浼氱洿鎺ヤ綔鐢ㄥ埌鍐ユ兂鐢熸垚鍜?TTS Studio 鐨?`/api/generate`銆?
                                </p>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
                                <div>
                                    <label className="block text-sm text-white/60 mb-3">Provider</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(["deepseek", "nvidia"] as AIProvider[]).map((provider) => {
                                            const active = aiProvider === provider;
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
                                                            {provider === "deepseek" ? <Bot className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                                                        </div>
                                                        <div>
                                                            <div className="text-white/90 text-sm">{AI_PROVIDER_LABELS[provider]}</div>
                                                            <div className="text-xs text-white/45 mt-1">
                                                                {provider === "deepseek" ? "淇濇寔褰撳墠榛樿閾捐矾" : "璧?NVIDIA OpenAI 鍏煎鎺ュ彛"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-white/60 mb-3">妯″瀷绯诲垪</label>
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
                                                        {familyCount > 0 ? `${familyCount} models available` : "No models available right now"}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-white/60 mb-3">鍏蜂綋妯″瀷</label>
                                    {visibleModels.length === 0 && (
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/60">
                                            {selectedFamilyMeta?.emptyMessage || "There are no available models in this family right now."}
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
                                            <div className="text-sm text-white/90">Deep reasoning</div>
                                            <div className="text-xs text-white/45 mt-1">
                                                V4 Flash / Pro 鍙墜鍔ㄥ紑鍏筹紝`deepseek-reasoner` 浼氬己鍒跺紑鍚€?
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                                            <div>
                                                <div className="text-sm text-white/85">Enable deep reasoning</div>
                                                <div className="text-[11px] text-white/40 mt-1">When disabled, the normal chat parameters are used.</div>
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
                                            <label className="block text-sm text-white/85 mb-2">鎺ㄧ悊寮哄害</label>
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
                                    鍙栨秷
                                </button>
                                <button
                                    onClick={handleTestAISettings}
                                    disabled={isTestingAISettings || !canSubmitAISettings}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isTestingAISettings && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{isTestingAISettings ? "Testing..." : "Test connectivity"}</span>
                                </button>
                                <button
                                    onClick={handleSaveAISettings}
                                    disabled={isSavingAISettings || !canSubmitAISettings}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-400 hover:to-cyan-400 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSavingAISettings && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{isSavingAISettings ? "淇濆瓨涓?.." : "淇濆瓨"}</span>
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
                                <h2 className="text-lg font-medium text-white/90">TTS 寮曟搸閫夋嫨</h2>
                                <p className="text-sm text-white/45 mt-1">
                                    棣栭〉銆佸啣鎯冲拰 TTS Studio 鐨勮闊冲悎鎴愰兘璧拌繖閲岀殑鍏ㄥ眬璁剧疆銆?
                                </p>
                            </div>

                            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 pb-6 sm:px-6 sm:py-6">
                                {(["qwentts", "cosyvoice35plus", "cosyvoice", "edge"] as TTSProvider[]).map((provider) => {
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
                                                                褰撳墠
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
                                            <div className="text-sm text-white/90">CosyVoice 鍏ㄥ眬鍙傛暟</div>
                                            <div className="text-xs text-white/45 mt-1">
                                                杩欎簺鍙傛暟浼氬奖鍝嶉椤点€佸啣鎯冲拰 TTS Studio 鐨?CosyVoice 鍚堟垚銆?
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/60">
                                            {COSYVOICE_PROFILE.mode} | stream={String(COSYVOICE_PROFILE.stream)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                                            <div className="text-xs text-white/45 mb-1">鍏嬮殕闊抽</div>
                                            <div className="text-sm text-white/85">
                                                {COSYVOICE_VOICE_PROFILES.find((profile) => profile.id === cosyvoiceVoiceId)?.cloneAudioName || COSYVOICE_PROFILE.cloneAudioName}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                                            <div className="text-xs text-white/45 mb-1">褰撳墠妯″紡</div>
                                            <div className="text-sm text-white/85">{COSYVOICE_PROFILE.mode}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm text-white/85">鍏嬮殕闊宠壊</label>
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
                                        <label className="block text-sm text-white/85">Speed multiplier</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={cosyvoiceSpeedInput}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[锛?]/g, ".");
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
                                        <div className="text-xs text-white/40">{`Range 0.5 - 2.0, step 0.05, default ${COSYVOICE_PROFILE.speed}`}</div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm text-white/85">鑷劧璇█鎺у埗鎸囦护</label>
                                        <div className="mb-3 space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-[11px] text-white/45">鎸囦护棰勮</div>
                                                <div className="text-[11px] text-white/35">鐐瑰嚮鍚庝細濉厖鍒版枃鏈</div>
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
                                        <label className="block text-sm text-white/85">闅忔満鎺ㄧ悊绉嶅瓙</label>
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
                                                title="闅忔満绉嶅瓙"
                                            >
                                                <Shuffle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    </div>
                                )}

                                {ttsProvider === "qwentts" && (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm text-white/85">妯″瀷</label>
                                            <div className="space-y-2">
                                                {QWEN_TTS_MODELS.map((model) => {
                                                    const active = qwenTTSModel === model.id;
                                                    return (
                                                        <button
                                                            key={model.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setQwenTTSModel(model.id);
                                                                setQwenTTSVoiceMode(isQwenTTSCloneModel(model.id) ? "clone" : "system");
                                                                setTTSTestResult(null);
                                                            }}
                                                            className={cn(
                                                                "w-full rounded-xl border px-3 py-3 text-left transition-all",
                                                                active
                                                                    ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                                                                    : "border-white/10 bg-black/10 text-white/70 hover:bg-white/10"
                                                            )}
                                                        >
                                                            <div className="text-sm">{model.label}</div>
                                                            <div className="mt-1 text-[11px] text-white/40">{model.id}</div>
                                                            <div className="mt-2 text-[11px] text-white/50">{model.description}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {!qwenIsCloneModel && (
                                            <div className="space-y-2">
                                                <label className="block text-sm text-white/85">绯荤粺闊宠壊</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {QWEN_TTS_VOICES.map((voice) => {
                                                        const active = qwenTTSVoice === voice.id;
                                                        return (
                                                            <button
                                                                key={voice.id}
                                                                type="button"
                                                                onClick={() => setQwenTTSVoice(voice.id)}
                                                                className={cn(
                                                                    "rounded-xl border px-3 py-3 text-left transition-all",
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

                                        {qwenIsCloneModel && (
                                            <div className="space-y-3">
                                                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-xs text-white/55">
                                                    褰撳墠鏄厠闅嗘ā鍨嬶紝鍙樉绀哄厠闅嗛煶鑹茬浉鍏宠缃紝涓嶆樉绀虹郴缁熼煶鑹插拰鑷劧璇█鎸囦护銆?
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm text-white/85">鍏嬮殕闊宠壊 Profile</label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {COSYVOICE_VOICE_PROFILES.map((profile) => {
                                                            const active = qwenTTSCloneVoiceId === profile.id;
                                                            return (
                                                                <button
                                                                    key={profile.id}
                                                                    type="button"
                                                                    onClick={() => setQwenTTSCloneVoiceId(profile.id)}
                                                                    className={cn(
                                                                        "rounded-xl border px-3 py-3 text-left transition-all",
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
                                                    <label className="block text-sm text-white/85">Qwen 鍏嬮殕 voice_id</label>
                                                    <input
                                                        type="text"
                                                        value={qwenTTSCloneVoiceCloudId}
                                                        onChange={(e) => setQwenTTSCloneVoiceCloudId(e.target.value)}
                                                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="block text-sm text-white/85">璇█</label>
                                            <select
                                                value={qwenTTSLanguageType}
                                                onChange={(e) => {
                                                    if (isQwenTTSLanguageType(e.target.value)) {
                                                        setQwenTTSLanguageType(e.target.value);
                                                    }
                                                }}
                                                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none"
                                            >
                                                <option value="Chinese">Chinese</option>
                                                <option value="English">English</option>
                                            </select>
                                        </div>

                                        {qwenIsInstructionModel && (
                                            <>
                                                <div className="space-y-2">
                                                    <label className="block text-sm text-white/85">璇€熷€惧悜</label>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={qwenTTSSpeedInput}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[锛?]/g, ".");
                                                            if (!/^\d*(?:\.\d*)?$/.test(value)) return;
                                                            setQwenTTSSpeedInput(value);
                                                            const parsed = Number.parseFloat(value);
                                                            if (Number.isFinite(parsed)) {
                                                                setQwenTTSSpeed(Math.min(2, Math.max(0.5, parsed)));
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            const normalized = normalizeSpeedInput(qwenTTSSpeedInput, qwenTTSSpeed);
                                                            setQwenTTSSpeed(normalized);
                                                            setQwenTTSSpeedInput(String(normalized));
                                                        }}
                                                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm text-white/85">鑷劧璇█棰勮</label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {COSYVOICE_INSTRUCTION_PRESETS.map((preset) => {
                                                            const active = qwenTTSInstructions.trim() === preset.prompt;
                                                            return (
                                                                <button
                                                                    key={preset.id}
                                                                    type="button"
                                                                    onClick={() => setQwenTTSInstructions(preset.prompt)}
                                                                    className={cn(
                                                                        "rounded-xl border px-3 py-3 text-left transition-all",
                                                                        active
                                                                            ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                                                                            : "border-white/10 bg-black/10 text-white/70 hover:bg-white/10"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="text-sm">{preset.label}</div>
                                                                        <div className="text-[10px] text-white/40">{preset.description}</div>
                                                                    </div>
                                                                    <div className="mt-2 text-[11px] text-white/45 line-clamp-3">{preset.prompt}</div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-sm text-white/85">鑷劧璇█鎸囦护</label>
                                                    <textarea
                                                        rows={4}
                                                        value={qwenTTSInstructions}
                                                        onChange={(e) => setQwenTTSInstructions(e.target.value)}
                                                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none resize-none"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {!qwenIsInstructionModel && !qwenIsCloneModel && (
                                            <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-xs text-white/55">
                                                褰撳墠妯″瀷涓嶆敮鎸佽嚜鐒惰瑷€鎸囦护锛屼篃涓嶆敮鎸佸厠闅嗛煶鑹层€?
                                            </div>
                                        )}
                                    </div>
                                )}

                                {ttsProvider === "cosyvoice35plus" && (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 space-y-4">
                                        <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-xs text-white/55">
                                            杩欐槸 `鍏嬮殕闊宠壊 + 鑷劧璇█鎸囦护 + 纭閫焋 鐨勪簯绔ā寮忋€俙Plus` 鏇撮€傚悎鏈€缁堟垚鍝侊紝
                                            `Flash` 鏇撮€傚悎棰勮鍜岄绻侀噸鍚堟垚銆?
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm text-white/85">妯″瀷</label>
                                            <div className="space-y-2">
                                                {COSYVOICE_35_MODELS.map((model) => {
                                                    const active = cosyvoice35PlusModel === model.id;
                                                    return (
                                                        <button
                                                            key={model.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setCosyvoice35PlusModel(model.id);
                                                                setTTSTestResult(null);
                                                            }}
                                                            className={cn(
                                                                "w-full rounded-xl border px-3 py-3 text-left transition-all",
                                                                active
                                                                    ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                                                                    : "border-white/10 bg-black/10 text-white/70 hover:bg-white/10"
                                                            )}
                                                        >
                                                            <div className="text-sm">{model.label}</div>
                                                            <div className="mt-1 text-[11px] text-white/40">{model.id}</div>
                                                            <div className="mt-2 text-[11px] text-white/50">{model.description}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm text-white/85">浜戠鍏嬮殕闊宠壊 Profile</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {COSYVOICE_VOICE_PROFILES.map((profile) => {
                                                    const active = cosyvoice35PlusVoiceProfileId === profile.id;
                                                    return (
                                                        <button
                                                            key={profile.id}
                                                            type="button"
                                                            onClick={() => setCosyvoice35PlusVoiceProfileId(profile.id)}
                                                            className={cn(
                                                                "rounded-xl border px-3 py-3 text-left transition-all",
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
                                            <label className="block text-sm text-white/85">
                                                {cosyvoice35PlusModel === "cosyvoice-v3.5-flash" ? "Flash voice_id" : "Plus voice_id"}
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    cosyvoice35PlusModel === "cosyvoice-v3.5-flash"
                                                        ? cosyvoice35FlashVoiceId
                                                        : cosyvoice35PlusVoiceId
                                                }
                                                onChange={(e) => {
                                                    if (cosyvoice35PlusModel === "cosyvoice-v3.5-flash") {
                                                        setCosyvoice35FlashVoiceId(e.target.value);
                                                    } else {
                                                        setCosyvoice35PlusVoiceId(e.target.value);
                                                    }
                                                }}
                                                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className="block text-sm text-white/85">璇█鎻愮ず</label>
                                                <select
                                                    value={cosyvoice35PlusLanguageHint}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (isCosyVoice35PlusLanguageHint(value)) {
                                                            setCosyvoice35PlusLanguageHint(value);
                                                        }
                                                    }}
                                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none"
                                                >
                                                    <option value="zh">zh</option>
                                                    <option value="en">en</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-sm text-white/85">Language hint</label>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={cosyvoice35PlusSpeedInput}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/[锛?]/g, ".");
                                                        if (!/^\d*(?:\.\d*)?$/.test(value)) return;
                                                        setCosyvoice35PlusSpeedInput(value);
                                                        const parsed = Number.parseFloat(value);
                                                        if (Number.isFinite(parsed)) {
                                                            setCosyvoice35PlusSpeed(Math.min(2, Math.max(0.5, parsed)));
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        const normalized = normalizeSpeedInput(cosyvoice35PlusSpeedInput, cosyvoice35PlusSpeed);
                                                        setCosyvoice35PlusSpeed(normalized);
                                                        setCosyvoice35PlusSpeedInput(String(normalized));
                                                    }}
                                                    className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none"
                                                />
                                                <div className="text-xs text-white/40">鑼冨洿 0.5 - 2.0锛屾杩?0.05</div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm text-white/85">鑷劧璇█棰勮</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {COSYVOICE_INSTRUCTION_PRESETS.map((preset) => {
                                                    const active = cosyvoice35PlusInstruction.trim() === preset.prompt;
                                                    return (
                                                        <button
                                                            key={preset.id}
                                                            type="button"
                                                            onClick={() => setCosyvoice35PlusInstruction(preset.prompt)}
                                                            className={cn(
                                                                "rounded-xl border px-3 py-3 text-left transition-all",
                                                                active
                                                                    ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100"
                                                                    : "border-white/10 bg-black/10 text-white/70 hover:bg-white/10"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="text-sm">{preset.label}</div>
                                                                <div className="text-[10px] text-white/40">{preset.description}</div>
                                                            </div>
                                                            <div className="mt-2 text-[11px] text-white/45 line-clamp-3">{preset.prompt}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm text-white/85">鑷劧璇█鎸囦护</label>
                                            <textarea
                                                rows={4}
                                                value={cosyvoice35PlusInstruction}
                                                onChange={(e) => setCosyvoice35PlusInstruction(e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none resize-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {ttsProvider === "edge" && (
                                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm text-white/90">EdgeTTS 璇存槑</div>
                                                <div className="text-xs text-white/45 mt-1">
                                                    褰撳墠妯″紡涓嶉渶瑕侀澶栦簯绔弬鏁版垨鏈湴鏈嶅姟锛岀洿鎺ヤ娇鐢ㄦ祻瑙堝櫒渚ч粯璁ら摼璺€?
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/60">
                                                闆堕厤缃?
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-xs leading-6 text-white/55">
                                            濡傛灉浣犲彧鎯冲揩閫熻瘯鍚垨涓嶄緷璧?DashScope銆佹湰鍦?CosyVoice 鏈嶅姟锛屽彲浠ョ洿鎺ョ敤 EdgeTTS銆?
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm text-white/90">TTS connectivity test</div>
                                            <div className="text-xs text-white/45 mt-1">
                                                CosyVoice 浼氭鏌ユ湰鏈烘湇鍔★紝Qwen-TTS 浼氱敤鐭彞璋冪敤鐧剧偧鐢熸垚涓€娆°€?
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleTestTTSSettings}
                                            disabled={isTestingTTSSettings}
                                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isTestingTTSSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            <span>{isTestingTTSSettings ? "Testing..." : "Test connectivity"}</span>
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
                                    鍙栨秷
                                </button>
                                <button
                                    onClick={handleTestTTSSettings}
                                    disabled={isTestingTTSSettings}
                                    className="min-h-11 flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isTestingTTSSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{isTestingTTSSettings ? "Testing..." : "Test connectivity"}</span>
                                </button>
                                <button
                                    onClick={handleSaveTTSSettings}
                                    disabled={isSavingTTSSettings}
                                    className="col-span-2 min-h-12 flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 sm:col-span-1"
                                >
                                    {isSavingTTSSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{isSavingTTSSettings ? "淇濆瓨涓?.." : "淇濆瓨"}</span>
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
                                <h2 className="text-lg font-medium text-white/90">澹佺焊閫夋嫨</h2>
                                <button
                                    onClick={handleRandomWallpaper}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm text-white/80"
                                >
                                    <Shuffle className="w-4 h-4" />
                                    <span>闅忔満澹佺焊</span>
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
                                                        鉁?鍔ㄦ€?
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
                                                    鏃犻瑙?
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
                                <h2 className="text-lg font-medium text-white/90">娓呴櫎鍐ユ兂鏁版嵁</h2>
                            </div>

                            {/* Content */}
                            <div className="p-6 text-center">
                                <p className="text-white/60 text-sm mb-2">
                                    纭畾瑕佸垹闄ゆ墍鏈夊啣鎯宠褰曞悧锛?
                                </p>
                                <p className="text-orange-400/80 text-xs">
                                    鈿狅笍 姝ゆ搷浣滀笉鍙挙閿€锛岃幉鑺辫姳鍥篃灏嗘竻绌?
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm transition-colors"
                                >
                                    鍙栨秷
                                </button>
                                <button
                                    onClick={handleDeleteMeditationData}
                                    disabled={isDeleting}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white text-sm font-medium transition-all disabled:opacity-50"
                                >
                                    {isDeleting ? "鍒犻櫎涓?.." : "纭鍒犻櫎"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

