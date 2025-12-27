-- 增加 "other" (其它) 店铺类型支持
-- 请在 Supabase SQL 编辑器中执行此脚本

-- 1. 移除旧的约束
ALTER TABLE delivery_stores DROP CONSTRAINT IF EXISTS delivery_stores_store_type_check;

-- 2. 添加新的约束（包含 'other'）
ALTER TABLE delivery_stores
ADD CONSTRAINT delivery_stores_store_type_check
CHECK (store_type IN ('restaurant', 'tea_shop', 'drinks_snacks', 'grocery', 'transit_station', 'other'));

-- 3. 添加备注（可选）
COMMENT ON COLUMN delivery_stores.store_type IS '店铺类型：餐厅、茶铺、饮料和小吃、杂货店、中转站、其它';

