-- Inventory authentication hardening:
-- - bcrypt password hashes and service-role-only credential RPCs
-- - database-backed login cooldown
-- - JWT session binding and site-scoped RLS

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.delivery_stores
  ADD COLUMN IF NOT EXISTS password_hash text;

COMMENT ON COLUMN public.delivery_stores.password_hash IS
  'Inventory 登录密码的 bcrypt 哈希；不得通过客户端 API 读取';

UPDATE public.delivery_stores
SET password_hash = extensions.crypt(password, extensions.gen_salt('bf', 12)),
    password = NULL
WHERE NULLIF(password_hash, '') IS NULL
  AND NULLIF(password, '') IS NOT NULL
  AND store_type = 'transit_station';

-- 已有 hash 的行也清除遗留明文。password 保留为 nullable 兼容旧 schema，
-- 但此迁移后的认证代码和 RPC 均不再读取它。
UPDATE public.delivery_stores
SET password = NULL
WHERE NULLIF(password_hash, '') IS NOT NULL
  AND password IS NOT NULL
  AND store_type = 'transit_station';

-- 短暂滚动部署期间若旧后台仍写 plaintext，在写入边界立即转为 hash，
-- 防止 hash 已存在时旧更新被忽略；表中不会留下新明文。
CREATE OR REPLACE FUNCTION public.inventory_hash_legacy_store_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
BEGIN
  IF NEW.store_type = 'transit_station'
     AND NULLIF(NEW.password, '') IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.password IS DISTINCT FROM OLD.password) THEN
    NEW.password_hash := extensions.crypt(NEW.password, extensions.gen_salt('bf', 12));
    NEW.password := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.inventory_hash_legacy_store_password() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS delivery_stores_hash_legacy_password ON public.delivery_stores;
CREATE TRIGGER delivery_stores_hash_legacy_password
BEFORE INSERT OR UPDATE ON public.delivery_stores
FOR EACH ROW
EXECUTE FUNCTION public.inventory_hash_legacy_store_password();

