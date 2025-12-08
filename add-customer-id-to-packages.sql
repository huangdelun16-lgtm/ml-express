-- 修复 packages 表缺失 customer_id 字段的问题
-- 该字段用于关联订单与客户账号

-- 1. 添加 customer_id 字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS customer_id TEXT;

-- 2. 添加 customer_email 字段 (如果代码中也用到了)
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_customer_id ON packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_packages_customer_email ON packages(customer_email);

-- 4. 添加字段说明
COMMENT ON COLUMN packages.customer_id IS '客户ID，关联 users 表';
COMMENT ON COLUMN packages.customer_email IS '客户邮箱，用于备用关联';

-- 5. 验证字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'packages' 
AND column_name IN ('customer_id', 'customer_email');

