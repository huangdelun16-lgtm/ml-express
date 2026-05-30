-- 为 delivery_stores 表添加 push_token 字段，以便向合伙人发送推送通知
-- 请在 Supabase SQL 编辑器中执行

ALTER TABLE delivery_stores 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_delivery_stores_push_token ON delivery_stores(push_token);

-- 添加备注
COMMENT ON COLUMN delivery_stores.push_token IS 'Expo/FCM 推送令牌 (合伙人店铺)';

