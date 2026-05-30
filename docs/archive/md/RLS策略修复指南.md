# 🔧 RLS 策略修复指南

## 📋 问题描述

客户端 web 无法登录，原因是 RLS (Row Level Security) 已启用，但策略配置不正确，导致无法查询用户数据。

## 🚨 快速修复（推荐）

### 方法 1: 使用简化脚本（最快）

1. **登录 Supabase Dashboard**
   - 访问：https://app.supabase.com
   - 选择项目：`uopkyuluxnrewvlmutam`

2. **打开 SQL Editor**
   - 左侧菜单 → **SQL Editor**
   - 点击 **New query**

3. **执行修复脚本**
   - 复制 `fix-users-rls-policy-simple.sql` 的内容
   - 粘贴到 SQL Editor
   - 点击 **Run** 执行

4. **验证修复**
   - 脚本执行后，应该看到策略列表
   - 确认有 "Allow all operations on users" 策略

5. **测试登录**
   - 返回客户端 web
   - 尝试登录
   - 应该可以正常登录了

---

### 方法 2: 使用详细脚本（更安全）

如果需要更精细的控制，使用 `fix-users-rls-policy.sql`：

1. **执行详细脚本**
   - 复制 `fix-users-rls-policy.sql` 的内容
   - 在 SQL Editor 中执行

2. **这个脚本会创建以下策略**：
   - ✅ 允许匿名用户查询客户数据（用于登录）
   - ✅ 允许匿名用户插入客户数据（用于注册）
   - ✅ 允许匿名用户更新自己的数据

---

## 🔍 检查当前策略

如果想知道当前的策略配置，执行：

```sql
-- 查看所有策略
SELECT 
    policyname,
    cmd as operation,
    qual as using_expression
FROM pg_policies 
WHERE tablename = 'users';
```

---

## ⚠️ 安全说明

### 方案 1（简化版）
- **策略**：`USING (true) WITH CHECK (true)`
- **效果**：允许所有操作（查询、插入、更新、删除）
- **适用**：开发/测试环境
- **风险**：⚠️ 生产环境不推荐

### 方案 2（详细版）
- **策略**：只允许查询和插入客户数据
- **效果**：更安全，只暴露必要的数据
- **适用**：生产环境
- **风险**：✅ 推荐用于生产环境

---

## 📝 执行步骤

### 步骤 1: 登录 Supabase Dashboard
1. 访问 https://app.supabase.com
2. 选择你的项目

### 步骤 2: 打开 SQL Editor
1. 左侧菜单 → **SQL Editor**
2. 点击 **New query**

### 步骤 3: 执行修复脚本
1. 复制以下 SQL（简化版）：
```sql
-- 删除所有旧策略
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow anon read customers" ON users;
DROP POLICY IF EXISTS "Allow anon insert customers" ON users;
DROP POLICY IF EXISTS "Allow anon update own customer" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Public can read users" ON users;

-- 创建允许所有操作的策略
CREATE POLICY "Allow all operations on users" ON users
FOR ALL 
USING (true) 
WITH CHECK (true);
```

2. 粘贴到 SQL Editor
3. 点击 **Run** 执行

### 步骤 4: 验证
执行后应该看到：
```
Success. No rows returned
```

### 步骤 5: 测试
1. 返回客户端 web
2. 尝试登录
3. 应该可以正常登录了

---

## 🎯 预期结果

修复后：
- ✅ 客户端 web 可以查询用户数据
- ✅ 可以正常登录
- ✅ 可以正常注册
- ✅ 可以更新个人信息

---

## ❓ 如果还是不行

如果执行脚本后仍然无法登录，请检查：

1. **RLS 是否真的启用了**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'users';
   ```
   - 如果 `rowsecurity = true`，说明 RLS 已启用
   - 如果 `rowsecurity = false`，说明 RLS 未启用（这不是问题）

2. **策略是否创建成功**
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'users';
   ```
   - 应该看到至少一个策略

3. **Supabase Anon Key 是否正确**
   - 检查 Netlify 环境变量
   - 确认使用的是 Anon Key，不是 Service Role Key

4. **浏览器控制台错误**
   - 查看是否有权限错误
   - 查看查询日志

---

## 📞 需要帮助？

如果问题仍然存在，请提供：
1. SQL 执行结果
2. 策略列表（`SELECT policyname FROM pg_policies WHERE tablename = 'users';`）
3. 浏览器控制台的错误信息

