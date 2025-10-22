-- 创建验证码表
-- 请在Supabase Dashboard的SQL编辑器中执行此语句

-- 创建验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- 添加注释
COMMENT ON TABLE verification_codes IS '邮箱验证码表';
COMMENT ON COLUMN verification_codes.email IS '邮箱地址';
COMMENT ON COLUMN verification_codes.code IS '6位验证码';
COMMENT ON COLUMN verification_codes.expires_at IS '过期时间';
COMMENT ON COLUMN verification_codes.used IS '是否已使用';

-- 创建自动清理过期验证码的函数
CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- 创建定时任务（可选，需要pg_cron扩展）
-- SELECT cron.schedule('cleanup-verification-codes', '0 * * * *', 'SELECT cleanup_expired_codes();');
