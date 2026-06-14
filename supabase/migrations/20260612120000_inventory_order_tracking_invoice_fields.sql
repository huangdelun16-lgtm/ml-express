-- 装车出库时同步订单完整入库信息，供到站账号展示与 Invoice 一致

ALTER TABLE inventory_order_tracking
  ADD COLUMN IF NOT EXISTS recipient_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS packaging TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS spec TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS weight TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS detail_address TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS inbound_note TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS inbound_store_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS inbound_at TIMESTAMPTZ;

COMMENT ON COLUMN inventory_order_tracking.inbound_note IS '原站入库备注（含总费用、付款方式等）';
