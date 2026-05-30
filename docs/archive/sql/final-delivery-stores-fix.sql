-- 修复 delivery_stores 表结构
-- 在 Supabase SQL 编辑器中执行本脚本

-- 1. 添加 region 字段（如果不存在）
ALTER TABLE delivery_stores 
ADD COLUMN IF NOT EXISTS region TEXT;

-- 2. 添加 password 字段（如果不存在）
ALTER TABLE delivery_stores 
ADD COLUMN IF NOT EXISTS password TEXT;

-- 3. 更新 store_type 约束以匹配前端代码
ALTER TABLE delivery_stores DROP CONSTRAINT IF EXISTS delivery_stores_store_type_check;

ALTER TABLE delivery_stores
ADD CONSTRAINT delivery_stores_store_type_check
CHECK (store_type IN ('restaurant', 'tea_shop', 'drinks_snacks', 'grocery', 'transit_station'));

-- 添加注释
COMMENT ON COLUMN delivery_stores.region IS '店铺所属区域';
COMMENT ON COLUMN delivery_stores.password IS '合伙店铺登录密码';


