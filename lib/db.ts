import { sql } from "@vercel/postgres";

export function hasDb() {
  return Boolean(
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_HOST
  );
}
export async function ensureTables() {
  await sql`CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, created_at timestamptz DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS user_settings (
    user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    system_prompt text,
    quit_date date,
    updated_at timestamptz DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS user_prompts (
    user_id text REFERENCES users(id) ON DELETE CASCADE,
    topic_id text,
    prompt text,
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, topic_id)
  )`;

  await sql`CREATE TABLE IF NOT EXISTS tts_cards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text,
    content text NOT NULL,
    voice_id text NOT NULL,
    rate text DEFAULT '0%',
    created_at timestamptz DEFAULT now()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS meditation_topics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    prompt text NOT NULL,
    icon_name text DEFAULT 'wind',
    color_from text DEFAULT 'rose-400',
    color_to text DEFAULT 'rose-600',
    created_at timestamptz DEFAULT now()
  )`;

}
