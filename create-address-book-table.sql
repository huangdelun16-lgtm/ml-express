-- 创建常用地址簿表
CREATE TABLE IF NOT EXISTS address_book (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  label TEXT NOT NULL, -- 如：家里, 公司, 常用地址
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address_text TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE address_book ENABLE ROW LEVEL SECURITY;

-- 允许用户管理自己的地址
CREATE POLICY "Users can manage their own addresses" ON address_book
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 创建消息通知表
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'system', -- system, order, promotion
  is_read BOOLEAN DEFAULT FALSE,
  related_id TEXT, -- 如关联的订单ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- 允许用户读取自己的通知
CREATE POLICY "Users can read their own notifications" ON user_notifications
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);
