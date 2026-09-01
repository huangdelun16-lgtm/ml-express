-- 站点日结/月结快照 + 代转已汇签认
-- Admin 用 service role；站点 JWT 只能读写本站提交的结算 / 本站付出的汇款

CREATE TABLE IF NOT EXISTS public.inventory_station_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_type TEXT NOT NULL CHECK (period_type IN ('day', 'month')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  store_id UUID NOT NULL,
  store_code TEXT NOT NULL,
  hub_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'confirmed', 'rejected')),
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_by TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by TEXT NOT NULL DEFAULT '',
  confirmed_at TIMESTAMPTZ,
  rejected_reason TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_station_settlements_store_period_uidx
  ON public.inventory_station_settlements (store_id, period_type, period_start);

CREATE INDEX IF NOT EXISTS inventory_station_settlements_status_idx
  ON public.inventory_station_settlements (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS inventory_station_settlements_period_idx
  ON public.inventory_station_settlements (period_type, period_start, store_code);

COMMENT ON TABLE public.inventory_station_settlements IS
  '中转站日结/月结：站点提交金额快照，总部确认或驳回；已确认后活账变化不再改这份';

CREATE TABLE IF NOT EXISTS public.inventory_agency_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  from_store_id UUID NOT NULL,
  from_store_code TEXT NOT NULL,
  from_hub_code TEXT NOT NULL,
  to_origin_key TEXT NOT NULL,
  to_store_code TEXT NOT NULL DEFAULT '',
  amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'MMK',
  remitted_at DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS inventory_agency_remittances_from_idx
  ON public.inventory_agency_remittances (from_store_id, remitted_at DESC);

CREATE INDEX IF NOT EXISTS inventory_agency_remittances_origin_idx
  ON public.inventory_agency_remittances (upper(trim(to_origin_key)), remitted_at DESC);

COMMENT ON TABLE public.inventory_agency_remittances IS
  '目的站把代收已汇给发站的签认；发站与总部月结可见应付/已付';

ALTER TABLE public.inventory_station_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_agency_remittances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_station_settlements_select ON public.inventory_station_settlements;
CREATE POLICY inventory_station_settlements_select ON public.inventory_station_settlements
  FOR SELECT TO authenticated
  USING (
    public.inventory_session_active()
    AND store_id = public.inventory_jwt_store_id()
  );

DROP POLICY IF EXISTS inventory_station_settlements_insert ON public.inventory_station_settlements;
CREATE POLICY inventory_station_settlements_insert ON public.inventory_station_settlements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.inventory_session_active()
    AND store_id = public.inventory_jwt_store_id()
    AND upper(trim(store_code)) = upper(trim(public.inventory_jwt_store_code()))
    AND upper(trim(hub_code)) = upper(trim(public.inventory_jwt_hub_code()))
    AND status = 'submitted'
  );

DROP POLICY IF EXISTS inventory_station_settlements_update ON public.inventory_station_settlements;
CREATE POLICY inventory_station_settlements_update ON public.inventory_station_settlements
  FOR UPDATE TO authenticated
  USING (
    public.inventory_session_active()
    AND store_id = public.inventory_jwt_store_id()
    AND status = 'rejected'
  )
  WITH CHECK (
    public.inventory_session_active()
    AND store_id = public.inventory_jwt_store_id()
    AND status = 'submitted'
  );

DROP POLICY IF EXISTS inventory_agency_remittances_select ON public.inventory_agency_remittances;
CREATE POLICY inventory_agency_remittances_select ON public.inventory_agency_remittances
  FOR SELECT TO authenticated
  USING (
    public.inventory_session_active()
    AND (
      from_store_id = public.inventory_jwt_store_id()
      OR upper(trim(to_origin_key)) = upper(trim(public.inventory_jwt_hub_code()))
      OR upper(trim(to_store_code)) = upper(trim(public.inventory_jwt_store_code()))
    )
  );

DROP POLICY IF EXISTS inventory_agency_remittances_insert ON public.inventory_agency_remittances;
CREATE POLICY inventory_agency_remittances_insert ON public.inventory_agency_remittances
  FOR INSERT TO authenticated
  WITH CHECK (
    public.inventory_session_active()
    AND from_store_id = public.inventory_jwt_store_id()
    AND upper(trim(from_store_code)) = upper(trim(public.inventory_jwt_store_code()))
    AND upper(trim(from_hub_code)) = upper(trim(public.inventory_jwt_hub_code()))
  );

CREATE OR REPLACE FUNCTION public.inventory_settlement_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    IF OLD.status = 'confirmed' AND auth.role() IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'confirmed settlement is read-only';
    END IF;
    IF OLD.status = 'submitted' AND auth.role() IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'submitted settlement awaits HQ review';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_station_settlements_guard ON public.inventory_station_settlements;
CREATE TRIGGER inventory_station_settlements_guard
  BEFORE UPDATE ON public.inventory_station_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.inventory_settlement_guard();

GRANT SELECT, INSERT, UPDATE ON public.inventory_station_settlements TO authenticated;
GRANT SELECT, INSERT ON public.inventory_agency_remittances TO authenticated;

REVOKE ALL ON public.inventory_station_settlements FROM PUBLIC, anon;
REVOKE ALL ON public.inventory_agency_remittances FROM PUBLIC, anon;
