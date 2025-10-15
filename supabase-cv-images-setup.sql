-- 为 admin_accounts 表添加 cv_images 字段
-- 用于存储员工的CV Form图片

-- 添加 cv_images 字段（JSON数组类型，存储图片URL）
ALTER TABLE admin_accounts 
ADD COLUMN IF NOT EXISTS cv_images JSONB DEFAULT '[]'::jsonb;

-- 添加注释
COMMENT ON COLUMN admin_accounts.cv_images IS '员工CV Form图片URL数组';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_admin_accounts_cv_images 
ON admin_accounts USING GIN (cv_images);

-- 更新现有记录的cv_images字段为空数组
UPDATE admin_accounts 
SET cv_images = '[]'::jsonb 
WHERE cv_images IS NULL;

-- 示例：如何查询有CV Form的员工
-- SELECT employee_name, cv_images 
-- FROM admin_accounts 
-- WHERE jsonb_array_length(cv_images) > 0;

-- 示例：如何添加CV图片到员工记录
-- UPDATE admin_accounts 
-- SET cv_images = cv_images || '["https://example.com/cv1.jpg", "https://example.com/cv2.jpg"]'::jsonb
-- WHERE employee_id = 'EMP001';

-- 示例：如何删除特定CV图片
-- UPDATE admin_accounts 
-- SET cv_images = cv_images - 'https://example.com/cv1.jpg'
-- WHERE employee_id = 'EMP001';
