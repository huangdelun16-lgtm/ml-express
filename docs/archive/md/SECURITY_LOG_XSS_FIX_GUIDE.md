# 🔒 日志和 XSS 安全修复指南

## ✅ 已创建的工具

### 1. 安全日志工具 (`src/utils/logger.ts`)

**功能**:
- ✅ 仅在开发环境输出日志
- ✅ 自动清理敏感信息（密码、密钥、Token）
- ✅ 支持不同日志级别（DEBUG, INFO, WARN, ERROR）
- ✅ 兼容 console.log API

**使用方法**:
```typescript
import { logger } from '../utils/logger';

// 替换 console.log
logger.debug('调试信息');
logger.info('信息');
logger.warn('警告');
logger.error('错误');

// 或使用默认导出
import logger from '../utils/logger';
logger.log('仅在开发环境显示');
```

---

### 2. XSS 防护工具 (`src/utils/xssSanitizer.ts`)

**功能**:
- ✅ HTML 转义
- ✅ HTML 清理（移除脚本和危险属性）
- ✅ 安全的文本内容设置
- ✅ XSS 检测

**使用方法**:
```typescript
import { escapeHtml, sanitizeHtml, setTextContent, setSafeHtml } from '../utils/xssSanitizer';

// 转义 HTML
const safe = escapeHtml(userInput);

// 清理 HTML（如果必须使用 innerHTML）
const cleaned = sanitizeHtml(userInput);

// 安全设置文本内容（推荐）
setTextContent(element, userInput);

// 安全设置 HTML（仅在必要时）
setSafeHtml(element, userInput);
```

---

## 🔧 批量替换指南

### 步骤 1: 替换 console.log

**查找所有 console.log**:
```bash
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx"
```

**替换规则**:

1. **console.log** → `logger.debug()` 或 `logger.info()`
2. **console.error** → `logger.error()`
3. **console.warn** → `logger.warn()`
4. **console.info** → `logger.info()`

**示例**:
```typescript
// ❌ 旧代码
console.log('用户信息:', userData);
console.error('错误:', error);

// ✅ 新代码
import { logger } from '../utils/logger';
logger.debug('用户信息:', userData);
logger.error('错误:', error);
```

---

### 步骤 2: 替换 innerHTML

**查找所有 innerHTML**:
```bash
grep -r "innerHTML" src/ --include="*.ts" --include="*.tsx"
```

**替换规则**:

1. **设置文本内容** → 使用 `textContent` 或 `setTextContent()`
2. **必须使用 HTML** → 使用 `sanitizeHtml()` 清理

**示例**:
```typescript
// ❌ 旧代码（不安全）
element.innerHTML = userInput;
element.innerHTML = `<div>${userInput}</div>`;

// ✅ 新代码（安全）
import { setTextContent, sanitizeHtml } from '../utils/xssSanitizer';

// 如果只是文本
setTextContent(element, userInput);
// 或
element.textContent = userInput;

// 如果必须使用 HTML
element.innerHTML = sanitizeHtml(userInput);
```

---

## 📋 需要修复的文件列表

### 高优先级（生产代码）

#### console.log 修复
- [x] `src/pages/HomePage.tsx` - 部分修复
- [ ] `src/pages/AdminLogin.tsx`
- [ ] `src/services/authService.ts`
- [ ] `src/services/supabase.ts`
- [ ] `src/pages/RealTimeTracking.tsx`
- [ ] `src/pages/TrackingPage.tsx`
- [ ] `src/pages/DeliveryStoreManagement.tsx`
- [ ] `src/pages/CityPackages.tsx`
- [ ] `src/pages/FinanceManagement.tsx`
- [ ] `src/pages/AdminDashboard.tsx`
- [ ] `src/pages/SystemSettings.tsx`
- [ ] `src/pages/AccountManagement.tsx`
- [ ] `src/services/errorHandler.ts`
- [ ] `src/pages/DeliveryAlerts.tsx`
- [ ] `src/pages/CourierManagement.tsx`
- [ ] `src/components/ProtectedRoute.tsx`
- [ ] `src/services/orderNotificationService.ts`
- [ ] `src/pages/UserManagement.tsx`
- [ ] `src/services/emailService.ts`
- [ ] `src/services/deliveryAlertService.ts`
- [ ] `src/services/smsService.ts`
- [ ] `src/services/ImageCompressionService.ts`
- [ ] `src/services/FileUploadService.ts`
- [ ] `src/hooks/useSupabaseRealtime.ts`
- [ ] `src/hooks/useRealTimeTracking.ts`
- [ ] `src/api/courierLocation.ts`

#### innerHTML 修复
- [x] `src/pages/HomePage.tsx` - 部分修复
- [ ] `src/pages/RealTimeTracking.tsx`
- [ ] `src/pages/DeliveryAlerts.tsx`

---

## 🛠️ 自动化替换脚本

### 使用 VS Code 批量替换

1. **打开查找替换** (Ctrl/Cmd + Shift + H)

