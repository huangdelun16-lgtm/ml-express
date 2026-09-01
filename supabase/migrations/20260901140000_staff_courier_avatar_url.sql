-- Staff / rider profile photo. Safe to apply alone.
ALTER TABLE public.admin_accounts
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
