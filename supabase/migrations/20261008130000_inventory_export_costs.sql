-- 发站按单记下的出口成本（瑞丽 → 木姐 / 腊戌）。添加后不能改。

CREATE TABLE IF NOT EXISTS inventory_export_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_kind TEXT NOT NULL CHECK (subject_kind IN ('single', 'package')),
  subject_key TEXT NOT NULL,
  display_barcode TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  final_destination TEXT NOT NULL DEFAULT '',
  leg_origin TEXT NOT NULL DEFAULT 'RUI',
  leg_destination TEXT NOT NULL CHECK (leg_destination IN ('MSE', 'LSO')),
  weight_kg NUMERIC(12, 3) NOT NULL CHECK (weight_kg > 0),
  unit_price_cny NUMERIC(14, 2) NOT NULL CHECK (unit_price_cny > 0),
  total_cny NUMERIC(14, 2) NOT NULL CHECK (total_cny > 0),
  trip_number TEXT NOT NULL DEFAULT '',
  store_code TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_kind, subject_key)
);

CREATE INDEX IF NOT EXISTS idx_inventory_export_costs_created
  ON inventory_export_costs (created_at DESC);

REVOKE ALL ON TABLE inventory_export_costs FROM PUBLIC, anon, authenticated;
ALTER TABLE inventory_export_costs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION inventory_add_export_cost(
  p_subject_kind TEXT,
  p_subject_key TEXT,
  p_display_barcode TEXT,
  p_customer_name TEXT,
  p_final_destination TEXT,
  p_leg_destination TEXT,
  p_weight_kg NUMERIC,
  p_unit_price_cny NUMERIC,
  p_trip_number TEXT,
  p_created_by TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store TEXT := coalesce(auth.jwt() -> 'app_metadata' ->> 'inventory_store_code', '');
  v_kind TEXT := upper(trim(coalesce(p_subject_kind, '')));
  v_key TEXT := trim(coalesce(p_subject_key, ''));
  v_dest TEXT := upper(trim(coalesce(p_leg_destination, '')));
  v_weight NUMERIC := p_weight_kg;
  v_unit NUMERIC := p_unit_price_cny;
  v_total NUMERIC;
  v_row inventory_export_costs%ROWTYPE;
BEGIN
  IF v_store = '' THEN
    RAISE EXCEPTION 'inventory store required';
  END IF;
  IF v_kind = 'SINGLE' THEN
    v_kind := 'single';
  ELSIF v_kind = 'PACKAGE' THEN
    v_kind := 'package';
  ELSE
    RAISE EXCEPTION 'export cost subject required';
  END IF;
  IF v_key = '' OR length(v_key) > 80 THEN
    RAISE EXCEPTION 'export cost subject required';
  END IF;
  IF v_kind = 'package' THEN
    v_key := upper(v_key);
  END IF;
  IF v_dest NOT IN ('MSE', 'LSO') THEN
    RAISE EXCEPTION 'export cost destination required';
  END IF;
  IF v_weight IS NULL OR v_weight <= 0 OR v_weight > 100000 THEN
    RAISE EXCEPTION 'export cost weight required';
  END IF;
  IF v_unit IS NULL OR v_unit <= 0 OR v_unit > 1000000 THEN
    RAISE EXCEPTION 'export cost price required';
  END IF;

  v_total := round(v_weight * v_unit, 2);
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'export cost price required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM inventory_export_costs
    WHERE subject_kind = v_kind AND subject_key = v_key
  ) THEN
    RAISE EXCEPTION 'export cost already added';
  END IF;

  BEGIN
    INSERT INTO inventory_export_costs (
      subject_kind,
      subject_key,
      display_barcode,
      customer_name,
      final_destination,
      leg_origin,
      leg_destination,
      weight_kg,
      unit_price_cny,
      total_cny,
      trip_number,
      store_code,
      created_by
    ) VALUES (
      v_kind,
      v_key,
      left(trim(coalesce(p_display_barcode, '')), 80),
      left(trim(coalesce(p_customer_name, '')), 120),
      left(trim(coalesce(p_final_destination, '')), 40),
      'RUI',
      v_dest,
      v_weight,
      round(v_unit, 2),
      v_total,
      left(upper(trim(coalesce(p_trip_number, ''))), 40),
      v_store,
      left(trim(coalesce(p_created_by, '')), 80)
    )
    RETURNING * INTO v_row;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'export cost already added';
  END;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'subject_kind', v_row.subject_kind,
    'subject_key', v_row.subject_key,
    'leg_destination', v_row.leg_destination,
    'weight_kg', v_row.weight_kg,
    'unit_price_cny', v_row.unit_price_cny,
    'total_cny', v_row.total_cny,
    'trip_number', v_row.trip_number
  );
END;
$$;

CREATE OR REPLACE FUNCTION inventory_list_export_costs()
RETURNS SETOF inventory_export_costs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store TEXT := coalesce(auth.jwt() -> 'app_metadata' ->> 'inventory_store_code', '');
BEGIN
  IF v_store = '' THEN
    RAISE EXCEPTION 'inventory store required';
  END IF;
  RETURN QUERY
  SELECT *
  FROM inventory_export_costs
  WHERE store_code = v_store
  ORDER BY created_at DESC
  LIMIT 500;
END;
$$;

REVOKE ALL ON FUNCTION inventory_add_export_cost(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION inventory_list_export_costs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION inventory_add_export_cost(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION inventory_list_export_costs() TO authenticated;
