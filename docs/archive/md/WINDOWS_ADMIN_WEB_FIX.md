# Windows 电脑 Admin Web 无法打开 - 修复指南

## 🔍 问题分析

从错误信息看，问题是 **HTTP 401 Unauthorized**，发生在 `verify-admin` 函数调用时。

### 可能的原因

1. **Cookie 问题** - Windows 浏览器可能没有正确发送/接收 httpOnly Cookie
2. **CORS 配置** - 跨域请求可能被阻止
3. **JWT_SECRET 环境变量** - 可能没有正确配置
4. **Token 生成/验证** - 客户端和服务端密钥不匹配

---

## ✅ 修复步骤

### 步骤 1: 检查 Netlify 环境变量

1. **登录 Netlify Dashboard**
   - 访问：https://app.netlify.com
   - 选择项目：`market-link-express`（后台管理项目）

2. **检查环境变量**
   - 进入 **Site settings** → **Environment variables**
   - 确认以下变量已配置：
     ```
     REACT_APP_SUPABASE_URL = [您的 Supabase URL]
     REACT_APP_SUPABASE_ANON_KEY = [您的 Supabase Anon Key]
     JWT_SECRET = [您的 JWT 密钥]  ⚠️ 重要！
     ```

3. **如果没有 JWT_SECRET**
   - 点击 **Add variable**
   - Key: `JWT_SECRET`
   - Value: 生成一个随机字符串（至少 32 字符）
   - 示例：`openssl rand -base64 32`

4. **重新部署**
   - 环境变量更改后，需要重新部署
   - 进入 **Deploys** 标签
   - 点击 **Trigger deploy** → **Deploy site**

---

### 步骤 2: 清除浏览器缓存和 Cookie

在 Windows 浏览器中：

1. **Chrome/Edge**
   - 按 `Ctrl + Shift + Delete`
   - 选择 "Cookie 和其他网站数据"
   - 时间范围：全部时间
   - 点击 "清除数据"

2. **Firefox**
   - 按 `Ctrl + Shift + Delete`
   - 选择 "Cookie"
   - 时间范围：全部
   - 点击 "立即清除"

3. **重新访问**
   - 关闭所有浏览器标签页
   - 重新打开浏览器
   - 访问：https://admin-market-link-express.com

---

### 步骤 3: 检查浏览器控制台

1. **打开开发者工具**
   - 按 `F12` 或 `Ctrl + Shift + I`

2. **查看 Console 标签**
   - 检查是否有错误信息
   - 特别注意 Cookie 相关的错误

3. **查看 Network 标签**
   - 刷新页面
   - 找到 `verify-admin` 请求
   - 检查请求头（Headers）
   - 检查响应（Response）

---

### 步骤 4: 检查 Cookie 设置

在浏览器控制台中执行：

```javascript
// 检查 Cookie 是否被设置
console.log('Cookies:', document.cookie);

// 检查是否有 admin_auth_token
const cookies = document.cookie.split(';');
const adminToken = cookies.find(c => c.trim().startsWith('admin_auth_token='));
console.log('Admin Token Cookie:', adminToken);
```

**注意**：`admin_auth_token` 是 httpOnly Cookie，JavaScript 无法读取。这是正常的。

---

### 步骤 5: 测试登录流程

1. **打开登录页面**
   - 访问：https://admin-market-link-express.com/admin/login

2. **输入用户名和密码**
   - 使用有效的管理员账号

3. **查看 Network 请求**
   - 打开开发者工具 → Network 标签
   - 点击登录按钮
   - 检查以下请求：
     - `admin-password` - 应该返回 200
     - `verify-admin` - 应该返回 200（不是 401）

---

## 🔧 常见问题排查

### 问题 1: Cookie 没有被设置

**症状**：登录后立即返回登录页面

**原因**：
- Cookie 的 `SameSite` 设置可能有问题
- 域名配置不正确

**解决**：
1. 检查 Netlify 域名配置
2. 确认 `admin-market-link-express.com` 已正确配置
3. 检查 `netlify/functions/admin-password.js` 中的 Cookie 设置

### 问题 2: JWT_SECRET 不匹配

**症状**：401 错误，提示 "令牌签名无效"

**原因**：
- 客户端和服务端使用了不同的 JWT_SECRET

**解决**：
1. 确认 Netlify 环境变量中 `JWT_SECRET` 已设置
2. 确认客户端代码使用 `REACT_APP_JWT_SECRET`（如果设置了）
3. 重新部署应用

### 问题 3: CORS 错误

**症状**：控制台显示 CORS 相关错误

**原因**：
- CORS 配置不允许当前域名

**解决**：
1. 检查 `netlify/functions/utils/cors.js`
2. 确认 `ALLOWED_ORIGINS` 环境变量包含 `admin-market-link-express.com`
3. 或者检查默认配置

---

## 🧪 调试步骤

### 步骤 1: 检查环境变量

在 Netlify Function 中添加日志（临时调试）：

```javascript
// 在 verify-admin.js 中添加
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
```

### 步骤 2: 检查 Cookie 设置

在 `admin-password.js` 中确认 Cookie 设置：

```javascript
const cookieOptions = [
  `admin_auth_token=${token}`,
  `Max-Age=${cookieMaxAge}`,
  'Path=/',
  'HttpOnly',
  'SameSite=Strict',
  'Secure' // 如果使用 HTTPS
].filter(Boolean).join('; ');
```

### 步骤 3: 测试 Token 生成

在浏览器控制台测试（仅用于调试）：

```javascript
// 测试 Token 验证
fetch('/.netlify/functions/verify-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // 重要！
  body: JSON.stringify({ action: 'verify' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## 📋 检查清单

- [ ] Netlify 环境变量已配置（特别是 `JWT_SECRET`）
- [ ] 已重新部署应用
- [ ] 浏览器缓存和 Cookie 已清除
- [ ] 域名 `admin-market-link-express.com` 已正确配置
- [ ] 使用 HTTPS 访问（不是 HTTP）
- [ ] 浏览器控制台没有其他错误
- [ ] Network 请求显示正确的状态码

---

## 🆘 如果问题仍然存在

### 临时解决方案：使用默认域名

在域名配置完成之前，可以使用 Netlify 默认域名：

- **后台管理**: https://market-link-express.netlify.app/admin/login

### 联系支持

如果以上步骤都无法解决问题，请提供以下信息：

1. 浏览器类型和版本
2. 完整的错误信息（从控制台复制）
3. Network 请求的详细信息
4. Netlify 部署日志

---

## 🔗 相关文件

- `netlify/functions/verify-admin.js` - Token 验证函数
- `netlify/functions/admin-password.js` - 登录函数
- `netlify/functions/utils/cors.js` - CORS 配置
- `src/services/authService.ts` - 客户端认证服务

---

**最后更新**: 2024年12月

