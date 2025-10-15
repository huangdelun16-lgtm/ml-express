-- 在Supabase中创建packages表的SQL语句
-- 请在Supabase Dashboard的SQL编辑器中执行此语句

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  package_type TEXT NOT NULL,
  weight TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT '待取件',
  create_time TEXT NOT NULL,
  pickup_time TEXT DEFAULT '',
  delivery_time TEXT DEFAULT '',
  courier TEXT DEFAULT '待分配',
  price TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_created_at ON packages(created_at);

-- 启用行级安全策略（可选）
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略（开发环境）
CREATE POLICY "Allow all operations on packages" ON packages
FOR ALL USING (true) WITH CHECK (true);

-- 插入一些测试数据（可选）
INSERT INTO packages (
  id, sender_name, sender_phone, sender_address,
  receiver_name, receiver_phone, receiver_address,
  package_type, weight, description, status, create_time,
  pickup_time, delivery_time, courier, price
) VALUES (
  'PKG001', '张先生', '09-123456789', '曼德勒市中心区',
  '李先生', '09-987654321', '曼德勒东区',
  '文件', '0.5kg', '重要文件', '已取件', '2024-12-28 10:30',
  '2024-12-28 11:00', '', '快递员A', '5000 MMK'
), (
  'PKG002', '王女士', '09-111222333', '曼德勒南区',
  '陈先生', '09-444555666', '曼德勒北区',
  '包裹', '2.0kg', '生活用品', '配送中', '2024-12-28 09:15',
  '2024-12-28 10:00', '', '快递员B', '8000 MMK'
), (
  'PKG003', '刘先生', '09-777888999', '曼德勒西区',
  '赵女士', '09-000111222', '曼德勒中区',
  '文件', '0.3kg', '合同文件', '已送达', '2024-12-27 14:20',
  '2024-12-27 15:00', '2024-12-27 16:30', '快递员C', '3000 MMK'
);
