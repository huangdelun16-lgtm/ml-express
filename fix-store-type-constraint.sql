-- 修复 delivery_stores 表的 store_type 约束
-- 添加 'transit_station' 到允许的 store_type 值

-- 首先删除现有的约束
ALTER TABLE delivery_stores DROP CONSTRAINT IF EXISTS delivery_stores_store_type_check;

-- 重新创建约束，包含 'transit_station'
ALTER TABLE delivery_stores 
ADD CONSTRAINT delivery_stores_store_type_check 
CHECK (store_type IN ('hub', 'branch', 'pickup_point', 'transit_station'));

-- 验证约束是否正确创建
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'delivery_stores_store_type_check';
