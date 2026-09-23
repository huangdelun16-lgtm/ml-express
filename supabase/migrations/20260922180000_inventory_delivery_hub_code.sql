-- 装车运达站可以和客户地区不同：POL 客户的货若运达站是 MDY，就在 MDY 入库并签收到账。
-- final_destination 仍是客户地区。delivery_hub_code 记录本段终点。

ALTER TABLE inventory_store_items
  ADD COLUMN IF NOT EXISTS delivery_hub_code TEXT;

COMMENT ON COLUMN inventory_store_items.delivery_hub_code IS
  '本段运达站。装车时选定的终点；可与 final_destination（客户地区）不同';

CREATE INDEX IF NOT EXISTS idx_inventory_store_items_delivery_hub
  ON inventory_store_items (delivery_hub_code)
  WHERE delivery_hub_code IS NOT NULL AND customer_signed_at IS NULL;

CREATE OR REPLACE FUNCTION public.inventory_dest_same(a text, b text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE upper(trim(coalesce(a, '')))
      WHEN 'MUSE' THEN 'MSE'
      WHEN 'RUILI' THEN 'RUI'
      ELSE upper(trim(coalesce(a, '')))
    END
    =
    CASE upper(trim(coalesce(b, '')))
      WHEN 'MUSE' THEN 'MSE'
      WHEN 'RUILI' THEN 'RUI'
      ELSE upper(trim(coalesce(b, '')))
    END
    AND upper(trim(coalesce(a, ''))) <> '';
$$;

COMMENT ON FUNCTION public.inventory_dest_same(text, text) IS
  '比较库存目的地码，MUSE/MSE、RUILI/RUI 视为同一站';

-- 运达站账号要能读、改发站已经建好的订单行（旧行还没有 hub_arrived_at / delivery_hub_code）
DROP POLICY IF EXISTS "inventory_store_items_leg_delivery_select" ON inventory_store_items;
CREATE POLICY "inventory_store_items_leg_delivery_select"
  ON inventory_store_items
  FOR SELECT TO authenticated
  USING (
    inventory_session_active()
    AND (
      public.inventory_dest_same(delivery_hub_code, inventory_jwt_hub_code())
      OR EXISTS (
        SELECT 1
        FROM inventory_order_tracking o
        JOIN inventory_pkg_tracking p ON p.pack_barcode = o.pack_barcode
        WHERE upper(trim(o.order_barcode)) = upper(trim(inventory_store_items.barcode))
          AND public.inventory_dest_same(
            coalesce(nullif(trim(p.leg_destination_code), ''), p.destination_code),
            inventory_jwt_hub_code()
          )
      )
    )
  );

DROP POLICY IF EXISTS "inventory_store_items_leg_delivery_update" ON inventory_store_items;
CREATE POLICY "inventory_store_items_leg_delivery_update"
  ON inventory_store_items
  FOR UPDATE TO authenticated
  USING (
    inventory_session_active()
    AND (
      public.inventory_dest_same(delivery_hub_code, inventory_jwt_hub_code())
      OR EXISTS (
        SELECT 1
        FROM inventory_order_tracking o
        JOIN inventory_pkg_tracking p ON p.pack_barcode = o.pack_barcode
        WHERE upper(trim(o.order_barcode)) = upper(trim(inventory_store_items.barcode))
          AND public.inventory_dest_same(
            coalesce(nullif(trim(p.leg_destination_code), ''), p.destination_code),
            inventory_jwt_hub_code()
          )
      )
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND (
      public.inventory_dest_same(delivery_hub_code, inventory_jwt_hub_code())
      OR hub_arrived_at IS NOT NULL
    )
  );
