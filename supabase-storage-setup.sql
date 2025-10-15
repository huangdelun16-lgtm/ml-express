-- Supabase Storage 设置脚本
-- 用于CV Form文件上传功能

-- 创建存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv-forms',
  'cv-forms',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 设置存储桶策略
-- 允许所有人上传文件
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'cv-forms');

-- 允许所有人查看文件
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'cv-forms');

-- 允许所有人删除文件
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'cv-forms');

-- 创建文件夹结构
-- 注意：Supabase Storage会自动创建文件夹，这里只是示例

-- 示例：创建员工CV文件夹
-- 文件夹结构: cv-forms/employee-cv/{employee_id}/{file_name}

-- 使用说明：
-- 1. 在Supabase Dashboard中执行此脚本
-- 2. 确保存储桶 'cv-forms' 已创建
-- 3. 验证文件大小限制为10MB
-- 4. 确认允许的文件类型包括图片和PDF

-- 测试上传（可选）
-- 可以通过Supabase Dashboard的Storage页面测试文件上传功能

-- 清理脚本（如果需要删除存储桶）
-- DELETE FROM storage.buckets WHERE id = 'cv-forms';

