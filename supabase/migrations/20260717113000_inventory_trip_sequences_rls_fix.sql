-- 修复装车出库 RLS：车次序号表仅允许 SECURITY DEFINER 函数写入，避免 authenticated 直写被拒

REVOKE ALL ON TABLE inventory_trip_sequences FROM PUBLIC, anon, authenticated;

ALTER TABLE inventory_trip_sequences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION inventory_allocate_trip_number(p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT := UPPER(LEFT(TRIM(COALESCE(p_prefix, '')), 3));
  v_next INT;
  v_legacy_max INT;
BEGIN
  IF v_prefix = '' THEN
    RAISE EXCEPTION 'invalid trip prefix';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('inventory_trip_seq:' || v_prefix, 0));

  INSERT INTO inventory_trip_sequences AS s (prefix, last_seq, updated_at)
  VALUES (v_prefix, 0, now())
  ON CONFLICT (prefix) DO NOTHING;

  SELECT COALESCE(MAX(SUBSTRING(trip_number FROM 4)::INTEGER), 0)
    INTO v_legacy_max
  FROM inventory_pkg_tracking
  WHERE trip_number ~ ('^' || v_prefix || '[0-9]{4}$');

  UPDATE inventory_trip_sequences
  SET last_seq = GREATEST(last_seq, v_legacy_max) + 1,
      updated_at = now()
  WHERE prefix = v_prefix
  RETURNING last_seq INTO v_next;

  RETURN v_prefix || LPAD(v_next::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION inventory_peek_trip_number(p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT := UPPER(LEFT(TRIM(COALESCE(p_prefix, '')), 3));
  v_seq INT := 0;
  v_legacy_max INT := 0;
BEGIN
  IF v_prefix = '' THEN
    RETURN NULL;
  END IF;

  SELECT last_seq INTO v_seq
  FROM inventory_trip_sequences
  WHERE prefix = v_prefix;

  SELECT COALESCE(MAX(SUBSTRING(trip_number FROM 4)::INTEGER), 0)
    INTO v_legacy_max
  FROM inventory_pkg_tracking
  WHERE trip_number ~ ('^' || v_prefix || '[0-9]{4}$');

  v_seq := GREATEST(COALESCE(v_seq, 0), v_legacy_max);
  RETURN v_prefix || LPAD((v_seq + 1)::TEXT, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION inventory_allocate_trip_number(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION inventory_peek_trip_number(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION inventory_allocate_trip_number(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION inventory_peek_trip_number(TEXT) TO authenticated;
