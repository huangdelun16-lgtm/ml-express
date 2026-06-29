-- 修复 owner_store_code 短码（MUSE/MDY）与 JWT 完整店码（MUSE001/MDY001）不一致导致 RLS 失败
-- 并放宽 UPDATE USING，使 upsert 能更新「他站归属、尚未写 hub_arrived_at」的已有云端行

CREATE OR REPLACE FUNCTION public.inventory_normalize_owner_key(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(UPPER(TRIM(p_code)), '') = '' THEN ''
    WHEN UPPER(TRIM(p_code)) LIKE 'ADMIN%' THEN 'ADMIN'
    WHEN UPPER(TRIM(p_code)) LIKE 'MUSE%' OR UPPER(TRIM(p_code)) IN ('MSE', 'MUS') THEN 'MUSE'
    WHEN UPPER(TRIM(p_code)) LIKE 'RUILI%' OR UPPER(TRIM(p_code)) = 'RUI' THEN 'RUILI'
    ELSE (
      SELECT CASE
        WHEN token IN ('MSE', 'MUS') THEN 'MUSE'
        WHEN token = 'RUI' THEN 'RUILI'
        ELSE token
      END
      FROM (
        SELECT UPPER(
          CASE
            WHEN LENGTH(regexp_replace(UPPER(TRIM(p_code)), '[0-9]', '', 'g')) >= 3
              THEN LEFT(regexp_replace(UPPER(TRIM(p_code)), '[0-9]', '', 'g'), 3)
            ELSE LEFT(UPPER(TRIM(p_code)), 3)
          END
        ) AS token
      ) s
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_owner_code_matches(p_owner_code text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT inventory_session_active()
    AND COALESCE(UPPER(TRIM(p_owner_code)), '') <> ''
    AND (
      UPPER(TRIM(p_owner_code)) = UPPER(inventory_jwt_store_code())
      OR inventory_normalize_owner_key(p_owner_code) = inventory_normalize_owner_key(inventory_jwt_store_code())
    );
$$;

COMMENT ON FUNCTION public.inventory_normalize_owner_key(text) IS
  'Inventory：店铺/归属码归一化（MUSE001→MUSE，与 App storeOwnership 一致）';
COMMENT ON FUNCTION public.inventory_owner_code_matches(text) IS
  'Inventory JWT：owner_store_code 是否与当前登录店匹配（含短码/完整码）';

-- ─── inventory_store_items ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "inventory_store_items_select" ON inventory_store_items;
CREATE POLICY "inventory_store_items_select" ON inventory_store_items
  FOR SELECT TO authenticated
  USING (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR inventory_owner_code_matches(owner_store_code)
      OR UPPER(final_destination) = UPPER(inventory_jwt_hub_code())
      OR (
        hub_arrived_at IS NOT NULL
        AND NOT inventory_owner_code_matches(owner_store_code)
        AND owner_store_id IS DISTINCT FROM inventory_jwt_store_id()
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
        AND inventory_owner_code_matches(owner_store_code)
      )
      OR UPPER(final_destination) = UPPER(inventory_jwt_hub_code())
      OR (
        hub_arrived_at IS NOT NULL
        AND NOT inventory_owner_code_matches(owner_store_code)
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
      OR inventory_owner_code_matches(owner_store_code)
      OR UPPER(final_destination) = UPPER(inventory_jwt_hub_code())
      OR (
        hub_arrived_at IS NOT NULL
        AND NOT inventory_owner_code_matches(owner_store_code)
      )
      OR (
        NOT inventory_owner_code_matches(owner_store_code)
        AND owner_store_id IS DISTINCT FROM inventory_jwt_store_id()
      )
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR inventory_owner_code_matches(owner_store_code)
      OR UPPER(final_destination) = UPPER(inventory_jwt_hub_code())
      OR (
        hub_arrived_at IS NOT NULL
        AND NOT inventory_owner_code_matches(owner_store_code)
      )
    )
  );

DROP POLICY IF EXISTS "inventory_store_items_delete" ON inventory_store_items;
CREATE POLICY "inventory_store_items_delete" ON inventory_store_items
  FOR DELETE TO authenticated
  USING (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR inventory_owner_code_matches(owner_store_code)
    )
  );

-- ─── inventory_packed_shipments（同步打包时同样存在 MUSE vs MUSE001）────────
DROP POLICY IF EXISTS "inventory_packed_shipments_access" ON inventory_packed_shipments;
CREATE POLICY "inventory_packed_shipments_access" ON inventory_packed_shipments
  FOR ALL TO authenticated
  USING (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR inventory_owner_code_matches(owner_store_code)
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND (
      owner_store_id = inventory_jwt_store_id()
      OR inventory_owner_code_matches(owner_store_code)
    )
  );
