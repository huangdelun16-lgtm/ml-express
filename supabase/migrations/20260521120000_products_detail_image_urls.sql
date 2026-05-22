-- 商品详情滚动图（Scrolling Pictures）：多张介绍图，顾客端纵向滚动浏览
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS detail_image_urls text[] DEFAULT '{}';

COMMENT ON COLUMN products.detail_image_urls IS '商品详细介绍滚动图 URL 列表，按上传顺序展示';