2. **替换 console.log**:
   - 查找: `console\.log\(`
   - 替换: `logger.debug(`
   - 使用正则表达式: ✅

3. **替换 console.error**:
   - 查找: `console\.error\(`
   - 替换: `logger.error(`
   - 使用正则表达式: ✅

4. **替换 console.warn**:
   - 查找: `console\.warn\(`
   - 替换: `logger.warn(`
   - 使用正则表达式: ✅

5. **替换 innerHTML**:
   - 查找: `\.innerHTML\s*=\s*`
   - 替换: `.textContent = ` (需要手动检查)
   - 使用正则表达式: ✅

**⚠️ 注意**: 批量替换后需要：
- 添加 import 语句
- 手动检查每个替换是否正确
- 对于必须使用 HTML 的情况，使用 `sanitizeHtml()`

---

## 📝 修复示例

### 示例 1: 替换 console.log

**文件**: `src/pages/AdminLogin.tsx`

```typescript
// ❌ 旧代码
import React, { useState } from 'react';
// ...
console.error('登录异常:', error);

// ✅ 新代码
import React, { useState } from 'react';
import { logger } from '../utils/logger';
// ...
logger.error('登录异常:', error);
```

---

### 示例 2: 替换 innerHTML

**文件**: `src/pages/DeliveryAlerts.tsx`

```typescript
// ❌ 旧代码
notification.innerHTML = `
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="font-size: 24px;">${severityIcon}</div>
    <div>
      <strong>${newAlert.title}</strong>
      <p>${newAlert.message}</p>
    </div>
  </div>
`;

// ✅ 新代码（使用 React）
import { sanitizeHtml } from '../utils/xssSanitizer';

// 方法 1: 使用 React 组件（推荐）
const NotificationContent = ({ alert }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{ fontSize: '24px' }}>{alert.severityIcon}</div>
    <div>
      <strong>{alert.title}</strong>
      <p>{alert.message}</p>
    </div>
  </div>
);

// 方法 2: 如果必须使用 innerHTML，先清理
notification.innerHTML = sanitizeHtml(`
  <div style="display: flex; align-items: center; gap: 12px;">
    <div style="font-size: 24px;">${escapeHtml(severityIcon)}</div>
    <div>
      <strong>${escapeHtml(newAlert.title)}</strong>
      <p>${escapeHtml(newAlert.message)}</p>
    </div>
  </div>
`);
```

---

### 示例 3: 替换样式 innerHTML

**文件**: `src/pages/RealTimeTracking.tsx`

```typescript
// ❌ 旧代码
const style = document.createElement('style');
style.innerHTML = `
  .gm-fullscreen-control {
    top: 50px !important;
  }
`;

// ✅ 新代码
const style = document.createElement('style');
style.textContent = `
  .gm-fullscreen-control {
    top: 50px !important;
  }
`;
```

---

## ✅ 验证修复

### 1. 检查是否还有 console.log

```bash
# 检查生产代码
grep -r "console\.log\|console\.error\|console\.warn\|console\.info" src/ --include="*.ts" --include="*.tsx" | grep -v "logger.ts"

# 应该返回空或只有注释
```

### 2. 检查是否还有 innerHTML

```bash
# 检查生产代码
grep -r "innerHTML" src/ --include="*.ts" --include="*.tsx" | grep -v "xssSanitizer.ts"

# 应该返回空或只有已清理的使用
```

### 3. 测试应用

1. 运行开发服务器
2. 检查浏览器控制台（应该没有敏感信息）
3. 测试所有功能是否正常

---

## 🔍 安全检查清单

- [ ] 所有 `console.log` 已替换为 `logger.debug()` 或 `logger.info()`
- [ ] 所有 `console.error` 已替换为 `logger.error()`
- [ ] 所有 `console.warn` 已替换为 `logger.warn()`
- [ ] 所有 `innerHTML` 已替换为 `textContent` 或已清理
- [ ] 已添加必要的 import 语句
- [ ] 已测试应用功能正常
- [ ] 生产环境构建成功

---

## 🆘 常见问题

### Q1: 某些 console.log 需要保留怎么办？

**A**: 使用 `logger.debug()` 或 `logger.info()`，它们仅在开发环境显示。

---

### Q2: 必须使用 innerHTML 怎么办？

**A**: 
1. 使用 `sanitizeHtml()` 清理内容
2. 或使用 React 的 `dangerouslySetInnerHTML`（不推荐）
3. 或重构为 React 组件

---

### Q3: 样式 innerHTML 怎么办？

**A**: 使用 `textContent` 代替 `innerHTML`（样式内容不需要 HTML 解析）。

---

## 🔗 相关文档

- `SECURITY_AUDIT_REPORT_COMPLETE.md` - 完整安全审计报告
- `src/utils/logger.ts` - 日志工具源码
- `src/utils/xssSanitizer.ts` - XSS 防护工具源码

---

**修复完成时间**: 2024年12月
**下次安全检查**: 建议每季度检查一次日志和 XSS 防护

