-- 商家入驻申请：推销员、申请日期、证件附件
ALTER TABLE merchant_applications
  ADD COLUMN IF NOT EXISTS salesperson_name TEXT,
  ADD COLUMN IF NOT EXISTS application_date DATE,
  ADD COLUMN IF NOT EXISTS license_document_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN merchant_applications.salesperson_name IS 'MARKET LINK 推销员姓名';
COMMENT ON COLUMN merchant_applications.application_date IS '申请日期（由申请者填写）';
COMMENT ON COLUMN merchant_applications.license_document_urls IS '商店证件图片/PDF 公开 URL 列表';

-- 证件存储桶（Netlify merchant-apply-upload 写入）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'merchant-application-docs',
  'merchant-application-docs',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;
