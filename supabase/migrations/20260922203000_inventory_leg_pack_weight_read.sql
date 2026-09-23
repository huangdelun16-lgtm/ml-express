-- 多个入库的总重量写在包装商品上。运达站不是客户地区时（POL 货发到 MDY），
-- 目的站要能读到这张包装，Invoice 才能显示总重量。

DROP POLICY IF EXISTS "inventory_store_items_leg_pack_bundle_select" ON inventory_store_items;
CREATE POLICY "inventory_store_items_leg_pack_bundle_select"
  ON inventory_store_items
  FOR SELECT TO authenticated
  USING (
    inventory_session_active()
    AND EXISTS (
      SELECT 1
      FROM inventory_pkg_tracking p
      WHERE upper(trim(p.pack_barcode)) = upper(trim(inventory_store_items.barcode))
        AND public.inventory_dest_same(
          coalesce(nullif(trim(p.leg_destination_code), ''), p.destination_code),
          inventory_jwt_hub_code()
        )
    )
  );

CREATE OR REPLACE FUNCTION inventory_pack_hub_arrived_visible(p_pack_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM inventory_packed_shipment_items psi
    JOIN inventory_store_items i ON i.id = psi.item_id
    WHERE psi.pack_id = p_pack_id
      AND i.hub_arrived_at IS NOT NULL
      AND (
        public.inventory_dest_same(i.final_destination, inventory_jwt_hub_code())
        OR public.inventory_dest_same(i.delivery_hub_code, inventory_jwt_hub_code())
      )
  );
$$;
