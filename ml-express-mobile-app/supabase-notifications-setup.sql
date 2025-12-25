-- 为 couriers 表添加 push_token 字段
ALTER TABLE couriers 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 为 admin_accounts 表添加 push_token 字段（部分骑手可能使用后台账号登录）
ALTER TABLE admin_accounts 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 添加注释
COMMENT ON COLUMN couriers.push_token IS 'Expo/FCM 推送令牌';
COMMENT ON COLUMN admin_accounts.push_token IS 'Expo/FCM 推送令牌';

-- 创建索引以加快查询
CREATE INDEX IF NOT EXISTS idx_couriers_push_token ON couriers(push_token);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_push_token ON admin_accounts(push_token);

