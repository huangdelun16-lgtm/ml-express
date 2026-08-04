-- 跨境登记客户表（Admin 登记）+ Inventory App 按编码查电话 + 入库流水 customer_code

CREATE TABLE IF NOT EXISTS cross_border_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  delivery_region_id TEXT NOT NULL DEFAULT '',
  delivery_area_code TEXT NOT NULL DEFAULT '',
  address_notes TEXT NOT NULL DEFAULT '',
  salesperson_employee_code TEXT NOT NULL DEFAULT '',
  application_date DATE NOT NULL,
  customer_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_border_customers_code_upper
  ON cross_border_customers (UPPER(TRIM(customer_code)));

ALTER TABLE inventory_stock_movements
  ADD COLUMN IF NOT EXISTS customer_code TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_inv_movements_customer_code_upper
  ON inventory_stock_movements (UPPER(TRIM(customer_code)))
  WHERE COALESCE(TRIM(customer_code), '') <> '';

-- Inventory App：按客户编码查登记姓名与电话
CREATE OR REPLACE FUNCTION lookup_cross_border_customer(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := UPPER(TRIM(COALESCE(p_code, '')));
  v_row cross_border_customers%ROWTYPE;
BEGIN
  IF length(v_code) < 5 THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_row
  FROM cross_border_customers
  WHERE UPPER(TRIM(customer_code)) = v_code
    AND COALESCE(status, 'active') = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'customer_code', v_row.customer_code,
    'customer_name', v_row.customer_name,
    'phone', v_row.phone,
    'delivery_area_code', v_row.delivery_area_code,
    'delivery_region_id', v_row.delivery_region_id
  );
END;
$$;

