-- Inventory App：订单打包/中转状态同步字段（多设备一致）
ALTER TABLE inventory_store_items
  ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS packed_bundle_barcode TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hub_transit_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hub_transit_shipped_at TIMESTAMPTZ;

COMMENT ON COLUMN inventory_store_items.packed_at IS '打包入快递包时间（Inventory App 多设备同步）';
COMMENT ON COLUMN inventory_store_items.packed_bundle_barcode IS '所属快递包包装号';
COMMENT ON COLUMN inventory_store_items.hub_transit_released_at IS '中转站释放待转出时间';
COMMENT ON COLUMN inventory_store_items.hub_transit_shipped_at IS '中转站装车转出时间';
