-- 已上架商品编辑：修改暂存 pending_update，Admin 通过后合并到主字段，客户在此之前仍见旧内容
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pending_update jsonb DEFAULT NULL;

COMMENT ON COLUMN products.pending_update IS '商家编辑待审快照（JSON）；listing_status=approved 时客户仍读主字段，Admin 通过后合并并清空';

CREATE INDEX IF NOT EXISTS idx_products_pending_update_not_null
  ON public.products ((pending_update IS NOT NULL))
  WHERE pending_update IS NOT NULL;
