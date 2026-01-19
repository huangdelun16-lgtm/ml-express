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

-- 2. 创建支付凭证 Storage Bucket (重要：请在 Supabase Dashboard 手动操作)
-- 操作步骤：
-- 1. 进入 Supabase 控制台 -> Storage
-- 2. 点击 "New Bucket"，命名为 "payment_proofs"
-- 3. 开启 "Public bucket" 选项（或者手动设置下面的 RLS 策略）
-- 4. 点击 "Create bucket"

-- 3. 设置 Storage RLS 策略 (如果 Bucket 已设为 Public 可选)
-- 允许所有人查看凭证（以便管理员在后台看到图片）
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'payment_proofs');
-- 允许经过身份验证的用户上传凭证
-- CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment_proofs');

