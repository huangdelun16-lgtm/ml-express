-- 中转站分拨：本段运达站 + 订单级目的地 + 释放入待转出

ALTER TABLE inventory_pkg_tracking
  ADD COLUMN IF NOT EXISTS leg_destination_code TEXT;

UPDATE inventory_pkg_tracking
SET leg_destination_code = destination_code
WHERE leg_destination_code IS NULL OR TRIM(leg_destination_code) = '';

ALTER TABLE inventory_order_tracking
  ADD COLUMN IF NOT EXISTS destination_code TEXT NOT NULL DEFAULT '';

ALTER TABLE inventory_order_tracking
  DROP CONSTRAINT IF EXISTS inventory_order_tracking_status_check;

ALTER TABLE inventory_order_tracking
  ADD CONSTRAINT inventory_order_tracking_status_check
  CHECK (status IN ('in_transit', 'hub_received', 'released_at_hub'));

ALTER TABLE inventory_pkg_tracking
  DROP CONSTRAINT IF EXISTS inventory_pkg_tracking_status_check;

ALTER TABLE inventory_pkg_tracking
  ADD CONSTRAINT inventory_pkg_tracking_status_check
  CHECK (status IN (
    'in_transit',
    'hub_received',
    'completed',
    'cancelled',
    'split_at_hub'
  ));

CREATE INDEX IF NOT EXISTS idx_inv_pkg_leg_dest_status
  ON inventory_pkg_tracking (leg_destination_code, status);

COMMENT ON COLUMN inventory_pkg_tracking.leg_destination_code IS '本段装车运达站（可与包装号最终目的地不同）';
COMMENT ON COLUMN inventory_order_tracking.destination_code IS '订单最终目的地（入库时登记）';
