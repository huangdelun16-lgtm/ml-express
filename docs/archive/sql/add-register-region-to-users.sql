-- 为 users 表添加 register_region 字段
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'register_region') THEN
        ALTER TABLE users ADD COLUMN register_region TEXT DEFAULT 'mandalay';
    END IF;
END $$;

-- 确保 notes 字段存在
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'users' AND column_name = 'notes') THEN
        ALTER TABLE users ADD COLUMN notes TEXT;
    END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN users.register_region IS '用户注册所属领区';
COMMENT ON COLUMN users.notes IS '用户备注信息';
