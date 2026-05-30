-- 为 packages 表添加缺失的合伙店铺关联字段
-- 这些字段用于在后台显示包裹来源的店铺信息

ALTER TABLE packages
ADD COLUMN IF NOT EXISTS sender_code TEXT,
ADD COLUMN IF NOT EXISTS delivery_store_id UUID,
ADD COLUMN IF NOT EXISTS delivery_store_name TEXT;

-- 添加注释
COMMENT ON COLUMN packages.sender_code IS '寄件方代码（合伙店铺代码）';
COMMENT ON COLUMN packages.delivery_store_id IS '关联的合伙店铺ID';
COMMENT ON COLUMN packages.delivery_store_name IS '关联的合伙店铺名称';

