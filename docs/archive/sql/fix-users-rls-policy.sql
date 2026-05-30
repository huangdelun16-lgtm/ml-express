-- 修复 users 表的 RLS 策略
-- 在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 1. 检查当前 RLS 状态
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users';

-- 2. 查看当前所有策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users';

-- 3. 删除所有旧的策略（如果存在）
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow anon read users" ON users;
DROP POLICY IF EXISTS "Allow anon insert users" ON users;
DROP POLICY IF EXISTS "Allow anon update users" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Public can read users" ON users;
DROP POLICY IF EXISTS "Allow public read" ON users;
DROP POLICY IF EXISTS "Allow public insert" ON users;

-- 4. 创建新的策略 - 允许匿名用户（anon）查询客户数据（用于登录验证）
CREATE POLICY "Allow anon read customers" ON users
FOR SELECT
USING (user_type = 'customer' OR user_type IS NULL);

-- 5. 允许匿名用户插入客户数据（用于注册）
CREATE POLICY "Allow anon insert customers" ON users
FOR INSERT
WITH CHECK (user_type = 'customer');

-- 6. 允许匿名用户更新自己的数据（用于更新个人信息）
CREATE POLICY "Allow anon update own customer" ON users
FOR UPDATE
USING (user_type = 'customer')
WITH CHECK (user_type = 'customer');

-- 7. 如果需要允许查询所有类型用户（包括 courier），可以使用这个策略
-- 注意：这会暴露所有用户数据，请谨慎使用
-- CREATE POLICY "Allow anon read all users" ON users
-- FOR SELECT
-- USING (true);

-- 8. 验证策略已创建
SELECT 
    policyname,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- 9. 测试查询（应该能查询到客户数据）
-- SELECT * FROM users WHERE user_type = 'customer' LIMIT 5;

