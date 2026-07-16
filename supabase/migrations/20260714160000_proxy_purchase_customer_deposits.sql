-- 代购清单：按客户记录预收订金（人民币合计卡片）

ALTER TABLE public.proxy_purchase_workspaces
  ADD COLUMN IF NOT EXISTS customer_deposits JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.proxy_purchase_workspaces.customer_deposits IS '按客户姓名键入的订金金额（字符串数字，单位 RMB）';
