-- 添加支付方式字段到packages表
-- 这个脚本用于支持现金支付、转账支付和二维码支付的区分

-- 添加payment_method字段到packages表
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'qr';

-- 添加注释说明字段用途
COMMENT ON COLUMN packages.payment_method IS '支付方式：qr=二维码支付，cash=现金支付，transfer=转账支付';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_payment_method ON packages(payment_method);

-- 更新现有订单的payment_method（如果status为"待收款"，则设为cash）
UPDATE packages 
SET payment_method = 'cash' 
WHERE status = '待收款' AND (payment_method IS NULL OR payment_method = '');

-- 验证字段是否添加成功
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'packages' 
AND column_name = 'payment_method';

