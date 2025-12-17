export { };

declare global {
    interface Window {
        electron: {
            generateTTS: (text: string, voice: string, rate: string) => Promise<string>;
            generateMeditation: (prompt: string, apiKey: string) => void;
            onMeditationChunk: (callback: (chunk: string) => void) => void;
            onMeditationError: (callback: (error: string) => void) => void;
            onMeditationDone: (callback: () => void) => void;
            removeMeditationListeners: () => void;
        };
    }
}
