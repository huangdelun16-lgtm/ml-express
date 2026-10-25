-- 普通店铺（非中转站）的密码不再放在网页能读到的列里。
-- 中转站仍用 delivery_stores.password_hash，给 Inventory 登录。
-- 公开钥匙不能再写入 password / password_hash，也不能新增或删除店铺行。

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.delivery_store_secrets (
  store_id uuid PRIMARY KEY REFERENCES public.delivery_stores(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_store_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.delivery_store_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.delivery_store_secrets TO service_role;

INSERT INTO public.delivery_store_secrets (store_id, password_hash)
SELECT id,
  CASE
    WHEN nullif(password_hash, '') IS NOT NULL THEN password_hash
    ELSE extensions.crypt(password, extensions.gen_salt('bf', 12))
  END
FROM public.delivery_stores
WHERE coalesce(store_type, '') <> 'transit_station'
  AND (nullif(password, '') IS NOT NULL OR nullif(password_hash, '') IS NOT NULL)
ON CONFLICT (store_id) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    updated_at = now();

UPDATE public.delivery_stores
SET password = NULL,
    password_hash = NULL
WHERE coalesce(store_type, '') <> 'transit_station'
  AND (password IS NOT NULL OR password_hash IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
  attempt_key text PRIMARY KEY,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_login_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.auth_login_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.merchant_authenticate_store(p_store_code text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_code text := upper(trim(coalesce(p_store_code, '')));
  v_store public.delivery_stores%ROWTYPE;
  v_hash text;
  v_attempts integer;
  v_locked timestamptz;
  v_ok boolean := false;
BEGIN
  IF v_code = '' OR coalesce(p_password, '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', '缺少店铺代码或密码');
  END IF;

  SELECT failed_attempts, locked_until
  INTO v_attempts, v_locked
  FROM public.auth_login_attempts
  WHERE attempt_key = 'merchant:' || v_code;

  IF v_locked IS NOT NULL AND v_locked > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '尝试次数过多，请 ' || greatest(1, ceil(extract(epoch FROM (v_locked - now())) / 60.0))::int || ' 分钟后再试'
    );
  END IF;

  SELECT * INTO v_store
  FROM public.delivery_stores
  WHERE upper(store_code) = v_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '店铺代码不存在');
  END IF;

  IF coalesce(v_store.store_type, '') = 'transit_station' THEN
    RETURN jsonb_build_object('success', false, 'error', '该账号为跨境中转站账号，请使用 Inventory App 登录，无法在商家端登录。');
  END IF;

  IF v_store.status IS NOT NULL AND v_store.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', '账号状态异常 (' || v_store.status || ')，请联系管理员。');
  END IF;

  SELECT password_hash INTO v_hash
  FROM public.delivery_store_secrets
  WHERE store_id = v_store.id;

  IF nullif(v_hash, '') IS NOT NULL THEN
    v_ok := v_hash = extensions.crypt(p_password, v_hash);
  ELSIF nullif(v_store.password, '') IS NOT NULL AND v_store.password = p_password THEN
    v_ok := true;
  END IF;

  IF NOT v_ok THEN
  INSERT INTO public.auth_login_attempts (attempt_key, failed_attempts, locked_until, updated_at)
  VALUES ('merchant:' || v_code, 1, NULL, now())
  ON CONFLICT (attempt_key) DO UPDATE
  SET failed_attempts = CASE
        WHEN auth_login_attempts.locked_until IS NOT NULL AND auth_login_attempts.locked_until <= now() THEN 1
        ELSE auth_login_attempts.failed_attempts + 1
      END,
      locked_until = CASE
        WHEN (CASE
          WHEN auth_login_attempts.locked_until IS NOT NULL AND auth_login_attempts.locked_until <= now() THEN 1
          ELSE auth_login_attempts.failed_attempts + 1
        END) >= 5 THEN now() + interval '15 minutes'
        ELSE NULL
      END,
      updated_at = now();
    RETURN jsonb_build_object('success', false, 'error', '密码错误');
  END IF;

  INSERT INTO public.delivery_store_secrets (store_id, password_hash)
  VALUES (v_store.id, extensions.crypt(p_password, extensions.gen_salt('bf', 12)))
  ON CONFLICT (store_id) DO NOTHING;

  UPDATE public.delivery_stores
  SET password = NULL
  WHERE id = v_store.id
    AND password IS NOT NULL;

  DELETE FROM public.auth_login_attempts WHERE attempt_key = 'merchant:' || v_code;

  RETURN jsonb_build_object(
    'success', true,
    'store', jsonb_build_object(
      'id', v_store.id,
      'store_code', v_store.store_code,
      'store_name', v_store.store_name,
      'email', v_store.email,
      'phone', v_store.phone,
      'address', v_store.address,
      'status', v_store.status,
      'store_type', v_store.store_type,
      'region', v_store.region,
      'packing_sla_minutes', v_store.packing_sla_minutes,
      'avatar_url', v_store.avatar_url
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.merchant_change_store_password(
  p_store_id uuid,
  p_current text,
  p_new text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_store public.delivery_stores%ROWTYPE;
  v_hash text;
  v_ok boolean := false;
BEGIN
  IF p_store_id IS NULL OR coalesce(p_current, '') = '' OR coalesce(p_new, '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', '缺少必要参数');
  END IF;
  IF char_length(p_new) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', '新密码至少 6 位');
  END IF;

  SELECT * INTO v_store FROM public.delivery_stores WHERE id = p_store_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '店铺不存在');
  END IF;
  IF coalesce(v_store.store_type, '') = 'transit_station' THEN
    RETURN jsonb_build_object('success', false, 'error', '中转站账号请在 Inventory App 修改密码');
  END IF;

  SELECT password_hash INTO v_hash FROM public.delivery_store_secrets WHERE store_id = v_store.id;
  IF nullif(v_hash, '') IS NOT NULL THEN
    v_ok := v_hash = extensions.crypt(p_current, v_hash);
  ELSIF nullif(v_store.password, '') IS NOT NULL AND v_store.password = p_current THEN
    v_ok := true;
  END IF;

  IF NOT v_ok THEN
    RETURN jsonb_build_object('success', false, 'error', '原密码错误');
  END IF;

  INSERT INTO public.delivery_store_secrets (store_id, password_hash)
  VALUES (v_store.id, extensions.crypt(p_new, extensions.gen_salt('bf', 12)))
  ON CONFLICT (store_id) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      updated_at = now();

  UPDATE public.delivery_stores
  SET password = NULL,
      password_hash = NULL
  WHERE id = v_store.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.merchant_authenticate_store(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.merchant_change_store_password(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_authenticate_store(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.merchant_change_store_password(uuid, text, text) TO anon, authenticated, service_role;

REVOKE UPDATE (password, password_hash) ON TABLE public.delivery_stores FROM anon;
REVOKE INSERT, DELETE ON TABLE public.delivery_stores FROM anon;

DROP POLICY IF EXISTS delivery_stores_city_legacy_access ON public.delivery_stores;
DROP POLICY IF EXISTS delivery_stores_city_legacy_select ON public.delivery_stores;
DROP POLICY IF EXISTS delivery_stores_city_legacy_update ON public.delivery_stores;

CREATE POLICY delivery_stores_city_legacy_select
ON public.delivery_stores
FOR SELECT TO anon
USING (coalesce(store_type, '') <> 'transit_station');

CREATE POLICY delivery_stores_city_legacy_update
ON public.delivery_stores
FOR UPDATE TO anon
USING (coalesce(store_type, '') <> 'transit_station')
WITH CHECK (coalesce(store_type, '') <> 'transit_station');
