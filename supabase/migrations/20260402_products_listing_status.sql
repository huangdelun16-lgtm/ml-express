-- 商品上架审核：商家新增商品默认为 pending，Admin 通过后为 approved
-- 在 Supabase SQL Editor 中执行一次

ALTER TABLE products ADD COLUMN IF NOT EXISTS listing_status text;

UPDATE products
SET listing_status = 'approved'
WHERE listing_status IS NULL OR trim(listing_status) = '';

ALTER TABLE products ALTER COLUMN listing_status SET DEFAULT 'pending';

ALTER TABLE products
  ALTER COLUMN listing_status SET NOT NULL;

COMMENT ON COLUMN products.listing_status IS 'pending=待审核, approved=已上架, rejected=已拒绝';

-- 插入时若未带 listing_status 或为空，强制为待审核（防止客户端漏传）
CREATE OR REPLACE FUNCTION public.products_listing_status_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_status IS NULL OR trim(COALESCE(NEW.listing_status, '')) = '' THEN
    NEW.listing_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_listing_status_bi ON public.products;
CREATE TRIGGER trg_products_listing_status_bi
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.products_listing_status_before_insert();
