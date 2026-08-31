-- 目的站到站后通知客户取件：记录最近一次通知时间（WhatsApp / 短信）

ALTER TABLE inventory_store_items
  ADD COLUMN IF NOT EXISTS arrival_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_inventory_store_items_arrival_notify
  ON inventory_store_items (final_destination, arrival_notified_at)
  WHERE hub_arrived_at IS NOT NULL AND customer_signed_at IS NULL;

COMMENT ON COLUMN inventory_store_items.arrival_notified_at IS
  '目的站通知客户取件时间（Inventory App 现场 WhatsApp/短信）';
