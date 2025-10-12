-- 创建验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(email)
);

-- 添加注释
COMMENT ON TABLE verification_codes IS '存储邮箱验证码';
COMMENT ON COLUMN verification_codes.email IS '邮箱地址';
COMMENT ON COLUMN verification_codes.code IS '验证码';
COMMENT ON COLUMN verification_codes.created_at IS '创建时间';
COMMENT ON COLUMN verification_codes.expires_at IS '过期时间';
COMMENT ON COLUMN verification_codes.used IS '是否已使用';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- 启用 RLS（行级安全）
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许所有人插入（注册时）
CREATE POLICY "允许插入验证码" ON verification_codes
  FOR INSERT
  WITH CHECK (true);

-- 创建策略：允许所有人查询自己的验证码
CREATE POLICY "允许查询验证码" ON verification_codes
  FOR SELECT
  USING (true);

-- 创建策略：允许更新验证码状态
CREATE POLICY "允许更新验证码" ON verification_codes
  FOR UPDATE
  USING (true);

-- 创建自动清理过期验证码的函数
CREATE OR REPLACE FUNCTION clean_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW() OR used = true;
END;
$$ LANGUAGE plpgsql;

-- 注意：你需要手动在 Supabase 中设置定时任务来调用这个函数
-- 或者在应用中定期调用来清理过期数据

