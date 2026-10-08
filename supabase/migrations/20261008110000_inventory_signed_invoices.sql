-- 签收成功时把当时那张 Invoice 定档。发票号按仰光日期全公司递增：20261008-01。

CREATE TABLE IF NOT EXISTS inventory_invoice_day_sequences (
  issued_on DATE PRIMARY KEY,
  last_seq INT NOT NULL DEFAULT 0 CHECK (last_seq >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE inventory_invoice_day_sequences FROM PUBLIC, anon, authenticated;
ALTER TABLE inventory_invoice_day_sequences ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS inventory_signed_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE,
  issued_on DATE NOT NULL,
  day_seq INT NOT NULL CHECK (day_seq > 0),
  customer_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  trip_label TEXT NOT NULL DEFAULT '',
  piece_count INT NOT NULL DEFAULT 0,
  total_fee_cny NUMERIC,
  total_fee_mmk NUMERIC NOT NULL DEFAULT 0,
  document JSONB NOT NULL,
  item_ids UUID[] NOT NULL,
  store_code TEXT NOT NULL DEFAULT '',
  signed_by TEXT NOT NULL DEFAULT '',
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (issued_on, day_seq)
);

CREATE INDEX IF NOT EXISTS idx_inventory_signed_invoices_signed_at
  ON inventory_signed_invoices (signed_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_signed_invoices_item_ids
  ON inventory_signed_invoices USING GIN (item_ids);

REVOKE ALL ON TABLE inventory_signed_invoices FROM PUBLIC, anon, authenticated;
ALTER TABLE inventory_signed_invoices ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION inventory_freeze_signed_invoice(
  p_document JSONB,
  p_item_ids UUID[],
  p_signed_by TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store TEXT := coalesce(auth.jwt() -> 'app_metadata' ->> 'inventory_store_code', '');
  v_ids UUID[];
  v_day DATE;
  v_next INT;
  v_no TEXT;
  v_doc JSONB;
  v_existing inventory_signed_invoices%ROWTYPE;
  v_cny NUMERIC;
BEGIN
  IF v_store = '' THEN
    RAISE EXCEPTION 'inventory store required';
  END IF;
  IF p_document IS NULL OR jsonb_typeof(p_document) <> 'object' THEN
    RAISE EXCEPTION 'invoice document required';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT id
    FROM unnest(COALESCE(p_item_ids, ARRAY[]::UUID[])) AS id
    WHERE id IS NOT NULL
    ORDER BY id
  ) INTO v_ids;

  IF COALESCE(cardinality(v_ids), 0) = 0 THEN
    RAISE EXCEPTION 'invoice items required';
  END IF;

  v_day := (timezone('Asia/Yangon', now()))::date;
  PERFORM pg_advisory_xact_lock(hashtextextended('inventory_invoice_day:' || v_day::text, 0));

  SELECT * INTO v_existing
  FROM inventory_signed_invoices
  WHERE item_ids = v_ids
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'invoice_no', v_existing.invoice_no,
      'id', v_existing.id,
      'idempotent', true
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM inventory_signed_invoices WHERE item_ids && v_ids
  ) THEN
    RAISE EXCEPTION 'invoice items already archived';
  END IF;

  INSERT INTO inventory_invoice_day_sequences (issued_on, last_seq, updated_at)
  VALUES (v_day, 0, now())
  ON CONFLICT (issued_on) DO NOTHING;

  UPDATE inventory_invoice_day_sequences
  SET last_seq = last_seq + 1,
      updated_at = now()
  WHERE issued_on = v_day
  RETURNING last_seq INTO v_next;

  v_no := to_char(v_day, 'YYYYMMDD') || '-' || lpad(v_next::text, 2, '0');
  v_doc := p_document || jsonb_build_object(
    'invoiceNo', v_no,
    'issuedOn', to_char(v_day, 'YYYY-MM-DD')
  );
  v_cny := NULLIF(p_document->>'totalFeeCny', '')::NUMERIC;

  INSERT INTO inventory_signed_invoices (
    invoice_no,
    issued_on,
    day_seq,
    customer_name,
    phone,
    trip_label,
    piece_count,
    total_fee_cny,
    total_fee_mmk,
    document,
    item_ids,
    store_code,
    signed_by
  ) VALUES (
    v_no,
    v_day,
    v_next,
    left(coalesce(p_document->>'customerName', ''), 200),
    left(coalesce(p_document->>'phone', ''), 40),
    left(coalesce(p_document->>'trip', ''), 200),
    COALESCE((p_document->>'pieceCount')::INT, 0),
    CASE WHEN v_cny IS NOT NULL AND v_cny > 0 THEN v_cny ELSE NULL END,
    COALESCE(NULLIF(p_document->>'totalFeeMmk', '')::NUMERIC, 0),
    v_doc,
    v_ids,
    v_store,
    left(coalesce(p_signed_by, ''), 80)
  );

  RETURN jsonb_build_object('invoice_no', v_no, 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION inventory_freeze_signed_invoice(JSONB, UUID[], TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION inventory_freeze_signed_invoice(JSONB, UUID[], TEXT) TO authenticated;
