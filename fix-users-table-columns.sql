-- 为 users 表添加缺失的字段
DO $$ 
BEGIN 
    -- 添加余额字段
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'balance') THEN
        ALTER TABLE users ADD COLUMN balance NUMERIC(12, 2) DEFAULT 0;
    END IF;

    -- 添加累计消费字段
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'total_spent') THEN
        ALTER TABLE users ADD COLUMN total_spent NUMERIC(12, 2) DEFAULT 0;
    END IF;

    -- 确保 user_type 允许 partner 类型
    -- 先检查约束是否存在，如果存在则更新，不存在则忽略或添加新约束
    -- 这里我们通过修改 CHECK 约束来确保包含 'partner'
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
    ALTER TABLE users ADD CONSTRAINT users_user_type_check CHECK (user_type IN ('customer', 'courier', 'admin', 'partner', 'vip'));

END $$;
