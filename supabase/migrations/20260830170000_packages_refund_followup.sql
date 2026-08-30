-- 取消单退款跟单：记录是否已退、退了多少、谁跟的，避免余额/转账各退各的对不上
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS refund_status text,
  ADD COLUMN IF NOT EXISTS refund_amount numeric,
  ADD COLUMN IF NOT EXISTS refund_note text,
  ADD COLUMN IF NOT EXISTS refund_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_by text,
  ADD COLUMN IF NOT EXISTS refund_by_name text;

COMMENT ON COLUMN public.packages.refund_status IS
  '退款跟单：pending | refunded | waived';
COMMENT ON COLUMN public.packages.refund_amount IS
  '实际或应退金额（MMK）';
COMMENT ON COLUMN public.packages.refund_note IS
  '退款备注（线下已退 / 无需退原因）';
COMMENT ON COLUMN public.packages.refund_at IS
  '最近一次退款跟单时间';
COMMENT ON COLUMN public.packages.refund_by IS
  '跟单人 ID（后台用户名或 merchant）';
COMMENT ON COLUMN public.packages.refund_by_name IS
  '跟单人显示名';

CREATE INDEX IF NOT EXISTS idx_packages_refund_status
  ON public.packages (refund_status)
  WHERE status = '已取消';
