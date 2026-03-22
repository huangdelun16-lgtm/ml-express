-- 创建聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'rider', 'merchant', 'admin')),
  message TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- 启用 RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 创建策略
DROP POLICY IF EXISTS "Allow all access to chat_messages" ON chat_messages;
CREATE POLICY "Allow all access to chat_messages" ON chat_messages
FOR ALL USING (true) WITH CHECK (true);

-- 评论：用于存储订单相关的实时聊天消息
COMMENT ON TABLE chat_messages IS '订单实时聊天消息表';
