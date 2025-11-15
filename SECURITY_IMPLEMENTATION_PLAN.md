# 🔒 安全加固实施计划

## ✅ 已完成的安全措施

1. **ProtectedRoute 服务端验证** ✅
   - 已使用 `verifyToken()` 调用服务端验证
   - 不再仅依赖 localStorage

2. **Token 机制** ✅
   - 已实现 Token 生成和验证
   - 已集成到登录流程

3. **路由保护** ✅
   - 所有后台路由都使用 ProtectedRoute
   - 按角色设置权限要求

---

## 🚨 当前仍存在的风险

### 高风险（需要立即处理）

1. **API 密钥暴露**
   - 位置：`src/services/supabase.ts`
   - 风险：代码泄露会导致数据库被直接访问
   - **解决方案**：使用环境变量

2. **密码明文存储**
   - 位置：`admin_accounts` 表
   - 风险：数据库泄露会导致所有密码暴露
   - **解决方案**：使用 bcrypt 加密

3. **登录失败无限制**
   - 风险：暴力破解攻击
   - **解决方案**：添加登录失败限制

---

## 📋 实施步骤

### 步骤 1：环境变量管理（立即实施）

#### 1.1 在 Netlify 配置环境变量

1. 登录 Netlify Dashboard
2. 进入你的项目：`market-link-express`
3. 点击 **Site settings** → **Environment variables**
4. 添加以下变量：

```
REACT_APP_SUPABASE_URL = https://uopkyuluxnrewvlmutam.supabase.co
REACT_APP_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL = https://uopkyuluxnrewvlmutam.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 1.2 更新代码使用环境变量

已更新 `supabase.ts` 使用环境变量，但需要确保：
- 代码中不再硬编码密钥
- 所有密钥都从环境变量读取

---

### 步骤 2：密码加密（本周实施）

#### 2.1 创建密码加密 Netlify Function

创建 `netlify/functions/admin-password.js`：
- 处理密码加密
- 验证加密密码

#### 2.2 更新登录逻辑

- 登录时验证加密密码
- 不再直接比较明文

#### 2.3 迁移现有密码

- 创建迁移脚本
- 将所有现有密码加密

---

### 步骤 3：登录失败限制（本周实施）

#### 3.1 创建登录失败记录表

在 Supabase 创建表：
```sql
CREATE TABLE admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2 更新登录逻辑

- 记录每次登录尝试
- 检查失败次数
- 5 次失败后锁定 30 分钟

---

### 步骤 4：增强 Token 安全性（下周实施）

#### 4.1 使用真正的 JWT

- 集成 `jsonwebtoken` 库
- 使用服务端密钥签名
- 添加更多安全字段

#### 4.2 Token 刷新机制

- 实现自动刷新
- 用户无感知续期

---

## 🎯 优先级排序

### 🔥 今天必须完成

1. ✅ 确认 ProtectedRoute 使用服务端验证（已完成）
2. ✅ 确认 AdminLogin 使用 Token（已完成）
3. ⚠️ **配置 Netlify 环境变量**（需要你手动操作）

### ⚡ 本周完成

4. 密码加密存储
5. 登录失败限制

### 📅 下周完成

6. 真正的 JWT 实现
7. Token 自动刷新

---

## 📝 检查清单

### 环境变量
- [ ] 在 Netlify 配置了环境变量
- [ ] 代码中移除了硬编码密钥
- [ ] 测试环境变量是否正确加载

### 密码安全
- [ ] 创建了密码加密 Function
- [ ] 更新了登录逻辑
- [ ] 迁移了现有密码

### 登录安全
- [ ] 创建了登录失败记录表
- [ ] 实现了失败次数限制
- [ ] 添加了 IP 地址记录

### Token 安全
- [ ] 实现了 JWT
- [ ] 添加了 Token 刷新
- [ ] 增强了签名安全性

---

## 🚀 快速开始

### 立即行动（5分钟）

1. **配置 Netlify 环境变量**
   - 登录 Netlify Dashboard
   - 添加环境变量（见步骤 1.1）
   - 重新部署

2. **验证环境变量**
   - 检查代码是否使用环境变量
   - 测试应用是否正常运行

### 本周行动（2-3小时）

3. **实施密码加密**
   - 创建加密 Function
   - 更新登录逻辑
   - 迁移现有密码

4. **添加登录失败限制**
   - 创建记录表
   - 更新登录逻辑
   - 测试失败限制

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 Netlify Function 日志
2. 检查浏览器控制台
3. 验证环境变量设置
4. 测试 Token 验证流程

