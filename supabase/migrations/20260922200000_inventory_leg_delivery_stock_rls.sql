-- 运达站不是客户地区时，目的站仍要能写入到站入库流水。
-- 例如 POL 客户的货发到 MDY：final_destination 保持 POL，流水由 MDY 写入。

DROP POLICY IF EXISTS "inventory_stock_movements_access" ON inventory_stock_movements;
CREATE POLICY "inventory_stock_movements_access" ON inventory_stock_movements
  FOR ALL TO authenticated
  USING (
    inventory_session_active()
    AND EXISTS (
      SELECT 1 FROM inventory_store_items i
      WHERE i.id = inventory_stock_movements.item_id
        AND (
          i.owner_store_id = inventory_jwt_store_id()
          OR UPPER(i.owner_store_code) = UPPER(inventory_jwt_store_code())
          OR UPPER(i.final_destination) = UPPER(inventory_jwt_hub_code())
          OR public.inventory_dest_same(i.delivery_hub_code, inventory_jwt_hub_code())
          OR EXISTS (
            SELECT 1
            FROM inventory_order_tracking o
            JOIN inventory_pkg_tracking p ON p.pack_barcode = o.pack_barcode
            WHERE upper(trim(o.order_barcode)) = upper(trim(i.barcode))
              AND public.inventory_dest_same(
                coalesce(nullif(trim(p.leg_destination_code), ''), p.destination_code),
                inventory_jwt_hub_code()
              )
          )
        )
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND EXISTS (
      SELECT 1 FROM inventory_store_items i
      WHERE i.id = inventory_stock_movements.item_id
        AND (
          i.owner_store_id = inventory_jwt_store_id()
          OR UPPER(i.owner_store_code) = UPPER(inventory_jwt_store_code())
          OR UPPER(i.final_destination) = UPPER(inventory_jwt_hub_code())
          OR public.inventory_dest_same(i.delivery_hub_code, inventory_jwt_hub_code())
          OR EXISTS (
            SELECT 1
            FROM inventory_order_tracking o
            JOIN inventory_pkg_tracking p ON p.pack_barcode = o.pack_barcode
            WHERE upper(trim(o.order_barcode)) = upper(trim(i.barcode))
              AND public.inventory_dest_same(
                coalesce(nullif(trim(p.leg_destination_code), ''), p.destination_code),
                inventory_jwt_hub_code()
              )
          )
        )
    )
  );

DROP POLICY IF EXISTS "inventory_store_items_leg_delivery_insert" ON inventory_store_items;
CREATE POLICY "inventory_store_items_leg_delivery_insert"
  ON inventory_store_items
  FOR INSERT TO authenticated
  WITH CHECK (
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
