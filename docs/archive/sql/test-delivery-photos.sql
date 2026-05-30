-- 测试配送照片功能
-- 请将以下参数替换为实际值

-- 插入测试照片数据
INSERT INTO delivery_photos (
  package_id,
  photo_base64,
  courier_name,
  latitude,
  longitude,
  location_name,
  upload_time
) VALUES (
  'MDY20250928214595', -- 替换为实际的包裹ID
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', -- 这是一个1x1像素的测试图片base64
  '测试骑手', -- 替换为实际的骑手姓名
  21.9588, -- 替换为实际纬度
  96.0891, -- 替换为实际经度
  '测试位置', -- 替换为实际位置名称
  NOW()
);

-- 验证插入是否成功
SELECT 
  id,
  package_id,
  courier_name,
  upload_time,
  '测试照片已插入' as status
FROM delivery_photos 
WHERE package_id = 'MDY20250928214595' -- 替换为实际的包裹ID
ORDER BY upload_time DESC;
