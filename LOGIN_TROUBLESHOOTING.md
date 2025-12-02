# 🔧 Admin Web 登录问题排查指南

## 问题症状
- 无法登录 admin web
- 登录后立即被登出
- Token 验证失败

---

## 🔍 可能的原因

### 1. **环境变量未配置或不一致**

**问题**：客户端和服务端使用了不同的 JWT_SECRET 密钥

**检查方法**：
1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签页
3. 查找警告信息：`⚠️ 警告：使用默认 JWT_SECRET`

**解决方案**：

#### 步骤 1: 生成强密钥
```bash
# 使用 OpenSSL
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 步骤 2: 在 Netlify 中配置环境变量

1. 登录 Netlify Dashboard
2. 选择站点：**admin-market-link-express**（或您的后台管理站点）
3. 进入 **Site settings** → **Environment variables**
4. 添加以下变量：

   **变量 1**:
   - **Key**: `JWT_SECRET`
   - **Value**: `[生成的密钥]`
   - **Scopes**: ✅ Production, ✅ Deploy previews, ✅ Branch deploys

   **变量 2**:
   - **Key**: `REACT_APP_JWT_SECRET`
   - **Value**: `[相同的密钥]`（必须与 JWT_SECRET 相同！）
   - **Scopes**: ✅ Production, ✅ Deploy previews, ✅ Branch deploys

5. 点击 **Save**

#### 步骤 3: 重新部署
- 推送代码到 Git（如果已连接）
- 或手动触发：**Deploys** → **Trigger deploy** → **Deploy site**

---

### 2. **旧的 Token 缓存**

**问题**：浏览器中存储了旧的 Token（使用旧的签名方式）

**解决方案**：
1. 打开浏览器开发者工具（F12）
2. 进入 **Application** 标签页（Chrome）或 **Storage** 标签页（Firefox）
3. 找到 **Local Storage** → 您的网站域名
4. 删除以下键：
   - `admin_auth_token`
   - `currentUser`
   - `currentUserName`
   - `currentUserRole`
5. 刷新页面并重新登录

**快速方法**：
```javascript
// 在浏览器控制台执行
localStorage.clear();
location.reload();
```

---

### 3. **Web Crypto API 不支持**

**问题**：旧版浏览器或不安全上下文（非 HTTPS）不支持 Web Crypto API

**检查方法**：
1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签页
3. 查找错误：`Token 签名生成失败`

**解决方案**：
- 确保使用 HTTPS（生产环境）
- 升级浏览器到最新版本
- 如果必须使用 HTTP（仅开发环境），考虑使用 polyfill

---

### 4. **签名验证失败**

**问题**：客户端和服务端生成的签名不一致

**检查方法**：
1. 打开浏览器开发者工具（F12）
2. 查看 **Network** 标签页
3. 找到 `/.netlify/functions/verify-admin` 请求
4. 查看响应，查找错误：`令牌签名无效`

**解决方案**：
- 确保 `JWT_SECRET` 和 `REACT_APP_JWT_SECRET` 使用相同的值
- 清除浏览器缓存和 Local Storage
- 重新部署 Netlify Functions

---

## 🛠️ 快速修复步骤

### 方法 1: 清除缓存并重新登录

```javascript
// 在浏览器控制台执行
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 方法 2: 检查环境变量配置

1. 登录 Netlify Dashboard
2. 检查环境变量是否已配置
3. 确保 `JWT_SECRET` 和 `REACT_APP_JWT_SECRET` 都存在且值相同

### 方法 3: 临时回退（仅用于紧急情况）

如果急需登录，可以临时修改代码回退到旧的签名方式（**不推荐，仅用于紧急情况**）：

```typescript
// 在 src/services/authService.ts 中临时修改
function generateToken(username: string, role: string): string {
  const timestamp = Date.now().toString();
  // 临时回退到简单签名（不安全！）
  const signature = btoa(`${username}:${role}:${timestamp}`).slice(0, 16);
  return `${username}:${role}:${timestamp}:${signature}`;
}
```

**⚠️ 警告**：这只是临时解决方案，完成后必须恢复 HMAC-SHA256 签名！

---

## 📋 检查清单

- [ ] Netlify 环境变量 `JWT_SECRET` 已配置
- [ ] Netlify 环境变量 `REACT_APP_JWT_SECRET` 已配置
- [ ] 两个环境变量的值相同
- [ ] 已重新部署 Netlify 站点
- [ ] 已清除浏览器 Local Storage
- [ ] 浏览器支持 Web Crypto API
- [ ] 使用 HTTPS（生产环境）

---

## 🔍 调试步骤

### 1. 检查浏览器控制台

打开浏览器开发者工具（F12），查看 Console 标签页，查找：
- 错误信息
- 警告信息
- Token 生成相关的日志

### 2. 检查网络请求

1. 打开 **Network** 标签页
2. 尝试登录
3. 查看以下请求：
   - `/.netlify/functions/admin-password`（登录验证）
   - `/.netlify/functions/verify-admin`（Token 验证）

### 3. 检查 Local Storage

1. 打开 **Application** 标签页（Chrome）或 **Storage** 标签页（Firefox）
2. 查看 **Local Storage** → 您的网站域名
3. 检查 `admin_auth_token` 的值
4. 验证 Token 格式：应该是 `username:role:timestamp:signature`（4部分）

---

## 🆘 如果仍然无法解决

1. **收集错误信息**：
   - 浏览器控制台的完整错误信息
   - Network 标签页中的请求和响应
   - Local Storage 中的 Token 值

2. **检查 Netlify 日志**：
   - 登录 Netlify Dashboard
   - 进入 **Functions** → **verify-admin**
   - 查看最近的日志，查找错误信息

3. **联系技术支持**：
   - 提供收集的错误信息
   - 说明已完成的排查步骤

---

## ✅ 验证修复

修复后，验证以下功能：

1. **登录功能**：
   - 输入正确的用户名和密码
   - 点击登录按钮
   - 应该成功跳转到 `/admin/dashboard`

2. **Token 验证**：
   - 登录后刷新页面
   - 应该保持登录状态
   - 不应该被重定向到登录页面

3. **权限检查**：
   - 访问需要特定权限的页面
   - 应该根据角色显示相应内容

---

**最后更新**: 2024年12月

