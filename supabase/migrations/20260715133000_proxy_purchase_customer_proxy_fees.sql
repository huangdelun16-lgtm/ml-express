-- 代购清单：按客户记录代购费百分比

ALTER TABLE public.proxy_purchase_workspaces
  ADD COLUMN IF NOT EXISTS customer_proxy_fees JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.proxy_purchase_workspaces.customer_proxy_fees IS '按客户姓名键入的代购费百分比（字符串数字）';
