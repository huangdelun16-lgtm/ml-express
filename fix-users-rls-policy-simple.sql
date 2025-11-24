-- 简化版：快速修复 users 表 RLS 策略
-- 在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- 方案 1: 允许所有操作（开发/测试环境，最简单）
-- 删除所有旧策略
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow anon read customers" ON users;
DROP POLICY IF EXISTS "Allow anon insert customers" ON users;
DROP POLICY IF EXISTS "Allow anon update own customer" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Public can read users" ON users;

-- 创建允许所有操作的策略
CREATE POLICY "Allow all operations on users" ON users
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 验证
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users';

