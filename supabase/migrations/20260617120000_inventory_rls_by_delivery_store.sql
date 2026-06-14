-- P4：Inventory App RLS — 按 delivery_stores.id / store_code / hub 区域收紧
-- 依赖：客户端登录后 Supabase Auth JWT app_metadata 含 inventory_store_id / inventory_store_code / inventory_hub_code
-- 部署 Edge Function：inventory-store-login

-- ─── JWT 辅助函数 ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.inventory_jwt_store_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'inventory_store_id', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.inventory_jwt_store_code()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'inventory_store_code', '');
$$;

CREATE OR REPLACE FUNCTION public.inventory_jwt_hub_code()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'inventory_hub_code', '');
$$;

CREATE OR REPLACE FUNCTION public.inventory_session_active()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT inventory_jwt_store_id() IS NOT NULL
     AND inventory_jwt_store_code() <> ''
     AND inventory_jwt_hub_code() <> '';
$$;

COMMENT ON FUNCTION public.inventory_jwt_store_id() IS 'Inventory App JWT：当前登录 delivery_stores.id';
COMMENT ON FUNCTION public.inventory_jwt_store_code() IS 'Inventory App JWT：当前店铺代码（大写）';
COMMENT ON FUNCTION public.inventory_jwt_hub_code() IS 'Inventory App JWT：本站服务区域码（如 MDY）';

-- ─── delivery_stores：已登录中转站可读自己的店铺行（校验账号状态）──────────
DROP POLICY IF EXISTS "delivery_stores_inventory_read_self" ON delivery_stores;
CREATE POLICY "delivery_stores_inventory_read_self" ON delivery_stores
  FOR SELECT TO authenticated
  USING (id = inventory_jwt_store_id());

-- ─── inventory_store_items ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "inventory_store_items_all" ON inventory_store_items;

DROP POLICY IF EXISTS "inventory_store_items_select" ON inventory_store_items;
CREATE POLICY "inventory_store_items_select" ON inventory_store_items
  FOR SELECT TO authenticated
  USING (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR UPPER(owner_store_code) = UPPER(inventory_jwt_store_code())
      OR UPPER(final_destination) = UPPER(inventory_jwt_hub_code())
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
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR UPPER(owner_store_code) = UPPER(inventory_jwt_store_code())
      OR UPPER(final_destination) = UPPER(inventory_jwt_hub_code())
    )
  );

DROP POLICY IF EXISTS "inventory_store_items_delete" ON inventory_store_items;
CREATE POLICY "inventory_store_items_delete" ON inventory_store_items
  FOR DELETE TO authenticated
  USING (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR UPPER(owner_store_code) = UPPER(inventory_jwt_store_code())
    )
  );

-- ─── inventory_stock_movements ─────────────────────────────────────────────
DROP POLICY IF EXISTS "inventory_stock_movements_all" ON inventory_stock_movements;

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
        )
    )
  );

-- ─── inventory_packed_shipments ────────────────────────────────────────────
DROP POLICY IF EXISTS "inventory_packed_shipments_all" ON inventory_packed_shipments;

DROP POLICY IF EXISTS "inventory_packed_shipments_access" ON inventory_packed_shipments;
CREATE POLICY "inventory_packed_shipments_access" ON inventory_packed_shipments
  FOR ALL TO authenticated
  USING (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR UPPER(owner_store_code) = UPPER(inventory_jwt_store_code())
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR UPPER(owner_store_code) = UPPER(inventory_jwt_store_code())
    )
  );

-- ─── inventory_packed_shipment_items ───────────────────────────────────────
DROP POLICY IF EXISTS "inventory_packed_shipment_items_all" ON inventory_packed_shipment_items;

DROP POLICY IF EXISTS "inventory_packed_shipment_items_access" ON inventory_packed_shipment_items;
CREATE POLICY "inventory_packed_shipment_items_access" ON inventory_packed_shipment_items
  FOR ALL TO authenticated
  USING (
    inventory_session_active()
    AND EXISTS (
      SELECT 1 FROM inventory_packed_shipments p
      WHERE p.id = inventory_packed_shipment_items.pack_id
        AND (
          p.owner_store_id = inventory_jwt_store_id()
          OR UPPER(p.owner_store_code) = UPPER(inventory_jwt_store_code())
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
          OR UPPER(p.owner_store_code) = UPPER(inventory_jwt_store_code())
        )
    )
  );

-- ─── inventory_pkg_tracking ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "inventory_pkg_tracking_all" ON inventory_pkg_tracking;

DROP POLICY IF EXISTS "inventory_pkg_tracking_access" ON inventory_pkg_tracking;
CREATE POLICY "inventory_pkg_tracking_access" ON inventory_pkg_tracking
  FOR ALL TO authenticated
  USING (
    inventory_session_active()
    AND (
      origin_store_id = inventory_jwt_store_id()
      OR UPPER(origin_store_code) = UPPER(inventory_jwt_store_code())
      OR UPPER(leg_destination_code) = UPPER(inventory_jwt_hub_code())
      OR UPPER(destination_code) = UPPER(inventory_jwt_hub_code())
      OR hub_received_by_store_id = inventory_jwt_store_id()
      OR UPPER(hub_received_by_store_code) = UPPER(inventory_jwt_store_code())
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND (
      origin_store_id = inventory_jwt_store_id()
      OR UPPER(origin_store_code) = UPPER(inventory_jwt_store_code())
      OR UPPER(leg_destination_code) = UPPER(inventory_jwt_hub_code())
      OR UPPER(destination_code) = UPPER(inventory_jwt_hub_code())
      OR hub_received_by_store_id = inventory_jwt_store_id()
      OR UPPER(hub_received_by_store_code) = UPPER(inventory_jwt_store_code())
    )
  );

-- ─── inventory_order_tracking ────────────────────────────────────────────────
DROP POLICY IF EXISTS "inventory_order_tracking_all" ON inventory_order_tracking;

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
          OR UPPER(pkg.origin_store_code) = UPPER(inventory_jwt_store_code())
          OR UPPER(pkg.leg_destination_code) = UPPER(inventory_jwt_hub_code())
          OR UPPER(pkg.destination_code) = UPPER(inventory_jwt_hub_code())
          OR pkg.hub_received_by_store_id = inventory_jwt_store_id()
          OR UPPER(pkg.hub_received_by_store_code) = UPPER(inventory_jwt_store_code())
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
          OR UPPER(pkg.origin_store_code) = UPPER(inventory_jwt_store_code())
          OR UPPER(pkg.leg_destination_code) = UPPER(inventory_jwt_hub_code())
          OR UPPER(pkg.destination_code) = UPPER(inventory_jwt_hub_code())
          OR pkg.hub_received_by_store_id = inventory_jwt_store_id()
          OR UPPER(pkg.hub_received_by_store_code) = UPPER(inventory_jwt_store_code())
        )
    )
  );
