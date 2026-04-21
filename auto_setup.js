const fs = require('fs');

const ref = 'pcevqfegtkkwodmiwgwa';
const token = 'sbp_154c5a16d292a4d94516c455f3f5dfe401752744';
const newUrl = 'https://pcevqfegtkkwodmiwgwa.supabase.co';
const newServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZXZxZmVndGtrd29kbWl3Z3dhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc3NjU2NiwiZXhwIjoyMDkyMzUyNTY2fQ.rY6O7sOg6qk2NOgiFyLV8QC6nP8a9v3ONUjPy2iY9BY';

const sql = `
-- 1. 危险时段表
CREATE TABLE IF NOT EXISTS user_danger_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    time_slot TIME NOT NULL,
    label TEXT DEFAULT '',
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 推送订阅表
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    subscription JSONB NOT NULL,
    reminder_times TEXT[] DEFAULT ARRAY['08:00'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 声波卡片表
CREATE TABLE IF NOT EXISTS tts_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    title TEXT,
    content TEXT NOT NULL,
    voice_id TEXT NOT NULL,
    rate TEXT DEFAULT '0%',
    guidance_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 冥想主题表
CREATE TABLE IF NOT EXISTS meditation_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    icon_name TEXT DEFAULT 'wind',
    color_from TEXT DEFAULT 'rose-400',
    color_to TEXT DEFAULT 'rose-600',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 冥想会话记录表
CREATE TABLE IF NOT EXISTS meditation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    topic_id UUID REFERENCES meditation_topics(id) ON DELETE SET NULL,
    duration_seconds INTEGER NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 6. 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY,
    system_prompt TEXT,
    quit_date DATE,
    ai_provider TEXT,
    ai_model TEXT,
    tts_provider TEXT,
    cosyvoice_speed DOUBLE PRECISION,
    cosyvoice_instruction TEXT,
    cosyvoice_seed INTEGER,
    cosyvoice_voice_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 开启安全规则并赋予公网读取权限
ALTER TABLE tts_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE meditation_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read TTS Cards" ON tts_cards FOR SELECT USING (true);
CREATE POLICY "Public Read Topics" ON meditation_topics FOR SELECT USING (true);
`;

async function main() {
    console.log("Creating tables...");
    const res = await fetch(`https://api.supabase.com/pg-meta/${ref}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });
    
    if (!res.ok) {
        console.error("SQL Error:", await res.text());
        return;
    }
    console.log("Tables created successfully!");
    
    console.log("Uploading local mock_cards.json to tts_cards...");
    const mockCards = JSON.parse(fs.readFileSync('mock_cards.json', 'utf8'));
    
    // Clean data for insertion (e.g. remove null user_id if we want, or adjust)
    const payload = mockCards.map(c => ({
        id: c.id,
        title: c.title,
        content: c.content,
        voice_id: c.voice_id || 'zh-CN-XiaoxiaoNeural',
        rate: c.rate || '0%',
        created_at: c.created_at || new Date().toISOString()
    }));
    
    const insertRes = await fetch(`${newUrl}/rest/v1/tts_cards`, {
        method: 'POST',
        headers: {
            'apikey': newServiceKey,
            'Authorization': `Bearer ${newServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
    });
    
    if (!insertRes.ok) {
        console.error("Insert Error:", await insertRes.text());
    } else {
        console.log(`Successfully inserted ${payload.length} records into tts_cards!`);
    }
}

main();
