-- 跨境登记客户：到货通知偏好（现场 WhatsApp / Telegram / 短信 / 电话 / 微信）

ALTER TABLE cross_border_customers
  ADD COLUMN IF NOT EXISTS notify_method TEXT NOT NULL DEFAULT 'whatsapp';

ALTER TABLE cross_border_customers
  DROP CONSTRAINT IF EXISTS cross_border_customers_notify_method_check;

ALTER TABLE cross_border_customers
  ADD CONSTRAINT cross_border_customers_notify_method_check
  CHECK (notify_method IN ('whatsapp', 'telegram', 'message', 'phone', 'wechat'));

COMMENT ON COLUMN cross_border_customers.notify_method IS
  '到货通知偏好：whatsapp | telegram | message | phone | wechat';

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
    'notify_method', COALESCE(v_row.notify_method, 'whatsapp')
  );
END;
$$;

REVOKE ALL ON FUNCTION lookup_cross_border_customer(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_cross_border_customer(TEXT) TO authenticated;
