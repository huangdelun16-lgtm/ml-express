-- 占位：未来平台库存 App 与云端同步时使用（当前独立 App 不依赖此表）
-- 设计参考：本机 SQLite inventory_items / stock_movements 的上云版本

-- CREATE TABLE IF NOT EXISTS platform_inventory_items (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   barcode TEXT NOT NULL UNIQUE,
--   name TEXT NOT NULL,
--   spec TEXT DEFAULT '',
--   unit TEXT DEFAULT '件',
--   qty_on_hand NUMERIC NOT NULL DEFAULT 0,
--   min_qty NUMERIC NOT NULL DEFAULT 0,
--   note TEXT DEFAULT '',
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- );

-- CREATE TABLE IF NOT EXISTS platform_stock_movements (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   item_id UUID NOT NULL REFERENCES platform_inventory_items(id),
--   type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjust')),
--   qty NUMERIC NOT NULL,
--   qty_before NUMERIC NOT NULL,
--   qty_after NUMERIC NOT NULL,
--   operator TEXT NOT NULL,
--   note TEXT DEFAULT '',
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- );

SELECT 1;
