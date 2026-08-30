-- 商品审核备注：拒绝原因写回商品，商家端可直接展示
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS listing_review_notes TEXT;

COMMENT ON COLUMN public.products.listing_review_notes IS
  'Admin 最近一次商品审核备注；拒绝时写入，通过后清空';

-- 通知表允许发给商家、类型为商品审核（兼容旧 CHECK）
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%recipient_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', rec.conname);
  END LOOP;

  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_recipient_type_check
    CHECK (recipient_type IN ('courier', 'customer', 'admin', 'merchant'));

  FOR rec IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%notification_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', rec.conname);
  END LOOP;

  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_notification_type_check
    CHECK (notification_type IN ('package_assigned', 'status_update', 'urgent', 'system', 'product_review'));
EXCEPTION
  WHEN undefined_table THEN
    NULL;
  WHEN duplicate_object THEN
    NULL;
END $$;
