-- 添加中转码字段到packages表
-- 用于包裹在中转站的唯一标识

-- 添加transfer_code字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS transfer_code TEXT;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_transfer_code ON packages(transfer_code);

-- 添加注释
COMMENT ON COLUMN packages.transfer_code IS '中转码：包裹在中转站的唯一标识码';

-- 验证字段是否添加成功
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'packages' AND column_name = 'transfer_code';
