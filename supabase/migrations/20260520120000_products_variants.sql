-- 商品多规格 SKU（同商品不同规格不同价格/库存）
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT NULL;

COMMENT ON COLUMN products.variants IS
  'Multi-spec SKUs: [{id,name,price,original_price,stock,is_available,sort_order}]. NULL = single-price product.';
