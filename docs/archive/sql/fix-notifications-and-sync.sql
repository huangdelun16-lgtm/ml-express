-- 修复推送通知和骑手同步问题
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 为 couriers 表添加 push_token 字段（如果缺失）
ALTER TABLE couriers 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 2. 为 admin_accounts 表添加 push_token 字段（如果缺失）
ALTER TABLE admin_accounts 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 3. 确保 admin_accounts 表有 last_login 字段
ALTER TABLE admin_accounts 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 4. 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_couriers_push_token ON couriers(push_token);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_push_token ON admin_accounts(push_token);

-- 5. 添加备注
COMMENT ON COLUMN couriers.push_token IS 'Expo/FCM 推送令牌';
COMMENT ON COLUMN admin_accounts.push_token IS 'Expo/FCM 推送令牌';
COMMENT ON COLUMN admin_accounts.last_login IS '最后登录时间';

