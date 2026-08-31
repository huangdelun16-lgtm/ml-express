-- 库存异常件 + 现场照片（到站/快递明细登记，Admin 跨境页只读）

CREATE TABLE IF NOT EXISTS inventory_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_store_items(id) ON DELETE SET NULL,
  item_barcode TEXT NOT NULL,
  express_barcode TEXT,
  pack_barcode TEXT,
  order_tracking_id UUID,
  exception_type TEXT NOT NULL CHECK (
    exception_type IN ('damage', 'shortage', 'excess', 'lost', 'wrong_item', 'return_origin')
  ),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'cancelled')),
  qty_expected NUMERIC,
  qty_actual NUMERIC,
  note TEXT NOT NULL,
  reported_store_id UUID NOT NULL,
  reported_store_code TEXT NOT NULL,
  reported_hub_code TEXT NOT NULL,
  reported_operator TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolve_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_exceptions_status_idx
  ON inventory_exceptions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_exceptions_item_barcode_idx
  ON inventory_exceptions (upper(trim(item_barcode)));
CREATE INDEX IF NOT EXISTS inventory_exceptions_pack_barcode_idx
  ON inventory_exceptions (upper(trim(pack_barcode)));
CREATE INDEX IF NOT EXISTS inventory_exceptions_store_idx
  ON inventory_exceptions (reported_store_id, status);

COMMENT ON TABLE inventory_exceptions IS 'Inventory App：破损/短少/丢失等异常件，由中转站现场登记';

CREATE TABLE IF NOT EXISTS inventory_exception_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES inventory_exceptions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_exception_photos_exception_idx
  ON inventory_exception_photos (exception_id);

COMMENT ON TABLE inventory_exception_photos IS '异常件现场照片（storage bucket inventory-exceptions）';

ALTER TABLE inventory_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_exception_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_exceptions_select ON inventory_exceptions;
CREATE POLICY inventory_exceptions_select ON inventory_exceptions
  FOR SELECT TO authenticated
  USING (
    inventory_session_active()
    AND (
      reported_store_id = inventory_jwt_store_id()
      OR upper(trim(reported_hub_code)) = upper(trim(inventory_jwt_hub_code()))
      OR (
        item_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM inventory_store_items i
          WHERE i.id = inventory_exceptions.item_id
            AND (
              i.owner_store_id = inventory_jwt_store_id()
              OR upper(trim(i.owner_store_code)) = upper(trim(inventory_jwt_store_code()))
              OR upper(trim(i.final_destination)) = upper(trim(inventory_jwt_hub_code()))
            )
        )
      )
    )
  );

DROP POLICY IF EXISTS inventory_exceptions_insert ON inventory_exceptions;
CREATE POLICY inventory_exceptions_insert ON inventory_exceptions
  FOR INSERT TO authenticated
  WITH CHECK (
    inventory_session_active()
    AND reported_store_id = inventory_jwt_store_id()
    AND upper(trim(reported_store_code)) = upper(trim(inventory_jwt_store_code()))
    AND upper(trim(reported_hub_code)) = upper(trim(inventory_jwt_hub_code()))
  );

DROP POLICY IF EXISTS inventory_exceptions_update ON inventory_exceptions;
CREATE POLICY inventory_exceptions_update ON inventory_exceptions
  FOR UPDATE TO authenticated
  USING (
    inventory_session_active()
    AND (
      reported_store_id = inventory_jwt_store_id()
      OR upper(trim(reported_hub_code)) = upper(trim(inventory_jwt_hub_code()))
    )
  )
  WITH CHECK (
    inventory_session_active()
    AND (
      reported_store_id = inventory_jwt_store_id()
      OR upper(trim(reported_hub_code)) = upper(trim(inventory_jwt_hub_code()))
    )
  );

DROP POLICY IF EXISTS inventory_exception_photos_select ON inventory_exception_photos;
CREATE POLICY inventory_exception_photos_select ON inventory_exception_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_exceptions e
      WHERE e.id = inventory_exception_photos.exception_id
    )
  );

DROP POLICY IF EXISTS inventory_exception_photos_insert ON inventory_exception_photos;
CREATE POLICY inventory_exception_photos_insert ON inventory_exception_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    inventory_session_active()
    AND EXISTS (
      SELECT 1 FROM inventory_exceptions e
      WHERE e.id = inventory_exception_photos.exception_id
        AND e.reported_store_id = inventory_jwt_store_id()
    )
  );

GRANT SELECT, INSERT, UPDATE ON inventory_exceptions TO authenticated;
GRANT SELECT, INSERT ON inventory_exception_photos TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inventory-exceptions',
  'inventory-exceptions',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS inventory_exceptions_storage_insert ON storage.objects;
CREATE POLICY inventory_exceptions_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'inventory-exceptions'
    AND inventory_session_active()
    AND (storage.foldername(name))[1] = inventory_jwt_store_id()::text
  );

DROP POLICY IF EXISTS inventory_exceptions_storage_select ON storage.objects;
CREATE POLICY inventory_exceptions_storage_select
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'inventory-exceptions');

DROP POLICY IF EXISTS inventory_exceptions_storage_delete ON storage.objects;
CREATE POLICY inventory_exceptions_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'inventory-exceptions'
    AND inventory_session_active()
    AND (storage.foldername(name))[1] = inventory_jwt_store_id()::text
  );
