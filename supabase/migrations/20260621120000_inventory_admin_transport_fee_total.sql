-- Admin 跨境物流 overview：数据库侧 SUM 车费，避免拉全表再在 JS 求和

CREATE OR REPLACE FUNCTION public.inventory_admin_transport_fee_total()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE
      WHEN transport_fee IS NULL OR btrim(transport_fee) = '' THEN 0::numeric
      WHEN btrim(transport_fee) ~ '^-?[0-9]+(\.[0-9]+)?$' THEN btrim(transport_fee)::numeric
      ELSE COALESCE(
        NULLIF(regexp_replace(btrim(transport_fee), '[^0-9.]', '', 'g'), '')::numeric,
        0::numeric
      )
    END
  ), 0)::bigint
  FROM inventory_pkg_tracking
  WHERE status IS DISTINCT FROM 'cancelled';
$$;

COMMENT ON FUNCTION public.inventory_admin_transport_fee_total IS
  'Admin 跨境物流 overview：登记车费合计（与 inventory-admin-data JS 解析规则对齐）';

GRANT EXECUTE ON FUNCTION public.inventory_admin_transport_fee_total() TO service_role;
