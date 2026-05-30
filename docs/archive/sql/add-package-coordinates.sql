-- 为 packages 表添加接收者和发送者的坐标字段
-- 用于导航功能，避免依赖Google Geocoding API

-- 添加接收者坐标字段
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS receiver_latitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS receiver_longitude DECIMAL(10, 7);

-- 添加发送者坐标字段
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS sender_latitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS sender_longitude DECIMAL(10, 7);

-- 添加注释
COMMENT ON COLUMN packages.receiver_latitude IS '接收者纬度';
COMMENT ON COLUMN packages.receiver_longitude IS '接收者经度';
COMMENT ON COLUMN packages.sender_latitude IS '发送者纬度';
COMMENT ON COLUMN packages.sender_longitude IS '发送者经度';

-- 为现有数据添加默认坐标（曼德勒市中心）
UPDATE packages
SET 
  receiver_latitude = 21.9588 + (RANDOM() - 0.5) * 0.02,
  receiver_longitude = 96.0891 + (RANDOM() - 0.5) * 0.02
WHERE receiver_latitude IS NULL;

UPDATE packages
SET 
  sender_latitude = 21.9588 + (RANDOM() - 0.5) * 0.02,
  sender_longitude = 96.0891 + (RANDOM() - 0.5) * 0.02
WHERE sender_latitude IS NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_receiver_coords ON packages (receiver_latitude, receiver_longitude);
CREATE INDEX IF NOT EXISTS idx_packages_sender_coords ON packages (sender_latitude, sender_longitude);

-- 验证更新
SELECT 
  COUNT(*) as total_packages,
  COUNT(receiver_latitude) as packages_with_receiver_coords,
  COUNT(sender_latitude) as packages_with_sender_coords
FROM packages;

