-- 系统设置表结构及示例数据
-- 在 Supabase SQL 编辑器中执行本脚本

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  settings_key TEXT NOT NULL UNIQUE,
  settings_value JSONB NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on system_settings" ON system_settings;
CREATE POLICY "Allow all operations on system_settings" ON system_settings
FOR ALL USING (true) WITH CHECK (true);

INSERT INTO system_settings (category, settings_key, settings_value, description, updated_by)
VALUES
  ('general', 'company.name', to_jsonb('Market Link Express'::text), '用于系统展示和通知模板的公司名称', 'initial-script'),
  ('general', 'company.contact_phone', to_jsonb('09-000000000'::text), '客户服务热线号码', 'initial-script'),
  ('general', 'company.contact_email', to_jsonb('support@marketlinkexpress.com'::text), '客服邮箱地址', 'initial-script'),
  ('pricing', 'pricing.base_fee', to_jsonb(1500), '基础起步价', 'initial-script'),
  ('notification', 'notification.sms_enabled', to_jsonb(true), '是否启用短信通知', 'initial-script'),
  ('automation', 'automation.auto_assign_strategy', to_jsonb('distance_first'::text), '自动派单策略', 'initial-script'),
  ('tracking', 'tracking.refresh_interval_seconds', to_jsonb(15), '定位刷新间隔（秒）', 'initial-script'),
  ('security', 'security.session_timeout_minutes', to_jsonb(45), '后台会话超时时间（分钟）', 'initial-script')
ON CONFLICT (settings_key) DO NOTHING;


