-- 创建骑手违规记录表
CREATE TABLE IF NOT EXISTS courier_violations (
  id SERIAL PRIMARY KEY,
  courier_id VARCHAR(50) NOT NULL,
  courier_name VARCHAR(100) NOT NULL,
  violation_type VARCHAR(50) NOT NULL, -- 违规类型：no_photo, wrong_location, late_delivery, etc.
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 严重程度：low, medium, high, critical
  penalty_points INTEGER NOT NULL DEFAULT 0, -- 扣分
  warning_level VARCHAR(30) NOT NULL DEFAULT 'warning', -- 警告级别：warning, serious_warning, final_warning
  description TEXT NOT NULL, -- 违规描述
  evidence_photos TEXT[], -- 证据照片URL数组
  admin_action VARCHAR(100) NOT NULL, -- 管理员处理动作
  admin_notes TEXT, -- 管理员备注
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(50) NOT NULL, -- 创建记录的管理员
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_courier_violations_courier_id ON courier_violations(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_violations_created_at ON courier_violations(created_at);
CREATE INDEX IF NOT EXISTS idx_courier_violations_severity ON courier_violations(severity);

-- 添加注释
COMMENT ON TABLE courier_violations IS '骑手违规记录表';
COMMENT ON COLUMN courier_violations.violation_type IS '违规类型';
COMMENT ON COLUMN courier_violations.severity IS '严重程度：low(1分), medium(3分), high(5分), critical(10分)';
COMMENT ON COLUMN courier_violations.penalty_points IS '扣分数量';
COMMENT ON COLUMN courier_violations.warning_level IS '警告级别';
COMMENT ON COLUMN courier_violations.evidence_photos IS '证据照片URL数组';
COMMENT ON COLUMN courier_violations.admin_action IS '管理员处理动作：口头警告、书面警告、暂停服务、终止合作等';
