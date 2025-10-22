-- 创建管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id VARCHAR(50) NOT NULL,
  admin_name VARCHAR(100) NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- 操作类型：create_violation, resolve_alert, update_courier, etc.
  target_type VARCHAR(50) NOT NULL, -- 目标类型：courier, alert, violation, etc.
  target_id VARCHAR(50) NOT NULL, -- 目标ID
  target_name VARCHAR(100), -- 目标名称（如骑手姓名）
  action_description TEXT NOT NULL, -- 操作描述
  old_values JSONB, -- 操作前的值
  new_values JSONB, -- 操作后的值
  ip_address INET, -- 操作IP地址
  user_agent TEXT, -- 用户代理
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_type ON admin_audit_logs(target_type);

-- 添加注释
COMMENT ON TABLE admin_audit_logs IS '管理员操作日志表';
COMMENT ON COLUMN admin_audit_logs.action_type IS '操作类型：create_violation, resolve_alert, update_courier, delete_record等';
COMMENT ON COLUMN admin_audit_logs.target_type IS '目标类型：courier, alert, violation, package等';
COMMENT ON COLUMN admin_audit_logs.old_values IS '操作前的数据（JSON格式）';
COMMENT ON COLUMN admin_audit_logs.new_values IS '操作后的数据（JSON格式）';
