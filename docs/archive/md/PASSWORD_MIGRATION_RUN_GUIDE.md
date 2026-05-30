# 🔒 密码迁移脚本运行指南

## 📍 在哪里运行？

**答案：在本地运行，不需要在 Netlify 上运行！**

这些迁移脚本是**数据库迁移工具**，不是 Web 应用的一部分。它们只需要：
- ✅ 能够访问 Supabase 数据库
- ✅ 配置了正确的环境变量
- ✅ 安装了 Node.js 和必要的依赖

---

## 🖥️ 本地运行步骤

### 步骤 1: 准备环境

1. **确保已安装 Node.js**（版本 12 或更高）
   ```bash
   node --version
   ```

2. **安装依赖**（如果还没有）
   ```bash
   cd /Users/aungmyatthu/Desktop/ml-express
   npm install
   ```

---

### 步骤 2: 配置环境变量

**方法 A: 临时设置（推荐）**

在终端中运行：

```bash
export REACT_APP_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE="your-service-role-key"
```

**方法 B: 创建 `.env` 文件**

在项目根目录创建 `.env` 文件（如果还没有）：

```bash
REACT_APP_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE=your-service-role-key
```

**⚠️ 重要**：
- 使用 **Service Role Key**（不是 Anon Key）
- Service Role Key 在 Supabase Dashboard → Settings → API → API Keys → `service_role` key

---

### 步骤 3: 运行迁移脚本

```bash
node scripts/force-migrate-passwords.js
```

脚本会：
1. 扫描所有账号
2. 显示密码状态统计
3. 提供交互式选项
4. 执行迁移

---

## 🔄 如果需要自动化（可选）

### 方式 A: 创建 Netlify Function（不推荐）

虽然可以在 Netlify 上创建 Function，但**不推荐**，因为：
- ❌ 这是**一次性操作**，不是常规 API
- ❌ 需要 Service Role Key，安全风险高
- ❌ 迁移完成后应该删除

如果确实需要，可以创建一个临时 Function：

```javascript
// netlify/functions/migrate-passwords-once.js
// ⚠️ 警告：迁移完成后请删除此文件！
```

---

### 方式 B: 使用 Supabase SQL Editor（简单）

如果不想运行脚本，可以直接在 Supabase Dashboard 中执行 SQL：

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择项目
3. 点击左侧菜单 **SQL Editor**
4. 运行以下查询检查状态：

```sql
-- 检查密码状态
SELECT 
  id,
  username,
  employee_name,
  CASE 
    WHEN password IS NULL OR password = '' THEN '无密码'
    WHEN password LIKE '$2a$%' OR password LIKE '$2b$%' OR password LIKE '$2y$%' THEN '已加密'
    ELSE '明文密码'
  END as password_status
FROM admin_accounts;
```

5. 然后手动迁移（通过 Web 后台或 SQL）

---

## 📋 完整运行示例

```bash
# 1. 进入项目目录
cd /Users/aungmyatthu/Desktop/ml-express

# 2. 设置环境变量
export REACT_APP_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE="YOUR_SUPABASE_ANON_KEY_HERE"

# 3. 运行迁移脚本
node scripts/force-migrate-passwords.js

# 4. 按照提示操作
# - 输入 "yes" 确认
# - 选择迁移方式（1 或 2）
# - 如果选择方式 1，输入临时密码
```

---

## 🆘 常见问题

### Q1: 为什么不能在 Netlify 上运行？

**A**: 这些脚本是**数据库迁移工具**，不是 Web API。它们需要：
- 直接访问数据库
- 一次性执行
- 不需要 HTTP 接口

---

### Q2: 我没有本地环境怎么办？

**A**: 可以使用以下替代方案：

1. **使用 Supabase SQL Editor**（最简单）
   - 直接在浏览器中运行 SQL
   - 不需要本地环境

2. **使用在线 Node.js 环境**
   - 如 [Repl.it](https://replit.com) 或 [CodeSandbox](https://codesandbox.io)
   - 上传脚本并运行

3. **手动迁移**（通过 Web 后台）
   - 登录后台管理
   - 逐个账号修改密码

---

### Q3: 如何获取 Service Role Key？

**A**: 
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择项目
3. 点击 **Settings** → **API**
4. 找到 **Project API keys** 部分
5. 复制 **`service_role`** key（⚠️ 注意：这是敏感密钥，不要泄露！）

---

### Q4: 迁移后需要做什么？

**A**: 
1. ✅ 验证所有密码都已加密
2. ✅ 通知受影响的用户
3. ✅ 测试登录功能
4. ✅ 删除或归档迁移脚本（可选）

---

## ✅ 检查清单

- [ ] 已安装 Node.js
- [ ] 已安装项目依赖（`npm install`）
- [ ] 已配置环境变量（`REACT_APP_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE`）
- [ ] 已获取 Service Role Key
- [ ] 已运行迁移脚本
- [ ] 已验证迁移结果

---

## 🔗 相关文档

- `PASSWORD_MIGRATION_GUIDE.md` - 完整迁移指南
- `scripts/force-migrate-passwords.js` - 强制迁移脚本
- `scripts/migrate-passwords.js` - 自动迁移脚本（保留向后兼容）

---

**总结**: 在**本地运行**，不需要在 Netlify 上运行！

