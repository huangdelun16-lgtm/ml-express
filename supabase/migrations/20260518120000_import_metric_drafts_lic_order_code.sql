-- 进口指标草稿：订单编码 LIC-####（保存后不可在前端修改，仅按序递增）
ALTER TABLE public.import_metric_drafts
  ADD COLUMN IF NOT EXISTS lic_order_code TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.import_metric_drafts.lic_order_code IS '订单编码，形如 LIC-0001；唯一（非空时）';

CREATE UNIQUE INDEX IF NOT EXISTS idx_import_metric_drafts_lic_order_code_unique
  ON public.import_metric_drafts (lic_order_code)
  WHERE lic_order_code <> '';
