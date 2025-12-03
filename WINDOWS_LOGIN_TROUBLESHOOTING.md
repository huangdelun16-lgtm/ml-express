# Windows Admin Web 登录问题 - 详细排查指南

## 🔍 当前问题

从网络请求日志可以看到：
- ✅ `admin-password` 请求返回 200（登录成功）
- ❌ `verify-admin` 请求返回 401（认证失败）

这说明：
1. 登录功能正常
2. Cookie 可能没有正确设置或发送
3. Token 验证失败

---

## 🔧 逐步排查

### 步骤 1: 检查 Cookie 是否被设置

1. **打开浏览器开发者工具**
   - 按 `F12` 或 `Ctrl + Shift + I`

2. **查看 Network 标签**
   - 刷新页面
   - 找到 `admin-password` 请求（应该返回 200）
   - 点击该请求
   - 查看 **Response Headers**
   - 查找 `Set-Cookie` 头

3. **检查 Cookie 内容**
   - 在 **Application** 标签（Chrome）或 **Storage** 标签（Firefox）
   - 左侧菜单找到 **Cookies**
   - 展开 `https://admin-market-link-express.com`
   - 查找 `admin_auth_token`
   - 确认是否存在

**如果没有 `admin_auth_token` Cookie**：
- Cookie 没有被设置
- 检查 `admin-password` 函数的响应头
- 检查浏览器是否阻止了 Cookie

### 步骤 2: 检查 Cookie 是否被发送

1. **查看 `verify-admin` 请求**
   - 在 Network 标签中找到 `verify-admin` 请求（401 错误）
   - 点击该请求
   - 查看 **Request Headers**
   - 查找 `Cookie` 头

2. **检查 Cookie 值**
   - `Cookie` 头应该包含 `admin_auth_token=...`
   - 如果没有，说明 Cookie 没有被发送

**如果 Cookie 没有被发送**：
- 检查 `credentials: 'include'` 是否设置
- 检查 CORS 配置
- 检查 SameSite 设置

### 步骤 3: 检查 JWT_SECRET 环境变量

这是最常见的问题！

1. **检查 Netlify 函数日志**
   - 登录 Netlify Dashboard
   - 进入项目 → **Functions** 标签
   - 点击 `verify-admin` 函数
   - 查看 **Logs** 标签
   - 查找 "使用默认 JWT_SECRET" 警告

2. **如果看到警告**
   - 说明 `JWT_SECRET` 环境变量未设置
   - 需要立即设置（见下面的步骤）

---

## ✅ 修复步骤

### 修复 1: 设置 JWT_SECRET 环境变量

1. **登录 Netlify Dashboard**
   ```
   https://app.netlify.com
   ```

2. **找到项目**
   - 在项目列表中查找您的项目
   - 如果找不到，尝试：
     - 查看所有项目
     - 搜索 "market" 或 "express"
     - 检查是否有多个账户

3. **进入环境变量设置**
   - 点击项目名称
   - 左侧菜单 → **Site settings**
   - 点击 **Environment variables**

4. **添加 JWT_SECRET**
   - 点击 **Add variable**
   - Key: `JWT_SECRET`
   - Value: 生成一个随机字符串
   
   **生成密钥的方法**：
   ```bash
   # 方法 1: 使用 OpenSSL
   openssl rand -base64 32
   
   # 方法 2: 使用 Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   
   # 方法 3: 在线工具
   # 访问 https://www.random.org/strings/
   # 生成 32 字符的随机字符串
   ```

5. **保存并重新部署**
   - 点击 **Save**
   - 进入 **Deploys** 标签
   - 点击 **Trigger deploy** → **Deploy site**
   - 等待部署完成（2-3 分钟）

### 修复 2: 清除浏览器数据

1. **清除所有 Cookie**
   - 按 `Ctrl + Shift + Delete`
   - 选择 "Cookie 和其他网站数据"
   - 时间范围：全部时间
   - 点击 "清除数据"

2. **清除缓存**
   - 同样在清除数据对话框中
   - 选择 "缓存的图片和文件"
   - 点击 "清除数据"

3. **关闭所有标签页**
   - 完全关闭浏览器
   - 重新打开

### 修复 3: 检查 CORS 配置

确认 `netlify/functions/utils/cors.js` 中包含：
```javascript
'https://admin-market-link-express.com'
```

如果代码已更新但未部署，需要重新部署。

---

## 🧪 测试步骤

### 测试 1: 检查登录流程

1. **打开开发者工具**
   - 按 `F12`

2. **清除所有请求**
   - 在 Network 标签中点击清除按钮

3. **尝试登录**
   - 输入用户名和密码
   - 点击登录按钮

4. **检查请求顺序**
   - 应该看到：
     1. `admin-password` → 200 ✅
     2. `verify-admin` → 200 ✅（不是 401）

### 测试 2: 检查 Cookie

1. **登录后**
   - 在 **Application** 标签（Chrome）
   - 左侧 → **Cookies** → `https://admin-market-link-express.com`
   - 应该看到 `admin_auth_token`

2. **检查 Cookie 属性**
   - `HttpOnly`: ✅
   - `Secure`: ✅（如果使用 HTTPS）
   - `SameSite`: `None` 或 `Lax`
   - `Path`: `/`

### 测试 3: 手动测试 Token 验证

在浏览器控制台执行（仅用于调试）：

```javascript
// 测试 Cookie 是否存在（httpOnly Cookie 无法通过 JS 读取，这是正常的）
console.log('Cookies:', document.cookie);

// 测试验证请求
fetch('/.netlify/functions/verify-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ action: 'verify' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## 🆘 如果仍然无法登录

### 检查清单

- [ ] `JWT_SECRET` 环境变量已设置
- [ ] 已重新部署应用
- [ ] 浏览器缓存和 Cookie 已清除
- [ ] 使用 HTTPS 访问（不是 HTTP）
- [ ] CORS 配置包含自定义域名
- [ ] 浏览器控制台没有其他错误

### 获取更多信息

1. **查看 Netlify 函数日志**
   - 登录 Netlify Dashboard
   - 项目 → **Functions** → `verify-admin` → **Logs**
   - 复制错误信息

2. **查看浏览器控制台**
   - 按 `F12`
   - **Console** 标签
   - 复制所有错误信息

3. **查看网络请求详情**
   - **Network** 标签
   - 找到 `verify-admin` 请求（401）
   - 查看 **Headers**、**Request**、**Response** 标签
   - 截图或复制信息

---

## 📞 需要帮助？

如果以上步骤都无法解决问题，请提供：

1. Netlify 函数日志（`verify-admin` 和 `admin-password`）
2. 浏览器控制台错误信息
3. Network 请求详情（特别是 `verify-admin` 的 Request 和 Response）
4. Cookie 设置情况（Application 标签截图）

---

**最后更新**: 2024年12月

