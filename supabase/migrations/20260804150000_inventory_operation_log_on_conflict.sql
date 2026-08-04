-- operation_log 写入：ON CONFLICT 兜底，避免并发/跨会话重复插入导致第二包无法入库

CREATE OR REPLACE FUNCTION inventory_confirm_pkg_hub_received(
  p_operation_id UUID,
  p_pack_barcode TEXT,
  p_store_id UUID,
  p_store_code TEXT,
  p_store_name TEXT,
  p_hub_code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing JSONB;
  v_pkg inventory_pkg_tracking%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_result JSONB;
  v_store_id UUID := inventory_jwt_store_id();
  v_store_code TEXT := upper(trim(inventory_jwt_store_code()));
  v_hub_code TEXT := upper(trim(inventory_jwt_hub_code()));
  v_store_name TEXT;
  v_all_orders_for_hub BOOLEAN := false;
BEGIN
  IF p_operation_id IS NULL OR NOT inventory_session_active() THEN
    RAISE EXCEPTION 'invalid inventory session';
  END IF;
  IF p_store_id IS DISTINCT FROM v_store_id
     OR upper(trim(coalesce(p_store_code, ''))) <> v_store_code
     OR upper(trim(coalesce(p_hub_code, ''))) <> v_hub_code THEN
    RAISE EXCEPTION 'inventory station identity mismatch';
  END IF;
  SELECT store_name INTO v_store_name
  FROM delivery_stores
  WHERE id = v_store_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'inventory station not found'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation_id::TEXT, 0));
  SELECT result INTO v_existing FROM inventory_operation_log WHERE operation_id = p_operation_id;
  IF FOUND THEN RETURN v_existing; END IF;

  SELECT * INTO v_pkg FROM inventory_pkg_tracking
    WHERE pack_barcode = UPPER(TRIM(p_pack_barcode)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'package tracking not found'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM inventory_order_tracking o
    WHERE upper(trim(o.pack_barcode)) = upper(trim(v_pkg.pack_barcode))
  ) AND NOT EXISTS (
    SELECT 1 FROM inventory_order_tracking o
    WHERE upper(trim(o.pack_barcode)) = upper(trim(v_pkg.pack_barcode))
      AND upper(trim(coalesce(o.destination_code, ''))) <> v_hub_code
  )
  INTO v_all_orders_for_hub;

  IF UPPER(COALESCE(v_pkg.leg_destination_code, v_pkg.destination_code)) <> v_hub_code
     AND NOT v_all_orders_for_hub THEN
    RAISE EXCEPTION 'package leg destination mismatch';
  END IF;

  IF v_pkg.status = 'hub_received' THEN
    v_result := jsonb_build_object('pack_barcode', v_pkg.pack_barcode, 'status', v_pkg.status, 'idempotent', true);
  ELSIF v_pkg.status = 'in_transit' THEN
    UPDATE inventory_pkg_tracking SET status = 'hub_received', hub_received_at = v_now,
      hub_received_by_store_id = v_store_id, hub_received_by_store_code = v_store_code,
      hub_received_by_store_name = v_store_name, updated_at = v_now
      WHERE id = v_pkg.id AND status = 'in_transit';
    v_result := jsonb_build_object('pack_barcode', v_pkg.pack_barcode, 'status', 'hub_received', 'idempotent', false);
  ELSE
    RAISE EXCEPTION 'package status prevents hub receipt: %', v_pkg.status;
  END IF;

  INSERT INTO inventory_operation_log (operation_id, operation_type, result)
    VALUES (p_operation_id, 'confirm_hub_received', v_result)
  ON CONFLICT (operation_id) DO NOTHING;

  SELECT result INTO v_existing FROM inventory_operation_log WHERE operation_id = p_operation_id;
  IF FOUND THEN RETURN v_existing; END IF;
  RETURN v_result;
END;
$$;

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
    VALUES (p_operation_id, 'stock_movement', v_result)
  ON CONFLICT (operation_id) DO NOTHING;

  SELECT result INTO v_existing FROM inventory_operation_log WHERE operation_id = p_operation_id;
  IF FOUND THEN RETURN v_existing; END IF;
  RETURN v_result;
END;
$$;
