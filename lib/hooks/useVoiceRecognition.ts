"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseVoiceRecognitionProps {
    onResult?: (transcript: string) => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
    language?: string;
}

export function useVoiceRecognition({
    onResult,
    onEnd,
    onError,
    language = "zh-CN"
}: UseVoiceRecognitionProps = {}) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false; // We want single interactions
                recognition.interimResults = true;
                recognition.lang = language;

                recognition.onstart = () => {
                    setIsListening(true);
                };

                recognition.onend = () => {
                    setIsListening(false);
                    if (onEnd) onEnd();
                };

                recognition.onresult = (event: any) => {
                    let finalTrans = "";
                    let interimTrans = "";

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTrans += event.results[i][0].transcript;
                        } else {
                            interimTrans += event.results[i][0].transcript;
                        }
                    }

                    if (finalTrans) {
                        setTranscript(finalTrans);
                        if (onResult) onResult(finalTrans);
                    }
                    setInterimTranscript(interimTrans);
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech Recognition Error:", event.error);
                    if (onError) onError(event.error);
                    setIsListening(false);
                };

                recognitionRef.current = recognition;
            }
        }
    }, [language, onResult, onEnd, onError]);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                setTranscript("");
                setInterimTranscript("");
                recognitionRef.current.start();
            } catch (e) {
                console.error("Failed to start recognition:", e);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.error("Failed to stop recognition:", e);
            }
        }
    }, [isListening]);

    return {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        isSupported: typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    };
}
