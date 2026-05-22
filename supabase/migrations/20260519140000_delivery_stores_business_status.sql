-- 商家端营业时间 / 今日打烊 / 休假日期（ProfilePage 保存依赖这些列）
ALTER TABLE delivery_stores
  ADD COLUMN IF NOT EXISTS is_closed_today BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE delivery_stores
  ADD COLUMN IF NOT EXISTS vacation_dates TEXT[] DEFAULT '{}';

COMMENT ON COLUMN delivery_stores.is_closed_today IS '今日是否暂停营业（商家端开关）';
COMMENT ON COLUMN delivery_stores.vacation_dates IS '计划休假日期 YYYY-MM-DD 列表';
