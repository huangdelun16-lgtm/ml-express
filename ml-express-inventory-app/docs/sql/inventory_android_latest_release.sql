-- Inventory App Android APK 最新版本（设置页「更新最新版本」读取）
-- 每次发布新 APK 后，在 Supabase SQL Editor 更新 apkUrl / version / versionCode

INSERT INTO system_settings (category, settings_key, settings_value, description, updated_by)
VALUES (
  'inventory',
  'inventory.android.latest_release',
  jsonb_build_object(
    'version', '1.8.1',
    'versionCode', 15,
    'apkUrl', 'https://uopkyuluxnrewvlmutam.supabase.co/storage/v1/object/public/inventory-releases/ml-inventory-1.8.1-15.apk',
    'releaseNotes', 'iPhone 蓝牙 TSPL 直连 Xprinter P201A；标签打印优化'
  ),
  'Inventory App Android 最新 APK 发布信息（versionCode 须大于旧版才会提示更新）',
  'admin'
)
ON CONFLICT (settings_key) DO UPDATE SET
  settings_value = EXCLUDED.settings_value,
  description = EXCLUDED.description,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();
