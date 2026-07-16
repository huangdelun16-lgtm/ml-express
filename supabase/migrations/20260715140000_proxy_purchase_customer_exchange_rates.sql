-- 代购清单：按客户记录汇率

ALTER TABLE public.proxy_purchase_workspaces
  ADD COLUMN IF NOT EXISTS customer_exchange_rates JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.proxy_purchase_workspaces.customer_exchange_rates IS '按客户姓名键入的汇率（字符串数字，1 RMB = N MMK）';
