-- 智能正念提醒系统 - Supabase 迁移脚本
-- 运行方式：在 Supabase Dashboard > SQL Editor 中执行
-- 1. 用户高危时段配置表
CREATE TABLE IF NOT EXISTS user_danger_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    time_slot TIME NOT NULL,
    -- 如 "14:00:00"
    label TEXT DEFAULT '',
    -- 如 "饭后"、"压力大时"
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 创建索引
CREATE INDEX IF NOT EXISTS idx_danger_times_user_id ON user_danger_times(user_id);
-- RLS 策略
ALTER TABLE user_danger_times ENABLE ROW LEVEL SECURITY;
-- 用户只能管理自己的高危时段
CREATE POLICY "Users can view own danger times" ON user_danger_times FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own danger times" ON user_danger_times FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own danger times" ON user_danger_times FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own danger times" ON user_danger_times FOR DELETE USING (auth.uid() = user_id);
-- 2. 扩展 push_subscriptions 表（如果需要多时间段支持）
-- 注意：只有表存在时才执行
DO $$ BEGIN IF EXISTS (
    SELECT
    FROM information_schema.tables
    WHERE table_name = 'push_subscriptions'
) THEN -- 添加多时间段支持
IF NOT EXISTS (
    SELECT
    FROM information_schema.columns
    WHERE table_name = 'push_subscriptions'
        AND column_name = 'reminder_times'
) THEN
ALTER TABLE push_subscriptions
ADD COLUMN reminder_times TEXT [] DEFAULT ARRAY ['08:00'];
END IF;
END IF;
END $$;
-- 完成提示
SELECT 'Migration completed successfully!' as status;