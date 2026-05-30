# 🔧 执行 Supabase 安全修复 - 快速指南

## 方法 1: 通过 Supabase Dashboard（推荐）✅

### 步骤 1: 登录 Supabase Dashboard
1. 访问 https://app.supabase.com
2. 登录您的账户
3. 选择项目（您的 Supabase 项目）

### 步骤 2: 打开 SQL Editor
1. 在左侧菜单中，点击 **SQL Editor**
2. 点击 **New query** 创建新查询

### 步骤 3: 复制并执行修复 SQL
复制以下 SQL 代码并粘贴到 SQL Editor 中：

```sql
-- 修复 delivery_alerts_stats 视图的 SECURITY DEFINER 问题
-- 删除旧视图
DROP VIEW IF EXISTS public.delivery_alerts_stats;

-- 重新创建视图，使用 SECURITY INVOKER
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
```

### 步骤 4: 执行 SQL
1. 点击 **Run** 按钮（或按 `Cmd+Enter` / `Ctrl+Enter`）
2. 等待执行完成
3. 确认看到 "Success" 消息

### 步骤 5: 验证修复
1. 在左侧菜单中，点击 **Security Advisor**
2. 刷新页面
3. 确认 `delivery_alerts_stats` 的错误已消失

---

## 方法 2: 通过 Supabase CLI（可选）

如果您安装了 Supabase CLI，可以使用以下命令：

```bash
# 确保已登录
supabase login

# 链接到项目
supabase link --project-ref YOUR_PROJECT_REF

# 执行 SQL 文件
supabase db execute --file fix-delivery-alerts-stats-security.sql
```

---

## ✅ 验证修复成功

### 验证 1: 检查 Security Advisor
1. 打开 Supabase Dashboard
2. 进入 **Security Advisor**
3. 确认错误数量从 **1 error** 变为 **0 errors**

### 验证 2: 测试视图查询
在 SQL Editor 中执行：

```sql
-- 测试视图查询
SELECT * FROM delivery_alerts_stats;

-- 检查视图定义
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views 
WHERE viewname = 'delivery_alerts_stats';
```

### 验证 3: 检查视图属性
```sql
-- 检查视图是否使用 SECURITY INVOKER
SELECT 
  n.nspname as schema_name,
  c.relname as view_name,
  pg_get_viewdef(c.oid, true) as view_definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'delivery_alerts_stats'
  AND c.relkind = 'v';
```

---

## ⚠️ 注意事项

1. **备份**: 虽然这个修复不会影响数据，但建议在执行前备份数据库
2. **权限**: 确保您有足够的权限执行 DROP 和 CREATE VIEW
3. **依赖**: 如果有其他对象依赖此视图，可能需要先处理依赖关系
4. **测试**: 执行后请测试应用功能是否正常

---

## 🆘 如果遇到问题

### 问题 1: 权限不足
**错误**: `permission denied for schema public`

**解决**: 
- 确保使用具有足够权限的账户（通常是项目所有者）
- 或者使用 Service Role Key 连接（仅用于管理操作）

### 问题 2: 视图不存在
**错误**: `view "delivery_alerts_stats" does not exist`

**解决**: 
- 这是正常的，`DROP VIEW IF EXISTS` 会安全处理
- 直接执行 CREATE VIEW 即可

### 问题 3: 表不存在
**错误**: `relation "delivery_alerts" does not exist`

**解决**: 
- 确认 `delivery_alerts` 表已创建
- 检查表名是否正确

---

## 📞 需要帮助？

如果遇到任何问题，请：
1. 检查错误消息
2. 查看 Supabase 日志
3. 参考 `SUPABASE_SECURITY_FIX_GUIDE.md` 获取详细说明

---

**执行时间**: 约 1-2 分钟  
**风险等级**: 低（只修改视图定义，不影响数据）  
**回滚**: 如果需要回滚，可以重新创建原始视图

