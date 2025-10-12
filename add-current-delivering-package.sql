-- 为 couriers 表添加当前正在配送的包裹ID字段
-- 这样可以实现"只有当前配送包裹的客户能看到骑手位置"

-- 添加字段
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS current_delivering_package_id TEXT;

-- 添加注释
COMMENT ON COLUMN couriers.current_delivering_package_id IS '当前正在配送的包裹ID，用于隐私权限控制';

-- 创建索引加快查询
CREATE INDEX IF NOT EXISTS idx_couriers_current_package ON couriers(current_delivering_package_id);

-- 添加外键约束（可选，确保数据一致性）
-- ALTER TABLE couriers ADD CONSTRAINT fk_current_package 
--   FOREIGN KEY (current_delivering_package_id) REFERENCES packages(id) ON DELETE SET NULL;

-- 说明：
-- 1. 当骑手开始配送某个包裹时，将该包裹ID写入此字段
-- 2. 客户查询包裹时，系统检查该包裹ID是否等于骑手的 current_delivering_package_id
-- 3. 只有匹配的客户才能看到骑手实时位置
-- 4. 骑手完成配送后，可以将此字段设为 NULL 或下一个包裹ID

