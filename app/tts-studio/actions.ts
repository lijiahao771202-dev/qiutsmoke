"use server";

import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { ensureTables } from "@/lib/db";

export interface TTSCard {
    id: string;
    content: string;
    voice_id: string;
    rate: string;
    created_at: Date;
}

export async function createCard(data: { content: string; voiceId: string; rate: string }) {
    if (!data.content) throw new Error("Content is required");

    // Ensure table exists before insertion
    await ensureTables();

    await sql`
    INSERT INTO tts_cards (content, voice_id, rate)
    VALUES (${data.content}, ${data.voiceId}, ${data.rate})
  `;

    revalidatePath("/tts-studio");
}

export async function getCards(): Promise<TTSCard[]> {
    // Ensure tables exist before querying, to avoid first-run errors
    await ensureTables();

    const { rows } = await sql<TTSCard>`
      SELECT * FROM tts_cards 
      ORDER BY created_at DESC
    `;
    return rows;
}

export async function deleteCard(id: string) {
    await sql`DELETE FROM tts_cards WHERE id = ${id}`;
    revalidatePath("/tts-studio");
}
