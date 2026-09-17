-- 客户端跨境追踪：补齐已入库 / 待装车 / 已装车 / 已到达 / 已签收时间线明细

CREATE OR REPLACE FUNCTION track_cross_border_shipment(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := UPPER(TRIM(COALESCE(p_code, '')));
  v_item inventory_store_items%ROWTYPE;
  v_first_inbound inventory_stock_movements%ROWTYPE;
  v_origin_token TEXT;
  v_dest_token TEXT;
  v_loaded_at TIMESTAMPTZ;
  v_pack_barcode TEXT := '';
  v_trip_number TEXT := '';
  v_events JSONB := '[]'::JSONB;
  v_current_key TEXT := 'unknown';
  v_origin_arrived_at TIMESTAMPTZ;
  v_match_type TEXT;
  v_loaded_note_zh TEXT;
  v_loaded_note_en TEXT;
BEGIN
  IF length(v_code) < 3 THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_item
  FROM inventory_store_items
  WHERE UPPER(TRIM(barcode)) = v_code
     OR UPPER(TRIM(COALESCE(input_barcode, ''))) = v_code
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_match_type := CASE
    WHEN UPPER(TRIM(v_item.barcode)) = v_code THEN 'inbound'
    ELSE 'express'
  END;

  SELECT *
  INTO v_first_inbound
  FROM inventory_stock_movements
  WHERE item_id = v_item.id
    AND type = 'in'
    AND COALESCE(note, '') NOT ILIKE '%中转站到站%'
    AND COALESCE(note, '') NOT ILIKE '%中转站释放%'
  ORDER BY created_at ASC
  LIMIT 1;

  v_origin_token := inventory_normalize_hub_token(
    COALESCE(NULLIF(TRIM(v_first_inbound.origin_store_code), ''), NULLIF(TRIM(v_item.owner_store_code), ''), 'RUILI')
  );
  v_dest_token := inventory_normalize_hub_token(COALESCE(NULLIF(TRIM(v_item.final_destination), ''), ''));

  SELECT ps.loaded_at, COALESCE(ps.bundle_barcode, ''), COALESCE(ps.trip_number, '')
  INTO v_loaded_at, v_pack_barcode, v_trip_number
  FROM inventory_packed_shipment_items psi
  JOIN inventory_packed_shipments ps ON ps.id = psi.pack_id
  WHERE psi.item_id = v_item.id
    AND ps.loaded_at IS NOT NULL
  ORDER BY ps.loaded_at ASC
  LIMIT 1;

  IF v_loaded_at IS NULL AND NULLIF(TRIM(v_item.hub_transit_shipped_at::TEXT), '') IS NOT NULL THEN
    v_loaded_at := v_item.hub_transit_shipped_at;
  END IF;

  IF COALESCE(v_pack_barcode, '') = '' THEN
    v_pack_barcode := COALESCE(NULLIF(TRIM(v_item.packed_bundle_barcode), ''), '');
  END IF;

  IF v_first_inbound.id IS NOT NULL THEN
    v_origin_arrived_at := v_first_inbound.created_at;
    v_events := v_events || jsonb_build_object(
      'status_key', 'inbound',
      'labels', jsonb_build_object(
        'zh', '已入库',
        'en', 'Warehoused',
        'my', 'Warehoused'
      ),
      'event_time', v_origin_arrived_at,
      'note', '已在' || inventory_hub_label_zh(v_origin_token) || '仓库完成入库登记'
    );
  END IF;

  IF v_first_inbound.id IS NOT NULL AND v_loaded_at IS NULL
     AND NULLIF(TRIM(v_item.hub_arrived_at::TEXT), '') IS NULL THEN
    v_events := v_events || jsonb_build_object(
      'status_key', 'pending_load',
      'labels', jsonb_build_object(
        'zh', '待装车',
        'en', 'Awaiting truck load',
        'my', 'Awaiting truck load'
      ),
      'event_time', COALESCE(v_item.packed_at, v_origin_arrived_at),
      'note', CASE
        WHEN v_dest_token <> '' THEN '正在' || inventory_hub_label_zh(v_origin_token) || '仓库等待装车，发往' || inventory_hub_label_zh(v_dest_token)
        ELSE '正在' || inventory_hub_label_zh(v_origin_token) || '仓库等待装车'
      END
    );
  END IF;

  IF v_loaded_at IS NOT NULL THEN
    v_loaded_note_zh := '已从' || inventory_hub_label_zh(v_origin_token) || '仓库装车发出';
    v_loaded_note_en := 'Loaded at ' || inventory_hub_label_en(v_origin_token);
    IF v_dest_token <> '' THEN
      v_loaded_note_zh := v_loaded_note_zh || '，运往' || inventory_hub_label_zh(v_dest_token);
      v_loaded_note_en := v_loaded_note_en || ' for ' || inventory_hub_label_en(v_dest_token);
    END IF;
    IF v_pack_barcode <> '' THEN
      v_loaded_note_zh := v_loaded_note_zh || ' · 快递包 ' || v_pack_barcode;
      v_loaded_note_en := v_loaded_note_en || ' · pack ' || v_pack_barcode;
    END IF;
    IF v_trip_number <> '' THEN
      v_loaded_note_zh := v_loaded_note_zh || ' · 车次 ' || v_trip_number;
      v_loaded_note_en := v_loaded_note_en || ' · trip ' || v_trip_number;
    END IF;
    v_events := v_events || jsonb_build_object(
      'status_key', 'loaded',
      'labels', jsonb_build_object(
        'zh', '已装车',
        'en', 'Loaded on truck',
        'my', 'Loaded on truck'
      ),
      'event_time', v_loaded_at,
      'note', v_loaded_note_zh
    );
  END IF;

  IF NULLIF(TRIM(v_item.hub_arrived_at::TEXT), '') IS NOT NULL THEN
    v_events := v_events || jsonb_build_object(
      'status_key', 'destination_arrived',
      'labels', jsonb_build_object(
        'zh', '已到达',
        'en', 'Arrived',
        'my', 'Arrived'
      ),
      'event_time', v_item.hub_arrived_at,
      'note', CASE
        WHEN v_dest_token <> '' THEN '货物已到达' || inventory_hub_label_zh(v_dest_token) || '站点，可安排取件'
        ELSE '货物已到达目的地站点，可安排取件'
      END
    );
  END IF;

  IF NULLIF(TRIM(v_item.customer_signed_at::TEXT), '') IS NOT NULL THEN
    v_events := v_events || jsonb_build_object(
      'status_key', 'signed',
      'labels', jsonb_build_object(
        'zh', '已签收',
        'en', 'Delivered & signed',
        'my', 'Signed'
      ),
      'event_time', v_item.customer_signed_at,
      'note', '客户已签收货物'
    );
  END IF;

  IF NULLIF(TRIM(v_item.customer_signed_at::TEXT), '') IS NOT NULL THEN
    v_current_key := 'signed';
  ELSIF NULLIF(TRIM(v_item.hub_arrived_at::TEXT), '') IS NOT NULL THEN
    v_current_key := 'destination_arrived';
  ELSIF v_loaded_at IS NOT NULL THEN
    v_current_key := 'loaded';
  ELSIF v_first_inbound.id IS NOT NULL THEN
    v_current_key := 'pending_load';
  ELSE
    v_current_key := 'registered';
  END IF;

  RETURN jsonb_build_object(
    'kind', 'cross_border',
    'query', TRIM(p_code),
    'match_type', v_match_type,
    'order_barcode', v_item.barcode,
    'express_barcode', COALESCE(v_item.input_barcode, ''),
    'recipient_name', COALESCE(v_item.recipient_name, ''),
    'final_destination', COALESCE(v_item.final_destination, ''),
    'final_destination_label', CASE
      WHEN v_dest_token <> '' THEN jsonb_build_object(
        'zh', inventory_hub_label_zh(v_dest_token),
        'en', inventory_hub_label_en(v_dest_token)
      )
      ELSE NULL
    END,
    'origin_label', jsonb_build_object(
      'zh', inventory_hub_label_zh(v_origin_token),
      'en', inventory_hub_label_en(v_origin_token)
    ),
    'weight', COALESCE(v_item.weight, ''),
    'product_name', COALESCE(v_item.name, ''),
    'current_status_key', v_current_key,
    'current_status', jsonb_build_object(
      'zh', CASE v_current_key
        WHEN 'signed' THEN '已签收'
        WHEN 'destination_arrived' THEN '已到达' || CASE WHEN v_dest_token <> '' THEN inventory_hub_label_zh(v_dest_token) ELSE '目的地' END
        WHEN 'loaded' THEN '已装车'
        WHEN 'pending_load' THEN '待装车'
        WHEN 'inbound' THEN '已入库'
        WHEN 'origin_arrived' THEN '已入库'
        WHEN 'registered' THEN '已登记'
        ELSE '处理中'
      END,
      'en', CASE v_current_key
        WHEN 'signed' THEN 'Delivered & signed'
        WHEN 'destination_arrived' THEN 'Arrived at destination'
        WHEN 'loaded' THEN 'Loaded on truck'
        WHEN 'pending_load' THEN 'Awaiting truck load'
        WHEN 'inbound' THEN 'Warehoused'
        WHEN 'origin_arrived' THEN 'Warehoused'
        WHEN 'registered' THEN 'Registered'
        ELSE 'Processing'
      END,
      'my', CASE v_current_key
        WHEN 'signed' THEN 'Signed'
        WHEN 'destination_arrived' THEN 'Arrived'
        WHEN 'loaded' THEN 'Loaded on truck'
        WHEN 'pending_load' THEN 'Awaiting truck load'
        WHEN 'inbound' THEN 'Warehoused'
        WHEN 'origin_arrived' THEN 'Warehoused'
        WHEN 'registered' THEN 'Registered'
        ELSE 'Processing'
      END
    ),
    'events', (
      SELECT COALESCE(jsonb_agg(evt ORDER BY (evt->>'event_time') ASC NULLS LAST), '[]'::JSONB)
      FROM jsonb_array_elements(v_events) AS evt
    )
  );
END;
$$;

COMMENT ON FUNCTION track_cross_border_shipment(TEXT) IS
  'Client App 公开查询：按快递单号或入库单号返回跨境物流完整时间线（已入库/待装车/已装车/已到达/已签收）';
