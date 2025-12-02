# 🔒 Token 签名安全修复指南

## ✅ 已完成的修复

### 1. 客户端 Token 签名（`src/services/authService.ts`）

**修复内容**:
- ✅ 使用 Web Crypto API 实现 HMAC-SHA256 签名
- ✅ 替换不安全的 base64 编码签名
- ✅ 添加签名验证函数

**关键改进**:
```typescript
// ❌ 旧实现（不安全）
const signature = btoa(`${username}:${role}:${timestamp}`).slice(0, 16);

// ✅ 新实现（安全）
const signature = await generateHMACSignature(payload);
// 使用 HMAC-SHA256 生成签名
```

---

### 2. 服务端 Token 签名（`netlify/functions/verify-admin.js`）

**修复内容**:
- ✅ 使用 Node.js crypto 模块实现 HMAC-SHA256 签名
- ✅ 添加签名验证函数
- ✅ 使用时间安全比较方法（防止时序攻击）

**关键改进**:
```javascript
// ❌ 旧实现（不安全）
const signature = Buffer.from(`${username}:${role}:${timestamp}`).toString('base64').slice(0, 16);

// ✅ 新实现（安全）
const signature = generateHMACSignature(payload);
// 使用 HMAC-SHA256 生成签名
```

---

## 🔧 需要配置的环境变量

### 1. Netlify 环境变量

**必须配置**: `JWT_SECRET`

**操作步骤**:
1. 登录 Netlify Dashboard
2. 选择站点：**admin-market-link-express**（或您的后台管理站点）
3. 进入 **Site settings** → **Environment variables**
4. 点击 **Add variable**
5. 添加以下变量：
   - **Key**: `JWT_SECRET`
   - **Value**: `[生成一个强随机密钥，至少 32 字符]`
   - **Scopes**: ✅ Production, ✅ Deploy previews, ✅ Branch deploys
6. 点击 **Save**

**生成强密钥的方法**:
```bash
# 方法 1: 使用 OpenSSL
openssl rand -base64 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法 3: 使用在线工具（不推荐，但可用）
# https://www.random.org/strings/
```

---

### 2. 客户端环境变量（可选）

**如果需要在客户端也使用相同的密钥**（仅用于开发环境）:
- 在 `.env` 文件中添加：`REACT_APP_JWT_SECRET=[您的密钥]`

**⚠️ 注意**: 
- 客户端环境变量会暴露在浏览器中
- 生产环境应该只使用服务端验证
- 客户端验证仅作为额外的安全检查

---

## 🔄 迁移步骤

### 步骤 1: 配置环境变量

1. **生成强密钥**:
   ```bash
   openssl rand -base64 32
   ```

2. **在 Netlify 中配置**:
   - 添加 `JWT_SECRET` 环境变量
   - 值：生成的密钥

3. **（可选）本地开发环境**:
   - 在 `.env` 文件中添加 `REACT_APP_JWT_SECRET`

---

### 步骤 2: 重新部署

**重要**: 配置环境变量后，必须重新部署才能生效！

1. **Netlify 自动部署**:
   - 如果已连接 Git，推送代码后会自动部署
   - 或手动触发：**Deploys** → **Trigger deploy** → **Deploy site**

2. **验证部署**:
   - 检查部署日志，确认环境变量已加载
   - 测试登录功能

---

### 步骤 3: 强制所有用户重新登录

**原因**: 旧的 Token 使用不安全的签名，无法通过新的验证。

**操作**:
1. **清除所有现有 Token**:
   - 用户下次访问时会自动要求重新登录
   - 或发送通知要求用户重新登录

2. **（可选）添加迁移逻辑**:
   ```typescript
   // 在 authService.ts 中添加
   async function migrateOldToken(oldToken: string): Promise<string | null> {
     // 检查是否是旧格式 Token
     const parts = oldToken.split(':');
     if (parts.length === 3) {
       // 旧格式，需要重新生成
       const [username, role] = parts;
       return await generateToken(username, role);
     }
     return null;
   }
   ```

---

## ✅ 验证修复

### 1. 测试 Token 生成

