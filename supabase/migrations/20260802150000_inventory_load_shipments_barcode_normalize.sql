-- 装车出库：快递包号大小写/空格归一化；幂等缓存失效时允许重试

CREATE OR REPLACE FUNCTION inventory_create_packed_shipment(
  p_operation_id UUID,
  p_bundle JSONB,
  p_pack JSONB,
  p_lines JSONB
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
  v_now TIMESTAMPTZ := COALESCE(NULLIF(p_pack->>'created_at', '')::TIMESTAMPTZ, now());
  v_result JSONB;
  v_bundle_code TEXT := upper(trim(p_bundle->>'barcode'));
BEGIN
  IF p_operation_id IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'invalid inventory pack operation';
  END IF;
  IF v_bundle_code = '' THEN
    RAISE EXCEPTION 'invalid inventory pack operation';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation_id::TEXT, 0));
  SELECT result INTO v_existing FROM inventory_operation_log WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF EXISTS (
      SELECT 1 FROM inventory_packed_shipments p
      WHERE p.id = NULLIF(v_existing->>'pack_id', '')::UUID
         OR upper(trim(p.bundle_barcode)) = v_bundle_code
    ) THEN
      RETURN v_existing;
    END IF;
    DELETE FROM inventory_operation_log WHERE operation_id = p_operation_id;
  END IF;

  INSERT INTO inventory_store_items (
    id, barcode, input_barcode, name, spec, unit, weight, qty_on_hand, min_qty, note,
    owner_store_id, owner_store_code, created_at, updated_at
  ) VALUES (
    COALESCE(NULLIF(p_bundle->>'id', '')::UUID, gen_random_uuid()), v_bundle_code, '',
    COALESCE(p_bundle->>'name', ''), COALESCE(p_bundle->>'spec', ''),
    COALESCE(p_bundle->>'unit', '1 Pcs'), COALESCE(p_bundle->>'weight', ''), 1, 0,
    COALESCE(p_bundle->>'note', ''), NULLIF(p_bundle->>'owner_store_id', '')::UUID,
    upper(trim(COALESCE(p_bundle->>'owner_store_code', ''))), v_now, v_now
  )
  ON CONFLICT (barcode) DO UPDATE SET name = EXCLUDED.name, spec = EXCLUDED.spec,
    unit = EXCLUDED.unit, weight = EXCLUDED.weight, note = EXCLUDED.note, updated_at = v_now
  RETURNING * INTO v_bundle;

  INSERT INTO inventory_packed_shipments (
    id, bundle_item_id, bundle_barcode, bundle_name, operator, note, owner_store_id,
    owner_store_code, transport_fee, truck_leg_destination, loaded_at, created_at, updated_at
  ) VALUES (
    COALESCE(NULLIF(p_pack->>'id', '')::UUID, gen_random_uuid()), v_bundle.id, v_bundle.barcode,
    COALESCE(p_pack->>'bundle_name', v_bundle.name), COALESCE(p_pack->>'operator', ''),
    COALESCE(p_pack->>'note', ''), NULLIF(p_pack->>'owner_store_id', '')::UUID,
    upper(trim(COALESCE(p_pack->>'owner_store_code', ''))), '', '', NULL, v_now, v_now
  )
  ON CONFLICT (bundle_barcode) DO UPDATE SET bundle_name = EXCLUDED.bundle_name,
    operator = EXCLUDED.operator, note = EXCLUDED.note, updated_at = v_now
  RETURNING * INTO v_pack;

  DELETE FROM inventory_packed_shipment_items WHERE pack_id = v_pack.id;
  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_qty := GREATEST(COALESCE((v_line->>'qty')::NUMERIC, 1), 1);
    SELECT * INTO v_item FROM inventory_store_items
      WHERE id = NULLIF(v_line->>'item_id', '')::UUID FOR UPDATE;
    IF NOT FOUND OR v_item.qty_on_hand < v_qty THEN
      RAISE EXCEPTION 'selected inventory item unavailable: %', v_line->>'item_barcode';
    END IF;
    UPDATE inventory_store_items SET qty_on_hand = qty_on_hand - v_qty, packed_at = v_now,
      packed_bundle_barcode = v_bundle.barcode, updated_at = v_now WHERE id = v_item.id;
    INSERT INTO inventory_stock_movements (
      id, item_id, barcode, item_name, type, qty, qty_before, qty_after, operator, note,
      destination, input_barcode, origin_store_id, origin_store_code, origin_store_name, created_at
    ) VALUES (
      gen_random_uuid(), v_item.id, v_item.barcode, v_item.name, 'out', v_qty, v_item.qty_on_hand,
      v_item.qty_on_hand - v_qty, COALESCE(p_pack->>'operator', ''),
      '打包入 ' || v_bundle.barcode, v_item.final_destination, v_item.input_barcode,
      NULLIF(p_pack->>'origin_store_id', '')::UUID, upper(trim(COALESCE(p_pack->>'owner_store_code', ''))),
      COALESCE(p_pack->>'origin_store_name', ''), v_now
    );
    INSERT INTO inventory_packed_shipment_items (id, pack_id, item_id, item_barcode, item_name, qty)
    VALUES (gen_random_uuid(), v_pack.id, v_item.id, v_item.barcode, v_item.name, v_qty);
  END LOOP;

  v_result := jsonb_build_object('bundle_item', to_jsonb(v_bundle), 'pack_id', v_pack.id, 'idempotent', false);
  INSERT INTO inventory_operation_log (operation_id, operation_type, result)
    VALUES (p_operation_id, 'create_pack', v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION inventory_load_shipments(
  p_operation_id UUID,
  p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing JSONB;
  v_pack JSONB;
  v_line JSONB;
  v_item inventory_store_items%ROWTYPE;
  v_pkg inventory_pkg_tracking%ROWTYPE;
  v_local_pack inventory_packed_shipments%ROWTYPE;
  v_pack_code TEXT;
  v_now TIMESTAMPTZ := COALESCE(NULLIF(p_payload->>'loaded_at', '')::TIMESTAMPTZ, now());
  v_result JSONB;
BEGIN
  IF p_operation_id IS NULL OR jsonb_array_length(COALESCE(p_payload->'packs', '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'invalid inventory load operation';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation_id::TEXT, 0));
  SELECT result INTO v_existing FROM inventory_operation_log WHERE operation_id = p_operation_id;
  IF FOUND THEN RETURN v_existing; END IF;

  FOR v_pack IN SELECT value FROM jsonb_array_elements(p_payload->'packs')
  LOOP
    v_pack_code := upper(trim(v_pack->>'bundle_barcode'));
    SELECT * INTO v_local_pack FROM inventory_packed_shipments
      WHERE upper(trim(bundle_barcode)) = v_pack_code FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'packed shipment not found: %', v_pack_code; END IF;
    IF v_local_pack.loaded_at IS NOT NULL THEN RAISE EXCEPTION 'packed shipment already loaded: %', v_pack_code; END IF;

    SELECT * INTO v_item FROM inventory_store_items WHERE id = v_local_pack.bundle_item_id FOR UPDATE;
    IF NOT FOUND OR v_item.qty_on_hand < 1 THEN RAISE EXCEPTION 'package inventory unavailable: %', v_pack_code; END IF;
    UPDATE inventory_store_items SET qty_on_hand = qty_on_hand - 1, updated_at = v_now WHERE id = v_item.id;
    INSERT INTO inventory_stock_movements (
      id, item_id, barcode, item_name, type, qty, qty_before, qty_after, operator, note,
      destination, input_barcode, origin_store_id, origin_store_code, origin_store_name, created_at
    ) VALUES (
      gen_random_uuid(), v_item.id, v_item.barcode, v_item.name, 'out', 1, v_item.qty_on_hand,
      v_item.qty_on_hand - 1, COALESCE(p_payload->>'operator', ''), COALESCE(p_payload->>'note', ''),
      COALESCE(p_payload->>'destination_code', ''), v_item.input_barcode,
      NULLIF(p_payload->>'origin_store_id', '')::UUID, COALESCE(p_payload->>'origin_store_code', ''),
      COALESCE(p_payload->>'origin_store_name', ''), v_now
    );
    UPDATE inventory_packed_shipments SET loaded_at = v_now,
      transport_fee = COALESCE(v_pack->>'transport_fee', ''),
      truck_leg_destination = COALESCE(p_payload->>'destination_code', ''), updated_at = v_now
      WHERE id = v_local_pack.id;

    INSERT INTO inventory_pkg_tracking (
      pack_barcode, pack_name, origin_store_id, origin_store_code, origin_store_name,
      destination_code, leg_destination_code, item_count, total_weight, transport_fee, status,
      truck_outbound_date, truck_loaded_at, updated_at
    ) VALUES (
      v_local_pack.bundle_barcode, COALESCE(v_pack->>'bundle_name', v_local_pack.bundle_name),
      NULLIF(p_payload->>'origin_store_id', '')::UUID, COALESCE(p_payload->>'origin_store_code', ''),
      COALESCE(p_payload->>'origin_store_name', ''), COALESCE(v_pack->>'destination_code', ''),
      COALESCE(p_payload->>'destination_code', ''), jsonb_array_length(COALESCE(v_pack->'lines', '[]'::jsonb)),
      COALESCE(v_pack->>'weight', ''), COALESCE(v_pack->>'transport_fee', ''), 'in_transit',
      NULLIF(p_payload->>'outbound_date', '')::DATE, v_now, v_now
    )
    ON CONFLICT (pack_barcode) DO UPDATE SET
      pack_name = EXCLUDED.pack_name, origin_store_id = EXCLUDED.origin_store_id,
      origin_store_code = EXCLUDED.origin_store_code, origin_store_name = EXCLUDED.origin_store_name,
      destination_code = EXCLUDED.destination_code, leg_destination_code = EXCLUDED.leg_destination_code,
      item_count = EXCLUDED.item_count, total_weight = EXCLUDED.total_weight,
      transport_fee = EXCLUDED.transport_fee, truck_outbound_date = EXCLUDED.truck_outbound_date,
      truck_loaded_at = EXCLUDED.truck_loaded_at, updated_at = EXCLUDED.updated_at
    WHERE inventory_pkg_tracking.status = 'in_transit'
    RETURNING * INTO v_pkg;
    IF NOT FOUND THEN RAISE EXCEPTION 'package tracking status prevents loading: %', v_pack_code; END IF;

    FOR v_line IN SELECT value FROM jsonb_array_elements(COALESCE(v_pack->'lines', '[]'::jsonb))
    LOOP
      INSERT INTO inventory_order_tracking (
        pkg_tracking_id, pack_barcode, order_barcode, express_barcode, order_name,
        destination_code, qty, status, recipient_name, recipient_phone, packaging, spec,
        weight, detail_address, inbound_note, inbound_store_name, inbound_at, updated_at
      ) VALUES (
        v_pkg.id, v_pkg.pack_barcode, v_line->>'item_barcode', COALESCE(v_line->>'input_barcode', ''),
        COALESCE(v_line->>'item_name', ''), COALESCE(v_line->>'destination', ''),
        COALESCE((v_line->>'qty')::INT, 1), 'in_transit', COALESCE(v_line->>'customer_name', ''),
        COALESCE(v_line->>'recipient_phone', ''), COALESCE(v_line->>'packaging', ''),
        COALESCE(v_line->>'spec', ''), COALESCE(v_line->>'weight', ''),
        COALESCE(v_line->>'detail_address', ''), COALESCE(v_line->>'inbound_note', ''),
        COALESCE(v_line->>'inbound_store_name', ''), NULLIF(v_line->>'inbound_at', '')::TIMESTAMPTZ, v_now
      )
      ON CONFLICT (pack_barcode, order_barcode) DO UPDATE SET
        pkg_tracking_id = EXCLUDED.pkg_tracking_id, express_barcode = EXCLUDED.express_barcode,
        order_name = EXCLUDED.order_name, destination_code = EXCLUDED.destination_code,
        qty = EXCLUDED.qty, status = 'in_transit', updated_at = EXCLUDED.updated_at
      WHERE inventory_order_tracking.status = 'in_transit';
      UPDATE inventory_store_items SET hub_transit_shipped_at = v_now, updated_at = v_now
        WHERE id = NULLIF(v_line->>'item_id', '')::UUID AND hub_transit_released_at IS NOT NULL;
    END LOOP;
  END LOOP;

  v_result := jsonb_build_object('count', jsonb_array_length(p_payload->'packs'), 'idempotent', false);
  INSERT INTO inventory_operation_log (operation_id, operation_type, result)
    VALUES (p_operation_id, 'load_shipments', v_result);
  RETURN v_result;
END;
$$;
