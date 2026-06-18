-- 管理端「个人开销」：按登录用户名隔离的收入 / 支出流水

CREATE TABLE IF NOT EXISTS public.personal_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_username TEXT NOT NULL DEFAULT '',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MMK',
  category TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_personal_ledger_owner_date
  ON public.personal_ledger_entries (owner_username, entry_date DESC);

COMMENT ON TABLE public.personal_ledger_entries IS '个人收入与开销流水（按 owner_username 隔离）';

ALTER TABLE public.personal_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all personal_ledger_entries" ON public.personal_ledger_entries;
CREATE POLICY "Allow all personal_ledger_entries" ON public.personal_ledger_entries
  FOR ALL USING (true) WITH CHECK (true);
