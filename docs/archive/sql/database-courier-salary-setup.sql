-- =====================================================
-- 骑手工资结算系统数据库设置
-- =====================================================

-- 1. 创建骑手工资记录表
CREATE TABLE IF NOT EXISTS courier_salaries (
  id SERIAL PRIMARY KEY,
  courier_id TEXT NOT NULL,
  courier_name TEXT NOT NULL,
  
  -- 结算周期
  settlement_period TEXT NOT NULL, -- 'weekly' 或 'monthly'
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- 工资组成
  base_salary DECIMAL(10, 2) DEFAULT 0, -- 基本工资
  km_fee DECIMAL(10, 2) DEFAULT 0, -- 公里费
  delivery_bonus DECIMAL(10, 2) DEFAULT 0, -- 配送奖金（按单数）
  performance_bonus DECIMAL(10, 2) DEFAULT 0, -- 绩效奖金
  overtime_pay DECIMAL(10, 2) DEFAULT 0, -- 加班费
  tip_amount DECIMAL(10, 2) DEFAULT 0, -- 小费
  
  -- 扣款项
  deduction_amount DECIMAL(10, 2) DEFAULT 0, -- 扣款（违规、赔偿等）
  
  -- 统计数据
  total_deliveries INTEGER DEFAULT 0, -- 总配送单数
  total_km DECIMAL(10, 2) DEFAULT 0, -- 总配送公里数
  on_time_deliveries INTEGER DEFAULT 0, -- 准时送达数
  late_deliveries INTEGER DEFAULT 0, -- 延迟送达数
  
  -- 工资总额
  gross_salary DECIMAL(10, 2) DEFAULT 0, -- 应发工资
  net_salary DECIMAL(10, 2) DEFAULT 0, -- 实发工资
  
  -- 状态
  status TEXT DEFAULT 'pending', -- 'pending'待结算, 'approved'已审核, 'paid'已发放, 'rejected'已拒绝
  
  -- 支付信息
  payment_method TEXT, -- 'cash'现金, 'bank_transfer'银行转账, 'mobile_money'移动支付, 'kbz_pay', 'wave_money'
  payment_reference TEXT, -- 支付凭证号
  payment_date TIMESTAMP WITH TIME ZONE,
  
  -- 备注
  notes TEXT,
  admin_notes TEXT, -- 管理员备注
  
  -- 审核信息
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建工资明细表（记录每一项收入/扣款）
CREATE TABLE IF NOT EXISTS courier_salary_details (
  id SERIAL PRIMARY KEY,
  salary_id INTEGER REFERENCES courier_salaries(id) ON DELETE CASCADE,
  courier_id TEXT NOT NULL,
  
  -- 明细类型
  detail_type TEXT NOT NULL, -- 'base_salary', 'km_fee', 'delivery_bonus', 'performance_bonus', 'overtime', 'tip', 'deduction'
  description TEXT NOT NULL, -- 说明
  
  -- 金额
  amount DECIMAL(10, 2) NOT NULL,
  
  -- 关联数据
  package_id TEXT, -- 关联的包裹ID（如果是单个包裹的费用）
  related_date DATE, -- 关联日期
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建工资发放记录表
CREATE TABLE IF NOT EXISTS courier_payment_records (
  id SERIAL PRIMARY KEY,
  salary_id INTEGER REFERENCES courier_salaries(id) ON DELETE CASCADE,
  courier_id TEXT NOT NULL,
  courier_name TEXT NOT NULL,
  
  -- 发放信息
  amount DECIMAL(10, 2) NOT NULL, -- 发放金额
  payment_method TEXT NOT NULL,
  payment_reference TEXT, -- 支付凭证号
  payment_status TEXT DEFAULT 'pending', -- 'pending'待发放, 'success'成功, 'failed'失败
  
  -- 收款账户信息
  account_holder TEXT, -- 账户持有人
  account_number TEXT, -- 账号
  bank_name TEXT, -- 银行名称
  
  -- 备注
  notes TEXT,
  failure_reason TEXT, -- 失败原因
  
  -- 操作人
  processed_by TEXT, -- 操作人
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建骑手绩效考核表
CREATE TABLE IF NOT EXISTS courier_performance (
  id SERIAL PRIMARY KEY,
  courier_id TEXT NOT NULL,
  courier_name TEXT NOT NULL,
  
  -- 考核周期
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- 绩效指标
  total_deliveries INTEGER DEFAULT 0,
  completed_deliveries INTEGER DEFAULT 0,
  on_time_rate DECIMAL(5, 2) DEFAULT 0, -- 准时率（百分比）
  customer_rating DECIMAL(3, 2) DEFAULT 0, -- 客户评分（0-5）
  complaint_count INTEGER DEFAULT 0, -- 投诉次数
  
  -- 奖惩
  reward_points INTEGER DEFAULT 0, -- 奖励积分
  penalty_points INTEGER DEFAULT 0, -- 惩罚积分
  bonus_amount DECIMAL(10, 2) DEFAULT 0, -- 奖金
  deduction_amount DECIMAL(10, 2) DEFAULT 0, -- 扣款
  
  -- 评级
  performance_grade TEXT, -- 'A+', 'A', 'B', 'C', 'D'
  
  -- 备注
  notes TEXT,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 添加索引
CREATE INDEX IF NOT EXISTS idx_courier_salaries_courier_id ON courier_salaries(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_salaries_status ON courier_salaries(status);
CREATE INDEX IF NOT EXISTS idx_courier_salaries_period ON courier_salaries(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_courier_salary_details_salary_id ON courier_salary_details(salary_id);
CREATE INDEX IF NOT EXISTS idx_courier_salary_details_courier_id ON courier_salary_details(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_payment_records_salary_id ON courier_payment_records(salary_id);
CREATE INDEX IF NOT EXISTS idx_courier_payment_records_status ON courier_payment_records(payment_status);
CREATE INDEX IF NOT EXISTS idx_courier_performance_courier_id ON courier_performance(courier_id);

-- 6. 添加注释
COMMENT ON TABLE courier_salaries IS '骑手工资记录表';
COMMENT ON TABLE courier_salary_details IS '工资明细表';
COMMENT ON TABLE courier_payment_records IS '工资发放记录表';
COMMENT ON TABLE courier_performance IS '骑手绩效考核表';

-- 7. 设置表权限
ALTER TABLE courier_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_salary_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_performance ENABLE ROW LEVEL SECURITY;

-- 创建访问策略（允许所有操作，实际生产环境需要更严格的权限控制）
CREATE POLICY "Enable all access for courier_salaries" ON courier_salaries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for courier_salary_details" ON courier_salary_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for courier_payment_records" ON courier_payment_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for courier_performance" ON courier_performance FOR ALL USING (true) WITH CHECK (true);

-- 8. 创建自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courier_salaries_updated_at BEFORE UPDATE ON courier_salaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courier_payment_records_updated_at BEFORE UPDATE ON courier_payment_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courier_performance_updated_at BEFORE UPDATE ON courier_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

