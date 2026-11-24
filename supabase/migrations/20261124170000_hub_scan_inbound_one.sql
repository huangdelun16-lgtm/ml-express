-- 到站扫码入库：一单的追踪状态、库存和入库流水在同一次数据库动作里完成。

CREATE OR REPLACE FUNCTION inventory_hub_scan_inbound_one(
  p_operation_id UUID,
  p_order_id UUID,
  p_hub_code TEXT,
  p_operator TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing JSONB;
  v_order inventory_order_tracking%ROWTYPE;
  v_pkg inventory_pkg_tracking%ROWTYPE;
  v_item inventory_store_items%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_hub TEXT := upper(trim(coalesce(p_hub_code, '')));
  v_jwt_hub TEXT := upper(trim(inventory_jwt_hub_code()));
  v_order_dest TEXT;
  v_leg TEXT;
  v_qty NUMERIC;
  v_arrived TIMESTAMPTZ;
  v_item_json JSONB;
  v_move_json JSONB;
  v_result JSONB;
BEGIN
  IF p_operation_id IS NULL OR p_order_id IS NULL OR NOT inventory_session_active() THEN
    RAISE EXCEPTION 'invalid inventory session';
  END IF;
  IF v_hub = '' OR v_hub <> v_jwt_hub THEN
    RAISE EXCEPTION 'inventory station identity mismatch';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_operation_id::TEXT, 0));
  SELECT result INTO v_existing FROM inventory_operation_log WHERE operation_id = p_operation_id;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  SELECT * INTO v_order FROM inventory_order_tracking WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
  END IF;
  IF v_order.status = 'released_at_hub' THEN
    RAISE EXCEPTION 'order released for repack';
  END IF;

  SELECT * INTO v_pkg
  FROM inventory_pkg_tracking
  WHERE pack_barcode = v_order.pack_barcode
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pack not found';
  END IF;

  v_order_dest := upper(trim(coalesce(v_order.destination_code, '')));
  v_leg := upper(trim(coalesce(v_pkg.leg_destination_code, v_pkg.destination_code, '')));
  IF v_order_dest <> v_hub AND v_leg <> v_hub THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'transit');
  END IF;

  IF v_pkg.status = 'in_transit' THEN
    UPDATE inventory_pkg_tracking
    SET status = 'hub_received',
        hub_received_at = v_now,
        hub_received_by_store_id = inventory_jwt_store_id(),
        hub_received_by_store_code = upper(trim(inventory_jwt_store_code())),
        hub_received_by_store_name = coalesce(
          (SELECT store_name FROM delivery_stores WHERE id = inventory_jwt_store_id()),
          ''
        ),
        updated_at = v_now
    WHERE id = v_pkg.id;
    v_pkg.status := 'hub_received';
    v_pkg.hub_received_at := v_now;
  END IF;

  IF v_order.status = 'in_transit' THEN
    UPDATE inventory_order_tracking
    SET status = 'hub_received',
        hub_received_at = v_now,
        hub_received_by_store_code = upper(trim(inventory_jwt_store_code())),
        hub_received_by_store_name = coalesce(
          (SELECT store_name FROM delivery_stores WHERE id = inventory_jwt_store_id()),
          ''
        ),
        updated_at = v_now
    WHERE id = v_order.id;
    v_order.status := 'hub_received';
    v_order.hub_received_at := v_now;
  END IF;

  v_arrived := coalesce(v_order.hub_received_at, v_pkg.hub_received_at, v_now);
  v_qty := greatest(1, coalesce(v_order.qty, 1));

  SELECT * INTO v_item
  FROM inventory_store_items
  WHERE barcode = trim(v_order.order_barcode)
  FOR UPDATE;

  IF FOUND AND v_item.customer_signed_at IS NOT NULL THEN
    v_result := jsonb_build_object('applied', true, 'reason', 'already_signed', 'idempotent', true);
    INSERT INTO inventory_operation_log (operation_id, operation_type, result)
      VALUES (p_operation_id, 'hub_scan_inbound', v_result)
    ON CONFLICT (operation_id) DO NOTHING;
    RETURN v_result;
  END IF;

  IF NOT FOUND OR v_item.qty_on_hand < 1 THEN
    v_item_json := jsonb_build_object(
      'barcode', trim(v_order.order_barcode),
      'input_barcode', coalesce(v_order.express_barcode, ''),
      'name', coalesce(nullif(trim(v_order.order_name), ''), trim(v_order.order_barcode)),
      'spec', coalesce(v_order.spec, ''),
      'unit', v_qty::TEXT || ' Pcs',
      'weight', coalesce(v_order.weight, ''),
      'min_qty', 0,
      'note', '到站交付 · 包 ' || v_order.pack_barcode,
      'owner_store_code', coalesce(v_pkg.origin_store_code, ''),
      'recipient_name', coalesce(v_order.recipient_name, ''),
      'final_destination', coalesce(nullif(trim(v_order.destination_code), ''), v_hub),
      'hub_arrived_at', v_arrived,
      'delivery_hub_code', v_hub,
      'qty_on_hand', 0,
      'created_at', v_now,
      'updated_at', v_now
    );
    v_move_json := jsonb_build_object(
      'type', 'in',
      'qty', v_qty,
      'operator', coalesce(p_operator, ''),
      'note', '到站交付确认 · 包 ' || v_order.pack_barcode,
      'item_name', coalesce(nullif(trim(v_order.order_name), ''), trim(v_order.order_barcode)),
      'recipient_name', coalesce(v_order.recipient_name, ''),
      'recipient_phone', coalesce(v_order.recipient_phone, ''),
      'destination', coalesce(nullif(trim(v_order.destination_code), ''), v_hub),
      'detail_address', coalesce(v_order.detail_address, ''),
      'packaging', coalesce(v_order.packaging, ''),
      'input_barcode', coalesce(v_order.express_barcode, ''),
      'origin_store_id', v_pkg.origin_store_id,
      'origin_store_code', coalesce(v_pkg.origin_store_code, ''),
      'origin_store_name', coalesce(v_order.inbound_store_name, v_pkg.origin_store_name, ''),
      'created_at', coalesce(v_order.inbound_at, v_arrived)
    );
    PERFORM inventory_apply_stock_movement(p_operation_id, v_item_json, v_move_json);
  ELSE
    v_result := jsonb_build_object('applied', true, 'reason', 'already_stocked', 'idempotent', true);
    INSERT INTO inventory_operation_log (operation_id, operation_type, result)
      VALUES (p_operation_id, 'hub_scan_inbound', v_result)
    ON CONFLICT (operation_id) DO NOTHING;
  END IF;

  UPDATE inventory_store_items
  SET hub_arrived_at = coalesce(hub_arrived_at, v_arrived),
      delivery_hub_code = v_hub,
      hub_transit_released_at = NULL,
      hub_transit_shipped_at = NULL,
      recipient_name = coalesce(nullif(trim(v_order.recipient_name), ''), recipient_name),
      final_destination = coalesce(nullif(trim(v_order.destination_code), ''), final_destination),
      packed_bundle_barcode = CASE
        WHEN btrim(coalesce(packed_bundle_barcode, '')) = '' THEN v_order.pack_barcode
        ELSE packed_bundle_barcode
      END,
      updated_at = v_now
  WHERE barcode = trim(v_order.order_barcode);

  IF NOT EXISTS (
    SELECT 1 FROM inventory_order_tracking
    WHERE pack_barcode = v_order.pack_barcode AND status = 'in_transit'
  ) THEN
    UPDATE inventory_pkg_tracking
    SET status = CASE
          WHEN EXISTS (
            SELECT 1 FROM inventory_order_tracking
            WHERE pack_barcode = v_order.pack_barcode AND status = 'released_at_hub'
          ) THEN 'split_at_hub'
          ELSE 'completed'
        END,
        completed_at = v_now,
        updated_at = v_now
    WHERE id = v_pkg.id
      AND status NOT IN ('completed', 'split_at_hub', 'cancelled');
  END IF;

  RETURN jsonb_build_object('applied', true, 'reason', 'stocked');
END;
$$;
