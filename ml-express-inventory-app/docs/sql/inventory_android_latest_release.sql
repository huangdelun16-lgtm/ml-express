-- Inventory App Android APK 最新版本（设置页「更新最新版本」读取）
-- 每次发布新 APK 后，在 Supabase SQL Editor 更新 apkUrl / version / versionCode

INSERT INTO system_settings (category, settings_key, settings_value, description, updated_by)
VALUES (
  'inventory',
  'inventory.android.latest_release',
  jsonb_build_object(
    'version', '1.8.8',
    'versionCode', 21,
    'apkUrl', 'https://uopkyuluxnrewvlmutam.supabase.co/storage/v1/object/public/inventory-releases/ml-inventory-1.8.8-21.apk',
    'releaseNotes', '打印预览页；按打印机保存标签布局（快递单号/条码/入库码位置）；Scan Printer 仅显示打印机'
  ),
  'Inventory App Android 最新 APK 发布信息（versionCode 须大于旧版才会提示更新）',
  'admin'
)
ON CONFLICT (settings_key) DO UPDATE SET
  settings_value = EXCLUDED.settings_value,
  description = EXCLUDED.description,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();
