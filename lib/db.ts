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
    deepseek_thinking_enabled boolean,
    deepseek_reasoning_effort text,
    tts_provider text,
    cosyvoice_speed double precision,
    cosyvoice_instruction text,
    cosyvoice_seed integer,
    cosyvoice_voice_id text,
    mimo_tts_model text,
    mimo_tts_voice text,
    mimo_tts_instruction text,
    mimo_tts_voice_design_prompt text,
    mimo_tts_clone_voice_url text,
    qwen_tts_model text,
    qwen_tts_voice text,
    qwen_tts_voice_mode text,
    qwen_tts_clone_voice_id text,
    qwen_tts_clone_voice_cloud_id text,
    qwen_tts_speed double precision,
    qwen_tts_language_type text,
    qwen_tts_instructions text,
    cosyvoice_35_plus_model text,
    cosyvoice_35_plus_voice_id text,
    cosyvoice_35_flash_voice_id text,
    cosyvoice_35_plus_voice_profile_id text,
    cosyvoice_35_plus_speed double precision,
    cosyvoice_35_plus_instruction text,
    cosyvoice_35_plus_language_hint text,
    updated_at timestamptz DEFAULT now()
  )`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_provider text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_model text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS deepseek_thinking_enabled boolean`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS deepseek_reasoning_effort text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS tts_provider text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_speed double precision`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_instruction text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_seed integer`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_voice_id text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS mimo_tts_model text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS mimo_tts_voice text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS mimo_tts_instruction text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS mimo_tts_voice_design_prompt text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS mimo_tts_clone_voice_url text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS qwen_tts_model text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS qwen_tts_voice text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS qwen_tts_voice_mode text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS qwen_tts_clone_voice_id text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS qwen_tts_clone_voice_cloud_id text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS qwen_tts_speed double precision`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS qwen_tts_language_type text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS qwen_tts_instructions text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_35_plus_model text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_35_plus_voice_id text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_35_flash_voice_id text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_35_plus_voice_profile_id text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_35_plus_speed double precision`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_35_plus_instruction text`;
  await sql`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cosyvoice_35_plus_language_hint text`;
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
