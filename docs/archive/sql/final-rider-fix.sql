-- 最终修复脚本：解决骑手同步、位置显示偏移及权限问题
-- 请在 Supabase SQL 编辑器中执行

-- 1. 为 couriers 表添加缺失的 employee_id 字段
ALTER TABLE couriers 
ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- 2. 确保 couriers 表有索引，方便关联查询
CREATE INDEX IF NOT EXISTS idx_couriers_employee_id ON couriers(employee_id);

-- 3. 修复 courier_locations 表的 RLS 权限
-- 默认情况下，Anon 角色（移动 App 使用）可能无法写入此表
DROP POLICY IF EXISTS "Allow anon read locations" ON courier_locations;
DROP POLICY IF EXISTS "Allow service insert locations" ON courier_locations;
DROP POLICY IF EXISTS "Allow service update locations" ON courier_locations;

-- 允许匿名和认证用户查看位置（用于后台地图显示）
CREATE POLICY "Enable read access for all users" ON courier_locations
  FOR SELECT USING (true);

-- 重点：允许移动端 App（通常是 anon 或 authenticated）新增和更新自己的位置
CREATE POLICY "Enable insert for all users" ON courier_locations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON courier_locations
  FOR UPDATE USING (true);

-- 4. 如果你想在后台看到更精准的移动，可以减小位置过滤的时间戳限制（已在移动端代码中修改为 30秒）

-- 5. 添加备注
COMMENT ON COLUMN couriers.employee_id IS '员工编号，用于与账号系统同步';

