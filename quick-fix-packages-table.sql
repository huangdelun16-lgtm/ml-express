-- 快速修复packages表结构
-- 在Supabase SQL Editor中执行此脚本

-- 1. 添加缺失的字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS delivery_store_id TEXT,
ADD COLUMN IF NOT EXISTS delivery_store_name TEXT,
ADD COLUMN IF NOT EXISTS store_receive_code TEXT;

-- 2. 添加索引提高性能
CREATE INDEX IF NOT EXISTS idx_packages_delivery_store_id ON packages(delivery_store_id);
CREATE INDEX IF NOT EXISTS idx_packages_store_receive_code ON packages(store_receive_code);

-- 3. 验证修复结果
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'packages' 
AND column_name IN ('delivery_store_id', 'delivery_store_name', 'store_receive_code')
ORDER BY column_name;
