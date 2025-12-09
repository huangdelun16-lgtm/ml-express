ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS rider_settled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rider_settled_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_packages_rider_settled ON packages(rider_settled);
COMMENT ON COLUMN packages.rider_settled IS '骑手是否已结清款项';
COMMENT ON COLUMN packages.rider_settled_at IS '骑手结清时间';

