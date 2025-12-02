# ✅ Supabase 密钥更新完成检查清单

## 📋 已完成的操作

### ✅ EAS Secrets（客户端 App）
- [x] 已创建 `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [x] Visibility: Sensitive
- [x] Environments: development, preview, production

---

## ⏳ 待完成的操作（重要！）

### 🔴 最高优先级：Netlify 环境变量更新

#### 客户端 Web (market-link-express.com)

**需要更新的变量**:

1. **REACT_APP_SUPABASE_ANON_KEY**
   ```
   值: [请从 Supabase Dashboard → Settings → API → API Keys 获取 Anon Key]
   ```

2. **SUPABASE_SERVICE_ROLE**
   ```
   值: [请从 Supabase Dashboard → Settings → API → API Keys 获取 Service Role Key]
   ```

**操作步骤**:
1. 登录 Netlify Dashboard: https://app.netlify.com
2. 选择站点：**client-ml-express**（或您的客户端 Web 站点名）
3. 进入 **Site settings** → **Environment variables**
4. 更新上述两个变量
5. 点击 **Save**
6. **重要**: 点击 **Deploys** → **Trigger deploy** → **Deploy site** 重新部署

---

#### 后台管理 Web (admin-market-link-express.com)

**重复上述步骤**，但选择后台管理站点。

---

## ✅ 验证步骤

### 1. 验证 EAS Secrets

```bash
cd ml-express-client
eas env:list
```

应该看到 `EXPO_PUBLIC_SUPABASE_ANON_KEY` 已创建。

---

### 2. 验证 Netlify 环境变量

在 Netlify Dashboard 中：
1. 进入 **Site settings** → **Environment variables**
2. 确认 `REACT_APP_SUPABASE_ANON_KEY` 已更新为新值
3. 确认 `SUPABASE_SERVICE_ROLE` 已更新为新值

---

### 3. 测试功能

#### 客户端 Web
- 访问：https://market-link-express.com
- 测试登录功能
- 测试注册功能
- 确认数据可以正常加载

#### 后台管理 Web
- 访问：https://admin-market-link-express.com
- 测试管理员登录
- 确认数据可以正常加载

#### Netlify Functions
- 测试发送邮箱验证码功能
- 测试验证邮箱验证码功能

---

## 📋 完整检查清单

### EAS Secrets
- [x] `EXPO_PUBLIC_SUPABASE_ANON_KEY` 已创建
- [x] Visibility 设置为 Sensitive
- [x] Environments 包含所有环境

### Netlify 环境变量（客户端 Web）
- [ ] `REACT_APP_SUPABASE_ANON_KEY` 已更新
- [ ] `SUPABASE_SERVICE_ROLE` 已更新
- [ ] 已重新部署

### Netlify 环境变量（后台管理 Web）
- [ ] `REACT_APP_SUPABASE_ANON_KEY` 已更新
- [ ] `SUPABASE_SERVICE_ROLE` 已更新
- [ ] 已重新部署

### 功能验证
- [ ] 客户端 Web 功能正常
- [ ] 后台管理 Web 功能正常
- [ ] Netlify Functions 功能正常

---

## 🎯 下一步

**请确认**：

1. **Netlify 环境变量是否已更新？**
   - 客户端 Web 和后台管理 Web 都需要更新
   - 这是最重要的步骤！

2. **是否已重新部署？**
   - 更新环境变量后，必须重新部署才能生效

3. **功能是否正常？**
   - 测试登录、注册等功能
   - 确认没有错误

---

## 🆘 如果遇到问题

### 问题 1: 应用无法连接 Supabase

**检查**:
1. Netlify 环境变量是否正确更新
2. 是否已重新部署
3. 检查 Netlify Dashboard → Functions → Logs

### 问题 2: Netlify Functions 无法工作

**检查**:
1. `SUPABASE_SERVICE_ROLE` 环境变量是否正确
2. 是否已重新部署
3. 检查 Functions 日志

---

**请告诉我 Netlify 环境变量是否已更新，以及功能测试的结果！** 🚀

