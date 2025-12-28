-- 为 users 表添加 push_token 字段，以便向客户发送推送通知
-- 请在 Supabase SQL 编辑器中执行

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token);

-- 添加备注
COMMENT ON COLUMN users.push_token IS 'Expo/FCM 推送令牌 (客户端用户)';