CREATE TABLE IF NOT EXISTS public.inventory_login_attempts (
  store_code text PRIMARY KEY,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  last_failed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.inventory_login_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.inventory_login_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.inventory_authenticate_store(
  p_store_code text,
  p_password text,
  p_session_id text
)
RETURNS TABLE (
  authenticated boolean,
  retry_after_seconds integer,
  store_id uuid,
  store_code text,
  store_name text,
  store_type text,
  store_status text,
  region text,
  address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_code text := upper(trim(coalesce(p_store_code, '')));
  v_attempt public.inventory_login_attempts%ROWTYPE;
  v_store public.delivery_stores%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_failed integer;
  v_valid boolean := false;
BEGIN
  IF v_code = ''
     OR length(v_code) > 64
     OR coalesce(p_password, '') = ''
     OR length(p_password) > 256
     OR trim(coalesce(p_session_id, '')) = '' THEN
    RETURN QUERY SELECT false, 0, NULL::uuid, NULL::text, NULL::text, NULL::text,
      NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  INSERT INTO public.inventory_login_attempts (store_code)
  VALUES (v_code)
  ON CONFLICT ON CONSTRAINT inventory_login_attempts_pkey DO NOTHING;

  SELECT * INTO v_attempt
  FROM public.inventory_login_attempts
  WHERE inventory_login_attempts.store_code = v_code
  FOR UPDATE;

  IF v_attempt.locked_until IS NOT NULL AND v_attempt.locked_until > v_now THEN
    RETURN QUERY SELECT false,
      greatest(1, ceil(extract(epoch FROM (v_attempt.locked_until - v_now)))::integer),
      NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_attempt.locked_until IS NOT NULL AND v_attempt.locked_until <= v_now THEN
    v_attempt.failed_attempts := 0;
  END IF;

  SELECT * INTO v_store
  FROM public.delivery_stores ds
  WHERE upper(trim(ds.store_code)) = v_code
  FOR UPDATE;

  IF FOUND
     AND v_store.store_type = 'transit_station'
     AND (v_store.status IS NULL OR v_store.status = 'active') THEN
    IF NULLIF(v_store.password_hash, '') IS NOT NULL THEN
      v_valid := v_store.password_hash = extensions.crypt(p_password, v_store.password_hash);
    ELSIF NULLIF(v_store.password, '') IS NOT NULL THEN
      -- 兼容 migration 前后短暂存在的旧数据；成功后立即升级并清除明文。
      v_valid := v_store.password = p_password;
      IF v_valid THEN
        UPDATE public.delivery_stores
        SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 12)),
            password = NULL,
            updated_at = v_now
        WHERE id = v_store.id;
      END IF;
    END IF;
  END IF;

  IF NOT v_valid THEN
    v_failed := coalesce(v_attempt.failed_attempts, 0) + 1;
    UPDATE public.inventory_login_attempts
    SET failed_attempts = v_failed,
        locked_until = CASE WHEN v_failed >= 5 THEN v_now + interval '5 minutes' ELSE NULL END,
        last_failed_at = v_now,
        updated_at = v_now
    WHERE inventory_login_attempts.store_code = v_code;

    RETURN QUERY SELECT false,
      CASE WHEN v_failed >= 5 THEN 300 ELSE 0 END,
      NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  UPDATE public.inventory_login_attempts
  SET failed_attempts = 0, locked_until = NULL, last_failed_at = NULL, updated_at = v_now
  WHERE inventory_login_attempts.store_code = v_code;

  UPDATE public.delivery_stores
  SET current_session_id = trim(p_session_id), updated_at = v_now
  WHERE id = v_store.id;

  RETURN QUERY SELECT true, 0, v_store.id, upper(trim(v_store.store_code))::text,
    v_store.store_name::text, v_store.store_type::text, v_store.status::text,
    v_store.region::text, v_store.address::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_change_store_password(
  p_store_id uuid,
  p_current_password text,
  p_new_password text,
  p_session_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_store public.delivery_stores%ROWTYPE;
BEGIN
  IF length(coalesce(p_new_password, '')) < 6 OR coalesce(p_current_password, '') = '' THEN
    RETURN false;
  END IF;

  SELECT * INTO v_store
  FROM public.delivery_stores
  WHERE id = p_store_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_store.store_type <> 'transit_station'
     OR (v_store.status IS NOT NULL AND v_store.status <> 'active')
     OR coalesce(v_store.current_session_id, '') <> coalesce(p_session_id, '')
     OR NULLIF(v_store.password_hash, '') IS NULL
     OR v_store.password_hash <> extensions.crypt(p_current_password, v_store.password_hash) THEN
    RETURN false;
  END IF;

  UPDATE public.delivery_stores
  SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 12)),
      password = NULL,
      updated_at = clock_timestamp()
  WHERE id = p_store_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_set_store_password(
  p_store_id uuid,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
BEGIN
  IF p_store_id IS NULL OR length(coalesce(p_new_password, '')) < 6 THEN
    RETURN false;
  END IF;

  UPDATE public.delivery_stores
  SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 12)),
      password = NULL,
      updated_at = clock_timestamp()
  WHERE id = p_store_id
    AND store_type = 'transit_station';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.inventory_authenticate_store(text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_change_store_password(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_set_store_password(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_authenticate_store(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.inventory_change_store_password(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.inventory_set_store_password(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.inventory_jwt_session_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'inventory_session_id', '');
$$;

CREATE OR REPLACE FUNCTION public.inventory_session_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.delivery_stores ds
    WHERE ds.id = public.inventory_jwt_store_id()
      AND upper(trim(ds.store_code)) = upper(trim(public.inventory_jwt_store_code()))
      AND ds.store_type = 'transit_station'
      AND (ds.status IS NULL OR ds.status = 'active')
      AND coalesce(ds.current_session_id, '') <> ''
      AND ds.current_session_id = public.inventory_jwt_session_id()
  );
$$;

REVOKE ALL ON FUNCTION public.inventory_jwt_session_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.inventory_session_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inventory_jwt_session_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inventory_session_active() TO authenticated, service_role;

ALTER TABLE public.cross_border_manual_entries
  ADD COLUMN IF NOT EXISTS store_id uuid,
  ADD COLUMN IF NOT EXISTS store_code text,
  ADD COLUMN IF NOT EXISTS hub_code text;

ALTER TABLE public.cross_border_manual_entries
  ALTER COLUMN store_id SET DEFAULT public.inventory_jwt_store_id(),
  ALTER COLUMN store_code SET DEFAULT public.inventory_jwt_store_code(),
  ALTER COLUMN hub_code SET DEFAULT public.inventory_jwt_hub_code();

CREATE INDEX IF NOT EXISTS idx_cross_border_manual_entries_store_date
  ON public.cross_border_manual_entries (store_id, entry_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cross_border_manual_entries_hub_date
  ON public.cross_border_manual_entries (hub_code, entry_date DESC, created_at DESC);

-- RLS policies are OR-combined. The two dedicated Inventory tables can safely drop every
-- historical policy. delivery_stores is shared with City merchant apps, so it is handled
-- separately below and keeps a non-transit compatibility policy.
DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'cross_border_manual_entries',
        'inventory_hub_transport_fee_payments'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      v_policy.policyname, v_policy.schemaname, v_policy.tablename);
  END LOOP;
END;
$$;

ALTER TABLE public.delivery_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_border_manual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_hub_transport_fee_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on delivery_stores" ON public.delivery_stores;
DROP POLICY IF EXISTS "delivery_stores_inventory_read_self" ON public.delivery_stores;
DROP POLICY IF EXISTS "delivery_stores_inventory_select_self" ON public.delivery_stores;
DROP POLICY IF EXISTS "delivery_stores_city_legacy_access" ON public.delivery_stores;
DROP POLICY IF EXISTS "delivery_stores_city_authenticated_read" ON public.delivery_stores;

-- City merchant Web/App currently authenticate against the shared table. Preserve their
-- existing non-transit behavior while ensuring anon can never read or mutate Inventory
-- transit-station rows. A future City-auth migration can remove this compatibility policy.
CREATE POLICY delivery_stores_city_legacy_access
ON public.delivery_stores
FOR ALL TO anon
USING (coalesce(store_type, '') <> 'transit_station')
WITH CHECK (coalesce(store_type, '') <> 'transit_station');

CREATE POLICY delivery_stores_city_authenticated_read
ON public.delivery_stores
FOR SELECT TO authenticated
USING (coalesce(store_type, '') <> 'transit_station');

CREATE POLICY delivery_stores_inventory_select_self
ON public.delivery_stores
FOR SELECT TO authenticated
USING (
  public.inventory_session_active()
  AND id = public.inventory_jwt_store_id()
);

CREATE POLICY cross_border_manual_entries_inventory_access
ON public.cross_border_manual_entries
FOR ALL TO authenticated
USING (
  public.inventory_session_active()
  AND store_id = public.inventory_jwt_store_id()
  AND upper(coalesce(store_code, '')) = upper(public.inventory_jwt_store_code())
  AND upper(coalesce(hub_code, '')) = upper(public.inventory_jwt_hub_code())
)
WITH CHECK (
  public.inventory_session_active()
  AND store_id = public.inventory_jwt_store_id()
  AND upper(coalesce(store_code, '')) = upper(public.inventory_jwt_store_code())
  AND upper(coalesce(hub_code, '')) = upper(public.inventory_jwt_hub_code())
);

CREATE POLICY inventory_hub_transport_fee_payments_store_access
ON public.inventory_hub_transport_fee_payments
FOR ALL TO authenticated
USING (
  public.inventory_session_active()
  AND upper(coalesce(store_code, '')) = upper(public.inventory_jwt_store_code())
)
WITH CHECK (
  public.inventory_session_active()
  AND upper(coalesce(store_code, '')) = upper(public.inventory_jwt_store_code())
);

REVOKE ALL ON TABLE public.cross_border_manual_entries FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.inventory_hub_transport_fee_payments FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.delivery_stores FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.delivery_stores FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cross_border_manual_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory_hub_transport_fee_payments TO authenticated;
DO $$
DECLARE
  v_anon_select_columns text;
  v_anon_write_columns text;
  v_authenticated_columns text;
BEGIN
  SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
  INTO v_anon_select_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'delivery_stores';

  SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
  INTO v_anon_write_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'delivery_stores'
    AND column_name <> 'password_hash';

  SELECT string_agg(format('%I', column_name), ', ' ORDER BY ordinal_position)
  INTO v_authenticated_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'delivery_stores'
    AND column_name NOT IN ('password', 'password_hash');

  IF v_anon_select_columns IS NOT NULL THEN
    -- City merchant clients currently use select('*'). The anon row policy excludes every
    -- transit_station row, so exposing the nullable hash column here does not expose
    -- Inventory credentials and preserves those existing queries.
    EXECUTE format(
      'GRANT SELECT (%s) ON public.delivery_stores TO anon',
      v_anon_select_columns
    );
  END IF;

  IF v_anon_write_columns IS NOT NULL THEN
    EXECUTE format('GRANT INSERT (%s) ON public.delivery_stores TO anon', v_anon_write_columns);
    EXECUTE format('GRANT UPDATE (%s) ON public.delivery_stores TO anon', v_anon_write_columns);
    EXECUTE 'GRANT DELETE ON public.delivery_stores TO anon';
  END IF;

  IF v_authenticated_columns IS NOT NULL THEN
    EXECUTE format(
      'GRANT SELECT (%s) ON public.delivery_stores TO authenticated',
      v_authenticated_columns
    );
  END IF;
END;
$$;

-- SQL 验证建议（在事务中以对应角色/JWT 执行后 ROLLBACK）：
-- 1. 错误密码连续 5 次后 inventory_authenticate_store 返回 retry_after_seconds=300。
-- 2. 新登录后旧 JWT 的 inventory_session_active()=false，新 JWT=true。
-- 3. authenticated 只能读自己的 delivery_stores 行，且无法选择 password/password_hash。
-- 4. manual entry 省略三个站点字段时由 JWT 默认值填充；伪造任一字段被 RLS 拒绝。
-- 5. hub transport fee 的 store_code 与 JWT 不同或 session 过期时读写均被拒绝。
