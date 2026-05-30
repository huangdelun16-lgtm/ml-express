-- 更新 delivery_stores 表的 store_type 约束
-- 允许的值: restaurant, tea_shop, drinks_snacks, grocery, transit_station

ALTER TABLE delivery_stores DROP CONSTRAINT IF EXISTS delivery_stores_store_type_check;

ALTER TABLE delivery_stores
ADD CONSTRAINT delivery_stores_store_type_check
CHECK (store_type IN ('restaurant', 'tea_shop', 'drinks_snacks', 'grocery', 'transit_station'));

