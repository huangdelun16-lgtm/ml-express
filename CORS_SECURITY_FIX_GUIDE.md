# 🔒 CORS 安全配置修复指南

## ✅ 已完成的修复

### 1. 创建通用的 CORS 处理工具

**文件**: `netlify/functions/utils/cors.js`

**功能**:
- ✅ 限制允许的来源（不再使用 `*`）
- ✅ 支持环境变量配置
- ✅ 统一的 CORS 处理逻辑
- ✅ 支持预检请求（OPTIONS）

---

### 2. 更新所有 Netlify Functions

**已更新的 Functions**:
- ✅ `netlify/functions/verify-admin.js`
- ✅ `netlify/functions/admin-password.js`
- ✅ `netlify/functions/send-email-code.js`
- ✅ `netlify/functions/verify-email-code.js`
- ✅ `netlify/functions/send-sms.js`
- ✅ `netlify/functions/verify-sms.js`
- ✅ `netlify/functions/send-order-confirmation.js`
- ✅ `ml-express-client-web/netlify/functions/send-email-code.js`
- ✅ `ml-express-client-web/netlify/functions/verify-email-code.js`

**修复内容**:
- ❌ 旧实现：`'Access-Control-Allow-Origin': '*'`（允许所有来源）
- ✅ 新实现：限制为特定域名列表

---

## 🔧 配置允许的来源

### 方法 1: 使用环境变量（推荐）

在 Netlify Dashboard 中配置 `ALLOWED_ORIGINS` 环境变量：

1. 登录 Netlify Dashboard
2. 选择站点（admin 和 client 都需要配置）
3. 进入 **Site settings** → **Environment variables**
4. 添加变量：
   - **Key**: `ALLOWED_ORIGINS`
   - **Value**: `https://admin-market-link-express.netlify.app,https://market-link-express.netlify.app,https://client-ml-express.netlify.app,http://localhost:3000,http://localhost:3001`
   - **Scopes**: ✅ Production, ✅ Deploy previews, ✅ Branch deploys
5. 点击 **Save**

**格式说明**:
- 多个域名用逗号分隔
- 不要有空格（或使用空格后会自动trim）
- 必须包含协议（`http://` 或 `https://`）

---

### 方法 2: 使用默认配置

如果没有配置 `ALLOWED_ORIGINS` 环境变量，将使用以下默认域名：

```javascript
[
  'https://admin-market-link-express.netlify.app',
  'https://market-link-express.netlify.app',
  'https://client-ml-express.netlify.app',
  'http://localhost:3000',      // 本地开发（admin）
  'http://localhost:3001',      // 本地开发（client）
  'http://localhost:8888',      // Netlify Dev
]
```

**⚠️ 注意**: 如果您的实际域名不同，请务必配置 `ALLOWED_ORIGINS` 环境变量！

---

## 📋 需要配置的站点

### 1. Admin Web（后台管理）

**站点**: `admin-market-link-express`（或您的实际站点名）

**需要配置的环境变量**:
- `ALLOWED_ORIGINS` = `https://admin-market-link-express.netlify.app,http://localhost:3000`

---

### 2. Client Web（客户端网站）

**站点**: `client-ml-express`（或您的实际站点名）

**需要配置的环境变量**:
- `ALLOWED_ORIGINS` = `https://client-ml-express.netlify.app,http://localhost:3001`

---

### 3. Main Web（主站点，如果有）

**站点**: `market-link-express`（或您的实际站点名）

**需要配置的环境变量**:
- `ALLOWED_ORIGINS` = `https://market-link-express.netlify.app,http://localhost:3000`

---

## 🔍 验证配置

### 1. 检查环境变量

在 Netlify Dashboard 中确认：
- ✅ `ALLOWED_ORIGINS` 已配置
- ✅ 值包含所有需要的域名
- ✅ 已重新部署站点

---

### 2. 测试 CORS

**测试方法 1: 浏览器控制台**

```javascript
// 在允许的域名上执行
fetch('https://your-site.netlify.app/.netlify/functions/verify-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'verify', token: 'test' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**预期结果**:
- ✅ 如果来源被允许：正常返回响应
- ❌ 如果来源不被允许：CORS 错误

---

**测试方法 2: 使用 curl**

```bash
# 测试允许的来源
curl -X POST https://your-site.netlify.app/.netlify/functions/verify-admin \
  -H "Origin: https://admin-market-link-express.netlify.app" \
  -H "Content-Type: application/json" \
  -d '{"action":"verify","token":"test"}' \
  -v

# 检查响应头中是否有 Access-Control-Allow-Origin
```

---

## 🛠️ 故障排除

### 问题 1: CORS 错误仍然出现

**可能原因**:
- 环境变量未配置
- 域名不匹配
- 未重新部署

**解决方案**:
1. 检查 Netlify Dashboard 中的环境变量
2. 确认域名完全匹配（包括协议和端口）
3. 重新部署站点

---

### 问题 2: 本地开发无法访问

**可能原因**:
- `localhost` 端口不在允许列表中
- 使用了不同的端口

**解决方案**:
1. 在 `ALLOWED_ORIGINS` 中添加您的本地端口
2. 或修改 `netlify/functions/utils/cors.js` 中的默认列表

---

### 问题 3: 预检请求失败

**可能原因**:
- OPTIONS 请求处理不正确
- 缺少必要的 CORS 头

**解决方案**:
- 确保所有 Functions 都使用了 `handleCorsPreflight` 函数
- 检查响应头是否包含所有必要的 CORS 头

---

## 📊 安全改进对比

### 修复前
- ❌ 允许所有来源（`*`）
- ❌ 任何网站都可以调用 API
- ❌ 容易受到 CSRF 攻击

### 修复后
- ✅ 只允许特定域名
- ✅ 防止未授权访问
- ✅ 降低 CSRF 攻击风险
- ✅ 支持环境变量配置
- ✅ 统一的 CORS 处理逻辑

---

## 🔗 相关文档

- `SECURITY_AUDIT_REPORT_COMPLETE.md` - 完整安全审计报告
- `TOKEN_SECURITY_FIX_GUIDE.md` - Token 签名安全修复指南

---

## ✅ 检查清单

- [ ] `ALLOWED_ORIGINS` 环境变量已在所有站点中配置
- [ ] 环境变量值包含所有需要的域名
- [ ] 已重新部署所有站点
- [ ] 测试了 CORS 功能（允许的域名可以访问）
- [ ] 测试了 CORS 限制（不允许的域名被拒绝）
- [ ] 本地开发环境可以正常访问

---

**修复完成时间**: 2024年12月
**下次安全检查**: 建议每季度检查一次 CORS 配置

