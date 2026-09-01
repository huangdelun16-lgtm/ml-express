-- Merchant packing SLA starts when the store accepts the order (status → 打包中).
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS packing_started_at TIMESTAMPTZ;

COMMENT ON COLUMN public.packages.packing_started_at IS
  'Merchant accepted / packing started. Used for packing SLA countdown.';
