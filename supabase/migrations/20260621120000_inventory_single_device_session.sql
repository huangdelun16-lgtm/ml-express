-- Inventory App：单设备登录 — delivery_stores.current_session_id
-- 登录时由 inventory-store-login Edge Function 写入；客户端轮询 / Realtime 检测被踢下线

ALTER TABLE delivery_stores
  ADD COLUMN IF NOT EXISTS current_session_id TEXT;

COMMENT ON COLUMN delivery_stores.current_session_id IS
  '最近一次登录会话 ID；Inventory / 商家 App 用于单设备登录校验';
