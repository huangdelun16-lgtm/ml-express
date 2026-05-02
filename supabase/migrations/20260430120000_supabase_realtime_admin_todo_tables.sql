-- 将仪表盘待办相关表纳入 Realtime，供后台 Web 订阅 postgres_changes（若已在 publication 中则跳过）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'recharge_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.recharge_requests;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'delivery_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_alerts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'packages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.packages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
END $$;
