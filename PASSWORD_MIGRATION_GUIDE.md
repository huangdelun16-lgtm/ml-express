# 🔒 密码强制迁移指南

## ✅ 已完成的修复

### 1. 移除向后兼容逻辑

**文件**: `netlify/functions/admin-password.js`

**修复内容**:
- ✅ 移除了明文密码的向后兼容逻辑
- ✅ 拒绝验证明文密码
- ✅ 要求使用明文密码的用户重置密码

**关键改进**:
```javascript
// ❌ 旧实现（不安全）
if (!hashedPassword.startsWith('$2a$')) {
  return password === hashedPassword; // 明文比较
}

// ✅ 新实现（安全）
if (!isPasswordHashed) {
  return {
    valid: false,
    needsMigration: true,
    error: '密码格式已过期，请重置密码'
  };
}
```

---

### 2. 创建强制迁移脚本

**文件**: `scripts/force-migrate-passwords.js`

**功能**:
- ✅ 扫描所有账号的密码状态
- ✅ 识别明文密码账号
- ✅ 提供两种迁移方式：
  1. 设置为临时密码（用户首次登录后修改）
  2. 清空密码（强制用户重置）

---

## 🚨 重要：立即执行迁移

### 步骤 1: 检查密码状态

在 Supabase SQL Editor 中运行：

```sql
-- 检查所有账号的密码状态
SELECT 
  id,
  username,
  employee_name,
  CASE 
    WHEN password IS NULL OR password = '' THEN '无密码'
    WHEN password LIKE '$2a$%' OR password LIKE '$2b$%' OR password LIKE '$2y$%' THEN '已加密'
    ELSE '明文密码'
  END as password_status,
  status
FROM admin_accounts
ORDER BY 
  CASE 
    WHEN password IS NULL OR password = '' THEN 1
    WHEN password LIKE '$2a$%' OR password LIKE '$2b$%' OR password LIKE '$2y$%' THEN 3
    ELSE 2
  END;
```

---

### 步骤 2: 选择迁移方式

#### 方式 A: 使用强制迁移脚本（推荐）

**前提条件**:
1. 配置环境变量：
   ```bash
   export REACT_APP_SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE="your-service-role-key"
   ```

2. 运行脚本：
   ```bash
   node scripts/force-migrate-passwords.js
   ```

**脚本功能**:
- 自动扫描所有账号
- 显示密码状态统计
- 提供交互式迁移选项
- 记录迁移结果

---

#### 方式 B: 手动迁移（通过 Web 后台）

1. 登录 Web 后台
2. 进入"账号管理"
3. 找到使用明文密码的账号
4. 点击"编辑"
5. 设置新密码（会自动加密）
6. 保存

**⚠️ 注意**: 需要知道每个账号的当前密码才能设置新密码。

---

#### 方式 C: 批量重置密码（SQL）

**⚠️ 警告**: 此方法会清空所有明文密码，用户需要通过"忘记密码"功能重置。

```sql
-- 清空所有明文密码（需要用户重置）
UPDATE admin_accounts
SET password = NULL
WHERE password IS NOT NULL
  AND password != ''
  AND password NOT LIKE '$2a$%'
  AND password NOT LIKE '$2b$%'
  AND password NOT LIKE '$2y$%';
```

---

## 📋 迁移后操作

### 1. 通知用户

**如果使用临时密码**:
- 通知所有受影响的用户
- 提供临时密码
- 要求首次登录后立即修改密码

**如果清空密码**:
- 通知所有受影响的用户
- 指导使用"忘记密码"功能重置密码

---

### 2. 验证迁移结果

运行以下 SQL 查询验证：

```sql
-- 验证所有密码都已加密
SELECT 
  COUNT(*) as total_accounts,
  SUM(CASE 
    WHEN password IS NULL OR password = '' THEN 1 
    ELSE 0 
  END) as empty_passwords,
  SUM(CASE 
    WHEN password LIKE '$2a$%' OR password LIKE '$2b$%' OR password LIKE '$2y$%' THEN 1 
    ELSE 0 
  END) as hashed_passwords,
  SUM(CASE 
    WHEN password IS NOT NULL 
      AND password != ''
      AND password NOT LIKE '$2a$%'
      AND password NOT LIKE '$2b$%'
      AND password NOT LIKE '$2y$%'
    THEN 1 
    ELSE 0 
  END) as plaintext_passwords
FROM admin_accounts
WHERE status = 'active';
```

**预期结果**:
- `plaintext_passwords` 应该为 `0`
- `hashed_passwords` 应该等于 `total_accounts - empty_passwords`

---

### 3. 测试登录功能

1. 使用已加密密码的账号登录
   - ✅ 应该可以正常登录

2. 尝试使用明文密码登录（如果还有）
   - ❌ 应该显示错误："密码格式已过期，请联系管理员重置密码"

---

## 🔍 故障排除

### 问题 1: 用户无法登录

**可能原因**:
- 密码已被清空
- 密码格式不正确

**解决方案**:
1. 检查账号的密码状态
2. 如果密码为空，使用"忘记密码"功能重置
3. 如果密码格式不正确，联系管理员重置

---

### 问题 2: 迁移脚本失败

**可能原因**:
- 环境变量未配置
- Supabase 连接失败
- 权限不足

**解决方案**:
1. 检查环境变量是否正确配置
2. 确认使用 Service Role Key（不是 Anon Key）
3. 检查 Supabase 项目状态

---

### 问题 3: 部分账号无法迁移

**可能原因**:
- 账号状态为 inactive
- 数据库权限问题

**解决方案**:
1. 检查账号状态
2. 手动迁移这些账号
3. 或联系数据库管理员

---

## 📊 安全改进对比

### 修复前
- ❌ 支持明文密码验证
- ❌ 向后兼容不安全
- ❌ 明文密码可能泄露

### 修复后
- ✅ 拒绝明文密码验证
- ✅ 强制使用加密格式
- ✅ 密码安全存储
- ✅ 提供迁移工具

---

## 🔗 相关文档

- `SECURITY_AUDIT_REPORT_COMPLETE.md` - 完整安全审计报告
- `PASSWORD_ENCRYPTION_GUIDE.md` - 密码加密指南
- `scripts/migrate-passwords.js` - 自动迁移脚本（保留向后兼容）
- `scripts/force-migrate-passwords.js` - 强制迁移脚本（推荐）

---

## ✅ 检查清单

- [ ] 已检查所有账号的密码状态
- [ ] 已选择迁移方式
- [ ] 已执行迁移脚本或手动迁移
- [ ] 已验证迁移结果（所有密码都已加密）
- [ ] 已通知受影响的用户
- [ ] 已测试登录功能
- [ ] 已确认没有明文密码残留

---

**修复完成时间**: 2024年12月
**下次安全检查**: 建议每季度检查一次密码存储状态

