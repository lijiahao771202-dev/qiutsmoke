"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, X, Volume2, VolumeX, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChatMessage, Message } from "./ChatMessage";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { useEdgeTTS } from "@/lib/hooks/useEdgeTTS";
import { memoryService } from "@/lib/services/memory";
import { useMeditationCore } from "@/lib/hooks/useMeditationCore";
import { useMoodStore, MOOD_THEMES } from "@/lib/store/useMoodStore";
import ImmersiveMeditationPlayer from "@/components/meditation/ImmersiveMeditationPlayer";
import { VoiceCallInterface } from "@/components/ai/VoiceCallInterface";

// 🎯 快速回复选项 - Quick Reply Options
const QUICK_REPLY_OPTIONS = [
    "😌 今天感觉还不错",
    "😔 有点焦虑",
    "😴 需要放松一下",
    "🧘 想做冥想练习"
];

export default function AIChatInterface() {
    const router = useRouter();
    const { triggerLight, triggerMedium, triggerHeavy } = useHaptics();
    const { play: playTTS, stop: stopTTS, isPlaying: isTTSPlaying } = useEdgeTTS();

    const [inputText, setInputText] = useState("");
    const [userInputEnabled, setUserInputEnabled] = useState(true);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "ai",
            content: "你好，我是你的冥想伙伴小岛🏝️ 今天感觉怎么样？",
            createdAt: Date.now(),
        },
    ]);

    // Player State
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [currentPractice, setCurrentPractice] = useState<{ title: string, duration: number } | null>(null);

    // Auto-scroll
    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Initial Greeting with TTS & Memory
    useEffect(() => {
        // Load Memory
        const profile = memoryService.getProfile();
        let greeting = "你好，我是你的冥想伙伴小岛🏝️ 今天感觉怎么样？";

        if (profile.name) {
            const hour = new Date().getHours();
            const timeOfDay = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
            greeting = `${timeOfDay}，${profile.name}。`;

            if (profile.emotionalState) {
                greeting += `上次你似乎感到${profile.emotionalState}，现在好些了吗？`;
            } else {
                greeting += "今天感觉怎么样？";
            }
        }

        // Update initial message with quick replies
        setMessages([{
            id: "welcome",
            role: "ai",
            content: greeting,
            createdAt: Date.now(),
            quickReplies: QUICK_REPLY_OPTIONS, // ✨ 添加快速回复按钮
        }]);

        // Small delay for effect
        const timer = setTimeout(() => {
            playTTS({ text: greeting });
        }, 800);
        return () => clearTimeout(timer);
    }, []); // Run once

    // Core Meditation Logic
    const {
        isPlaying: isMeditationPlaying,
        isGenerating: isMeditationGenerating,
        text: meditationText,
        currentSpokenText,
        generateMeditation,
        stopSession,
        togglePlay: toggleMeditationPlay,
        progress: meditationProgress,
        elapsedSeconds
    } = useMeditationCore({
        onSessionEnd: () => setIsPlayerOpen(false)
    });



    const [userId, setUserId] = useState<string | null>(null);

    // Auth Check
    useEffect(() => {
        const checkAuth = async () => {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        checkAuth();
    }, []);

    // 🚀 Session Tracking
    const hasStartedPractice = useRef(false);

    // 🔄 Shared Logic: Send Message to AI & Get Response
    // hiddenContext: Special system instruction not shown in UI
    const sendMessageToAI = async (text: string | null, hiddenContext?: string): Promise<string | void> => {
        let currentMessages = [...messages];

        // 1. Add User Message (Only if text exists)
        if (text) {
            const userMsg: Message = {
                id: Date.now().toString(),
                role: "user",
                content: text,
                createdAt: Date.now(),
            };
            currentMessages = [...messages, userMsg];
            setMessages(prev => [...prev, userMsg]);
        }

        // 2. Add AI Placeholder
        const aiMsgId = (Date.now() + 1).toString();
        const aiMsg: Message = {
            id: aiMsgId,
            role: "ai",
            content: "",
            createdAt: Date.now(),
        };
        setMessages(prev => [...prev, aiMsg]);

        // 3. Call API
        try {
            // Prepare payload
            const apiMessages = currentMessages.map(m => ({
                role: m.role,
                content: m.role === 'ai' ? m.content : m.content
            })).filter(m => m.content);

            // Inject hidden context if provided
            if (hiddenContext) {
                apiMessages.push({ role: 'system', content: hiddenContext });
            }

            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    userProfile: memoryService.getProfile(),
                    userId: userId
                }),
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                // Update UI Streaming
                setMessages(prev => prev.map(m =>
                    m.id === aiMsgId ? { ...m, content: fullText.split("|||JSON_START|||")[0] } : m
                ));
            }

            // 4. Process Final Result
            const parts = fullText.split("|||JSON_START|||");
            const spokenText = parts[0];
            const jsonBlock = parts[1] ? parts[1].split("|||JSON_END|||")[0] : null;

            // Handle Mood/JSON (Same logic as before)
            if (jsonBlock) {
                try {
                    const data = JSON.parse(jsonBlock);

                    // 🎯 处理动态快速回复
                    if (data.quickReplies && Array.isArray(data.quickReplies)) {
                        setMessages(prev => prev.map(m =>
                            m.id === aiMsgId ? { ...m, quickReplies: data.quickReplies } : m
                        ));
                    }

                    if (data.recommendation) {
                        setTimeout(() => {
                            const cardMsg: Message = {
                                id: (Date.now() + 2).toString(),
                                role: "ai",
                                content: "",
                                type: "card",
                                cardData: { ...data.recommendation, onClick: () => handleStartPractice(data.recommendation) },
                                createdAt: Date.now(),
                                // ❗ 卡片不需要快速回复按钮
                            };
                            setMessages(prev => [...prev, cardMsg]);
                            triggerHeavy();
                        }, 500);
                    } else if (data.type === 'breathing') {
                        setTimeout(() => {
                            const breathingMsg: Message = {
                                id: (Date.now() + 3).toString(),
                                role: "ai",
                                content: "",
                                type: "breathing",
                                createdAt: Date.now(),
                            }
                            setMessages(prev => [...prev, breathingMsg]);
                            triggerMedium();
                        }, 300);
                    }
                    if (data.mood && ['calm', 'happy', 'sad', 'anxious', 'focus'].includes(data.mood)) {
                        setMood(data.mood);
                    }
                } catch (e) {
                    console.error("JSON Parse Error", e);
                }
            }


            return spokenText.trim(); // Return text for Voice Mode TTS

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, content: "抱歉，我好像断线了..." } : m
            ));
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;
        stopTTS();
        triggerLight();

        const text = inputText;
        setInputText("");
        setUserInputEnabled(false);

        // Analyze basic emotion for memory (legacy simple logic)
        const lowerInput = text.toLowerCase();
        if (lowerInput.includes("累") || lowerInput.includes("烦") || lowerInput.includes("压力")) {
            memoryService.updateProfile({ emotionalState: "压力大" });
        }

        const responseText = await sendMessageToAI(text);

        // Only play TTS if in Chat Mode (Voice Mode handles its own TTS)
        if (responseText && !isPlayerOpen) {
            playTTS({ text: responseText });
        }

        setUserInputEnabled(true);
    };

    // 🚀 Start Real Generation Logic
    const handleStartPractice = (practice: any) => {
        stopTTS(); // Stop chat TTS
        setCurrentPractice(practice);
        setIsPlayerOpen(true);
        hasStartedPractice.current = true; // Mark session as active/dirty

        // Generate with real prompt logic
        // Construct a prompt similar to meditation page default logic
        const prompt = `创建一个关于"${practice.title}"的引导冥想脚本。${practice.reason ? `针对：${practice.reason}。` : ""}请用中文回复。`;

        generateMeditation(prompt, practice.duration || 5, "medium");
    };

    const handleClose = () => {
        stopTTS();
        stopSession(); // Stop meditation if playing
        triggerMedium();

        // ✨ Proactive Follow-up Logic
        if (hasStartedPractice.current && currentPractice) {
            hasStartedPractice.current = false; // Reset

            // Trigger hidden context after a small delay to allow UI to settle
            setTimeout(() => {
                const hiddenPrompt = `用户刚刚结束了冥想练习 '${currentPractice.title}'。请温柔地询问他们现在的感受，用中文回复，不要超过一句话。`;
                sendMessageToAI(null, hiddenPrompt).then((text) => {
                    if (text && !isPlayerOpen) playTTS({ text });
                });
            }, 1000);
        }

        setIsPlayerOpen(false);
        router.push("/dashboard");
    };

    const { currentMood, setMood } = useMoodStore();
    const theme = MOOD_THEMES[currentMood];

    const [isVoiceMode, setIsVoiceMode] = useState(false);

    return (
        // 根容器：使用 h-screen 和 flex 确保布局正确
        <div className={`h-screen w-screen overflow-hidden ${theme.bg} text-white font-sans selection:bg-teal-500/30 transition-colors duration-1000 flex flex-col`}>

            {/* 🎙️ Full Screen Voice Interface */}
            <AnimatePresence>
                {isVoiceMode && (
                    <VoiceCallInterface
                        onClose={() => setIsVoiceMode(false)}
                        onSendMessage={sendMessageToAI}
                    />
                )}
            </AnimatePresence>

            {/* 🌅 Emotional Atmosphere Background - 绝对定位背景层 */}
            <div className={`fixed inset-0 z-0 ${theme.bg} dark:bg-[#1C1917] transition-colors duration-1000 pointer-events-none`}>
                {/* Primary Mood Glow */}
                <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.6, 0.7, 0.6],
                        x: [0, 10, 0],
                        y: [0, -10, 0]
                    }}
                    transition={{ duration: 20 / theme.speed, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute top-[-10%] left-[-10%] w-[80vw] h-[80vw] rounded-full bg-gradient-to-br ${theme.primary} blur-[120px] transition-all duration-1000`}
                />

                {/* Secondary Mood Glow */}
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.4, 0.5, 0.4],
                        x: [0, -15, 0],
                    }}
                    transition={{ duration: 25 / theme.speed, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className={`absolute bottom-[-10%] right-[-20%] w-[90vw] h-[90vw] rounded-full bg-gradient-to-br ${theme.secondary} blur-[100px] transition-all duration-1000`}
                />

                {/* Subtle Grain Overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.95\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
            </div>

            {/* Top Navigation - 固定高度，不允许缩放 */}
            <div className="relative z-10 flex justify-between items-center px-4 pt-12 pb-2 shrink-0">
                <div className="flex items-center gap-3">
                    {/* Status Indicator: Breathing Dot instead of Bars */}
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${isTTSPlaying ? "bg-[#FFB74D] animate-ping" : "bg-[#D1D5DB]"}`} />
                    <span className="text-sm font-medium tracking-wide text-[#78716C] dark:text-[#A8A29E]">
                        {isTTSPlaying ? "Speaking..." : " 小岛 · 倾听中"}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* 🎙️ Voice Mode Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsVoiceMode(true)}
                        className="p-2 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 backdrop-blur-md border border-rose-500/20 transition-colors shadow-sm"
                    >
                        <Phone size={20} strokeWidth={2} />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleClose}
                        className="p-2 rounded-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-white/5 text-[#57534E] dark:text-[#D6D3D1] hover:bg-white/60 transition-colors shadow-sm"
                    >
                        <X size={20} strokeWidth={2} />
                    </motion.button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="relative z-10 flex-1 overflow-y-auto px-6 scrollbar-hide">
                <div className="flex flex-col justify-end min-h-full pb-4">
                    {messages.map((msg, index) => {
                        // 🎯 只在最新的非卡片消息上显示快速回复
                        const isLatestMessage = index === messages.length - 1;
                        const shouldShowQuickReplies = isLatestMessage && msg.type !== 'card' && msg.type !== 'breathing';

                        return (
                            <ChatMessage
                                key={msg.id}
                                message={{
                                    ...msg,
                                    // 只有最新消息才显示 quickReplies
                                    quickReplies: shouldShowQuickReplies ? msg.quickReplies : undefined
                                }}
                                isTyping={msg.role === 'ai' && isLatestMessage && !msg.type}
                                onQuickReply={(text) => {
                                    // 🎯 快速回复点击处理
                                    // 1. 移除当前消息的快速回复按钮
                                    setMessages(prev => prev.map(m =>
                                        m.id === msg.id ? { ...m, quickReplies: undefined } : m
                                    ));

                                    // 2. 特殊处理：如果点击"开始练习"，直接启动练习
                                    if (text.includes('开始练习') || text.includes('开始')) {
                                        // 查找最近的卡片并触发 onClick
                                        const lastCardMsg = [...messages].reverse().find(m => m.type === 'card' && m.cardData?.onClick);
                                        if (lastCardMsg?.cardData?.onClick) {
                                            lastCardMsg.cardData.onClick();
                                            triggerMedium();
                                            return;
                                        }
                                    }

                                    // 3. 其他情况：发送消息
                                    sendMessageToAI(text);
                                    triggerLight();
                                }}
                            />
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area - Floating Capsule */}
            <div className="relative z-10 px-4 pb-8 shrink-0">
                <div
                    className="relative flex items-center gap-2 p-1.5 bg-white/60 dark:bg-[#292524]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
                >
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder={userInputEnabled ? "告诉我有心事..." : "正在倾听..."}
                        disabled={!userInputEnabled}
                        className="flex-1 bg-transparent border-none rounded-full px-5 py-3.5 text-[#44403C] dark:text-[#E7E5E4] placeholder-[#A8A29E] focus:outline-none focus:ring-0 text-base"
                    />

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 pr-1">
                        <motion.button
                            whileHover={{ scale: 1.05, backgroundColor: "rgba(0,0,0,0.05)" }}
                            whileTap={{ scale: 0.95 }}
                            className="p-3 rounded-full text-[#78716C] dark:text-[#A8A29E] hover:text-[#57534E] transition-colors"
                        >
                            <Mic size={20} />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSendMessage}
                            disabled={!inputText.trim() || !userInputEnabled}
                            className={`p-3 rounded-full transition-all duration-300 shadow-sm ${inputText.trim()
                                ? "bg-[#FFB74D] text-white shadow-[#FFB74D]/30"
                                : "bg-[#E5E5E5] dark:bg-[#44403C] text-[#A3A3A3]"
                                }`}
                        >
                            <Send size={18} className={inputText ? "ml-0.5" : ""} strokeWidth={2.5} />
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Immersive Player Overlay */}
            <ImmersiveMeditationPlayer
                isOpen={isPlayerOpen}
                title={currentPractice?.title || "Meditation"}
                text={currentSpokenText}
                fullText={meditationText}
                isPlaying={isMeditationPlaying}
                isBuffering={isMeditationGenerating}
                onPlayPause={toggleMeditationPlay}
                onClose={() => {
                    stopSession();
                    setIsPlayerOpen(false);
                }}
                queueCurrent={meditationProgress.current}
                queueTotal={meditationProgress.total}
                elapsedSeconds={elapsedSeconds}
            />
        </div>
    );
}
