-- 装车出库车费（由本段运达站承担）
ALTER TABLE inventory_pkg_tracking
  ADD COLUMN IF NOT EXISTS transport_fee TEXT DEFAULT '';

COMMENT ON COLUMN inventory_pkg_tracking.transport_fee IS '本段装车车费 MMK，由 leg_destination_code 对应站点承担';
