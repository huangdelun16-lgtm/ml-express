CREATE TABLE IF NOT EXISTS public.geocode_cache (
  address TEXT PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS geocode_cache_updated_at_idx
  ON public.geocode_cache (updated_at DESC);

ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS couriers_auth_user_id_idx
  ON public.couriers (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

DROP POLICY IF EXISTS "geocode_cache_read" ON public.geocode_cache;
DROP POLICY IF EXISTS "geocode_cache_write" ON public.geocode_cache;
DROP POLICY IF EXISTS "geocode_cache_update" ON public.geocode_cache;

CREATE POLICY "geocode_cache_read"
  ON public.geocode_cache
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.couriers c
      WHERE c.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "geocode_cache_write"
  ON public.geocode_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.couriers c
      WHERE c.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "geocode_cache_update"
  ON public.geocode_cache
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.couriers c
      WHERE c.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.couriers c
      WHERE c.auth_user_id = auth.uid()
    )
  );
