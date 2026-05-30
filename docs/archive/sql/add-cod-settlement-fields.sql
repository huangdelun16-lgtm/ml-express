-- 为 packages 表添加代收款结清状态字段
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS cod_settled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cod_settled_at TIMESTAMP WITH TIME ZONE;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_cod_settled ON packages(cod_settled);

-- 添加字段说明
COMMENT ON COLUMN packages.cod_settled IS '代收款是否已结清给合伙店铺';
COMMENT ON COLUMN packages.cod_settled_at IS '代收款结清时间';

