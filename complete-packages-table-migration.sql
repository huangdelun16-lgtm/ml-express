-- ============================================
-- 数据库迁移脚本 - 添加必要的字段到 packages 表
-- ============================================
-- 此脚本包含两个重要的数据库更新：
-- 1. 添加 customer_id 和 customer_email 字段（用于客户端APP订单查询）
-- 2. 添加 cod_settled 和 cod_settled_at 字段（用于合伙店铺代收款结清功能）
-- ============================================

-- ============================================
-- 第一部分：添加客户关联字段
-- ============================================
-- 这些字段用于关联订单与客户账号，解决客户端APP订单查询问题

-- 1. 添加 customer_id 字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS customer_id TEXT;

-- 2. 添加 customer_email 字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_customer_id ON packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_packages_customer_email ON packages(customer_email);

-- 4. 添加字段说明
COMMENT ON COLUMN packages.customer_id IS '客户ID，关联 users 表';
COMMENT ON COLUMN packages.customer_email IS '客户邮箱，用于备用关联';

-- ============================================
-- 第二部分：添加代收款结清状态字段
-- ============================================
-- 这些字段用于跟踪合伙店铺代收款的结清状态

-- 1. 添加 cod_settled 字段（是否已结清）
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS cod_settled BOOLEAN DEFAULT FALSE;

-- 2. 添加 cod_settled_at 字段（结清时间）
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS cod_settled_at TIMESTAMP WITH TIME ZONE;

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_cod_settled ON packages(cod_settled);

-- 4. 添加字段说明
COMMENT ON COLUMN packages.cod_settled IS '代收款是否已结清给合伙店铺';
COMMENT ON COLUMN packages.cod_settled_at IS '代收款结清时间';

-- ============================================
-- 验证：检查字段是否添加成功
-- ============================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'packages' 
AND column_name IN ('customer_id', 'customer_email', 'cod_settled', 'cod_settled_at')
ORDER BY column_name;

-- ============================================
-- 完成！
-- ============================================
-- 如果上面的查询返回了4行数据，说明所有字段都已成功添加。
-- 现在可以：
-- 1. 客户端APP可以正常查询订单（通过 customer_id）
-- 2. Admin Web可以正常使用合伙代收款结清功能
-- ============================================

