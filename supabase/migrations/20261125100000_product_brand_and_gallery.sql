-- 商品品牌（可不填）和最多 6 张商品图。第一张仍写入 image_url，列表封面不用改。

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gallery_image_urls text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN products.brand IS '商品品牌，商家可不填';
COMMENT ON COLUMN products.gallery_image_urls IS '商品图片，最多 6 张，第一张同时作为 image_url 封面';

UPDATE products
SET gallery_image_urls = ARRAY[image_url]
WHERE cardinality(gallery_image_urls) = 0
  AND btrim(coalesce(image_url, '')) <> '';
