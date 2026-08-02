-- 多个入库：店码校验改用 owner 归一化匹配；打包明细 RLS 与 shipments 一致

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
      origin_store_id, origin_store_code, origin_store_name, created_at
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
      v_now
    );

    INSERT INTO inventory_packed_shipment_items (id, pack_id, item_id, item_barcode, item_name, qty)
    VALUES (gen_random_uuid(), v_pack.id, v_item.id, v_item.barcode, v_item.name, v_qty);
  END LOOP;

  v_result := jsonb_build_object(
    'bundle_item', to_jsonb(v_bundle),
    'pack_id', v_pack.id,
    'idempotent', false
  );
  INSERT INTO inventory_operation_log (operation_id, operation_type, result)
    VALUES (p_operation_id, 'packaging_stock_in_batch', v_result);
  RETURN v_result;
END;
$$;

DROP POLICY IF EXISTS "inventory_packed_shipment_items_access" ON inventory_packed_shipment_items;
CREATE POLICY "inventory_packed_shipment_items_access" ON inventory_packed_shipment_items
  FOR ALL TO authenticated
  USING (
    inventory_session_active()
    AND EXISTS (
      SELECT 1 FROM inventory_packed_shipments p
      WHERE p.id = inventory_packed_shipment_items.pack_id
        AND (
          p.owner_store_id = inventory_jwt_store_id()
          OR inventory_owner_code_matches(p.owner_store_code)
        )
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND EXISTS (
      SELECT 1 FROM inventory_packed_shipments p
      WHERE p.id = inventory_packed_shipment_items.pack_id
        AND (
          p.owner_store_id = inventory_jwt_store_id()
          OR inventory_owner_code_matches(p.owner_store_code)
        )
    )
  );
