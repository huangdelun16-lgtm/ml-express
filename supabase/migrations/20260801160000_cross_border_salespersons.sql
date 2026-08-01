-- Admin 跨境物流：公司推销员档案

CREATE TABLE IF NOT EXISTS public.cross_border_salespersons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  region_id TEXT NOT NULL,
  work_area_code TEXT NOT NULL,
  employee_code TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_border_salespersons_employee_code
  ON public.cross_border_salespersons (employee_code);

CREATE INDEX IF NOT EXISTS idx_cross_border_salespersons_region
  ON public.cross_border_salespersons (work_area_code, join_date DESC);

COMMENT ON TABLE public.cross_border_salespersons IS 'Admin 跨境物流：公司推销员档案';
COMMENT ON COLUMN public.cross_border_salespersons.work_area_code IS '工作区域短写，如 MDY、YGN';
COMMENT ON COLUMN public.cross_border_salespersons.employee_code IS '员工编码，格式 {短写}-001';

ALTER TABLE public.cross_border_salespersons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cross_border_salespersons_all ON public.cross_border_salespersons;
CREATE POLICY cross_border_salespersons_all ON public.cross_border_salespersons
  FOR ALL USING (true) WITH CHECK (true);
