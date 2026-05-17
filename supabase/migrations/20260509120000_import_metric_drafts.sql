-- 进口指标草稿（管理端）：单行一条批文，商品行为 JSONB
-- 进口价格表页面由本表 line_items 汇总展示，无需单独商品价目表

CREATE TABLE IF NOT EXISTS public.import_metric_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  register_no TEXT NOT NULL DEFAULT '',
  start_date DATE,
  customer_name TEXT NOT NULL DEFAULT '',
  port_of_discharge TEXT NOT NULL DEFAULT '',
  ed_date DATE,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_charges TEXT NOT NULL DEFAULT '',
  deposit_first TEXT NOT NULL DEFAULT '',
  deposit_second TEXT NOT NULL DEFAULT '',
  deposit_third TEXT NOT NULL DEFAULT '',
  first_handler TEXT NOT NULL DEFAULT '',
  first_account TEXT NOT NULL DEFAULT '',
  second_handler TEXT NOT NULL DEFAULT '',
  second_account TEXT NOT NULL DEFAULT '',
  third_handler TEXT NOT NULL DEFAULT '',
  third_account TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_import_metric_drafts_updated_at ON public.import_metric_drafts (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_metric_drafts_register_no ON public.import_metric_drafts (register_no);

COMMENT ON TABLE public.import_metric_drafts IS '进口指标批文草稿；商品价格页由 line_items 汇总';

ALTER TABLE public.import_metric_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all import_metric_drafts" ON public.import_metric_drafts;
CREATE POLICY "Allow all import_metric_drafts" ON public.import_metric_drafts
  FOR ALL USING (true) WITH CHECK (true);
