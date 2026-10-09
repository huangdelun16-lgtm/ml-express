-- 到站签收的 Invoice 窗口只列出货已经签完的发票。
-- 点「签收」会先开号，签收没完成的不出现。

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
  SELECT inv.*
  FROM inventory_signed_invoices inv
  WHERE COALESCE(cardinality(inv.item_ids), 0) > 0
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(inv.item_ids) AS item_id
      LEFT JOIN inventory_store_items AS item ON item.id = item_id
      WHERE item.customer_signed_at IS NULL
    )
  ORDER BY inv.signed_at DESC
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION inventory_list_signed_invoices() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION inventory_list_signed_invoices() TO authenticated;
