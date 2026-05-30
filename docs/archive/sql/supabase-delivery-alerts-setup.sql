-- 创建配送警报表
-- 用于记录骑手异常操作警报（例如：在收件地址100米外标记已送达）

CREATE TABLE IF NOT EXISTS delivery_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 包裹信息
  package_id VARCHAR(255) NOT NULL,
  
  -- 骑手信息
  courier_id VARCHAR(255) NOT NULL,
  courier_name VARCHAR(255) NOT NULL,
  
  -- 警报类型
  alert_type VARCHAR(50) NOT NULL, -- 'distance_violation', 'suspicious_location', 'time_violation' 等
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- 位置信息
  courier_latitude DECIMAL(10, 7) NOT NULL,
  courier_longitude DECIMAL(10, 7) NOT NULL,
  destination_latitude DECIMAL(10, 7),
  destination_longitude DECIMAL(10, 7),
  distance_from_destination DECIMAL(10, 2), -- 距离目标位置的距离（米）
  
  -- 详细信息
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  action_attempted VARCHAR(100), -- 'mark_delivered', 'upload_photo' 等
  
  -- 状态管理
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'acknowledged', 'resolved', 'dismissed'
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  resolution_notes TEXT,
  
  -- 附加数据
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_delivery_alerts_package_id ON delivery_alerts(package_id);
CREATE INDEX IF NOT EXISTS idx_delivery_alerts_courier_id ON delivery_alerts(courier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_alerts_status ON delivery_alerts(status);
CREATE INDEX IF NOT EXISTS idx_delivery_alerts_alert_type ON delivery_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_delivery_alerts_severity ON delivery_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_delivery_alerts_created_at ON delivery_alerts(created_at DESC);

-- 创建复合索引（用于查询未处理的警报）
CREATE INDEX IF NOT EXISTS idx_delivery_alerts_pending ON delivery_alerts(status, severity, created_at DESC) 
WHERE status = 'pending';

-- 添加注释
COMMENT ON TABLE delivery_alerts IS '配送警报记录表';
COMMENT ON COLUMN delivery_alerts.alert_type IS '警报类型：distance_violation(距离违规), suspicious_location(可疑位置), time_violation(时间异常)';
COMMENT ON COLUMN delivery_alerts.severity IS '严重程度：low(低), medium(中), high(高), critical(紧急)';
COMMENT ON COLUMN delivery_alerts.status IS '处理状态：pending(待处理), acknowledged(已确认), resolved(已解决), dismissed(已忽略)';
COMMENT ON COLUMN delivery_alerts.distance_from_destination IS '距离目标地址的距离（米）';

-- 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_delivery_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_alerts_updated_at_trigger
BEFORE UPDATE ON delivery_alerts
FOR EACH ROW
EXECUTE FUNCTION update_delivery_alerts_updated_at();

-- 启用行级安全（RLS）
ALTER TABLE delivery_alerts ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：管理员可以查看所有警报
CREATE POLICY "Admins can view all delivery alerts" ON delivery_alerts
  FOR SELECT
  USING (true); -- 需要根据实际的认证系统调整

-- 创建RLS策略：骑手可以查看自己的警报
CREATE POLICY "Couriers can view their own alerts" ON delivery_alerts
  FOR SELECT
  USING (true); -- 需要根据实际的认证系统调整

-- 创建RLS策略：系统可以插入警报
CREATE POLICY "System can insert alerts" ON delivery_alerts
  FOR INSERT
  WITH CHECK (true);

-- 创建RLS策略：管理员可以更新警报
CREATE POLICY "Admins can update alerts" ON delivery_alerts
  FOR UPDATE
  USING (true);

-- 插入测试数据（可选）
-- INSERT INTO delivery_alerts (
--   package_id, courier_id, courier_name, alert_type, severity,
--   courier_latitude, courier_longitude, destination_latitude, destination_longitude,
--   distance_from_destination, title, description, action_attempted
-- ) VALUES (
--   'PKG001', 'COU001', '张三', 'distance_violation', 'high',
--   21.9588, 96.0891, 21.9688, 96.0991,
--   1234.56, '距离违规警报', '骑手在距离收件地址1234.56米处尝试标记已送达', 'mark_delivered'
-- );

-- 查询统计
-- 按状态统计警报数量
CREATE OR REPLACE VIEW delivery_alerts_stats AS
SELECT 
  status,
  severity,
  COUNT(*) as alert_count,
  MIN(created_at) as oldest_alert,
  MAX(created_at) as newest_alert
FROM delivery_alerts
GROUP BY status, severity
ORDER BY 
  CASE status 
    WHEN 'pending' THEN 1 
    WHEN 'acknowledged' THEN 2 
    WHEN 'resolved' THEN 3 
    WHEN 'dismissed' THEN 4 
  END,
  CASE severity 
    WHEN 'critical' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    WHEN 'low' THEN 4 
  END;

-- 验证表创建
SELECT 
  COUNT(*) as total_alerts,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_alerts,
  COUNT(CASE WHEN severity = 'high' OR severity = 'critical' THEN 1 END) as high_priority_alerts
FROM delivery_alerts;

