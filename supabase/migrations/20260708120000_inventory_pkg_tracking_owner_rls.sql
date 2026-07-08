-- 装车出库 inventory_pkg_tracking / inventory_order_tracking：
-- 与 inventory_packed_shipments 一致，origin 店码支持 MUSE001 ↔ MUSE 归一化匹配

DROP POLICY IF EXISTS "inventory_pkg_tracking_access" ON inventory_pkg_tracking;
CREATE POLICY "inventory_pkg_tracking_access" ON inventory_pkg_tracking
  FOR ALL TO authenticated
  USING (
    inventory_session_active()
    AND (
      origin_store_id = inventory_jwt_store_id()
      OR inventory_owner_code_matches(origin_store_code)
      OR UPPER(leg_destination_code) = UPPER(inventory_jwt_hub_code())
      OR UPPER(destination_code) = UPPER(inventory_jwt_hub_code())
      OR hub_received_by_store_id = inventory_jwt_store_id()
      OR inventory_owner_code_matches(hub_received_by_store_code)
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND (
      origin_store_id = inventory_jwt_store_id()
      OR inventory_owner_code_matches(origin_store_code)
      OR UPPER(leg_destination_code) = UPPER(inventory_jwt_hub_code())
      OR UPPER(destination_code) = UPPER(inventory_jwt_hub_code())
      OR hub_received_by_store_id = inventory_jwt_store_id()
      OR inventory_owner_code_matches(hub_received_by_store_code)
    )
  );

DROP POLICY IF EXISTS "inventory_order_tracking_access" ON inventory_order_tracking;
CREATE POLICY "inventory_order_tracking_access" ON inventory_order_tracking
  FOR ALL TO authenticated
  USING (
    inventory_session_active()
    AND EXISTS (
      SELECT 1 FROM inventory_pkg_tracking pkg
      WHERE pkg.pack_barcode = inventory_order_tracking.pack_barcode
        AND (
          pkg.origin_store_id = inventory_jwt_store_id()
          OR inventory_owner_code_matches(pkg.origin_store_code)
          OR UPPER(pkg.leg_destination_code) = UPPER(inventory_jwt_hub_code())
          OR UPPER(pkg.destination_code) = UPPER(inventory_jwt_hub_code())
          OR pkg.hub_received_by_store_id = inventory_jwt_store_id()
          OR inventory_owner_code_matches(pkg.hub_received_by_store_code)
        )
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND EXISTS (
      SELECT 1 FROM inventory_pkg_tracking pkg
      WHERE pkg.pack_barcode = inventory_order_tracking.pack_barcode
        AND (
          pkg.origin_store_id = inventory_jwt_store_id()
          OR inventory_owner_code_matches(pkg.origin_store_code)
          OR UPPER(pkg.leg_destination_code) = UPPER(inventory_jwt_hub_code())
          OR UPPER(pkg.destination_code) = UPPER(inventory_jwt_hub_code())
          OR pkg.hub_received_by_store_id = inventory_jwt_store_id()
          OR inventory_owner_code_matches(pkg.hub_received_by_store_code)
        )
    )
  );
