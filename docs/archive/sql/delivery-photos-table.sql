-- 创建配送照片表
CREATE TABLE IF NOT EXISTS delivery_photos (
  id SERIAL PRIMARY KEY,
  package_id TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  photo_base64 TEXT, -- 存储base64编码的照片数据
  courier_name TEXT NOT NULL,
  courier_id TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name TEXT,
  upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_delivery_photos_package_id ON delivery_photos(package_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_courier_name ON delivery_photos(courier_name);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_upload_time ON delivery_photos(upload_time);

-- 添加外键约束（如果packages表存在）
-- ALTER TABLE delivery_photos ADD CONSTRAINT fk_delivery_photos_package_id 
-- FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE delivery_photos IS '配送照片表，存储骑手上传的送达证明照片';
COMMENT ON COLUMN delivery_photos.package_id IS '包裹ID';
COMMENT ON COLUMN delivery_photos.photo_url IS '照片URL（如果存储在外部服务）';
COMMENT ON COLUMN delivery_photos.photo_base64 IS '照片base64编码（如果存储在数据库中）';
COMMENT ON COLUMN delivery_photos.courier_name IS '上传照片的骑手姓名';
COMMENT ON COLUMN delivery_photos.courier_id IS '上传照片的骑手ID';
COMMENT ON COLUMN delivery_photos.latitude IS '拍摄位置纬度';
COMMENT ON COLUMN delivery_photos.longitude IS '拍摄位置经度';
COMMENT ON COLUMN delivery_photos.location_name IS '拍摄位置名称';
COMMENT ON COLUMN delivery_photos.upload_time IS '照片上传时间';
