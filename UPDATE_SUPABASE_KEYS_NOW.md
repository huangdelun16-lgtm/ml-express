# 🔑 立即更新 Supabase 密钥配置

## ✅ 已获取的新密钥

- ✅ **新的 Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY`
- ✅ **新的 Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0MzAwMCwiZXhwIjoyMDc0NjE5MDAwfQ.mpPnGHff2JL4bbCg4nsE7503FmCnTxlQEpZM3uv0jNw`

---

## 🚀 立即更新步骤

### 步骤 1: 更新 Netlify 环境变量

#### 客户端 Web (market-link-express.com)

**需要更新的变量**:
- `REACT_APP_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY`
- `SUPABASE_SERVICE_ROLE` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0MzAwMCwiZXhwIjoyMDc0NjE5MDAwfQ.mpPnGHff2JL4bbCg4nsE7503FmCnTxlQEpZM3uv0jNw`

**操作步骤**:
1. 登录 Netlify Dashboard
2. 选择站点：**client-ml-express**（或您的客户端 Web 站点名）
3. 进入 **Site settings** → **Environment variables**
4. 找到 `REACT_APP_SUPABASE_ANON_KEY`，点击 **Edit**，更新为新值
5. 找到 `SUPABASE_SERVICE_ROLE`，点击 **Edit**，更新为新值（如果没有，点击 **Add variable** 添加）
6. 点击 **Save**

#### 后台管理 Web (admin-market-link-express.com)

**需要更新的变量**（同上）:
- `REACT_APP_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY`
- `SUPABASE_SERVICE_ROLE` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0MzAwMCwiZXhwIjoyMDc0NjE5MDAwfQ.mpPnGHff2JL4bbCg4nsE7503FmCnTxlQEpZM3uv0jNw`

**操作步骤**（同上）:
1. 在 Netlify Dashboard 中选择后台管理站点
2. 进入 **Site settings** → **Environment variables**
3. 更新上述两个变量
4. 点击 **Save**

---

### 步骤 2: 更新 EAS Secrets（客户端 App）

```bash
cd ml-express-client

# 更新 Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY" --force

# 验证更新
eas secret:list
```

---

### 步骤 3: 更新本地 .env 文件

**⚠️ 注意**: `.env` 文件已在 `.gitignore` 中，不会被提交到 Git

更新本地 `.env` 文件：
```bash
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY
```

---

### 步骤 4: 立即重新部署

**Netlify 站点**:
1. **客户端 Web**: 在 Netlify Dashboard 中点击 **Deploys** → **Trigger deploy** → **Deploy site**
2. **后台管理 Web**: 同样触发重新部署

**⚠️ 重要**: 更新环境变量后，必须重新部署才能生效！

---

### 步骤 5: 验证功能

部署完成后，测试以下功能：

1. **客户端 Web**
   - 访问网站
   - 测试登录功能
   - 测试注册功能
   - 确认数据可以正常加载

2. **后台管理 Web**
   - 访问管理后台
   - 测试管理员登录
   - 确认数据可以正常加载

3. **Netlify Functions**
   - 测试发送邮箱验证码功能
   - 测试验证邮箱验证码功能

4. **客户端 App**
   - 测试登录功能
   - 测试数据加载

---

## 📋 检查清单

### Netlify 环境变量更新

- [ ] 客户端 Web: `REACT_APP_SUPABASE_ANON_KEY` 已更新
- [ ] 客户端 Web: `SUPABASE_SERVICE_ROLE` 已更新
- [ ] 后台管理 Web: `REACT_APP_SUPABASE_ANON_KEY` 已更新
- [ ] 后台管理 Web: `SUPABASE_SERVICE_ROLE` 已更新

### EAS Secrets 更新

- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` 已更新

### 本地配置更新

- [ ] 本地 `.env` 文件已更新

### 重新部署

- [ ] 客户端 Web 已重新部署
- [ ] 后台管理 Web 已重新部署

### 功能验证

- [ ] 客户端 Web 功能正常
- [ ] 后台管理 Web 功能正常
- [ ] Netlify Functions 功能正常
- [ ] 客户端 App 功能正常（如果需要重新构建）

---

## 🆘 如果遇到问题

### 问题 1: 应用无法连接 Supabase

**解决方案**:
1. 确认环境变量已正确更新
2. 确认已重新部署站点
3. 检查 Netlify Dashboard → Functions → Logs 查看错误信息

### 问题 2: Netlify Functions 无法工作

**解决方案**:
1. 确认 `SUPABASE_SERVICE_ROLE` 环境变量已更新
2. 确认已重新部署站点
3. 检查 Functions 日志

---

**现在请按照上述步骤更新 Netlify 环境变量，然后告诉我，我会帮您验证！** 🚀

