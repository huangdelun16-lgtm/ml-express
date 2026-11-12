-- 出口成本允许单价 0：这单不收出口费，仍要记一笔，才会从待填清单消失。

ALTER TABLE inventory_export_costs DROP CONSTRAINT IF EXISTS inventory_export_costs_unit_price_cny_check;
ALTER TABLE inventory_export_costs
  ADD CONSTRAINT inventory_export_costs_unit_price_cny_check CHECK (unit_price_cny >= 0);

ALTER TABLE inventory_export_costs DROP CONSTRAINT IF EXISTS inventory_export_costs_settlement_check;
ALTER TABLE inventory_export_costs
  ADD CONSTRAINT inventory_export_costs_settlement_check CHECK (
    (pay_currency = 'CNY' AND total_cny >= 0 AND total_mmk = 0 AND fx_mmk_per_cny IS NULL)
    OR
    (pay_currency = 'MMK' AND total_cny = 0 AND total_mmk > 0 AND fx_mmk_per_cny > 0)
  );

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
