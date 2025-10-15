-- 在Supabase中创建users表的SQL语句
-- 请在Supabase Dashboard的SQL编辑器中执行此语句

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'courier', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  registration_date TEXT NOT NULL,
  last_login TEXT DEFAULT '从未登录',
  total_orders INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  rating DECIMAL(3,1) DEFAULT 0.0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 启用行级安全策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略（开发环境）
CREATE POLICY "Allow all operations on users" ON users
FOR ALL USING (true) WITH CHECK (true);

-- 插入一些测试数据（可选）
INSERT INTO users (
  id, name, phone, email, address, user_type, status, 
  registration_date, last_login, total_orders, total_spent, rating, notes
) VALUES (
  'USR001', '张先生', '09-123456789', 'zhang@example.com', '曼德勒市中心区',
  'customer', 'active', '2024-12-01', '2024-12-28 10:30', 15, 75000, 4.8, '优质客户，经常使用快递服务'
), (
  'USR002', '李快递员', '09-987654321', 'li@example.com', '曼德勒东区',
  'courier', 'active', '2024-11-15', '2024-12-28 09:15', 0, 0, 4.9, '经验丰富的快递员，服务态度好'
), (
  'USR003', '王女士', '09-111222333', 'wang@example.com', '曼德勒南区',
  'customer', 'inactive', '2024-10-20', '2024-12-20 14:20', 8, 32000, 4.5, '最近较少使用服务'
), (
  'USR004', '陈管理员', '09-444555666', 'chen@example.com', '曼德勒北区',
  'admin', 'active', '2024-09-01', '2024-12-28 11:45', 0, 0, 5.0, '系统管理员'
);
