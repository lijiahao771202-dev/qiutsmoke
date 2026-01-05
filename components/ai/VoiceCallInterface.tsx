"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff } from "lucide-react";
import { useMoodStore, MOOD_THEMES } from "@/lib/store/useMoodStore";
import { useVoiceRecognition } from "@/lib/hooks/useVoiceRecognition";
import { useEdgeTTS } from "@/lib/hooks/useEdgeTTS";

interface VoiceCallInterfaceProps {
    onClose: () => void;
    onSendMessage: (text: string) => Promise<string | void>; // Returns TTS text
}

type CallState = "idle" | "listening" | "thinking" | "speaking";

export function VoiceCallInterface({ onClose, onSendMessage }: VoiceCallInterfaceProps) {
    const { currentMood } = useMoodStore();
    const theme = MOOD_THEMES[currentMood];
    const [callState, setCallState] = useState<CallState>("idle");
    const [micVolume, setMicVolume] = useState(0);

    // Audio Analysis (Mock for now, real implementation would use AnalyserNode)
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (callState === "listening") {
            interval = setInterval(() => {
                // Random volume simulation for visual effect
                setMicVolume(Math.random() * 0.5 + 0.5);
            }, 100);
        } else {
            setMicVolume(0);
        }
        return () => clearInterval(interval);
    }, [callState]);

    const { play: playTTS, stop: stopTTS, isPlaying: isTTSPlaying } = useEdgeTTS();

    const handleSpeechResult = async (transcript: string) => {
        if (!transcript.trim()) return;

        setCallState("thinking");
        try {
            // Send to AI and get response text
            const responseText = await onSendMessage(transcript);

            if (responseText && typeof responseText === 'string') {
                setCallState("speaking");
                await playTTS({ text: responseText });
                // Note: playTTS is async but useEdgeTTS manages isPlaying state
            }
        } catch (e) {
            console.error("Voice interaction failed", e);
        } finally {
            // Check loop: if TTS finished, go back to listening?
            // For now, let's wait for TTS to finish using useEffect on isTTSPlaying
        }
    };

    const {
        startListening,
        stopListening,
        isListening,
        transcript,
        interimTranscript
    } = useVoiceRecognition({
        onResult: (result) => {
            // We wait for onEnd or silence logic usually, but here relies on `continuous: false`
            // which auto-stops on silence. The hook provides the final result here.
            handleSpeechResult(result);
        },
        onEnd: () => {
            // If we were listening and it stopped without result, maybe manual stop or timeout
            if (callState === 'listening') {
                // setCallState("idle"); 
            }
        }
    });

    // Proactive Empathy: Silence Detection
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const SILENCE_THRESHOLD_MS = 14000; // 14 seconds of silence triggers AI

    const resetSilenceTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        // Only start timer if we are listening or waiting
        if (callState === 'listening' || callState === 'idle') {
            silenceTimerRef.current = setTimeout(() => {
                handleSilenceTrigger();
            }, SILENCE_THRESHOLD_MS);
        }
    };

    const handleSilenceTrigger = async () => {
        // Prevent trigger if already speaking or thinking
        if (callState !== 'listening' && callState !== 'idle') return;

        console.log("Silence detected, triggering proactive empathy...");
        // Visual cue before speaking
        setCallState("thinking");

        try {
            // Send special system event to AI
            const responseText = await onSendMessage("[SYSTEM_EVENT: USER_SILENCE]");

            if (responseText && typeof responseText === 'string') {
                setCallState("speaking");
                await playTTS({ text: responseText });
            }
        } catch (e) {
            console.error("Proactive trigger failed", e);
            setCallState("listening"); // Revert to listening on error
        }
    };

    // Reset timer on state changes
    useEffect(() => {
        if (callState === 'listening' || callState === 'idle') {
            resetSilenceTimer();
        } else {
            // Clear timer if thinking or speaking
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        }
        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, [callState]);

    // Reset timer when user speaks (interim results)
    useEffect(() => {
        if (isListening && (interimTranscript || transcript)) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        } else if (isListening && !interimTranscript && !transcript) {
            resetSilenceTimer();
        }
    }, [isListening, interimTranscript, transcript]);


    // Combined Effect for Loops
    useEffect(() => {
        // Auto-start listening when entering or after speaking
        if (callState === "idle") {
            startListening();
            setCallState("listening");
        }
    }, [callState, startListening]);

    useEffect(() => {
        if (callState === "speaking" && !isTTSPlaying) {
            // TTS finished -> Start listening again
            setCallState("idle");
        }
    }, [isTTSPlaying, callState]);

    // Initial Start
    useEffect(() => {
        startListening();
        setCallState("listening");
        return () => {
            stopListening();
            stopTTS();
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, []);


    // Visual Parameters based on State
    const orbVariants = {
        idle: { scale: 1, text: "Wait..." },
        listening: { scale: 1 + micVolume * 0.3, transition: { duration: 0.1 } },
        thinking: { rotate: 360, scale: 0.8, transition: { repeat: Infinity, duration: 1, ease: 'linear' } },
        speaking: { scale: [1, 1.2, 1], transition: { repeat: Infinity, duration: 2, ease: "easeInOut" } }
    };

    // Portal Logic
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    // Use Portal to break out of layout (covers NavBar/UserProfile)
    const { createPortal } = require("react-dom");

    return createPortal(
        <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/40 backdrop-blur-3xl`}
        >
            {/* Dynamic Gradient Background Overlay */}
            <div className={`absolute inset-0 opacity-30 ${theme.bg} mix-blend-overlay pointer-events-none`} />

            {/* Living Orb */}
            <div className="relative flex items-center justify-center w-64 h-64">
                {/* Core Core */}
                <motion.div
                    variants={orbVariants}
                    animate={callState}
                    className={`relative w-32 h-32 rounded-full bg-gradient-to-tr ${theme.primary} ${theme.secondary} shadow-[0_0_100px_rgba(255,255,255,0.3)] backdrop-blur-md border border-white/20`}
                >
                    {/* Inner Light */}
                    <div className={`absolute inset-0 rounded-full bg-white/30 blur-xl ${callState === 'thinking' ? 'animate-pulse' : ''}`} />
                </motion.div>

                {/* Ripple Effect (Listening) */}
                {callState === 'listening' && (
                    <motion.div
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-0 rounded-full border border-white/10"
                    />
                )}
            </div>

            {/* Status Text & Transcript */}
            <div className="absolute bottom-32 w-full px-8 text-center space-y-4">
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-white/60 text-lg font-medium tracking-wide"
                >
                    {callState === 'listening' ? "Listening..." :
                        callState === 'thinking' ? "Thinking..." :
                            callState === 'speaking' ? "Speaking..." : ""}
                </motion.p>

                {interimTranscript && (
                    <p className="text-white/90 text-xl font-light">{interimTranscript}</p>
                )}
            </div>

            {/* Controls */}
            <motion.div
                className="absolute bottom-12"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
            >
                <button
                    onClick={onClose}
                    className="flex items-center justify-center w-16 h-16 rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 transition-colors"
                >
                    <PhoneOff size={28} />
                </button>
            </motion.div>
        </motion.div>,
        document.body
    );
}
