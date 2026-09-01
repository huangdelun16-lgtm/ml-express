-- Per-store packing SLA (minutes). Admin sets this on 新增/编辑合伙店铺.
-- Existing column-level GRANTs on delivery_stores do not auto-include new columns.
ALTER TABLE public.delivery_stores
  ADD COLUMN IF NOT EXISTS packing_sla_minutes INTEGER NOT NULL DEFAULT 12;

ALTER TABLE public.delivery_stores
  DROP CONSTRAINT IF EXISTS delivery_stores_packing_sla_minutes_range;

ALTER TABLE public.delivery_stores
  ADD CONSTRAINT delivery_stores_packing_sla_minutes_range
  CHECK (packing_sla_minutes >= 1 AND packing_sla_minutes <= 180);

COMMENT ON COLUMN public.delivery_stores.packing_sla_minutes IS
  'Minutes the store has to pack after accepting an order. Configured in Admin merchant form.';

GRANT SELECT (packing_sla_minutes), INSERT (packing_sla_minutes), UPDATE (packing_sla_minutes)
  ON TABLE public.delivery_stores TO anon;

GRANT SELECT (packing_sla_minutes), UPDATE (packing_sla_minutes)
  ON TABLE public.delivery_stores TO authenticated;

NOTIFY pgrst, 'reload schema';
