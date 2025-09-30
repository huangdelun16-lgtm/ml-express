-- 员工账号管理表
-- 在 Supabase SQL 编辑器中执行本脚本

CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_id TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'operator', 'finance')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  hire_date TEXT NOT NULL,
  id_number TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  address TEXT,
  notes TEXT,
  created_by TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_admin_accounts_username ON admin_accounts(username);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_employee_id ON admin_accounts(employee_id);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_role ON admin_accounts(role);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_status ON admin_accounts(status);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_department ON admin_accounts(department);

-- 启用行级安全策略
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略（开发环境）
DROP POLICY IF EXISTS "Allow all operations on admin_accounts" ON admin_accounts;
CREATE POLICY "Allow all operations on admin_accounts" ON admin_accounts
FOR ALL USING (true) WITH CHECK (true);

-- 插入默认管理员账号
INSERT INTO admin_accounts (
  username, password, employee_name, employee_id, phone, email, 
  department, position, role, status, hire_date, notes, created_by
) VALUES (
  'admin', 'admin', '系统管理员', 'EMP001', '09-999999999', 'admin@marketlinkexpress.com',
  '技术部', '系统管理员', 'admin', 'active', '2024-01-01', '系统默认管理员账号', 'system'
) ON CONFLICT (username) DO NOTHING;
