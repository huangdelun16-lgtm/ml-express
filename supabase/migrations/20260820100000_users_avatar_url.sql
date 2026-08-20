-- Member profile photo URL. Safe to apply alone; does not rewrite other tables.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
