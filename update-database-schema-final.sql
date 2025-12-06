-- 数据库结构更新脚本 (最终合并版)
-- 请在 Supabase SQL Editor 中运行此脚本以修复 "Partner显示为普通账户" 和 "代收款不显示" 的问题

-- 1. 添加代收款字段 (修复代收款显示为"无")
ALTER TABLE packages ADD COLUMN IF NOT EXISTS cod_amount NUMERIC DEFAULT 0;
COMMENT ON COLUMN packages.cod_amount IS '代收款金额 (MMK)';

ALTER TABLE pending_orders ADD COLUMN IF NOT EXISTS cod_amount NUMERIC DEFAULT 0;
COMMENT ON COLUMN pending_orders.cod_amount IS '代收款金额 (MMK)';

-- 2. 添加 Partner 相关字段 (修复Partner识别为普通账户)
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS sender_code TEXT,
ADD COLUMN IF NOT EXISTS delivery_store_id UUID,
ADD COLUMN IF NOT EXISTS delivery_store_name TEXT;

COMMENT ON COLUMN packages.sender_code IS '寄件方代码（合伙店铺代码）';
COMMENT ON COLUMN packages.delivery_store_id IS '关联的合伙店铺ID';
COMMENT ON COLUMN packages.delivery_store_name IS '关联的合伙店铺名称';

-- 3. 添加客户信息字段 (用于VIP识别)
ALTER TABLE packages ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS customer_name TEXT;

COMMENT ON COLUMN packages.customer_email IS '客户邮箱';
COMMENT ON COLUMN packages.customer_name IS '客户姓名';

