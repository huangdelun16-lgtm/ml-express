-- 修复packages表结构，添加店铺相关字段
-- 这个脚本用于解决移动端扫码时"Could not find the 'delivery_store_id' column"错误

-- 添加店铺相关字段到packages表
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS delivery_store_id TEXT,
ADD COLUMN IF NOT EXISTS delivery_store_name TEXT,
ADD COLUMN IF NOT EXISTS store_receive_code TEXT;

-- 添加注释说明字段用途
COMMENT ON COLUMN packages.delivery_store_id IS '送达店铺ID，用于关联delivery_stores表';
COMMENT ON COLUMN packages.delivery_store_name IS '送达店铺名称，冗余存储便于查询';
COMMENT ON COLUMN packages.store_receive_code IS '店铺收件码，格式：STORE_店铺ID_时间戳';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_delivery_store_id ON packages(delivery_store_id);
CREATE INDEX IF NOT EXISTS idx_packages_store_receive_code ON packages(store_receive_code);

-- 验证字段是否添加成功
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'packages' 
AND column_name IN ('delivery_store_id', 'delivery_store_name', 'store_receive_code')
ORDER BY column_name;
