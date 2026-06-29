-- Inventory App：归属码归一化 RLS（修复 MUSE↔MUSE001 云同步 upsert USING 失败）
-- 在 Supabase Dashboard → SQL Editor 粘贴执行

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

-- 验证
SELECT proname FROM pg_proc
WHERE proname IN ('inventory_normalize_owner_key', 'inventory_owner_code_matches');
