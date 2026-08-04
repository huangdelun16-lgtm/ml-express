-- 目的地站签收：包内订单最终目的地均为本站时，允许确认到站（即使 leg_destination_code 为中转站）
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
    VALUES (p_operation_id, 'confirm_hub_received', v_result);
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION inventory_confirm_pkg_hub_received(UUID, TEXT, UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION inventory_confirm_pkg_hub_received(UUID, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
