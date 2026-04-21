export { };

declare global {
    interface ElectronTTSRequest {
        text: string;
        provider: "edge" | "cosyvoice";
        voice?: string;
        rate?: string;
        cosyvoiceSpeed?: number;
        cosyvoiceInstruction?: string;
        cosyvoiceSeed?: number;
    }

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
            generateTTS: (payload: ElectronTTSRequest) => Promise<string>;
            generateMeditation: (payload: ElectronMeditationPayload) => void;
            onMeditationChunk: (callback: (chunk: string) => void) => void;
            onMeditationError: (callback: (error: string) => void) => void;
            onMeditationDone: (callback: () => void) => void;
            removeMeditationListeners: () => void;
            stopMeditation: () => void;
        };
    }
}
