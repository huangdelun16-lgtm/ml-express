-- 修复 delivery_alerts_stats 视图的 SECURITY DEFINER 问题
-- 问题: 视图使用了 SECURITY DEFINER，会以创建者权限运行，而不是查询用户权限
-- 修复: 重新创建视图，使用 SECURITY INVOKER（默认），确保遵循 RLS 策略

-- 删除旧视图
DROP VIEW IF EXISTS public.delivery_alerts_stats;

-- 重新创建视图，明确使用 SECURITY INVOKER（默认行为）
-- SECURITY INVOKER 确保视图以查询用户的权限运行，遵循 RLS 策略
CREATE VIEW public.delivery_alerts_stats
WITH (security_invoker = true) AS
SELECT 
  status,
  severity,
  COUNT(*) as alert_count,
  MIN(created_at) as oldest_alert,
  MAX(created_at) as newest_alert
FROM delivery_alerts
GROUP BY status, severity
ORDER BY 
  CASE status 
    WHEN 'pending' THEN 1 
    WHEN 'acknowledged' THEN 2 
    WHEN 'resolved' THEN 3 
    WHEN 'dismissed' THEN 4 
  END,
  CASE severity 
    WHEN 'critical' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    WHEN 'low' THEN 4 
  END;

-- 添加注释说明
COMMENT ON VIEW public.delivery_alerts_stats IS 
'配送警报统计视图 - 按状态和严重程度统计警报数量。使用 SECURITY INVOKER 确保遵循 RLS 策略。';

-- 授予必要的权限（如果需要）
-- GRANT SELECT ON public.delivery_alerts_stats TO authenticated;
-- GRANT SELECT ON public.delivery_alerts_stats TO anon;

-- 验证视图创建
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views 
WHERE viewname = 'delivery_alerts_stats';

