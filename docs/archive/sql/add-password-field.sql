-- 为 users 表添加 password 字段
-- 用于客户注册和登录安全验证

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password TEXT;

-- 添加注释
COMMENT ON COLUMN users.password IS '用户密码（加密存储）';

-- 为已有用户设置默认密码（建议用户首次登录时修改）
UPDATE users 
SET password = '123456' 
WHERE password IS NULL;

-- 如果你想让密码字段必填，可以取消下面这行注释
-- ALTER TABLE users ALTER COLUMN password SET NOT NULL;

