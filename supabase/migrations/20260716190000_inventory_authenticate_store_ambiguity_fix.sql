-- 修复 inventory_authenticate_store RETURNS TABLE 输出变量 store_code
-- 与 inventory_login_attempts.store_code 在 ON CONFLICT 中的歧义。

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
  FROM public.inventory_login_attempts attempts
  WHERE attempts.store_code = v_code
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
    UPDATE public.inventory_login_attempts attempts
    SET failed_attempts = v_failed,
        locked_until = CASE WHEN v_failed >= 5 THEN v_now + interval '5 minutes' ELSE NULL END,
        last_failed_at = v_now,
        updated_at = v_now
    WHERE attempts.store_code = v_code;

    RETURN QUERY SELECT false,
      CASE WHEN v_failed >= 5 THEN 300 ELSE 0 END,
      NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  UPDATE public.inventory_login_attempts attempts
  SET failed_attempts = 0, locked_until = NULL, last_failed_at = NULL, updated_at = v_now
  WHERE attempts.store_code = v_code;

  UPDATE public.delivery_stores
  SET current_session_id = trim(p_session_id), updated_at = v_now
  WHERE id = v_store.id;

  RETURN QUERY SELECT true, 0, v_store.id, upper(trim(v_store.store_code))::text,
    v_store.store_name::text, v_store.store_type::text, v_store.status::text,
    v_store.region::text, v_store.address::text;
END;
$$;

REVOKE ALL ON FUNCTION public.inventory_authenticate_store(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_authenticate_store(text, text, text)
  TO service_role;
