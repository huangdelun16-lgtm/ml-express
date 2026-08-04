-- Admin 总支出：无 trip_number 时按装车批次（origin + leg + 分钟）去重车费

CREATE OR REPLACE FUNCTION public.inventory_admin_transport_fee_total()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH parsed AS (
    SELECT
      UPPER(TRIM(COALESCE(trip_number, ''))) AS trip_no,
      UPPER(TRIM(pack_barcode)) AS pack_code,
      truck_loaded_at,
      UPPER(TRIM(COALESCE(origin_store_code, ''))) AS origin_code,
      UPPER(TRIM(COALESCE(leg_destination_code, destination_code, ''))) AS leg_code,
      CASE
        WHEN transport_fee IS NULL OR btrim(transport_fee) = '' THEN 0::numeric
        WHEN btrim(transport_fee) ~ '^-?[0-9]+(\.[0-9]+)?$' THEN btrim(transport_fee)::numeric
        ELSE COALESCE(
          NULLIF(regexp_replace(btrim(transport_fee), '[^0-9.]', '', 'g'), '')::numeric,
          0::numeric
        )
      END AS fee_num
    FROM inventory_pkg_tracking
    WHERE status IS DISTINCT FROM 'cancelled'
  ),
  grouped AS (
    SELECT
      CASE
        WHEN trip_no <> '' THEN 'trip:' || trip_no
        WHEN truck_loaded_at IS NOT NULL
          AND origin_code <> ''
          AND leg_code <> ''
          THEN 'load:' || origin_code || ':' || leg_code || ':' ||
            (floor(extract(epoch FROM truck_loaded_at) / 60))::bigint
        ELSE 'pack:' || pack_code
      END AS group_key,
      MAX(fee_num) AS trip_fee
    FROM parsed
    GROUP BY 1
  )
  SELECT COALESCE(SUM(trip_fee), 0)::bigint FROM grouped;
$$;

COMMENT ON FUNCTION public.inventory_admin_transport_fee_total IS
  'Admin 跨境物流 overview：登记车费合计（同一 trip_number 或同一装车批次只计一次）';
