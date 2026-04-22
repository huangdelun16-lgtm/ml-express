-- 下单时基础起步价快照（MMK）。财务管理中骑手分成 = 跑腿费总价 - 该快照；
-- 避免日后在系统设置中修改「基础起步价」后追溯改变历史订单的骑手应得金额。
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS pricing_base_fee_mmk numeric;

COMMENT ON COLUMN public.packages.pricing_base_fee_mmk IS
  'Platform base fee (MMK) at order creation; rider share uses price minus this value. NULL = legacy row, fall back to current system setting.';
