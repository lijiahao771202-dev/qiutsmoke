import { pipeline } from '@xenova/transformers';

// Singleton instance to prevent reloading capabilities on every request in dev
let embeddingPipeline: any = null;

export class EmbeddingService {
    static async getPipeline() {
        if (!embeddingPipeline) {
            console.log("[EmbeddingService] Initializing pipeline...");
            embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                quantized: false, // Use full precision for better quality if possible, or true for speed
            });
            console.log("[EmbeddingService] Pipeline ready.");
        }
        return embeddingPipeline;
    }

    static async generateEmbedding(text: string): Promise<number[]> {
        try {
            const pipe = await this.getPipeline();
            const result = await pipe(text, { pooling: 'mean', normalize: true });

            // Result is a tensor, we need to convert to array
            // transformers.js returns a Float32Array
            return Array.from(result.data);
        } catch (error) {
            console.error("[EmbeddingService] Error generating embedding:", error);
            throw error;
        }
    }
}
