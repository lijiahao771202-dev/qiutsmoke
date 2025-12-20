-- Push 订阅表 - 存储用户的推送通知订阅
-- 在 Supabase Dashboard > SQL Editor 中执行
-- 创建表
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    subscription JSONB NOT NULL,
    -- 存储 PushSubscription JSON
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 创建索引
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
-- 启用 RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
-- RLS 策略：用户只能访问自己的订阅
CREATE POLICY "Users can view own subscriptions" ON push_subscriptions FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON push_subscriptions FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON push_subscriptions FOR
UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);
-- 完成提示
SELECT 'push_subscriptions table created successfully!' as status;