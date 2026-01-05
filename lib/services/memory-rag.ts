import { createClient } from '@/lib/supabase/server';
import { EmbeddingService } from './embedding';

interface Memory {
    id: string;
    content: string;
    similarity?: number;
    created_at: string;
    metadata?: any;
}

export class MemoryService {
    /**
     * Add a new memory for the user
     */
    static async addMemory(userId: string, content: string, type: 'summary' | 'fact' | 'conversation' = 'conversation', metadata: any = {}) {
        try {
            console.log(`[MemoryService] Generating embedding for: "${content.substring(0, 50)}..."`);
            const embedding = await EmbeddingService.generateEmbedding(content);

            const supabase = await createClient();

            const { error } = await supabase.from('memories').insert({
                user_id: userId,
                content: content,
                embedding: embedding,
                type: type,
                metadata: metadata
            });

            if (error) {
                console.error("[MemoryService] Supabase insert error:", error);
                throw error;
            }

            console.log("[MemoryService] Memory saved successfully.");
            return true;
        } catch (error) {
            console.error("[MemoryService] Failed to add memory:", error);
            // Don't block the chat flow if memory fails
            return false;
        }
    }

    /**
     * Search for relevant memories
     */
    static async searchMemories(userId: string, query: string, limit: number = 3): Promise<Memory[]> {
        try {
            const embedding = await EmbeddingService.generateEmbedding(query);
            const supabase = await createClient();

            // Call the match_memories RPC function
            const { data, error } = await supabase.rpc('match_memories', {
                query_embedding: embedding,
                match_threshold: 0.3, // Adjust threshold as needed
                match_count: limit,
                msg_user_id: userId
            });

            if (error) {
                console.error("[MemoryService] Vector search error:", error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error("[MemoryService] Failed to search memories:", error);
            return [];
        }
    }

    /**
     * Get recent context (e.g. last few summaries)
     * Useful for cold start
     */
    static async getRecentMemories(userId: string, limit: number = 5): Promise<Memory[]> {
        try {
            const supabase = await createClient();

            const { data, error } = await supabase
                .from('memories')
                .select('id, content, created_at, metadata')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error("[MemoryService] Recent fetch error:", error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error("[MemoryService] Failed to get recent memories:", error);
            return [];
        }
    }
}
