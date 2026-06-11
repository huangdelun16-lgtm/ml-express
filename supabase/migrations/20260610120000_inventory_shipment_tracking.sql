-- Inventory App 跨中转站包裹 / 订单在途追踪（装车出库 → 到站扫码 → 订单扫码确认）

CREATE TABLE IF NOT EXISTS inventory_pkg_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_barcode TEXT NOT NULL UNIQUE,
  pack_name TEXT NOT NULL DEFAULT '',
  origin_store_id UUID,
  origin_store_code TEXT NOT NULL,
  origin_store_name TEXT NOT NULL DEFAULT '',
  destination_code TEXT NOT NULL,
  item_count INT NOT NULL DEFAULT 0,
  total_weight TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_transit' CHECK (status IN (
    'in_transit',
    'hub_received',
    'completed',
    'cancelled'
  )),
  truck_outbound_date DATE,
  truck_loaded_at TIMESTAMPTZ,
  hub_received_at TIMESTAMPTZ,
  hub_received_by_store_id UUID,
  hub_received_by_store_code TEXT,
  hub_received_by_store_name TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pkg_tracking_id UUID NOT NULL REFERENCES inventory_pkg_tracking(id) ON DELETE CASCADE,
  pack_barcode TEXT NOT NULL,
  order_barcode TEXT NOT NULL,
  express_barcode TEXT DEFAULT '',
  order_name TEXT NOT NULL DEFAULT '',
  qty INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_transit' CHECK (status IN (
    'in_transit',
    'hub_received'
  )),
  hub_received_at TIMESTAMPTZ,
  hub_received_by_store_code TEXT,
  hub_received_by_store_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pack_barcode, order_barcode)
);

CREATE INDEX IF NOT EXISTS idx_inv_pkg_dest_status
  ON inventory_pkg_tracking (destination_code, status);
CREATE INDEX IF NOT EXISTS idx_inv_pkg_origin
  ON inventory_pkg_tracking (origin_store_code, status);
CREATE INDEX IF NOT EXISTS idx_inv_order_pack
  ON inventory_order_tracking (pack_barcode, status);

ALTER TABLE inventory_pkg_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_order_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_pkg_tracking_all" ON inventory_pkg_tracking;
CREATE POLICY "inventory_pkg_tracking_all" ON inventory_pkg_tracking
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_order_tracking_all" ON inventory_order_tracking;
CREATE POLICY "inventory_order_tracking_all" ON inventory_order_tracking
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE inventory_pkg_tracking IS 'Inventory App：快递包跨站追踪（装车出库后写入）';
COMMENT ON TABLE inventory_order_tracking IS 'Inventory App：快递包内含订单到站确认追踪';
