-- 财务记录表结构定义
CREATE TABLE IF NOT EXISTS finances (
  id TEXT PRIMARY KEY,
  record_type TEXT NOT NULL CHECK (record_type IN ('income', 'expense')),
  category TEXT NOT NULL,
  order_id TEXT,
  courier_id TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MMK',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method TEXT NOT NULL,
  reference TEXT,
  record_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引优化查询
CREATE INDEX IF NOT EXISTS finances_record_date_idx ON finances (record_date DESC);
CREATE INDEX IF NOT EXISTS finances_type_status_idx ON finances (record_type, status);
CREATE INDEX IF NOT EXISTS finances_order_idx ON finances (order_id);
CREATE INDEX IF NOT EXISTS finances_courier_idx ON finances (courier_id);

-- 启用行级安全，允许匿名访问读取和写入（根据需要调整）
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;

-- 默认策略：允许经过 Supabase 认证的客户端读写
CREATE POLICY "Allow authenticated read" ON finances
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert" ON finances
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON finances
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete" ON finances
  FOR DELETE
  USING (auth.role() = 'authenticated');

