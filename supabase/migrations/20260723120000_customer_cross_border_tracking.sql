-- 客户端 Track Order：按快递单号 / 入库单号查询 Inventory 跨境物流状态（公开只读 RPC）

CREATE INDEX IF NOT EXISTS idx_inv_store_items_input_barcode
  ON inventory_store_items (UPPER(TRIM(input_barcode)))
  WHERE COALESCE(TRIM(input_barcode), '') <> '';

CREATE OR REPLACE FUNCTION inventory_normalize_hub_token(p_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(TRIM(p_code), '') = '' THEN ''
    WHEN UPPER(TRIM(p_code)) IN ('RUILI', 'RUI') THEN 'RUILI'
    WHEN UPPER(TRIM(p_code)) IN ('MUSE', 'MSE', 'MUS') THEN 'MUSE'
    ELSE UPPER(REGEXP_REPLACE(TRIM(p_code), '[0-9]+$', ''))
  END;
$$;

CREATE OR REPLACE FUNCTION inventory_hub_label_zh(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE inventory_normalize_hub_token(p_token)
    WHEN 'RUILI' THEN '瑞丽'
    WHEN 'MUSE' THEN '木姐'
    WHEN 'MDY' THEN '曼德勒'
    WHEN 'YGN' THEN '仰光'
    WHEN 'TGI' THEN '东枝'
    WHEN 'NPW' THEN '内比都'
    WHEN 'POL' THEN '彬乌伦'
    WHEN 'LSO' THEN '腊戌'
    ELSE COALESCE(NULLIF(TRIM(p_token), ''), '发站')
  END;
$$;

CREATE OR REPLACE FUNCTION inventory_hub_label_en(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE inventory_normalize_hub_token(p_token)
    WHEN 'RUILI' THEN 'Ruili'
    WHEN 'MUSE' THEN 'Muse'
    WHEN 'MDY' THEN 'Mandalay'
    WHEN 'YGN' THEN 'Yangon'
    WHEN 'TGI' THEN 'Taunggyi'
    WHEN 'NPW' THEN 'Naypyidaw'
    WHEN 'POL' THEN 'Pyin Oo Lwin'
    WHEN 'LSO' THEN 'Lashio'
    ELSE COALESCE(NULLIF(TRIM(p_token), ''), 'Origin')
  END;
$$;

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
  v_events JSONB := '[]'::JSONB;
  v_current_key TEXT := 'unknown';
  v_origin_arrived_at TIMESTAMPTZ;
  v_match_type TEXT;
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

  SELECT MIN(ps.loaded_at)
  INTO v_loaded_at
  FROM inventory_packed_shipment_items psi
  JOIN inventory_packed_shipments ps ON ps.id = psi.pack_id
  WHERE psi.item_id = v_item.id
    AND ps.loaded_at IS NOT NULL;

  IF v_loaded_at IS NULL AND NULLIF(TRIM(v_item.hub_transit_shipped_at::TEXT), '') IS NOT NULL THEN
    v_loaded_at := v_item.hub_transit_shipped_at;
  END IF;

  IF v_first_inbound.id IS NOT NULL THEN
    v_origin_arrived_at := v_first_inbound.created_at;
    v_events := v_events || jsonb_build_object(
      'status_key', 'origin_arrived',
      'labels', jsonb_build_object(
        'zh', '已到达' || inventory_hub_label_zh(v_origin_token) || '仓库',
        'en', 'Arrived at ' || inventory_hub_label_en(v_origin_token) || ' warehouse',
        'my', inventory_hub_label_en(v_origin_token) || ' warehouse reached'
      ),
      'event_time', v_origin_arrived_at,
      'note', COALESCE(NULLIF(TRIM(v_first_inbound.origin_store_name), ''), inventory_hub_label_zh(v_origin_token) || ' 入库登记')
    );
  END IF;

  IF v_loaded_at IS NOT NULL THEN
    v_events := v_events || jsonb_build_object(
      'status_key', 'loaded',
      'labels', jsonb_build_object(
        'zh', '已装车',
        'en', 'Loaded on truck',
        'my', 'Loaded on truck'
      ),
      'event_time', v_loaded_at,
      'note', CASE
        WHEN inventory_normalize_hub_token(v_origin_token) = 'RUILI' THEN '已从瑞丽仓库装车发出'
        ELSE '已从' || inventory_hub_label_zh(v_origin_token) || '仓库装车发出'
      END
    );
  END IF;

  IF NULLIF(TRIM(v_item.hub_arrived_at::TEXT), '') IS NOT NULL THEN
    v_events := v_events || jsonb_build_object(
      'status_key', 'destination_arrived',
      'labels', jsonb_build_object(
        'zh', '已抵达目的地',
        'en', 'Arrived at destination',
        'my', 'Arrived at destination'
      ),
      'event_time', v_item.hub_arrived_at,
      'note', CASE
        WHEN v_dest_token <> '' THEN inventory_hub_label_zh(v_dest_token) || ' 站点已入库'
        ELSE '目的地站点已入库'
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
      'note', '客户已签收'
    );
  END IF;

  IF NULLIF(TRIM(v_item.customer_signed_at::TEXT), '') IS NOT NULL THEN
    v_current_key := 'signed';
  ELSIF NULLIF(TRIM(v_item.hub_arrived_at::TEXT), '') IS NOT NULL THEN
    v_current_key := 'destination_arrived';
  ELSIF v_loaded_at IS NOT NULL THEN
    v_current_key := 'loaded';
  ELSIF v_first_inbound.id IS NOT NULL THEN
    v_current_key := 'origin_arrived';
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
        WHEN 'destination_arrived' THEN '已抵达目的地'
        WHEN 'loaded' THEN '已装车'
        WHEN 'origin_arrived' THEN '已到达' || inventory_hub_label_zh(v_origin_token) || '仓库'
        WHEN 'registered' THEN '已登记'
        ELSE '处理中'
      END,
      'en', CASE v_current_key
        WHEN 'signed' THEN 'Delivered & signed'
        WHEN 'destination_arrived' THEN 'Arrived at destination'
        WHEN 'loaded' THEN 'Loaded on truck'
        WHEN 'origin_arrived' THEN 'Arrived at ' || inventory_hub_label_en(v_origin_token) || ' warehouse'
        WHEN 'registered' THEN 'Registered'
        ELSE 'Processing'
      END,
      'my', CASE v_current_key
        WHEN 'signed' THEN 'Signed'
        WHEN 'destination_arrived' THEN 'Arrived at destination'
        WHEN 'loaded' THEN 'Loaded on truck'
        WHEN 'origin_arrived' THEN inventory_hub_label_en(v_origin_token) || ' warehouse reached'
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

REVOKE ALL ON FUNCTION track_cross_border_shipment(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION track_cross_border_shipment(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION track_cross_border_shipment(TEXT) IS
  'Client App 公开查询：按快递单号或入库单号返回 Inventory 跨境物流状态与时间线';
