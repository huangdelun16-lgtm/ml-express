-- Admin 代购清单：云端共享工作区（多设备同步，替代浏览器 localStorage）

CREATE TABLE IF NOT EXISTS public.proxy_purchase_workspaces (
  workspace_key TEXT PRIMARY KEY DEFAULT 'default',
  proxy_fee_percent TEXT NOT NULL DEFAULT '5',
  exchange_rate TEXT NOT NULL DEFAULT '595',
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_proxy_purchase_workspaces_updated_at
  ON public.proxy_purchase_workspaces (updated_at DESC);

COMMENT ON TABLE public.proxy_purchase_workspaces IS 'Admin 代购清单工作区；rows 为订单行 JSON 数组';

ALTER TABLE public.proxy_purchase_workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all proxy_purchase_workspaces" ON public.proxy_purchase_workspaces;
CREATE POLICY "Allow all proxy_purchase_workspaces" ON public.proxy_purchase_workspaces
  FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proxy_purchase_workspaces TO anon, authenticated, service_role;
