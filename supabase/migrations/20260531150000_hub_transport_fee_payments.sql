-- Inventory App：中转站装车车费支付记录（同步至云端供 Admin 对账）

CREATE TABLE IF NOT EXISTS inventory_hub_transport_fee_payments (
  pack_barcode TEXT PRIMARY KEY,
  fee TEXT NOT NULL DEFAULT '',
  leg_destination_code TEXT NOT NULL DEFAULT '',
  origin_store_code TEXT NOT NULL DEFAULT '',
  operator TEXT NOT NULL DEFAULT '',
  store_code TEXT NOT NULL DEFAULT '',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_hub_transport_fee_payments_store
  ON inventory_hub_transport_fee_payments (store_code);

COMMENT ON TABLE inventory_hub_transport_fee_payments IS 'Inventory App：运达站向发站支付装车车费记录';

ALTER TABLE inventory_hub_transport_fee_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_hub_transport_fee_payments_all" ON inventory_hub_transport_fee_payments;
CREATE POLICY "inventory_hub_transport_fee_payments_all" ON inventory_hub_transport_fee_payments
  FOR ALL USING (true) WITH CHECK (true);
