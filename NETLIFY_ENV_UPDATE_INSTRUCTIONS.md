# 🚀 Netlify 环境变量更新指南

## 📋 需要更新的密钥

### 新的 Anon Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY
```

### 新的 Service Role Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0MzAwMCwiZXhwIjoyMDc0NjE5MDAwfQ.mpPnGHff2JL4bbCg4nsE7503FmCnTxlQEpZM3uv0jNw
```

---

## 🔧 更新步骤

### 客户端 Web (market-link-express.com)

1. **登录 Netlify Dashboard**
   - 访问：https://app.netlify.com
   - 选择站点：**client-ml-express**（或您的客户端 Web 站点名）

2. **进入环境变量设置**
   - 点击 **Site settings**
   - 点击 **Environment variables**

3. **更新变量 1: REACT_APP_SUPABASE_ANON_KEY**
   - 找到 `REACT_APP_SUPABASE_ANON_KEY`
   - 点击 **Edit**
   - 更新值为：
     ```
     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY
     ```
   - 点击 **Save**

4. **更新变量 2: SUPABASE_SERVICE_ROLE**
   - 找到 `SUPABASE_SERVICE_ROLE`（如果没有，点击 **Add variable**）
   - 点击 **Edit** 或 **Add variable**
   - 更新/添加值为：
     ```
     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA0MzAwMCwiZXhwIjoyMDc0NjE5MDAwfQ.mpPnGHff2JL4bbCg4nsE7503FmCnTxlQEpZM3uv0jNw
     ```
   - 点击 **Save**

5. **重新部署**
   - 点击 **Deploys** 标签页
   - 点击 **Trigger deploy** → **Deploy site**
   - 等待部署完成

---

### 后台管理 Web (admin-market-link-express.com)

**重复上述步骤**，但选择后台管理站点。

---

## ✅ 验证更新

部署完成后，测试：

1. **客户端 Web**
   - 访问：https://market-link-express.com
   - 测试登录功能
   - 测试注册功能

2. **后台管理 Web**
   - 访问：https://admin-market-link-express.com
   - 测试管理员登录

3. **Netlify Functions**
   - 测试发送验证码功能
   - 测试验证验证码功能

---

## 📋 快速检查清单

- [ ] 客户端 Web: `REACT_APP_SUPABASE_ANON_KEY` 已更新
- [ ] 客户端 Web: `SUPABASE_SERVICE_ROLE` 已更新
- [ ] 客户端 Web: 已重新部署
- [ ] 后台管理 Web: `REACT_APP_SUPABASE_ANON_KEY` 已更新
- [ ] 后台管理 Web: `SUPABASE_SERVICE_ROLE` 已更新
- [ ] 后台管理 Web: 已重新部署
- [ ] 已测试所有功能正常

---

**请按照上述步骤更新 Netlify 环境变量，然后告诉我结果！** 🚀