REVOKE ALL ON FUNCTION lookup_cross_border_customer(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_cross_border_customer(TEXT) TO authenticated;

-- 入库 RPC：写入 customer_code
CREATE OR REPLACE FUNCTION inventory_apply_stock_movement(
  p_operation_id UUID,
  p_item JSONB,
  p_movement JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing JSONB;
  v_item inventory_store_items%ROWTYPE;
  v_before NUMERIC;
  v_after NUMERIC;
  v_qty NUMERIC := ABS(COALESCE((p_movement->>'qty')::NUMERIC, 0));
  v_type TEXT := p_movement->>'type';
  v_result JSONB;
BEGIN
  IF p_operation_id IS NULL OR v_qty <= 0 OR v_type NOT IN ('in', 'out', 'adjust') THEN
    RAISE EXCEPTION 'invalid inventory stock operation';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation_id::TEXT, 0));
  SELECT result INTO v_existing FROM inventory_operation_log WHERE operation_id = p_operation_id;
  IF FOUND THEN RETURN v_existing; END IF;

  SELECT * INTO v_item
  FROM inventory_store_items
  WHERE barcode = TRIM(p_item->>'barcode')
  FOR UPDATE;

  IF NOT FOUND THEN
    IF v_type <> 'in' THEN RAISE EXCEPTION 'inventory item not found'; END IF;
    INSERT INTO inventory_store_items (
      id, barcode, input_barcode, name, spec, unit, weight, qty_on_hand, min_qty, note,
      owner_store_id, owner_store_code, recipient_name, final_destination, hub_arrived_at,
      customer_signed_at, packed_at, packed_bundle_barcode, hub_transit_released_at,
      hub_transit_shipped_at, created_at, updated_at
    ) VALUES (
      COALESCE(NULLIF(p_item->>'id', '')::UUID, gen_random_uuid()), TRIM(p_item->>'barcode'),
      COALESCE(p_item->>'input_barcode', ''), COALESCE(p_item->>'name', ''),
      COALESCE(p_item->>'spec', ''), COALESCE(p_item->>'unit', '1 Pcs'),
      COALESCE(p_item->>'weight', ''), 0, COALESCE((p_item->>'min_qty')::NUMERIC, 0),
      COALESCE(p_item->>'note', ''), NULLIF(p_item->>'owner_store_id', '')::UUID,
      COALESCE(p_item->>'owner_store_code', ''), COALESCE(p_item->>'recipient_name', ''),
      COALESCE(p_item->>'final_destination', ''), NULLIF(p_item->>'hub_arrived_at', '')::TIMESTAMPTZ,
      NULLIF(p_item->>'customer_signed_at', '')::TIMESTAMPTZ,
      NULLIF(p_item->>'packed_at', '')::TIMESTAMPTZ, COALESCE(p_item->>'packed_bundle_barcode', ''),
      NULLIF(p_item->>'hub_transit_released_at', '')::TIMESTAMPTZ,
      NULLIF(p_item->>'hub_transit_shipped_at', '')::TIMESTAMPTZ,
      COALESCE(NULLIF(p_item->>'created_at', '')::TIMESTAMPTZ, now()),
      COALESCE(NULLIF(p_item->>'updated_at', '')::TIMESTAMPTZ, now())
    ) RETURNING * INTO v_item;
  END IF;

  v_before := v_item.qty_on_hand;
  v_after := CASE v_type WHEN 'in' THEN v_before + v_qty WHEN 'out' THEN v_before - v_qty ELSE v_qty END;
  IF v_after < 0 THEN RAISE EXCEPTION 'insufficient inventory'; END IF;

  UPDATE inventory_store_items SET
    input_barcode = COALESCE(p_item->>'input_barcode', input_barcode),
    name = COALESCE(p_item->>'name', name), spec = COALESCE(p_item->>'spec', spec),
    unit = COALESCE(p_item->>'unit', unit), weight = COALESCE(p_item->>'weight', weight),
    note = COALESCE(p_item->>'note', note), recipient_name = COALESCE(p_item->>'recipient_name', recipient_name),
    final_destination = COALESCE(p_item->>'final_destination', final_destination),
    qty_on_hand = v_after, updated_at = COALESCE(NULLIF(p_item->>'updated_at', '')::TIMESTAMPTZ, now())
  WHERE id = v_item.id RETURNING * INTO v_item;

  INSERT INTO inventory_stock_movements (
    id, item_id, barcode, item_name, type, qty, qty_before, qty_after, operator, note,
    recipient_name, recipient_phone, destination, detail_address, packaging, input_barcode,
    origin_store_id, origin_store_code, origin_store_name, customer_code, created_at
  ) VALUES (
    COALESCE(NULLIF(p_movement->>'id', '')::UUID, gen_random_uuid()), v_item.id, v_item.barcode,
    COALESCE(p_movement->>'item_name', v_item.name), v_type, v_qty, v_before, v_after,
    COALESCE(p_movement->>'operator', ''), COALESCE(p_movement->>'note', ''),
    COALESCE(p_movement->>'recipient_name', ''), COALESCE(p_movement->>'recipient_phone', ''),
    COALESCE(p_movement->>'destination', ''), COALESCE(p_movement->>'detail_address', ''),
    COALESCE(p_movement->>'packaging', ''), COALESCE(p_movement->>'input_barcode', ''),
    NULLIF(p_movement->>'origin_store_id', '')::UUID, COALESCE(p_movement->>'origin_store_code', ''),
    COALESCE(p_movement->>'origin_store_name', ''),
    UPPER(TRIM(COALESCE(p_movement->>'customer_code', ''))),
    COALESCE(NULLIF(p_movement->>'created_at', '')::TIMESTAMPTZ, now())
  );

  v_result := jsonb_build_object('item', to_jsonb(v_item), 'idempotent', false);
  INSERT INTO inventory_operation_log (operation_id, operation_type, result)
    VALUES (p_operation_id, 'stock_movement', v_result);
  RETURN v_result;
END;
$$;

