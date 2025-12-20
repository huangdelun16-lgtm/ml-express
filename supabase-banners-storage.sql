-- 创建 banners 存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('banners', 'banners', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 允许任何人读取 banners (因为是公共存储桶)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'banners');

-- 允许认证管理员上传/修改/删除 banners
CREATE POLICY "Admin Full Access" ON storage.objects FOR ALL 
TO authenticated 
USING (bucket_id = 'banners')
WITH CHECK (bucket_id = 'banners');
