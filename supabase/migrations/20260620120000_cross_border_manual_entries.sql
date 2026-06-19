-- Admin 跨境物流「其它开销」：手工登记的收入 / 支出

CREATE TABLE IF NOT EXISTS public.cross_border_manual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'MMK',
  category TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_cross_border_manual_entries_date
  ON public.cross_border_manual_entries (entry_date DESC, created_at DESC);

COMMENT ON TABLE public.cross_border_manual_entries IS 'Admin 跨境物流：其它收入/支出手工登记';

ALTER TABLE public.cross_border_manual_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cross_border_manual_entries_all" ON public.cross_border_manual_entries;
CREATE POLICY "cross_border_manual_entries_all" ON public.cross_border_manual_entries
  FOR ALL USING (true) WITH CHECK (true);
