# 🔑 Supabase Anon Key 重置解决方案

## 📋 问题确认

- ❌ API Keys 页面没有 Reset 按钮
- ❌ JWT Keys 页面没有 Reset JWT Secret 按钮
- ✅ Secret Key 已生成新的

---

## 🎯 解决方案

### 方案 1: 切换到 "Legacy JWT Secret" 标签页（优先尝试）

在 JWT Keys 页面：

1. **点击 "Legacy JWT Secret" 标签页**
   - 您当前在 "JWT Signing Keys" 标签页
   - 点击切换到 "Legacy JWT Secret" 标签页

2. **在 Legacy JWT Secret 标签页中查找**
   - 应该可以看到 Legacy API Keys 的管理界面
   - 查找 Reset、Regenerate 或类似的按钮
   - 可能显示为 "Reset JWT Secret" 或 "Rotate Keys"

---

### 方案 2: 通过 Supabase Management API（技术方案）

如果 Dashboard 没有重置选项，可以通过 API 重置：

**⚠️ 需要**: Supabase Access Token（项目设置中可以生成）

```bash
# 1. 获取项目引用 ID（从 Supabase Dashboard URL 或设置中获取）
PROJECT_REF="your-project-ref"

# 2. 获取 Access Token（从 Supabase Dashboard → Account Settings → Access Tokens）
ACCESS_TOKEN="your-access-token"

# 3. 重置 JWT Secret（这会重置所有 Legacy API Keys）
curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/secrets" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action": "rotate_jwt_secret"}'
```

**注意**: 这个方法需要 Supabase Access Token，并且会重置所有 Legacy 密钥。

---

### 方案 3: 联系 Supabase 支持（推荐）

如果以上方法都不可行，**强烈建议联系 Supabase 支持**：

1. **通过 Dashboard**
   - 查找 **Help** 或 **Support** 选项
   - 或访问：https://supabase.com/support

2. **提交支持请求**
   - 说明：Anon Key 已泄漏，需要重置
   - 提供：项目 ID、问题描述
   - 请求：帮助重置 Legacy Anon Key

3. **通常 Supabase 支持会很快响应**
   - 他们可以帮助您重置密钥
   - 或者指导您如何操作

---

### 方案 4: 创建新项目并迁移（最后手段）

如果重置非常困难，可以考虑：

1. **创建新的 Supabase 项目**
2. **迁移数据**
   - 导出当前项目的数据
   - 导入到新项目
3. **更新配置**
   - 使用新项目的 Anon Key 和 Secret Key
   - 更新所有环境变量

---

## 🔍 详细操作步骤

### 步骤 1: 尝试 Legacy JWT Secret 标签页

1. **在 JWT Keys 页面**
   - 点击顶部的 **"Legacy JWT Secret"** 标签页
   - 查看这个标签页中的内容

2. **查找重置选项**
   - 可能显示为：
     - "Reset JWT Secret"
     - "Regenerate Keys"
     - "Rotate Secret"
     - 或其他类似的按钮

3. **如果找到按钮**
   - 点击按钮
   - 确认操作
   - 复制新的 Anon Key

---

### 步骤 2: 检查 API 设置页面的其他选项

1. **在 Settings → API 页面**
   - 查看左侧是否有其他子菜单
   - 查找 "API Keys"、"Legacy Keys" 等选项

2. **检查页面底部**
   - 可能有一些高级选项或链接
   - 查找 "Reset"、"Regenerate" 等关键词

---

### 步骤 3: 如果仍然找不到

**建议操作顺序**：

1. ✅ **首先尝试**: 切换到 "Legacy JWT Secret" 标签页
2. ✅ **其次**: 联系 Supabase 支持
3. ✅ **最后**: 考虑创建新项目（如果重置非常困难）

---

## 📞 联系 Supabase 支持模板

如果您决定联系支持，可以使用以下模板：

**主题**: Request to Reset Leaked Anon Key

**内容**:
```
Hello Supabase Support Team,

I need help resetting my project's Anon Key because it has been publicly leaked.

Project Details:
- Project Reference ID: [您的项目ID]
- Issue: Anon Key has been leaked and I cannot find the Reset button in the Dashboard
- Current Status: I have already generated a new Secret Key, but need to reset the Anon Key

I have checked:
- API Keys page: No Reset button found
- JWT Keys page: No Reset JWT Secret button found
- Legacy JWT Secret tab: [请描述您看到的内容]

Could you please help me reset the Anon Key, or guide me on how to do it?

Thank you!
```

---

## ⚠️ 临时安全措施

在等待重置期间，建议：

1. **检查代码**
   - ✅ 已移除所有硬编码的密钥
   - ✅ 所有密钥都使用环境变量

2. **监控使用情况**
   - 在 Supabase Dashboard 中监控 API 使用情况
   - 如果发现异常活动，立即采取措施

3. **限制访问**
   - 检查 RLS (Row Level Security) 策略
   - 确保数据访问受到适当限制

---

## 📋 下一步操作

**请告诉我**：

1. **切换到 "Legacy JWT Secret" 标签页后，您看到了什么？**
   - 是否有重置选项？
   - 显示了什么内容？

2. **您是否愿意联系 Supabase 支持？**
   - 我可以帮您准备支持请求的内容

3. **或者您希望我帮您准备创建新项目的方案？**
   - 包括数据迁移步骤

---

**建议**: 优先尝试切换到 "Legacy JWT Secret" 标签页，如果仍然找不到重置选项，联系 Supabase 支持是最安全和可靠的方法。

