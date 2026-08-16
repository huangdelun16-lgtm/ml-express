-- 多个入库：包装号不得复用旧包；只返回本次写入的订单行（避免打包页显示旧快递单）

ALTER TABLE inventory_packed_shipment_items
  ADD COLUMN IF NOT EXISTS input_barcode TEXT NOT NULL DEFAULT '';

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
  v_line_ids UUID[] := ARRAY[]::UUID[];
  v_express TEXT;
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

  IF EXISTS (
    SELECT 1 FROM inventory_packed_shipments
    WHERE upper(trim(bundle_barcode)) = v_bundle_code
  ) THEN
    RAISE EXCEPTION 'package barcode taken: %', v_bundle_code;
  END IF;

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
  RETURNING * INTO v_pack;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_payload->'lines')
  LOOP
    v_qty := GREATEST(COALESCE((v_line->>'qty')::NUMERIC, 1), 1);
    v_express := trim(COALESCE(v_line->>'input_barcode', ''));

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
        v_express,
        COALESCE(v_line->>'name', v_express),
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
        input_barcode = CASE WHEN v_express <> '' THEN v_express ELSE input_barcode END,
        name = COALESCE(NULLIF(v_line->>'name', ''), name),
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

    v_line_ids := array_append(v_line_ids, v_item.id);

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
      COALESCE(NULLIF(v_express, ''), v_item.input_barcode),
      v_store_id,
      v_store_code,
      COALESCE(p_payload->>'store_name', ''),
      v_customer_code,
      v_now
    );

    INSERT INTO inventory_packed_shipment_items (
      id, pack_id, item_id, item_barcode, item_name, qty, input_barcode
    )
    VALUES (
      gen_random_uuid(),
      v_pack.id,
      v_item.id,
      v_item.barcode,
      v_item.name,
      v_qty,
      COALESCE(NULLIF(v_express, ''), v_item.input_barcode)
    );
  END LOOP;

  v_result := jsonb_build_object(
    'bundle_item', to_jsonb(v_bundle),
    'pack_id', v_pack.id,
    'pack', to_jsonb(v_pack),
    'line_items', COALESCE((
      SELECT jsonb_agg(to_jsonb(i) ORDER BY i.barcode)
      FROM inventory_store_items i
      WHERE i.id = ANY(v_line_ids)
    ), '[]'::jsonb),
    'idempotent', false
  );
  INSERT INTO inventory_operation_log (operation_id, operation_type, result)
    VALUES (p_operation_id, 'packaging_stock_in_batch', v_result);
  RETURN v_result;
END;
$$;
