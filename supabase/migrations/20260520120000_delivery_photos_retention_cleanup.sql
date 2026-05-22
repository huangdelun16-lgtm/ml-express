-- 骑手送达证明照片：默认保留 7 天后自动清理（upload_time / created_at）
-- 照片存于 public.delivery_photos（含 photo_base64），长期不删会占满数据库空间

CREATE OR REPLACE FUNCTION public.cleanup_expired_delivery_photos(retention_days integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
  cutoff timestamptz;
BEGIN
  IF retention_days IS NULL OR retention_days < 1 THEN
    RAISE EXCEPTION 'retention_days must be >= 1';
  END IF;

  cutoff := NOW() - (retention_days || ' days')::interval;

  -- 主规则：上传时间超过保留期（骑手确认送达时上传，与送达时间一致）
  DELETE FROM public.delivery_photos dp
  WHERE COALESCE(dp.upload_time, dp.created_at) < cutoff;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_delivery_photos(integer) IS
  '删除超过 retention_days 天的 delivery_photos 记录（默认 7 天）。由 pg_cron 或 Netlify 定时任务调用。';

REVOKE ALL ON FUNCTION public.cleanup_expired_delivery_photos(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_delivery_photos(integer) TO service_role;

-- 加速按时间清理
CREATE INDEX IF NOT EXISTS idx_delivery_photos_upload_time_retention
  ON public.delivery_photos (upload_time);

-- Supabase Pro 且已启用 pg_cron 时：每天 UTC 04:00 执行
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-delivery-photos-daily') THEN
      PERFORM cron.schedule(
        'cleanup-delivery-photos-daily',
        '0 4 * * *',
        $cron$SELECT public.cleanup_expired_delivery_photos(7);$cron$
      );
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table OR undefined_object OR insufficient_privilege THEN
    RAISE NOTICE 'pg_cron 未启用，请使用 Netlify 定时函数 cleanup-delivery-photos';
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron 调度跳过: %', SQLERRM;
END
$do$;
