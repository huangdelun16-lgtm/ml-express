-- 可选：在 Supabase SQL 编辑器执行一次（不设也行，后台首次「保存到服务器」会自动 upsert）
-- 客户端通过 anon key 读取 system_settings 中 client.recharge_qr_urls（需已有 RLS 读策略）

INSERT INTO system_settings (category, settings_key, settings_value, description, updated_by)
VALUES (
  'client',
  'client.recharge_qr_urls',
  '{}'::jsonb,
  '客户端 App/Web 余额充值扫码图 URL，键为金额数字字符串，值为图片 URL（后台广告管理维护）',
  'migration'
)
ON CONFLICT (settings_key) DO NOTHING;
