-- 修复 delivery_photos 表的权限问题 (Error 42501)
-- 这个问题是因为数据库开启了行级安全(RLS)，但没有配置允许插入的策略

-- 1. 启用 RLS (以防万一)
ALTER TABLE delivery_photos ENABLE ROW LEVEL SECURITY;

-- 2. 清理旧策略
DROP POLICY IF EXISTS "Enable insert for all users" ON delivery_photos;
DROP POLICY IF EXISTS "Enable read access for all users" ON delivery_photos;
DROP POLICY IF EXISTS "Allow public insert access" ON delivery_photos;
DROP POLICY IF EXISTS "Allow public select access" ON delivery_photos;

-- 3. 创建新策略：允许所有用户（包括匿名用户）上传照片
-- 骑手APP使用匿名Key，所以必须允许 public/anon 角色操作
CREATE POLICY "Enable insert for all users" 
ON delivery_photos 
FOR INSERT 
TO public 
WITH CHECK (true);

-- 4. 创建新策略：允许所有用户查看照片
CREATE POLICY "Enable read access for all users" 
ON delivery_photos 
FOR SELECT 
TO public 
USING (true);

-- 5. 授予必要的表权限
GRANT ALL ON delivery_photos TO anon;
GRANT ALL ON delivery_photos TO authenticated;
GRANT ALL ON delivery_photos TO service_role;

-- 6. 授予序列权限 (关键：修复自增ID权限问题)
GRANT USAGE, SELECT ON SEQUENCE delivery_photos_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE delivery_photos_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE delivery_photos_id_seq TO service_role;

-- 7. 验证 RLS 状态
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'delivery_photos';

