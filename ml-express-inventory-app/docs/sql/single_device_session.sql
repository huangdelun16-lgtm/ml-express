-- 单设备登录：在 Supabase Dashboard → SQL Editor 中执行
-- 对应 migration: supabase/migrations/20260621120000_inventory_single_device_session.sql

ALTER TABLE delivery_stores
  ADD COLUMN IF NOT EXISTS current_session_id TEXT;

COMMENT ON COLUMN delivery_stores.current_session_id IS
  '最近一次登录会话 ID；Inventory / 商家 App 用于单设备登录校验';

-- 验证
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'delivery_stores'
  AND column_name = 'current_session_id';
