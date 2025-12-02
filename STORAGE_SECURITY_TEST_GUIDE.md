# 🔒 敏感数据存储安全测试指南

## ✅ 控制台错误说明

您看到的 `ReferenceError: Can't find variable: data` 是**正常的**！

这是因为您在控制台中直接执行了示例代码，但 `data` 变量未定义。示例代码只是为了说明如何使用，不是可以直接执行的代码。

---

## 🧪 正确的测试方法

### 方法 1: 测试登录流程（推荐）

1. **清除旧的 localStorage 数据**（在控制台执行）:
```javascript
localStorage.removeItem('admin_auth_token');
localStorage.removeItem('currentUser');
localStorage.removeItem('currentUserName');
localStorage.removeItem('currentUserRole');
```

2. **访问登录页面**:
   - 打开 `/admin/login`
   - 输入用户名和密码
   - 点击登录

3. **检查 Cookie**:
   - 打开 DevTools → **Application** → **Cookies**
   - 查找 `admin_auth_token` Cookie
   - 验证属性：
     - ✅ **HttpOnly**: 已勾选
     - ✅ **Secure**: 已勾选（如果使用 HTTPS）
     - ✅ **SameSite**: Strict

---

### 方法 2: 测试 Token 验证（在控制台）

**正确的测试代码**:
```javascript
// 测试 Token 验证（会自动使用 Cookie）
fetch('/.netlify/functions/verify-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // 重要：包含 Cookie
  body: JSON.stringify({
    action: 'verify',
    requiredRoles: []
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**预期结果**:
- ✅ 如果已登录：返回 `{ valid: true, user: {...} }`
- ❌ 如果未登录：返回 `{ valid: false, error: '...' }`

---

### 方法 3: 测试登出功能

```javascript
// 测试登出（清除 Cookie）
fetch('/.netlify/functions/verify-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    action: 'logout'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**预期结果**:
- ✅ 返回 `{ success: true, message: '已登出' }`
- ✅ Cookie 被清除（检查 Application → Cookies）

---

## 🔍 验证 Cookie 安全

### 1. 检查 Cookie 是否无法通过 JavaScript 访问

**在控制台执行**:
```javascript
// 应该返回空字符串或 undefined（无法访问 httpOnly Cookie）
document.cookie;

// 应该返回 null（无法从 localStorage 读取）
localStorage.getItem('admin_auth_token');
```

**预期结果**: 
- ✅ `document.cookie` 不包含 `admin_auth_token`
- ✅ `localStorage.getItem('admin_auth_token')` 返回 `null`

---

### 2. 检查 Cookie 属性

**在 DevTools 中**:
1. **Application** → **Cookies** → 您的域名
2. 查找 `admin_auth_token`
3. 检查以下属性：

| 属性 | 值 | 说明 |
|------|-----|------|
| **Name** | `admin_auth_token` | Cookie 名称 |
| **Value** | `username:role:timestamp:signature` | Token 值 |
| **Domain** | 您的域名 | Cookie 域名 |
| **Path** | `/` | Cookie 路径 |
| **Expires** | 2小时后 | 过期时间 |
| **HttpOnly** | ✅ | **防止 JavaScript 访问** |
| **Secure** | ✅ | **仅 HTTPS**（生产环境） |
| **SameSite** | `Strict` | **防止 CSRF** |

---

## 📋 完整测试流程

### 步骤 1: 清除旧数据

```javascript
// 在控制台执行
localStorage.clear();
sessionStorage.clear();
// 手动清除 Cookie（如果需要）
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

---

### 步骤 2: 登录测试

1. 访问 `/admin/login`
2. 输入用户名和密码
3. 点击登录
4. 检查：
   - ✅ 是否成功跳转到 `/admin/dashboard`
   - ✅ Cookie 是否已设置
   - ✅ Cookie 是否标记为 HttpOnly

---

### 步骤 3: 访问受保护页面

1. 访问 `/admin/dashboard` 或其他受保护页面
2. 检查：
   - ✅ 是否可以直接访问（不需要重新登录）
   - ✅ 页面是否正常加载

---

### 步骤 4: 登出测试

1. 点击登出按钮
2. 检查：
   - ✅ 是否跳转到登录页面
   - ✅ Cookie 是否被清除
   - ✅ 再次访问受保护页面是否被重定向到登录页

---

## 🆘 常见问题

### Q1: Cookie 未设置

**可能原因**:
- 登录 API 调用失败
- Cookie 设置代码未执行
- 域名不匹配

**检查方法**:
1. 打开 **Network** 标签页
2. 找到 `admin-password` 请求
3. 查看响应头，应该有 `Set-Cookie` 头

---

### Q2: Cookie 设置了但验证失败

**可能原因**:
- Cookie 未包含在请求中
- `credentials: 'include'` 未设置
- CORS 配置问题

**检查方法**:
1. 打开 **Network** 标签页
2. 找到 `verify-admin` 请求
3. 查看请求头，应该有 `Cookie` 头
4. 检查请求是否包含 `credentials: 'include'`

---

### Q3: 仍然可以从 localStorage 读取 Token

**这是正常的**:
- 旧的 Token 可能还在 localStorage 中
- 但新的登录流程不再使用 localStorage
- 清除 localStorage 后重新登录即可

---

## ✅ 验证清单

- [ ] 已清除旧的 localStorage 数据
- [ ] 登录后 Cookie 已设置
- [ ] Cookie 标记为 HttpOnly
- [ ] Cookie 标记为 Secure（生产环境）
- [ ] 无法通过 `document.cookie` 访问 Token
- [ ] 无法通过 `localStorage` 访问 Token
- [ ] 访问受保护页面正常工作
- [ ] 登出后 Cookie 被清除

---

**总结**: 控制台中的错误是正常的，因为那只是示例代码。实际代码已经正确配置，请按照上述方法测试实际功能。

