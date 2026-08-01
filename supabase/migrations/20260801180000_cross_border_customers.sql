-- Admin 跨境物流：登记客户档案

CREATE TABLE IF NOT EXISTS public.cross_border_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  delivery_region_id TEXT NOT NULL,
  delivery_area_code TEXT NOT NULL,
  address_notes TEXT NOT NULL DEFAULT '',
  salesperson_employee_code TEXT NOT NULL DEFAULT '',
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_border_customers_code
  ON public.cross_border_customers (customer_code);

CREATE INDEX IF NOT EXISTS idx_cross_border_customers_application_date
  ON public.cross_border_customers (application_date DESC, created_at DESC);

COMMENT ON TABLE public.cross_border_customers IS 'Admin 跨境物流：登记客户（客户编码=送货区域短写+申请日期YYMMDD+推销员序号）';
COMMENT ON COLUMN public.cross_border_customers.customer_code IS '如 MDY260812005';

ALTER TABLE public.cross_border_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cross_border_customers_all ON public.cross_border_customers;
CREATE POLICY cross_border_customers_all ON public.cross_border_customers
  FOR ALL USING (true) WITH CHECK (true);
