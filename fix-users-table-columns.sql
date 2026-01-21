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

    -- 确保 user_type 允许 partner, vip 类型
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
    ALTER TABLE users ADD CONSTRAINT users_user_type_check CHECK (user_type IN ('customer', 'courier', 'admin', 'partner', 'vip'));

    -- 更新所有 NULL 值为 0
    UPDATE users SET balance = 0 WHERE balance IS NULL;
    UPDATE users SET total_spent = 0 WHERE total_spent IS NULL;

END $$;

-- 设置存储桶权限 (请确保 payment_proofs 桶已在控制台创建)
-- 允许所有人查看（公开桶策略）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Access') THEN
        EXECUTE 'CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = ''payment_proofs'')';
    END IF;
    
    -- 允许所有人上传
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Upload') THEN
        EXECUTE 'CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''payment_proofs'')';
    END IF;
END $$;

