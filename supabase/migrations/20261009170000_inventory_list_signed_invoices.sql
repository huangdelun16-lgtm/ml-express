-- 已登录的库存站点可以查找全部已签收发票，和后台 Invoice 页同一份记录。
-- 店号只用来确认是库存账号，不接受客户端传入，也不按店过滤。

CREATE OR REPLACE FUNCTION inventory_list_signed_invoices()
RETURNS SETOF inventory_signed_invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store TEXT := coalesce(auth.jwt() -> 'app_metadata' ->> 'inventory_store_code', '');
BEGIN
  IF v_store = '' THEN
    RAISE EXCEPTION 'inventory store required';
  END IF;
  RETURN QUERY
  SELECT *
  FROM inventory_signed_invoices
  ORDER BY signed_at DESC
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION inventory_list_signed_invoices() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION inventory_list_signed_invoices() TO authenticated;
