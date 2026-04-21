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
    ai_provider text,
    ai_model text,
    tts_provider text,
    cosyvoice_speed double precision,
    cosyvoice_instruction text,
    cosyvoice_seed integer,
    updated_at timestamptz DEFAULT now()
  )`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_provider text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_model text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS tts_provider text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_speed double precision`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_instruction text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_seed integer`;
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
