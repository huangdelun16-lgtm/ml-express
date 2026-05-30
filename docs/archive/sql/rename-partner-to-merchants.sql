-- 1. 更新 users 表中的 user_type 约束和数据
-- 首先删除旧约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- 更新数据：将 'partner' 改为 'merchant'
UPDATE users SET user_type = 'merchant' WHERE user_type = 'partner';

-- 添加新约束，包含 'merchant'
ALTER TABLE users ADD CONSTRAINT users_user_type_check CHECK (user_type IN ('customer', 'courier', 'admin', 'merchant', 'vip'));

-- 2. 更新 admin_accounts 表中的数据
-- 假设该表也有类似的 user_type 或角色逻辑（通常是在前端代码中判断）
-- 如果 admin_accounts 有 user_type 字段，也一并更新
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'admin_accounts' AND column_name = 'user_type') THEN
        UPDATE admin_accounts SET user_type = 'merchant' WHERE user_type = 'partner';
    END IF;
END $$;

-- 3. 如果有其他表关联了 partner，也需要更新
-- 例如可能存在的 delivery_stores 表（如果它是按 user_type 区分的）
-- 目前根据代码搜寻，主要的逻辑在 user_type 字段。
