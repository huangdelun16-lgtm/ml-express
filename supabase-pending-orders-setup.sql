-- 临时订单表（用于存储待支付的订单信息）
CREATE TABLE IF NOT EXISTS pending_orders (
  id TEXT PRIMARY KEY,
  temp_order_id TEXT NOT NULL UNIQUE,
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_address TEXT NOT NULL,
  sender_latitude NUMERIC,
  sender_longitude NUMERIC,
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  receiver_latitude NUMERIC,
  receiver_longitude NUMERIC,
  package_type TEXT NOT NULL,
  weight TEXT NOT NULL,
  delivery_speed TEXT,
  scheduled_delivery_time TEXT,
  price NUMERIC NOT NULL,
  distance NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'qr', -- 'qr' 或 'cash'
  customer_email TEXT,
  customer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours') -- 24小时后过期
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_pending_orders_temp_order_id ON pending_orders(temp_order_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_created_at ON pending_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_orders_expires_at ON pending_orders(expires_at);

-- 启用行级安全策略
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略（开发环境）
CREATE POLICY "Allow all operations on pending_orders" ON pending_orders
FOR ALL USING (true) WITH CHECK (true);

-- 添加注释
COMMENT ON TABLE pending_orders IS '临时订单表，用于存储待支付的订单信息，24小时后自动过期';
COMMENT ON COLUMN pending_orders.temp_order_id IS '临时订单ID，用于关联支付流程';
COMMENT ON COLUMN pending_orders.payment_method IS '支付方式：qr=二维码支付，cash=现金支付';
COMMENT ON COLUMN pending_orders.expires_at IS '订单过期时间，24小时后自动删除';

