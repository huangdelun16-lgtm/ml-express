-- 后台统一审计表（与 src/services/supabase.ts 中 auditLogService / audit_logs 一致）
-- 若表已存在于线上，本 migration 因 IF NOT EXISTS 可安全重复执行

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  module TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  action_description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  action_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time ON public.audit_logs (action_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs (module);

COMMENT ON TABLE public.audit_logs IS '管理端操作审计日志（登录、财务、包裹、配送警报等）';
