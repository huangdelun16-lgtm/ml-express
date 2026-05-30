# 🔒 敏感数据存储安全修复指南

## ✅ 已完成的修复

### 1. 迁移到 httpOnly Cookie

**问题**:
- ❌ 使用 localStorage 存储 Token（容易被 XSS 攻击窃取）
- ❌ JavaScript 可以直接访问 Token
- ❌ 没有 httpOnly 保护

**解决方案**:
- ✅ Token 现在通过 httpOnly Cookie 存储
- ✅ JavaScript 无法访问 httpOnly Cookie
- ✅ 自动防止 XSS 攻击窃取 Token

---

### 2. 修改的文件

#### 客户端 (`src/services/authService.ts`)
- ✅ `saveToken()` - 不再使用 localStorage，由服务器设置 Cookie
- ✅ `getToken()` - 返回 null（httpOnly Cookie 无法读取）
- ✅ `clearToken()` - 调用服务器 API 清除 Cookie
- ✅ `verifyToken()` - 使用 `credentials: 'include'` 自动发送 Cookie
- ✅ `isAuthenticated()` - 改为异步，通过 API 验证
- ✅ `getCurrentUser()` - 从 sessionStorage 读取非敏感信息

#### 服务端 (`netlify/functions/admin-password.js`)
- ✅ 登录成功后设置 httpOnly Cookie
- ✅ 设置安全标志：HttpOnly, SameSite=Strict, Secure（生产环境）

#### 服务端 (`netlify/functions/verify-admin.js`)
- ✅ 从 Cookie 读取 Token（优先）
- ✅ 添加 logout 操作清除 Cookie
- ✅ 验证失败时清除 Cookie

---

## 🔧 Cookie 安全配置

### Cookie 属性说明

```javascript
Set-Cookie: admin_auth_token=<token>; 
            Max-Age=7200;           // 2小时过期
            Path=/;                  // 所有路径
            HttpOnly;                // 防止 JavaScript 访问
            SameSite=Strict;         // 防止 CSRF
            Secure                   // 仅 HTTPS（生产环境）
```

**安全标志**:
- **HttpOnly**: JavaScript 无法访问，防止 XSS 攻击
- **SameSite=Strict**: 防止 CSRF 攻击
- **Secure**: 仅通过 HTTPS 传输（生产环境）

---

## 📋 迁移步骤

### 步骤 1: 清除旧的 localStorage 数据

**在浏览器控制台执行**:
```javascript
// 清除旧的 Token 数据
localStorage.removeItem('admin_auth_token');
localStorage.removeItem('currentUser');
localStorage.removeItem('currentUserName');
localStorage.removeItem('currentUserRole');
```

**或通过代码自动迁移**:
```typescript
// 在应用启动时执行一次
function migrateFromLocalStorage() {
  try {
    const oldToken = localStorage.getItem('admin_auth_token');
    if (oldToken) {
      // 清除旧数据
      localStorage.removeItem('admin_auth_token');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentUserName');
      localStorage.removeItem('currentUserRole');
      
      // 提示用户重新登录
      alert('安全更新：请重新登录');
      window.location.href = '/admin/login';
    }
  } catch (error) {
    logger.error('迁移失败:', error);
  }
}
```

---

### 步骤 2: 更新所有 API 调用

**重要**: 所有需要认证的 API 调用必须包含 `credentials: 'include'`

```typescript
// ❌ 旧代码
fetch('/api/protected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// ✅ 新代码
fetch('/api/protected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // 重要：包含 Cookie
  body: JSON.stringify(data)
});
```

---

### 步骤 3: 测试登录流程

1. **清除所有 Cookie 和 localStorage**
2. **访问登录页面**
3. **输入用户名和密码登录**
4. **检查浏览器 DevTools → Application → Cookies**
   - 应该看到 `admin_auth_token` Cookie
   - 应该标记为 `HttpOnly`
   - 应该标记为 `Secure`（如果使用 HTTPS）

---

## 🔍 验证修复

### 1. 检查 Cookie 设置

**在浏览器 DevTools 中**:
1. 打开 **Application** 标签页（Chrome）或 **Storage** 标签页（Firefox）
2. 点击 **Cookies** → 您的网站域名
3. 查找 `admin_auth_token` Cookie
4. 验证以下属性：
   - ✅ **HttpOnly**: 已勾选
   - ✅ **Secure**: 已勾选（生产环境）
   - ✅ **SameSite**: Strict
   - ✅ **Expires**: 2小时后

---

### 2. 测试 XSS 防护

**尝试在控制台执行**:
```javascript
// 应该返回 null（无法访问 httpOnly Cookie）
document.cookie;

// 应该返回空字符串或 undefined
localStorage.getItem('admin_auth_token');
```

**预期结果**: 无法通过 JavaScript 访问 Token

---

### 3. 测试认证流程

1. **登录**:
   - 输入用户名和密码
   - 点击登录
   - 应该成功跳转到后台

2. **访问受保护页面**:
   - 应该可以正常访问
   - 不需要手动传递 Token

3. **登出**:
   - 点击登出
   - Cookie 应该被清除
   - 应该跳转到登录页面

---

## 🆘 故障排除

### 问题 1: Cookie 未设置

**可能原因**:
- 域名不匹配
- 路径不正确
- HTTPS 未启用（Secure 标志）

**解决方案**:
1. 检查 Cookie 的域名和路径设置
2. 确保生产环境使用 HTTPS
3. 检查 Netlify Functions 的响应头

---

### 问题 2: 认证失败

**可能原因**:
- Cookie 未包含在请求中
- `credentials: 'include'` 未设置

**解决方案**:
1. 确保所有 API 调用包含 `credentials: 'include'`
2. 检查浏览器是否支持 Cookie
3. 检查 CORS 配置（需要允许 credentials）

---

### 问题 3: 旧 Token 仍然有效

**可能原因**:
- localStorage 中仍有旧 Token
- 客户端代码仍在使用旧 Token

**解决方案**:
1. 清除所有 localStorage 数据
2. 确保所有代码已更新
3. 强制用户重新登录

---

## 📊 安全改进对比

### 修复前
- ❌ Token 存储在 localStorage
- ❌ JavaScript 可以直接访问 Token
- ❌ 容易受到 XSS 攻击
- ❌ Token 可能被恶意脚本窃取

### 修复后
- ✅ Token 存储在 httpOnly Cookie
- ✅ JavaScript 无法访问 Token
- ✅ 自动防止 XSS 攻击
- ✅ Token 只能由服务器读取
- ✅ 自动包含在请求中（无需手动传递）

---

## 🔗 相关文档

- `SECURITY_AUDIT_REPORT_COMPLETE.md` - 完整安全审计报告
- `src/services/authService.ts` - 认证服务源码
- `netlify/functions/admin-password.js` - 登录处理函数
- `netlify/functions/verify-admin.js` - Token 验证函数

---

## ✅ 检查清单

- [ ] 已清除旧的 localStorage Token 数据
- [ ] 已更新所有 API 调用包含 `credentials: 'include'`
- [ ] 已测试登录流程
- [ ] 已验证 Cookie 设置正确（HttpOnly, Secure, SameSite）
- [ ] 已测试登出功能
- [ ] 已确认无法通过 JavaScript 访问 Token
- [ ] 已更新 CORS 配置（如果需要）

---

**修复完成时间**: 2024年12月
**下次安全检查**: 建议每季度检查一次 Cookie 安全配置

