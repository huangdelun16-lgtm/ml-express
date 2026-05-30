-- 为 tutorials 表增加多图支持
ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS image_urls text[];

-- 将原有的单张图片 image_url 数据同步到 image_urls 数组中（可选，为了兼容性）
UPDATE tutorials 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL 
AND (image_urls IS NULL OR array_length(image_urls, 1) = 0);
