-- 为 packages 表添加 cod_amount 字段
-- 用于存储代收款金额 (Cash on Delivery)

ALTER TABLE packages
ADD COLUMN IF NOT EXISTS cod_amount NUMERIC DEFAULT 0;

COMMENT ON COLUMN packages.cod_amount IS '代收款金额 (MMK)';

-- 为 pending_orders 表添加 cod_amount 字段
-- 用于临时存储代收款金额

ALTER TABLE pending_orders
ADD COLUMN IF NOT EXISTS cod_amount NUMERIC DEFAULT 0;

COMMENT ON COLUMN pending_orders.cod_amount IS '代收款金额 (MMK)';
