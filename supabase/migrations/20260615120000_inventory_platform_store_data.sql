-- Inventory App（中转站）专用业务库：与客户端/商家端/骑手端 packages、orders 等完全隔离
-- 命名空间：inventory_store_* / inventory_packed_*（装车在途仍用 inventory_pkg_tracking）

-- ─── 订单/商品主数据（对应本机 inventory_items）────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT NOT NULL,
  input_barcode TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  spec TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '1 Pcs',
  weight TEXT NOT NULL DEFAULT '',
  qty_on_hand NUMERIC NOT NULL DEFAULT 0,
  min_qty NUMERIC NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  owner_store_id UUID REFERENCES delivery_stores(id) ON DELETE SET NULL,
  owner_store_code TEXT NOT NULL DEFAULT '',
  recipient_name TEXT NOT NULL DEFAULT '',
  final_destination TEXT NOT NULL DEFAULT '',
  hub_arrived_at TIMESTAMPTZ,
  customer_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_store_items_barcode_unique UNIQUE (barcode)
);

CREATE INDEX IF NOT EXISTS idx_inventory_store_items_owner
  ON inventory_store_items (owner_store_code, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_store_items_dest
  ON inventory_store_items (final_destination, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_store_items_input_barcode
  ON inventory_store_items (input_barcode);

COMMENT ON TABLE inventory_store_items IS 'Inventory App：订单/商品（中转站专用，非客户端 packages）';

-- ─── 入库/出库流水（对应本机 stock_movements）────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_store_items(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  item_name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjust')),
  qty NUMERIC NOT NULL DEFAULT 0,
  qty_before NUMERIC NOT NULL DEFAULT 0,
  qty_after NUMERIC NOT NULL DEFAULT 0,
  operator TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  recipient_name TEXT NOT NULL DEFAULT '',
  recipient_phone TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  detail_address TEXT NOT NULL DEFAULT '',
  packaging TEXT NOT NULL DEFAULT '',
  input_barcode TEXT NOT NULL DEFAULT '',
  origin_store_id UUID,
  origin_store_code TEXT NOT NULL DEFAULT '',
  origin_store_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_movements_item
  ON inventory_stock_movements (item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_movements_created
  ON inventory_stock_movements (created_at DESC);

COMMENT ON TABLE inventory_stock_movements IS 'Inventory App：库存流水（中转站专用）';

-- ─── 本地快递包（对应本机 packed_shipments，装车前即存在）────────────────
CREATE TABLE IF NOT EXISTS inventory_packed_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_item_id UUID REFERENCES inventory_store_items(id) ON DELETE SET NULL,
  bundle_barcode TEXT NOT NULL,
  bundle_name TEXT NOT NULL DEFAULT '',
  operator TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  owner_store_id UUID REFERENCES delivery_stores(id) ON DELETE SET NULL,
  owner_store_code TEXT NOT NULL DEFAULT '',
  transport_fee TEXT NOT NULL DEFAULT '',
  truck_leg_destination TEXT NOT NULL DEFAULT '',
  loaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_packed_shipments_barcode_unique UNIQUE (bundle_barcode)
);

CREATE INDEX IF NOT EXISTS idx_inventory_packed_shipments_owner
  ON inventory_packed_shipments (owner_store_code, created_at DESC);

COMMENT ON TABLE inventory_packed_shipments IS 'Inventory App：快递包打包记录（装车前；装车后关联 inventory_pkg_tracking）';

-- ─── 快递包内订单行 ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_packed_shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES inventory_packed_shipments(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_store_items(id) ON DELETE SET NULL,
  item_barcode TEXT NOT NULL,
  item_name TEXT NOT NULL DEFAULT '',
  qty NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_packed_shipment_items_pack_barcode_unique UNIQUE (pack_id, item_barcode)
);

CREATE INDEX IF NOT EXISTS idx_inventory_packed_shipment_items_item
  ON inventory_packed_shipment_items (item_barcode);

COMMENT ON TABLE inventory_packed_shipment_items IS 'Inventory App：快递包明细行';

-- ─── RLS（与现有 inventory_pkg_tracking 一致：App 用 anon + 店铺密码，暂开放）──
ALTER TABLE inventory_store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_packed_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_packed_shipment_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_store_items_all" ON inventory_store_items;
CREATE POLICY "inventory_store_items_all" ON inventory_store_items
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_stock_movements_all" ON inventory_stock_movements;
CREATE POLICY "inventory_stock_movements_all" ON inventory_stock_movements
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_packed_shipments_all" ON inventory_packed_shipments;
CREATE POLICY "inventory_packed_shipments_all" ON inventory_packed_shipments
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_packed_shipment_items_all" ON inventory_packed_shipment_items;
CREATE POLICY "inventory_packed_shipment_items_all" ON inventory_packed_shipment_items
  FOR ALL USING (true) WITH CHECK (true);
