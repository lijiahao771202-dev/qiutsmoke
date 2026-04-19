export { };

declare global {
    interface ElectronMeditationPayload {
        prompt: string;
        apiKey?: string;
        provider?: "deepseek" | "nvidia";
        model?: string;
        systemPrompt?: string;
        duration?: number;
        guidanceLevel?: "light" | "medium" | "heavy";
    }

    interface Window {
        electron: {
            generateTTS: (text: string, voice: string, rate: string) => Promise<string>;
            generateMeditation: (payload: ElectronMeditationPayload) => void;
            onMeditationChunk: (callback: (chunk: string) => void) => void;
            onMeditationError: (callback: (error: string) => void) => void;
            onMeditationDone: (callback: () => void) => void;
            removeMeditationListeners: () => void;
            stopMeditation: () => void;
        };
    }
}
