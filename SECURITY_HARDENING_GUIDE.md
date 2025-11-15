# 🔒 后台管理安全加固指南

## ⚠️ 当前安全风险

### 🔴 高风险问题

1. **客户端权限验证可被绕过**
   - 当前：`ProtectedRoute` 只检查 `localStorage`
   - 风险：用户可以手动修改 `localStorage` 伪造登录状态

2. **API 密钥暴露在前端代码**
   - 当前：Supabase 密钥硬编码在 `supabase.ts`
   - 风险：代码泄露会导致数据库被直接访问

3. **密码明文存储**
   - 当前：密码直接存储在数据库中
   - 风险：数据库泄露会导致所有密码暴露

4. **没有服务端验证**
   - 当前：虽然有 `verify-admin.js`，但 `ProtectedRoute` 没有完全使用
   - 风险：可以绕过前端直接调用 API

5. **Token 签名过于简单**
   - 当前：Token 签名只是 base64 编码
   - 风险：容易被伪造

---

## 🛡️ 安全加固方案（分阶段实施）

### 阶段一：立即实施（今天完成）✅

#### 1. 更新 ProtectedRoute 使用服务端验证

**目标**：所有路由保护都通过服务端验证

**步骤**：
- 修改 `ProtectedRoute.tsx` 使用 `authService.verifyToken()`
- 移除仅依赖 `localStorage` 的检查

#### 2. 更新 AdminLogin 使用 authService

**目标**：登录流程使用 Token 机制

**步骤**：
- 登录成功后调用 `authService.saveToken()`
- 移除直接设置 `localStorage` 的代码

#### 3. 环境变量管理

**目标**：将敏感信息移到环境变量

**步骤**：
- 在 Netlify 设置中添加环境变量
- 更新代码使用环境变量

---

### 阶段二：短期改进（本周完成）📅

#### 1. 密码加密存储

**目标**：密码使用 bcrypt 加密

**步骤**：
- 创建 Netlify Function 处理密码加密
- 更新登录逻辑验证加密密码
- 迁移现有密码到加密格式

#### 2. 登录失败限制

**目标**：防止暴力破解

**步骤**：
- 记录登录失败次数
- 5 次失败后锁定账户 30 分钟
- 记录 IP 地址

#### 3. Token 刷新机制

**目标**：自动刷新过期 Token

**步骤**：
- 实现 Token 自动刷新
- 用户无感知续期

---

### 阶段三：长期优化（下个月）🚀

#### 1. 使用真正的 JWT

**目标**：使用标准 JWT 库

**步骤**：
- 集成 `jsonwebtoken` 或 `jose`
- 使用服务端密钥签名

#### 2. API 网关模式

**目标**：所有后台 API 通过网关

**步骤**：
- 创建统一的 API 网关 Function
- 所有请求先验证权限

#### 3. 审计日志增强

**目标**：记录所有敏感操作

**步骤**：
- 记录 IP 地址
- 记录操作时间
- 记录操作详情

#### 4. 双因素认证（可选）

**目标**：增强登录安全

**步骤**：
- 集成 Google Authenticator
- 或使用短信验证码

---

## 📋 实施优先级

### 🔥 必须立即实施（今天）

1. ✅ 更新 `ProtectedRoute` 使用服务端验证
2. ✅ 更新 `AdminLogin` 使用 `authService`
3. ✅ 配置 Netlify 环境变量

### ⚡ 尽快实施（本周）

4. 密码加密存储
5. 登录失败限制
6. Token 自动刷新

### 📅 计划实施（下个月）

7. 真正的 JWT 实现
8. API 网关模式
9. 审计日志增强

---

## 🔧 技术实施细节

### 1. ProtectedRoute 服务端验证

```typescript
// 使用 authService.verifyToken() 而不是只检查 localStorage
const result = await verifyToken(requiredRoles);
if (!result.valid) {
  return <Navigate to="/admin/login" />;
}
```

### 2. 环境变量配置

在 Netlify Dashboard：
- Site settings → Environment variables
- 添加：
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (仅服务端使用)

### 3. 密码加密

使用 bcrypt：
```javascript
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashedPassword);
```

---

## ✅ 检查清单

- [ ] ProtectedRoute 使用服务端验证
- [ ] AdminLogin 使用 authService
- [ ] 环境变量已配置
- [ ] 密码加密已实施
- [ ] 登录失败限制已添加
- [ ] Token 自动刷新已实现
- [ ] 审计日志已增强
- [ ] 所有敏感操作已记录

---

## 🚨 紧急情况处理

如果发现安全漏洞：

1. **立即更改所有管理员密码**
2. **检查审计日志**，查看是否有异常访问
3. **撤销所有 Token**（清空数据库中的 session）
4. **更新 API 密钥**（如果可能）
5. **通知所有管理员**更改密码

---

## 📞 需要帮助？

如果实施过程中遇到问题，请：
1. 查看 Netlify Function 日志
2. 检查浏览器控制台错误
3. 验证环境变量是否正确设置
4. 测试 Token 验证流程

