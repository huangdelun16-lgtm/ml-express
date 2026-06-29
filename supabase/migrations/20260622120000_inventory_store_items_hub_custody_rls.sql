-- 中转站可对「已到站、发站非本站」的订单 upsert（终站可能非本站，如 MDY 到站后转 YGN）
-- 依赖客户端 upsert 时写入 hub_arrived_at；与 20260619120000 的 final_destination 策略互补

DROP POLICY IF EXISTS "inventory_store_items_select" ON inventory_store_items;
CREATE POLICY "inventory_store_items_select" ON inventory_store_items
  FOR SELECT TO authenticated
  USING (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR UPPER(owner_store_code) = UPPER(inventory_jwt_store_code())
      OR UPPER(final_destination) = UPPER(inventory_jwt_hub_code())
      OR (
        hub_arrived_at IS NOT NULL
        AND (
          owner_store_id IS DISTINCT FROM inventory_jwt_store_id()
          OR UPPER(owner_store_code) <> UPPER(inventory_jwt_store_code())
        )
      )
    )
  );

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
      OR (
        hub_arrived_at IS NOT NULL
        AND (
          owner_store_id IS DISTINCT FROM inventory_jwt_store_id()
          OR UPPER(owner_store_code) <> UPPER(inventory_jwt_store_code())
        )
      )
    )
  );

DROP POLICY IF EXISTS "inventory_store_items_update" ON inventory_store_items;
CREATE POLICY "inventory_store_items_update" ON inventory_store_items
  FOR UPDATE TO authenticated
  USING (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR UPPER(owner_store_code) = UPPER(inventory_jwt_store_code())
      OR UPPER(final_destination) = UPPER(inventory_jwt_hub_code())
      OR (
        hub_arrived_at IS NOT NULL
        AND (
          owner_store_id IS DISTINCT FROM inventory_jwt_store_id()
          OR UPPER(owner_store_code) <> UPPER(inventory_jwt_store_code())
        )
      )
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR UPPER(owner_store_code) = UPPER(inventory_jwt_store_code())
      OR UPPER(final_destination) = UPPER(inventory_jwt_hub_code())
      OR (
        hub_arrived_at IS NOT NULL
        AND (
          owner_store_id IS DISTINCT FROM inventory_jwt_store_id()
          OR UPPER(owner_store_code) <> UPPER(inventory_jwt_store_code())
        )
      )
    )
  );
