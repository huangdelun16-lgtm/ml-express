-- courier_salaries 表增加 related_package_ids 字段，用于存储关联的包裹ID
ALTER TABLE courier_salaries
ADD COLUMN IF NOT EXISTS related_package_ids TEXT[];

-- 为新字段创建索引，如果需要按包裹ID反向查询工资单的话
CREATE INDEX IF NOT EXISTS idx_related_package_ids ON courier_salaries USING GIN (related_package_ids);
