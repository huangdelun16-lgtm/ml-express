-- Admin 商家监管「催接单」时间戳。商家 Web/App 订阅本店 UPDATE，字段变化时响铃。
ALTER TABLE public.delivery_stores
  ADD COLUMN IF NOT EXISTS ops_nudge_at TIMESTAMPTZ;

COMMENT ON COLUMN public.delivery_stores.ops_nudge_at IS
  'Last time admin nudged the store to accept pending orders. Merchant clients subscribe to changes.';

GRANT SELECT (ops_nudge_at), INSERT (ops_nudge_at), UPDATE (ops_nudge_at)
  ON TABLE public.delivery_stores TO anon;

GRANT SELECT (ops_nudge_at), UPDATE (ops_nudge_at)
  ON TABLE public.delivery_stores TO authenticated;

NOTIFY pgrst, 'reload schema';
