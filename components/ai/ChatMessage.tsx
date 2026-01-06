"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RecommendationCard, RecommendationProps } from "./RecommendationCard";
import { BreathingBubble } from "./BreathingBubble";

export interface Message {
    id: string;
    role: "user" | "ai";
    content: string;
    type?: "text" | "card" | "breathing";
    cardData?: RecommendationProps;
    createdAt: number;
    quickReplies?: string[]; // 快速回复选项
}

interface ChatMessageProps {
    message: Message;
    isTyping?: boolean;
    onQuickReply?: (text: string) => void; // 快速回复点击回调
}

export function ChatMessage({ message, isTyping, onQuickReply }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
                "flex flex-col w-full mb-4",
                isUser ? "items-end" : "items-start"
            )}
        >
            {/* Bubble Container */}
            <div
                className={cn(
                    "max-w-[85%] rounded-[1.25rem] text-[0.95rem] leading-[1.6] transition-all shadow-sm",
                    isUser
                        ? "bg-[#6B5B95] text-white px-5 py-3.5 rounded-br-sm shadow-[#6B5B95]/20" // User: Muted warm purple
                        : message.type === 'card'
                            ? "bg-transparent p-0 border-none shadow-none"
                            : "bg-white/80 dark:bg-[#292524]/90 backdrop-blur-md text-[#44403C] dark:text-[#E7E5E4] px-6 py-4 rounded-bl-none border border-white/50 dark:border-white/5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]" // AI: Ceramic White
                )}
            >
                {/* Text Content */}
                {message.type !== 'card' && (
                    <>
                        {message.content}

                        {/* Typing Cursor */}
                        {message.role === "ai" && isTyping && (
                            <span className="inline-block w-1.5 h-1.5 ml-2 rounded-full bg-[#FFB74D] animate-ping" />
                        )}
                    </>
                )}

                {/* Card Content */}
                {message.type === 'card' && message.cardData && (
                    <div className="flex flex-col items-start">
                        {message.content && <p className="mb-2 text-white/80 text-sm px-2">{message.content}</p>}
                        <RecommendationCard {...message.cardData} />
                    </div>
                )}

                {/* Micro-Breathing Bubble */}
                {message.type === 'breathing' && (
                    <div className="flex flex-col items-start">
                        {message.content && <p className="mb-2 text-white/80 text-sm px-2">{message.content}</p>}
                        <BreathingBubble />
                    </div>
                )}
            </div>

            {/* 🎯 Quick Reply Buttons - 快速回复按钮 */}
            {message.quickReplies && message.quickReplies.length > 0 && onQuickReply && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap gap-2 mt-3 max-w-[90%]"
                >
                    {message.quickReplies.map((reply, index) => (
                        <motion.button
                            key={index}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onQuickReply(reply)}
                            className="px-4 py-2.5 bg-white/70 dark:bg-[#292524]/70 backdrop-blur-md 
                                       text-[#44403C] dark:text-[#E7E5E4] text-sm font-medium
                                       rounded-full border border-white/50 dark:border-white/10
                                       shadow-[0_2px_8px_rgba(0,0,0,0.04)]
                                       hover:bg-white/90 dark:hover:bg-[#292524]/90
                                       transition-all duration-200"
                        >
                            {reply}
                        </motion.button>
                    ))}
                </motion.div>
            )}
        </motion.div>
    );
}
