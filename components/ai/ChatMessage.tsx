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
}

interface ChatMessageProps {
    message: Message;
    isTyping?: boolean;
}

export function ChatMessage({ message, isTyping }: ChatMessageProps) {
    const isUser = message.role === "user";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
                "flex w-full mb-4",
                isUser ? "justify-end" : "justify-start"
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
        </motion.div>
    );
}
