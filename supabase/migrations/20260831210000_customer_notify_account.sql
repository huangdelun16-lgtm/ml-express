-- 跨境客户到货通知账号（WhatsApp 号、Telegram @、微信号等）

ALTER TABLE cross_border_customers
  ADD COLUMN IF NOT EXISTS notify_account TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN cross_border_customers.notify_account IS
  '到货通知账号：与 notify_method 对应的 WhatsApp / Telegram / 短信 / 电话 / 微信号';

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
    'delivery_region_id', v_row.delivery_region_id,
    'notify_method', COALESCE(v_row.notify_method, 'whatsapp'),
    'notify_account', COALESCE(v_row.notify_account, '')
  );
END;
$$;

REVOKE ALL ON FUNCTION lookup_cross_border_customer(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_cross_border_customer(TEXT) TO authenticated;
