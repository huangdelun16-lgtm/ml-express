-- avatar_url was added after 20260716180000 snapshotted column GRANTs.
-- anon SELECT * then fails with "permission denied for table delivery_stores".
GRANT SELECT (avatar_url), INSERT (avatar_url), UPDATE (avatar_url)
  ON TABLE public.delivery_stores TO anon;

GRANT SELECT (avatar_url), UPDATE (avatar_url)
  ON TABLE public.delivery_stores TO authenticated;

NOTIFY pgrst, 'reload schema';
