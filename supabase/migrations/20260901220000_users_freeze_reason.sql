-- Admin customer freeze reason. VIP remains users.user_type = 'vip' (not wallet balance).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS freeze_reason TEXT;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS frozen_by TEXT;

COMMENT ON COLUMN public.users.freeze_reason IS
  'Required note when status is set to suspended from Admin 用户管理.';

NOTIFY pgrst, 'reload schema';
