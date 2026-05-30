-- ============================================
-- 为现有用户添加默认密码
-- ============================================
-- 说明：
-- 1. 此脚本为所有密码为NULL的用户设置默认密码"123456"
-- 2. 仅影响user_type为'customer'的用户
-- 3. 执行前请先备份数据库
-- ============================================

-- 方法1：为所有没有密码的customer用户设置默认密码
UPDATE users 
SET password = '123456'
WHERE user_type = 'customer' 
  AND (password IS NULL OR password = '');

-- 方法2：为所有用户设置默认密码（如果需要的话）
-- UPDATE users 
-- SET password = '123456'
-- WHERE password IS NULL OR password = '';

-- 查询更新结果
SELECT 
  id,
  name,
  email,
  phone,
  user_type,
  CASE 
    WHEN password IS NULL OR password = '' THEN '无密码'
    ELSE '已设置密码'
  END as password_status,
  status,
  registration_date,
  last_login
FROM users
WHERE user_type = 'customer'
ORDER BY created_at DESC;

-- ============================================
-- 执行说明：
-- ============================================
-- 1. 登录 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 粘贴上面的 UPDATE 语句
-- 4. 点击 Run 执行
-- 5. 执行完成后，所有现有客户将使用默认密码 "123456" 登录
-- 6. 建议用户首次登录后修改密码
-- ============================================

