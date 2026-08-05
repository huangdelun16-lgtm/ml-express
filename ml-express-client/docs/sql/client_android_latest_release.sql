-- 客户端 App Android APK 最新版本（设置 → 关于应用 → 更新版本）
-- 在 Supabase SQL Editor 执行；versionCode 必须大于用户已安装的 versionCode
-- 推荐用 jsonb_build_object，避免手写 JSON 引号出错

INSERT INTO system_settings (category, settings_key, settings_value, description, updated_by)
VALUES (
  'client',
  'client.android.latest_release',
  jsonb_build_object(
    'version', '2.6.2',
    'versionCode', 69,
    'apkUrl', 'https://uopkyuluxnrewvlmutam.supabase.co/storage/v1/object/public/client-releases/ml-client-2.6.2-69.apk',
    'releaseNotes', '2.6.2：体验与稳定性优化'
  ),
  'Client app Android latest APK for in-app update check',
  'admin'
)
ON CONFLICT (settings_key) DO UPDATE SET
  settings_value = EXCLUDED.settings_value,
  description = EXCLUDED.description,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();
