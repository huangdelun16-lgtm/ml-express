-- 到站签收的 Invoice 窗口按页往下翻，避免只看见最近 200 张。
-- 仍然只列出货已经签完的发票。

DROP FUNCTION IF EXISTS inventory_list_signed_invoices();

CREATE FUNCTION inventory_list_signed_invoices(p_offset int DEFAULT 0)
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
  SELECT inv.*
  FROM inventory_signed_invoices inv
  WHERE COALESCE(cardinality(inv.item_ids), 0) > 0
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(inv.item_ids) AS item_id
      LEFT JOIN inventory_store_items AS item ON item.id = item_id
      WHERE item.customer_signed_at IS NULL
    )
  ORDER BY inv.signed_at DESC, inv.id DESC
  OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  LIMIT 40;
END;
$$;

REVOKE ALL ON FUNCTION inventory_list_signed_invoices(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION inventory_list_signed_invoices(int) TO authenticated;
