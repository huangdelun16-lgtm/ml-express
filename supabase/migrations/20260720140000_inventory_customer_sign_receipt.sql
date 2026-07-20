-- Inventory App：客户签收留痕（签名、电话、本人/代收）
ALTER TABLE inventory_store_items
  ADD COLUMN IF NOT EXISTS customer_sign_phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_sign_pickup_type TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_sign_proxy_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_signature_data TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_signed_by_operator TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN inventory_store_items.customer_sign_phone IS '签收时登记/核实的收件人电话';
COMMENT ON COLUMN inventory_store_items.customer_sign_pickup_type IS '签收方式：self=本人, proxy=代收';
COMMENT ON COLUMN inventory_store_items.customer_sign_proxy_name IS '代收人姓名（pickup_type=proxy 时）';
COMMENT ON COLUMN inventory_store_items.customer_signature_data IS '手写签名笔画 JSON';
COMMENT ON COLUMN inventory_store_items.customer_signed_by_operator IS '执行签收的操作员';
