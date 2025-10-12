-- 通知表 (Notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipient_id TEXT NOT NULL, -- 接收者ID（快递员ID或用户ID）
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('courier', 'customer', 'admin')), -- 接收者类型
  notification_type TEXT NOT NULL CHECK (notification_type IN ('package_assigned', 'status_update', 'urgent', 'system')), -- 通知类型
  title TEXT NOT NULL, -- 通知标题
  message TEXT NOT NULL, -- 通知内容
  package_id TEXT, -- 关联的包裹ID（如果有）
  is_read BOOLEAN DEFAULT false, -- 是否已读
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 创建时间
  read_at TIMESTAMP WITH TIME ZONE, -- 阅读时间
  metadata JSONB -- 额外的元数据（如包裹详情、发送者等）
);

-- 创建索引加快查询
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_package ON notifications(package_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);

-- 添加注释
COMMENT ON TABLE notifications IS '系统通知表，用于存储发送给快递员、客户和管理员的通知';
COMMENT ON COLUMN notifications.recipient_id IS '接收者ID';
COMMENT ON COLUMN notifications.recipient_type IS '接收者类型：courier(快递员)、customer(客户)、admin(管理员)';
COMMENT ON COLUMN notifications.notification_type IS '通知类型：package_assigned(包裹分配)、status_update(状态更新)、urgent(紧急)、system(系统)';
COMMENT ON COLUMN notifications.title IS '通知标题';
COMMENT ON COLUMN notifications.message IS '通知内容';
COMMENT ON COLUMN notifications.package_id IS '关联的包裹ID（如果有）';
COMMENT ON COLUMN notifications.is_read IS '是否已读';
COMMENT ON COLUMN notifications.metadata IS '额外的元数据JSON';

-- 插入示例通知（可选）
INSERT INTO notifications (recipient_id, recipient_type, notification_type, title, message, package_id, metadata) VALUES
  ('courier-001', 'courier', 'package_assigned', '新包裹分配', '您有一个新的包裹待取件，请及时处理。', 'PKG001', '{"sender": "系统自动分配", "priority": "normal"}'::jsonb),
  ('courier-002', 'courier', 'urgent', '紧急包裹', '您有一个急送达包裹，请优先配送！', 'PKG002', '{"sender": "调度中心", "priority": "urgent"}'::jsonb);

-- 启用行级安全性（RLS）
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看自己的通知
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT
  USING (recipient_id = current_user);

-- 创建策略：系统可以插入通知
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT
  WITH CHECK (true);

-- 创建策略：用户可以更新自己的通知（标记为已读）
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE
  USING (recipient_id = current_user);

