-- 创建快递员表
CREATE TABLE IF NOT EXISTS couriers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('motorcycle', 'car', 'bicycle', 'truck', 'tricycle', 'small_truck')),
  license_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'busy')),
  join_date TEXT NOT NULL,
  last_active TEXT DEFAULT '从未上线',
  total_deliveries INTEGER DEFAULT 0,
  rating DECIMAL(3,1) DEFAULT 0.0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_couriers_phone ON couriers(phone);
CREATE INDEX IF NOT EXISTS idx_couriers_status ON couriers(status);
CREATE INDEX IF NOT EXISTS idx_couriers_vehicle_type ON couriers(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_couriers_rating ON couriers(rating);

-- 启用行级安全
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

-- 创建策略（允许所有操作）
CREATE POLICY "Allow all operations on couriers" ON couriers
  FOR ALL USING (true) WITH CHECK (true);
