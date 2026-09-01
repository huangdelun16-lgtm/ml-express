-- Store profile photo shown in merchant account + City Mall.
-- Safe to apply alone; does not rewrite other tables.
ALTER TABLE public.delivery_stores
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
