-- 到站中转站需将 final_destination=本站 的订单写回云端（到站扫码、释放等）
-- 原 INSERT 策略仅允许 owner_store_id/code 为本站，导致 MDY 无法 upsert 木姐发来在途单

DROP POLICY IF EXISTS "inventory_store_items_insert" ON inventory_store_items;
CREATE POLICY "inventory_store_items_insert" ON inventory_store_items
  FOR INSERT TO authenticated
  WITH CHECK (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR (
        owner_store_id IS NULL
        AND UPPER(owner_store_code) = UPPER(inventory_jwt_store_code())
      )
      OR UPPER(final_destination) = UPPER(inventory_jwt_hub_code())
    )
  );
