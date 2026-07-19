-- Inventory App Android APK 最新版本（设置页「更新最新版本」读取）
-- 每次发布新 APK 后，在 Supabase SQL Editor 更新 apkUrl / version / versionCode

INSERT INTO system_settings (category, settings_key, settings_value, description, updated_by)
VALUES (
  'inventory',
  'inventory.android.latest_release',
  jsonb_build_object(
    'version', '1.6.0',
    'versionCode', 12,
    'apkUrl', 'https://YOUR_CDN_OR_SUPABASE_STORAGE_URL/ml-inventory-1.6.0-12.apk',
    'releaseNotes', '装车车次、条码扫描修复、到站签收加速'
  ),
  'Inventory App Android 最新 APK 发布信息（versionCode 须大于旧版才会提示更新）',
  'admin'
)
ON CONFLICT (settings_key) DO UPDATE SET
  settings_value = EXCLUDED.settings_value,
  description = EXCLUDED.description,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();
