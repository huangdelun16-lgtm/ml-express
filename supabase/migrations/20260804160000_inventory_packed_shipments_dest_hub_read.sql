-- 目的站账号可读「已到站」订单所属的快递包（note 含多个入库总费用；包内序号明细）
-- SELECT 放宽；INSERT/UPDATE/DELETE 仍仅限 owner 店
-- 注意：不可在策略内直接 JOIN 另一张带 RLS 的表，否则会 infinite recursion；
--       见 20260804170000_inventory_packed_shipments_rls_recursion_fix.sql

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
