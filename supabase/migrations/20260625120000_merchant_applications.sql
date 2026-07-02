-- 商家入驻在线申请（公开提交 → Admin 审核通过后开通 delivery_stores 账号）
CREATE TABLE IF NOT EXISTS merchant_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL,
  store_type TEXT NOT NULL,
  region TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  manager_name TEXT NOT NULL,
  manager_phone TEXT NOT NULL,
  operating_hours TEXT NOT NULL DEFAULT '08:00 - 22:00',
  cod_settlement_day TEXT NOT NULL DEFAULT '7',
  facilities TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  applicant_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_store_id UUID REFERENCES delivery_stores(id) ON DELETE SET NULL,
  provisioned_store_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_applications_status
  ON merchant_applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_merchant_applications_phone
  ON merchant_applications (phone);

COMMENT ON TABLE merchant_applications IS
  '同城合伙商户入驻申请；审核通过后写入 delivery_stores 并下发店铺代码与密码';

ALTER TABLE merchant_applications ENABLE ROW LEVEL SECURITY;

-- 仅 service role（Netlify Functions）可读写；前端不直连
CREATE POLICY merchant_applications_deny_anon
  ON merchant_applications
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
