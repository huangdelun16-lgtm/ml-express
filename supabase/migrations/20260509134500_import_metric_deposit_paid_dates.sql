-- 三期款项各自实际付款日期（公历），可与金额分开记录
ALTER TABLE public.import_metric_drafts
  ADD COLUMN IF NOT EXISTS deposit_first_paid_on DATE,
  ADD COLUMN IF NOT EXISTS deposit_second_paid_on DATE,
  ADD COLUMN IF NOT EXISTS deposit_third_paid_on DATE;

COMMENT ON COLUMN public.import_metric_drafts.deposit_first_paid_on IS '第一期申请批文订金付款日';
COMMENT ON COLUMN public.import_metric_drafts.deposit_second_paid_on IS '第二期 ANNI 费用付款日';
COMMENT ON COLUMN public.import_metric_drafts.deposit_third_paid_on IS '第三期 LICENSE / 尾款付款日';
