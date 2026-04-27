-- 客户评价：商家商品(沿用 rating) + 骑手配送
ALTER TABLE store_reviews
ADD COLUMN IF NOT EXISTS courier_rating smallint
  CHECK (courier_rating IS NULL OR (courier_rating >= 1 AND courier_rating <= 5));

COMMENT ON COLUMN store_reviews.courier_rating IS '骑手配送服务评分 1-5';

-- 订单详情页展示用（与 store_reviews 提交时同步）
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS courier_service_rating smallint
  CHECK (courier_service_rating IS NULL OR (courier_service_rating >= 1 AND courier_service_rating <= 5));

COMMENT ON COLUMN packages.courier_service_rating IS '骑手配送服务评分 1-5，与 store_reviews.courier_rating 同步';
