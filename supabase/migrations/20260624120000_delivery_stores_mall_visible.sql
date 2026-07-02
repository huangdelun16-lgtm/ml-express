-- 区分「同城商场可见商户」与「跨境 Inventory 中转站账号」
ALTER TABLE delivery_stores
  ADD COLUMN IF NOT EXISTS mall_visible BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN delivery_stores.mall_visible IS
  '是否在客户端/商家端同城商场展示；Admin 跨境物流创建的 Inventory 中转站为 false';

-- 跨境 Inventory 中转站不在同城商场展示（含历史误标 store_type 的记录）
UPDATE delivery_stores
SET mall_visible = false
WHERE store_type = 'transit_station'
   OR address ILIKE '%跨境物流中转站%'
   OR address ILIKE '%cross-border transit hub%'
   OR notes ILIKE '%Inventory App 跨境%';
