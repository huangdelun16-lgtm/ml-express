-- 为 delivery_stores 表添加 password 字段
-- 用于合伙店铺登录验证

ALTER TABLE delivery_stores 
ADD COLUMN IF NOT EXISTS password TEXT;

-- 添加注释
COMMENT ON COLUMN delivery_stores.password IS '合伙店铺登录密码（加密存储）';

