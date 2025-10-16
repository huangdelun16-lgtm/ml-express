-- 检查 packages 表是否有坐标字段
-- 如果没有，则添加坐标字段并初始化数据

-- 1. 检查字段是否存在
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'packages' 
    AND column_name IN ('receiver_latitude', 'receiver_longitude', 'sender_latitude', 'sender_longitude')
ORDER BY column_name;

-- 2. 如果字段不存在，添加字段
DO $$
BEGIN
    -- 添加接收者坐标字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'receiver_latitude') THEN
        ALTER TABLE packages ADD COLUMN receiver_latitude DECIMAL(10, 7);
        RAISE NOTICE 'Added receiver_latitude column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'receiver_longitude') THEN
        ALTER TABLE packages ADD COLUMN receiver_longitude DECIMAL(10, 7);
        RAISE NOTICE 'Added receiver_longitude column';
    END IF;
    
    -- 添加发送者坐标字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'sender_latitude') THEN
        ALTER TABLE packages ADD COLUMN sender_latitude DECIMAL(10, 7);
        RAISE NOTICE 'Added sender_latitude column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'sender_longitude') THEN
        ALTER TABLE packages ADD COLUMN sender_longitude DECIMAL(10, 7);
        RAISE NOTICE 'Added sender_longitude column';
    END IF;
END $$;

-- 3. 为现有数据添加默认坐标（曼德勒市中心 + 随机偏移）
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

-- 4. 验证更新结果
SELECT 
  COUNT(*) as total_packages,
  COUNT(receiver_latitude) as packages_with_receiver_coords,
  COUNT(sender_latitude) as packages_with_sender_coords,
  ROUND(COUNT(receiver_latitude)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as receiver_coords_percentage,
  ROUND(COUNT(sender_latitude)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as sender_coords_percentage
FROM packages;

-- 5. 查看前5个包裹的坐标数据
SELECT 
    id,
    receiver_name,
    receiver_address,
    ROUND(receiver_latitude::numeric, 6) as receiver_lat,
    ROUND(receiver_longitude::numeric, 6) as receiver_lng
FROM packages
ORDER BY created_at DESC
LIMIT 5;
