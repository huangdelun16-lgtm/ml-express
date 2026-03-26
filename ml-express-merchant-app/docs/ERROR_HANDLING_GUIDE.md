# 统一错误处理和网络请求指南

## 概述

项目已实现统一的错误处理和网络请求系统，包括：
- **ErrorService**: 统一错误处理和用户友好的错误消息
- **NetworkService**: 支持自动重试的网络请求包装器
- **ToastService**: 统一的 Toast 提示服务
- **GlobalToast**: 全局 Toast 组件

## 使用方法

### 1. ErrorService - 统一错误处理

```typescript
import { errorService } from '../services/ErrorService';

// 基本用法
try {
  // 你的代码
} catch (error) {
  errorService.handleError(error, { 
    context: 'YourComponent.methodName' 
  });
}

// 静默处理（不显示提示）
errorService.handleError(error, { 
  context: 'YourComponent.methodName',
  silent: true 
});

// 使用 Toast 而不是 Alert
errorService.handleError(error, { 
  context: 'YourComponent.methodName',
  useToast: true 
});

// 显示重试选项
errorService.handleError(error, { 
  context: 'YourComponent.methodName',
  showRetry: true,
  onRetry: () => {
    // 重试逻辑
  }
});
```

### 2. NetworkService - 网络请求（支持重试）

```typescript
import { networkService } from '../services/NetworkService';

// GET 请求
try {
  const data = await networkService.get('/api/users', {
    retries: 3, // 重试次数
    retryDelay: 1000, // 重试延迟（毫秒）
    timeout: 30000, // 超时时间（毫秒）
    showErrorToast: true, // 显示错误 Toast
  });
} catch (error) {
  // 错误已自动处理和提示
}

// POST 请求
try {
  const result = await networkService.post('/api/orders', {
    name: 'John',
    email: 'john@example.com'
  }, {
    retries: 3,
    showSuccessToast: true,
    successMessage: '订单创建成功',
  });
} catch (error) {
  // 错误已自动处理
}

// 自定义重试条件
try {
  const data = await networkService.get('/api/data', {
    retries: 5,
    retryCondition: (error) => {
      // 只在特定错误时重试
      return error.status === 500 || error.status === 429;
    }
  });
} catch (error) {
  // 错误已自动处理
}
```

### 3. ToastService - Toast 提示

```typescript
import { toastService } from '../services/ToastService';

// 成功提示
toastService.success('操作成功');

// 错误提示
toastService.error('操作失败');

// 信息提示
toastService.info('这是一条信息');

// 警告提示
toastService.warning('请注意');

// 自定义持续时间
toastService.success('操作成功', 5000); // 5秒
```

### 4. 替换 console.error/warn

**之前：**
```typescript
try {
  // 代码
} catch (error) {
  console.error('操作失败:', error);
  Alert.alert('错误', '操作失败');
}
```

**之后：**
```typescript
import { errorService } from '../services/ErrorService';

try {
  // 代码
} catch (error) {
  errorService.handleError(error, { 
    context: 'ComponentName.methodName' 
  });
}
```

## 错误类型

ErrorService 会自动识别和处理以下错误类型：

- **网络错误**: 自动重试，显示友好的错误消息
- **超时错误**: 提示用户检查网络连接
- **认证错误**: 提示用户重新登录
- **权限错误**: 提示权限不足
- **服务器错误**: 自动重试，显示服务器错误提示
- **Supabase 错误**: 转换为用户友好的消息

## 网络重试策略

NetworkService 使用指数退避策略：
- 第1次重试：1秒后
- 第2次重试：2秒后
- 第3次重试：4秒后
- 第4次重试：8秒后（如果配置了更多重试）

## 最佳实践

1. **始终使用 ErrorService 处理错误**
   - 不要直接使用 `console.error` 或 `Alert.alert`
   - 提供有意义的 `context` 参数以便调试

2. **网络请求使用 NetworkService**
   - 自动重试机制提高成功率
   - 统一的错误处理

3. **Toast vs Alert**
   - 使用 Toast 显示非阻塞性提示（成功、信息）
   - 使用 Alert 显示需要用户确认的错误（通过 `useToast: false`）

4. **静默错误**
   - 对于不影响用户体验的错误，使用 `silent: true`
   - 例如：离线数据同步失败

5. **错误上下文**
   - 始终提供有意义的 `context`，格式：`ComponentName.methodName`
   - 便于生产环境错误追踪

## 迁移清单

- [x] 创建 ErrorService
- [x] 创建 NetworkService
- [x] 创建 ToastService
- [x] 创建 GlobalToast 组件
- [x] 更新 PlaceOrderScreen
- [x] 更新 usePlaceAutocomplete
- [ ] 更新其他关键文件（HomeScreen, MyOrdersScreen 等）

## 注意事项

1. GlobalToast 组件已添加到 App.tsx，无需手动添加
2. 错误会自动记录到控制台（开发环境）或日志服务（生产环境）
3. 网络请求失败会自动重试，无需手动处理
4. Toast 消息会自动排队，不会重叠显示

