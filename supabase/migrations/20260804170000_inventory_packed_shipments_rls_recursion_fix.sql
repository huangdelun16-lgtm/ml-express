-- 修复 20260804160000 导致的 RLS 无限递归：
-- packed_shipments 策略查 psi，psi 策略再查 packed_shipments → infinite recursion
-- 改用 SECURITY DEFINER 函数判定「目的站已到站包」，打破循环

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
      AND UPPER(TRIM(i.final_destination)) = UPPER(inventory_jwt_hub_code())
  );
$$;

REVOKE ALL ON FUNCTION inventory_pack_hub_arrived_visible(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION inventory_pack_hub_arrived_visible(UUID) TO authenticated;

DROP POLICY IF EXISTS "inventory_packed_shipments_access" ON inventory_packed_shipments;
CREATE POLICY "inventory_packed_shipments_access" ON inventory_packed_shipments
  FOR ALL TO authenticated
  USING (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR inventory_owner_code_matches(owner_store_code)
      OR inventory_pack_hub_arrived_visible(id)
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR inventory_owner_code_matches(owner_store_code)
    )
  );

DROP POLICY IF EXISTS "inventory_packed_shipment_items_access" ON inventory_packed_shipment_items;
CREATE POLICY "inventory_packed_shipment_items_access" ON inventory_packed_shipment_items
  FOR ALL TO authenticated
  USING (
    inventory_session_active()
    AND (
      EXISTS (
        SELECT 1 FROM inventory_packed_shipments p
        WHERE p.id = inventory_packed_shipment_items.pack_id
          AND (
            p.owner_store_id = inventory_jwt_store_id()
            OR inventory_owner_code_matches(p.owner_store_code)
          )
      )
      OR EXISTS (
        SELECT 1 FROM inventory_store_items i
        WHERE i.id = inventory_packed_shipment_items.item_id
          AND i.hub_arrived_at IS NOT NULL
          AND UPPER(TRIM(i.final_destination)) = UPPER(inventory_jwt_hub_code())
      )
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND EXISTS (
      SELECT 1 FROM inventory_packed_shipments p
      WHERE p.id = inventory_packed_shipment_items.pack_id
        AND (
          p.owner_store_id = inventory_jwt_store_id()
          OR inventory_owner_code_matches(p.owner_store_code)
        )
    )
  );
