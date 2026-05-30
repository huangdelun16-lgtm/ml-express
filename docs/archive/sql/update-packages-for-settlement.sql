-- packages 表增加 is_settled 字段，用于标记薪资是否结算
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS is_settled BOOLEAN DEFAULT FALSE;

-- 为新字段创建索引，优化查询性能
CREATE INDEX IF NOT EXISTS idx_packages_is_settled ON packages (is_settled);

-- 更新历史数据（可选）：为了演示，这里可以将所有“已送达”的旧包裹标记为已结算
-- 在实际应用中，您可能需要根据您的财务记录来决定哪些旧包裹需要被标记
-- UPDATE packages
-- SET is_settled = TRUE
-- WHERE status = '已送达' AND created_at < 'YYYY-MM-DD'; -- 比如某个结算日期之前的

-- 接下来是针对行级安全策略（RLS）的修改，非常重要

-- ！！！重要！！！
-- 登录您的 Supabase 项目后台，导航到 "Authentication" -> "Policies"。
-- 在表列表中找到 "packages" 表。
-- 找到那条允许骑手（couriers）读取（SELECT）数据的策略。它的名字可能是 "Enable read access for authenticated users" 或者您自定义的名称。
-- 点击 "Edit" 编辑这条策略。
-- 在 "USING expression" 中，您会看到类似 (auth.uid() = courier_id) 的条件。
-- 将它修改为：
-- (auth.uid() = courier_id) AND (is_settled = FALSE)
--
-- 点击 "Review" 并 "Save policy"。
--
-- 这样就确保了骑手端的 App 只能获取到他们自己的、并且是“未结算”的包裹，实现了我们的优化目标。
