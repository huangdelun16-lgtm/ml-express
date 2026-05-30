-- 快速诊断和修复配送照片问题
-- 请在Supabase SQL编辑器中执行以下脚本

-- 1. 检查delivery_photos表是否存在
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_photos') 
    THEN 'delivery_photos表已存在' 
    ELSE 'delivery_photos表不存在，需要创建' 
  END as table_status;

-- 2. 如果表不存在，创建表
CREATE TABLE IF NOT EXISTS delivery_photos (
  id SERIAL PRIMARY KEY,
  package_id TEXT NOT NULL,
  photo_url TEXT,
  photo_base64 TEXT,
  courier_name TEXT NOT NULL,
  courier_id TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name TEXT,
  upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 添加索引
CREATE INDEX IF NOT EXISTS idx_delivery_photos_package_id ON delivery_photos(package_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_courier_name ON delivery_photos(courier_name);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_upload_time ON delivery_photos(upload_time);

-- 4. 设置表权限
GRANT SELECT ON delivery_photos TO anon;
GRANT SELECT ON delivery_photos TO authenticated;
GRANT INSERT ON delivery_photos TO authenticated;
GRANT UPDATE ON delivery_photos TO authenticated;
GRANT DELETE ON delivery_photos TO authenticated;

-- 5. 检查表中是否有数据
SELECT COUNT(*) as photo_count FROM delivery_photos;

-- 6. 查看最近的照片记录
SELECT 
  id,
  package_id,
  courier_name,
  upload_time,
  CASE 
    WHEN photo_base64 IS NOT NULL THEN '有base64数据'
    WHEN photo_url IS NOT NULL THEN '有URL数据'
    ELSE '无照片数据'
  END as photo_status
FROM delivery_photos 
ORDER BY upload_time DESC 
LIMIT 10;

-- 7. 检查特定包裹的照片
-- 请将 'YOUR_PACKAGE_ID' 替换为实际的包裹ID
SELECT 
  id,
  package_id,
  courier_name,
  upload_time,
  latitude,
  longitude,
  location_name
FROM delivery_photos 
WHERE package_id = 'YOUR_PACKAGE_ID'
ORDER BY upload_time DESC;