**客户端测试**:
```typescript
import { saveToken } from './services/authService';

// 测试生成 Token
const token = await saveToken('testuser', 'admin', 'Test User');
console.log('生成的 Token:', token);
// 应该看到格式：username:role:timestamp:signature（4部分）
```

**服务端测试**:
```javascript
// 在 verify-admin.js 中测试
const token = generateAdminToken('testuser', 'admin');
console.log('生成的 Token:', token);
// 应该看到格式：username:role:timestamp:signature（4部分）
```

---

### 2. 测试 Token 验证

**测试有效 Token**:
```typescript
import { verifyToken } from './services/authService';

const result = await verifyToken(['admin']);
console.log('验证结果:', result);
// 应该返回 { valid: true, user: {...} }
```

**测试无效 Token**:
```typescript
// 尝试使用旧格式 Token
const oldToken = 'username:role:timestamp'; // 3部分，缺少签名
const result = await verifyToken(['admin']);
console.log('验证结果:', result);
// 应该返回 { valid: false, error: '...' }
```

**测试伪造 Token**:
```typescript
// 尝试伪造签名
const fakeToken = 'admin:admin:1234567890:fake-signature';
const result = await verifyToken(['admin']);
console.log('验证结果:', result);
// 应该返回 { valid: false, error: '令牌签名无效' }
```

---

## 🔍 安全检查清单

### 配置检查
- [ ] `JWT_SECRET` 环境变量已在 Netlify 中配置
- [ ] 密钥长度至少 32 字符
- [ ] 密钥是随机生成的（不是简单字符串）
- [ ] （可选）`REACT_APP_JWT_SECRET` 已在本地 `.env` 中配置

### 代码检查
- [ ] `src/services/authService.ts` 已更新为使用 HMAC-SHA256
- [ ] `netlify/functions/verify-admin.js` 已更新为使用 HMAC-SHA256
- [ ] `src/pages/AdminLogin.tsx` 已更新为使用 `await saveToken()`

### 部署检查
- [ ] 代码已提交到 Git
- [ ] Netlify 已重新部署
- [ ] 部署日志显示环境变量已加载

### 功能测试
- [ ] 可以正常登录
- [ ] Token 格式正确（4部分）
- [ ] 旧 Token 无法通过验证
- [ ] 伪造 Token 无法通过验证
- [ ] Token 过期后无法使用

---

## 🆘 故障排除

### 问题 1: Token 验证总是失败

**可能原因**:
- `JWT_SECRET` 环境变量未配置或值不正确
- 客户端和服务端使用了不同的密钥

**解决方案**:
1. 检查 Netlify 环境变量是否正确配置
2. 确认重新部署后环境变量已加载
3. 检查客户端和服务端是否使用相同的密钥

---

### 问题 2: 浏览器不支持 Web Crypto API

**可能原因**:
- 旧版浏览器不支持 Web Crypto API
- 非 HTTPS 环境（Web Crypto API 需要安全上下文）

**解决方案**:
1. 确保使用 HTTPS（生产环境）
2. 对于旧浏览器，可以考虑使用 polyfill（但建议升级浏览器）

---

### 问题 3: 所有用户需要重新登录

**这是正常的**:
- 旧 Token 使用不安全的签名，无法通过新验证
- 用户需要重新登录以获取新 Token

**解决方案**:
- 这是预期的行为，确保安全性
- 可以提前通知用户系统升级，需要重新登录

---

## 📋 安全改进总结

### 修复前
- ❌ Token 签名仅使用 base64 编码
- ❌ 签名可以被轻易伪造
- ❌ 攻击者可以创建有效 Token

### 修复后
- ✅ Token 签名使用 HMAC-SHA256
- ✅ 签名无法被伪造（不知道密钥）
- ✅ 攻击者无法创建有效 Token
- ✅ 使用时间安全比较（防止时序攻击）

---

## 🔗 相关文档

- `SECURITY_AUDIT_REPORT_COMPLETE.md` - 完整安全审计报告
- `SECURITY_HARDENING_GUIDE.md` - 安全加固指南

---

**修复完成时间**: 2024年12月
**下次安全检查**: 建议每季度检查一次 Token 安全性