-- 多个入库：写入 customer_code
CREATE OR REPLACE FUNCTION inventory_packaging_stock_in_batch(
  p_operation_id UUID,
  p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing JSONB;
  v_bundle inventory_store_items%ROWTYPE;
  v_item inventory_store_items%ROWTYPE;
  v_pack inventory_packed_shipments%ROWTYPE;
  v_line JSONB;
  v_qty NUMERIC;
  v_dest TEXT;
  v_now TIMESTAMPTZ := COALESCE(NULLIF(p_payload->>'inbound_at', '')::TIMESTAMPTZ, now());
  v_store_id UUID := inventory_jwt_store_id();
  v_store_code TEXT := upper(trim(coalesce(p_payload->>'store_code', '')));
  v_result JSONB;
  v_bundle_code TEXT := upper(trim(p_payload->'bundle'->>'barcode'));
  v_line_note TEXT := COALESCE(p_payload->>'line_note', '');
  v_operator TEXT := COALESCE(p_payload->>'operator', '');
  v_customer_code TEXT := upper(trim(COALESCE(p_payload->>'customer_code', '')));
BEGIN
  IF p_operation_id IS NULL
     OR jsonb_typeof(p_payload->'lines') <> 'array'
     OR jsonb_array_length(p_payload->'lines') = 0
     OR v_bundle_code = '' THEN
    RAISE EXCEPTION 'invalid packaging stock in operation';
  END IF;
  IF NOT inventory_session_active() THEN
    RAISE EXCEPTION 'invalid inventory session';
  END IF;
  IF v_store_code = '' OR NOT inventory_owner_code_matches(v_store_code) THEN
    RAISE EXCEPTION 'inventory station identity mismatch';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation_id::TEXT, 0));
  SELECT result INTO v_existing FROM inventory_operation_log WHERE operation_id = p_operation_id;
  IF FOUND THEN RETURN v_existing; END IF;

  v_dest := upper(trim(COALESCE(p_payload->>'destination', '')));

  INSERT INTO inventory_store_items (
    id, barcode, input_barcode, name, spec, unit, weight, qty_on_hand, min_qty, note,
    owner_store_id, owner_store_code, recipient_name, final_destination, created_at, updated_at
  ) VALUES (
    COALESCE(NULLIF(p_payload->'bundle'->>'id', '')::UUID, gen_random_uuid()),
    v_bundle_code,
    '',
    COALESCE(p_payload->'bundle'->>'name', ''),
    COALESCE(p_payload->'bundle'->>'spec', ''),
    COALESCE(p_payload->'bundle'->>'unit', '1 Pcs'),
    COALESCE(p_payload->'bundle'->>'weight', ''),
    1,
    0,
    COALESCE(p_payload->'bundle'->>'note', ''),
    v_store_id,
    v_store_code,
    COALESCE(p_payload->>'recipient_name', ''),
    v_dest,
    v_now,
    v_now
  )
  ON CONFLICT (barcode) DO UPDATE SET
    name = EXCLUDED.name,
    spec = EXCLUDED.spec,
    unit = EXCLUDED.unit,
    weight = EXCLUDED.weight,
    note = EXCLUDED.note,
    owner_store_id = EXCLUDED.owner_store_id,
    owner_store_code = EXCLUDED.owner_store_code,
    recipient_name = EXCLUDED.recipient_name,
    final_destination = EXCLUDED.final_destination,
    updated_at = v_now
  RETURNING * INTO v_bundle;

  INSERT INTO inventory_packed_shipments (
    id, bundle_item_id, bundle_barcode, bundle_name, operator, note,
    owner_store_id, owner_store_code, created_at, updated_at
  ) VALUES (
    COALESCE(NULLIF(p_payload->'bundle'->>'pack_id', '')::UUID, gen_random_uuid()),
    v_bundle.id,
    v_bundle.barcode,
    COALESCE(p_payload->'bundle'->>'name', v_bundle.name),
    v_operator,
    COALESCE(p_payload->'bundle'->>'note', ''),
    v_store_id,
    v_store_code,
    v_now,
    v_now
  )
  ON CONFLICT (bundle_barcode) DO UPDATE SET
    bundle_name = EXCLUDED.bundle_name,
    operator = EXCLUDED.operator,
    note = EXCLUDED.note,
    owner_store_id = EXCLUDED.owner_store_id,
    owner_store_code = EXCLUDED.owner_store_code,
    bundle_item_id = EXCLUDED.bundle_item_id,
    updated_at = v_now
  RETURNING * INTO v_pack;

  DELETE FROM inventory_packed_shipment_items WHERE pack_id = v_pack.id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_payload->'lines')
  LOOP
    v_qty := GREATEST(COALESCE((v_line->>'qty')::NUMERIC, 1), 1);

    SELECT * INTO v_item
    FROM inventory_store_items
    WHERE barcode = upper(trim(v_line->>'barcode'))
    FOR UPDATE;

    IF FOUND AND (v_item.qty_on_hand > 0 OR v_item.packed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'order already stocked or packed: %', v_line->>'barcode';
    END IF;

    IF NOT FOUND THEN
      INSERT INTO inventory_store_items (
        id, barcode, input_barcode, name, spec, unit, weight, qty_on_hand, min_qty, note,
        owner_store_id, owner_store_code, recipient_name, final_destination,
        packed_at, packed_bundle_barcode, created_at, updated_at
      ) VALUES (
        COALESCE(NULLIF(v_line->>'id', '')::UUID, gen_random_uuid()),
        upper(trim(v_line->>'barcode')),
        COALESCE(v_line->>'input_barcode', ''),
        COALESCE(v_line->>'name', ''),
        '',
        v_qty::TEXT || ' Pcs',
        '',
        0,
        0,
        v_line_note,
        v_store_id,
        v_store_code,
        COALESCE(p_payload->>'recipient_name', ''),
        v_dest,
        v_now,
        v_bundle_code,
        v_now,
        v_now
      )
      RETURNING * INTO v_item;
    ELSE
      UPDATE inventory_store_items SET
        input_barcode = COALESCE(v_line->>'input_barcode', input_barcode),
        name = COALESCE(v_line->>'name', name),
        unit = v_qty::TEXT || ' Pcs',
        weight = '',
        qty_on_hand = 0,
        note = v_line_note,
        recipient_name = COALESCE(p_payload->>'recipient_name', recipient_name),
        final_destination = v_dest,
        owner_store_id = v_store_id,
        owner_store_code = v_store_code,
        packed_at = v_now,
        packed_bundle_barcode = v_bundle_code,
        updated_at = v_now
      WHERE id = v_item.id
      RETURNING * INTO v_item;
    END IF;

    INSERT INTO inventory_stock_movements (
      id, item_id, barcode, item_name, type, qty, qty_before, qty_after, operator, note,
      recipient_name, recipient_phone, destination, input_barcode,
      origin_store_id, origin_store_code, origin_store_name, customer_code, created_at
    ) VALUES (
      gen_random_uuid(),
      v_item.id,
      v_item.barcode,
      v_item.name,
      'in',
      v_qty,
      0,
      0,
      v_operator,
      COALESCE(v_line->>'inbound_note', v_line_note) || ' · 打包入 ' || v_bundle_code,
      COALESCE(p_payload->>'recipient_name', ''),
      COALESCE(p_payload->>'recipient_phone', ''),
      v_dest,
      COALESCE(v_line->>'input_barcode', v_item.input_barcode),
      v_store_id,
      v_store_code,
      COALESCE(p_payload->>'store_name', ''),
      v_customer_code,
      v_now
    );

    INSERT INTO inventory_packed_shipment_items (id, pack_id, item_id, item_barcode, item_name, qty)
    VALUES (gen_random_uuid(), v_pack.id, v_item.id, v_item.barcode, v_item.name, v_qty);
  END LOOP;

  v_result := jsonb_build_object(
    'bundle_item', to_jsonb(v_bundle),
    'pack_id', v_pack.id,
    'pack', to_jsonb(v_pack),
    'line_items', COALESCE((
      SELECT jsonb_agg(to_jsonb(i) ORDER BY i.barcode)
      FROM inventory_store_items i
      WHERE i.packed_bundle_barcode = v_bundle_code
        AND i.barcode <> v_bundle_code
    ), '[]'::jsonb),
    'idempotent', false
  );
  INSERT INTO inventory_operation_log (operation_id, operation_type, result)
    VALUES (p_operation_id, 'packaging_stock_in_batch', v_result);
  RETURN v_result;
END;
$$;
