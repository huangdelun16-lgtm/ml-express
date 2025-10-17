-- 启用通知功能的系统设置
INSERT INTO system_settings (settings_key, settings_value, description, category) 
VALUES 
  ('notification.sms_enabled', 'true', '启用短信通知', 'notification'),
  ('notification.email_enabled', 'true', '启用邮件通知', 'notification'),
  ('notification.push_enabled', 'true', '启用推送通知', 'notification')
ON CONFLICT (settings_key) 
DO UPDATE SET 
  settings_value = EXCLUDED.settings_value,
  updated_at = NOW();
