-- 快递店管理表
-- 在 Supabase SQL 编辑器中执行本脚本

CREATE TABLE IF NOT EXISTS delivery_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL,
  store_code TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  manager_name TEXT NOT NULL,
  manager_phone TEXT NOT NULL,
  store_type TEXT NOT NULL CHECK (store_type IN ('hub', 'branch', 'pickup_point')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  operating_hours TEXT NOT NULL DEFAULT '08:00-22:00',
  service_area_radius INTEGER DEFAULT 5, -- 服务半径（公里）
  capacity INTEGER DEFAULT 1000, -- 日处理能力（包裹数）
  current_load INTEGER DEFAULT 0, -- 当前负载
  facilities TEXT[], -- 设施列表 ['parking', 'storage', 'office', 'restroom']
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_delivery_stores_code ON delivery_stores(store_code);
CREATE INDEX IF NOT EXISTS idx_delivery_stores_status ON delivery_stores(status);
CREATE INDEX IF NOT EXISTS idx_delivery_stores_type ON delivery_stores(store_type);
CREATE INDEX IF NOT EXISTS idx_delivery_stores_location ON delivery_stores(latitude, longitude);

-- 启用行级安全策略
ALTER TABLE delivery_stores ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略（开发环境）
DROP POLICY IF EXISTS "Allow all operations on delivery_stores" ON delivery_stores;
CREATE POLICY "Allow all operations on delivery_stores" ON delivery_stores
FOR ALL USING (true) WITH CHECK (true);

-- 插入示例数据
INSERT INTO delivery_stores (
  store_name, store_code, address, latitude, longitude, phone, email,
  manager_name, manager_phone, store_type, status, operating_hours,
  service_area_radius, capacity, facilities, notes, created_by
) VALUES (
  '曼德勒中心店', 'MDL001', '曼德勒市中心商业区', 21.9588, 96.0891,
  '09-123456789', 'mdl001@marketlinkexpress.com',
  '张经理', '09-987654321', 'hub', 'active', '06:00-24:00',
  10, 2000, ARRAY['parking', 'storage', 'office', 'restroom', 'loading_dock'],
  '主要分拣中心，24小时营业', 'system'
), (
  '东区配送点', 'MDL002', '曼德勒东区住宅区', 21.9688, 96.0991,
  '09-111222333', 'mdl002@marketlinkexpress.com',
  '李主管', '09-444555666', 'branch', 'active', '08:00-20:00',
  5, 500, ARRAY['parking', 'storage', 'office'],
  '住宅区配送点，主要服务东区客户', 'system'
), (
  '西区自提点', 'MDL003', '曼德勒西区购物中心', 21.9488, 96.0791,
  '09-777888999', 'mdl003@marketlinkexpress.com',
  '王店长', '09-000111222', 'pickup_point', 'active', '09:00-21:00',
  3, 200, ARRAY['storage', 'office'],
  '购物中心自提点，方便客户取件', 'system'
);
