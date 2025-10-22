-- 为packages表添加评价相关字段
-- 请在Supabase Dashboard的SQL编辑器中执行此语句

-- 添加客户评价字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5);

-- 添加客户评价评论字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS customer_comment TEXT;

-- 添加评价时间字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS rating_time TIMESTAMP WITH TIME ZONE;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_customer_rating ON packages(customer_rating);
CREATE INDEX IF NOT EXISTS idx_packages_rating_time ON packages(rating_time);

-- 添加注释
COMMENT ON COLUMN packages.customer_rating IS '客户评价分数 (1-5星)';
COMMENT ON COLUMN packages.customer_comment IS '客户评价评论';
COMMENT ON COLUMN packages.rating_time IS '评价时间';
