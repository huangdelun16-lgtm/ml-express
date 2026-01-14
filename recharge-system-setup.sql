-- 1. 创建充值申请表
CREATE TABLE IF NOT EXISTS recharge_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  proof_url TEXT, -- 汇款凭证图片URL
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE recharge_requests ENABLE ROW LEVEL SECURITY;

-- 允许所有操作（当前开发模式，建议后续根据权限细化）
CREATE POLICY "Public access for recharge_requests" ON recharge_requests
  FOR ALL USING (true) WITH CHECK (true);

-- 2. 创建支付凭证 Storage Bucket (如果尚未创建)
-- 注意：Bucket 的创建通常在 Supabase 控制台手动完成，
-- 或者通过以下 SQL（取决于 Supabase 版本和权限）
-- INSERT INTO storage.buckets (id, name, public) VALUES ('payment_proofs', 'payment_proofs', true);

-- 设置 Storage 策略
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'payment_proofs');
-- CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment_proofs');
