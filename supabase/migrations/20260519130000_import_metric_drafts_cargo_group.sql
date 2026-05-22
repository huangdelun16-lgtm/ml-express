-- 进口指标草稿：商品分组（整单级别，非 line_items 内单条商品字段）
ALTER TABLE public.import_metric_drafts
  ADD COLUMN IF NOT EXISTS cargo_group TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.import_metric_drafts.cargo_group IS '商品明细 Group（整单）；导出 Excel 商品明细时写入 GROUP 列';
