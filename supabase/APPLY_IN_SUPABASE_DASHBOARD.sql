-- 在 Supabase Dashboard → SQL Editor 中执行本文件（若已执行过 migration 会跳过列添加）
-- 解决：Could not find the 'courier_rating' column of 'store_reviews' in the schema cache

ALTER TABLE store_reviews
ADD COLUMN IF NOT EXISTS courier_rating smallint
  CHECK (courier_rating IS NULL OR (courier_rating >= 1 AND courier_rating <= 5));

ALTER TABLE packages
ADD COLUMN IF NOT EXISTS courier_service_rating smallint
  CHECK (courier_service_rating IS NULL OR (courier_service_rating >= 1 AND courier_service_rating <= 5));

-- 执行后若客户端仍提示 schema cache：在 Dashboard 重启项目或等待 PostgREST 刷新；应用端也已对缺列做了自动重试。
