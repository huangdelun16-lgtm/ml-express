-- 为packages表添加配送相关字段
-- 请在Supabase Dashboard的SQL编辑器中执行此语句

-- 添加配送速度字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS delivery_speed TEXT;

-- 添加定时达指定时间字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS scheduled_delivery_time TEXT;

-- 添加配送距离字段（单位：km）
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS delivery_distance NUMERIC(10, 2);

-- 为新字段添加注释
COMMENT ON COLUMN packages.delivery_speed IS '配送速度（准时达/急送达/定时达）';
COMMENT ON COLUMN packages.scheduled_delivery_time IS '定时达的指定时间';
COMMENT ON COLUMN packages.delivery_distance IS '配送距离（单位：公里）';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_delivery_speed ON packages(delivery_speed);
CREATE INDEX IF NOT EXISTS idx_packages_scheduled_time ON packages(scheduled_delivery_time);

-- 查看表结构确认
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'packages'
ORDER BY ordinal_position;

