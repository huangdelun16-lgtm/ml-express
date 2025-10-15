-- 更新packages表，添加客户信息字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- 添加注释
COMMENT ON COLUMN packages.customer_name IS '客户姓名';
COMMENT ON COLUMN packages.customer_phone IS '客户手机号';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_packages_customer_phone ON packages(customer_phone);
CREATE INDEX IF NOT EXISTS idx_packages_customer_name ON packages(customer_name);
