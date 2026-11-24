-- 出口成本记下包装号。作废后可以重开，已作废的金额不再计入，原来的数字不改。

ALTER TABLE inventory_export_costs
  ADD COLUMN IF NOT EXISTS pack_barcode text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS voided_at timestamptz;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'inventory_export_costs'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%subject_kind%'
  LIMIT 1;
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE inventory_export_costs DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_export_costs_active_subject
  ON inventory_export_costs (subject_kind, subject_key)
  WHERE voided_at IS NULL;

CREATE OR REPLACE FUNCTION public.inventory_lookup_export_pack(p_kind text, p_key text, p_display text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  found text;
  key text := upper(trim(coalesce(p_key, '')));
  display text := upper(trim(coalesce(p_display, '')));
BEGIN
  IF p_kind = 'single' THEN
    SELECT upper(trim(packed_bundle_barcode)) INTO found
    FROM inventory_store_items
    WHERE btrim(coalesce(packed_bundle_barcode, '')) <> ''
      AND (
        id::text = trim(coalesce(p_key, ''))
        OR upper(barcode) = display
        OR upper(input_barcode) = display
      )
    LIMIT 1;
  ELSE
    SELECT upper(trim(packed_bundle_barcode)) INTO found
    FROM inventory_store_items
    WHERE btrim(coalesce(packed_bundle_barcode, '')) <> ''
      AND (
        upper(barcode) LIKE key || '(%'
        OR upper(barcode) = display
        OR upper(input_barcode) = display
      )
    LIMIT 1;
  END IF;
  IF found IS NOT NULL AND found <> '' THEN
    RETURN found;
  END IF;
  IF display ~ '^[A-Z]{3}[0-9]{2}[A-Z]{3}[0-9]+[0-9]{4}$' THEN
    RETURN display;
  END IF;
  IF key ~ '^[A-Z]{3}[0-9]{2}[A-Z]{3}[0-9]+[0-9]{4}$' THEN
    RETURN key;
  END IF;
  RETURN '';
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_export_cost_fill_pack()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF btrim(coalesce(NEW.pack_barcode, '')) = '' THEN
    NEW.pack_barcode := public.inventory_lookup_export_pack(NEW.subject_kind, NEW.subject_key, NEW.display_barcode);
  ELSE
    NEW.pack_barcode := upper(trim(NEW.pack_barcode));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_export_costs_fill_pack ON inventory_export_costs;
CREATE TRIGGER inventory_export_costs_fill_pack
  BEFORE INSERT OR UPDATE OF pack_barcode, display_barcode, subject_key
  ON inventory_export_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.inventory_export_cost_fill_pack();

UPDATE inventory_export_costs
SET pack_barcode = public.inventory_lookup_export_pack(subject_kind, subject_key, display_barcode)
WHERE btrim(coalesce(pack_barcode, '')) = '';

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
  p_created_by TEXT,
  p_pay_currency TEXT,
  p_mmk_per_cny NUMERIC
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
  v_currency TEXT := upper(trim(coalesce(p_pay_currency, '')));
  v_weight NUMERIC := p_weight_kg;
  v_unit NUMERIC := p_unit_price_cny;
  v_rate NUMERIC := p_mmk_per_cny;
  v_quote NUMERIC;
  v_total_cny NUMERIC;
  v_total_mmk NUMERIC;
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
  IF v_unit IS NULL OR v_unit < 0 OR v_unit > 1000000 THEN
    RAISE EXCEPTION 'export cost price required';
  END IF;
  IF v_currency = 'CNY' THEN
    v_currency := 'CNY';
  ELSIF v_currency = 'MMK' THEN
    v_currency := 'MMK';
  ELSE
    RAISE EXCEPTION 'export cost currency required';
  END IF;

  v_quote := round(v_weight * v_unit, 2);
  IF v_quote < 0 THEN
    RAISE EXCEPTION 'export cost price required';
  END IF;

  IF v_quote = 0 THEN
    v_currency := 'CNY';
    v_rate := NULL;
    v_total_cny := 0;
    v_total_mmk := 0;
  ELSIF v_currency = 'MMK' THEN
    IF v_rate IS NULL OR v_rate <= 0 OR v_rate > 1000000 THEN
      RAISE EXCEPTION 'export cost rate required';
    END IF;
    v_total_cny := 0;
    v_total_mmk := round(v_quote * v_rate);
    IF v_total_mmk <= 0 THEN
      RAISE EXCEPTION 'export cost rate required';
    END IF;
  ELSE
    v_rate := NULL;
    v_total_cny := v_quote;
    v_total_mmk := 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM inventory_export_costs
    WHERE subject_kind = v_kind AND subject_key = v_key AND voided_at IS NULL
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
      pay_currency,
      fx_mmk_per_cny,
      total_mmk,
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
      v_total_cny,
      v_currency,
      v_rate,
      v_total_mmk,
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
    'pay_currency', v_row.pay_currency,
    'fx_mmk_per_cny', v_row.fx_mmk_per_cny,
    'total_mmk', v_row.total_mmk,
    'trip_number', v_row.trip_number
  );
END;
$$;
