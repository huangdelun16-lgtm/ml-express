-- 合伙店铺创建表单依赖字段：扩展 store_type 约束、添加 cod_settlement_day
ALTER TABLE delivery_stores
  ADD COLUMN IF NOT EXISTS cod_settlement_day TEXT DEFAULT '7';

ALTER TABLE delivery_stores DROP CONSTRAINT IF EXISTS delivery_stores_store_type_check;

ALTER TABLE delivery_stores
  ADD CONSTRAINT delivery_stores_store_type_check
  CHECK (store_type IN (
    'restaurant',
    'drinks_snacks',
    'breakfast',
    'cake_shop',
    'tea_shop',
    'flower_shop',
    'clothing_store',
    'grocery',
    'hardware_store',
    'supermarket',
    'transit_station',
    'other'
  ));

COMMENT ON COLUMN delivery_stores.cod_settlement_day IS 'COD 结清周期（天）：7/10/15/30';
