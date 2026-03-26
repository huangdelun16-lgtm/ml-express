# MARKET LINK EXPRESS 开发指南

## 1. 项目结构

```
ml-express-client/
├── src/
│   ├── components/     # 可复用组件
│   ├── config/         # 全局配置（主题、常量）
│   ├── contexts/       # React Contexts (State)
│   ├── hooks/          # 自定义 Hooks
│   ├── navigation/     # 导航配置
│   ├── screens/        # 页面组件
│   ├── services/       # API 和业务逻辑服务
│   ├── types/          # TypeScript 类型定义
│   └── utils/          # 工具函数
├── assets/             # 图片和静态资源
└── App.tsx             # 应用入口
```

## 2. 核心配置

### 主题配置 (`src/config/theme.ts`)
项目使用统一的主题配置管理颜色、间距和字体。
**禁止**在组件中硬编码颜色值，请使用 `theme.colors.*`。

```typescript
import { theme } from '../config/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.default,
    padding: theme.spacing.l,
  },
  text: {
    color: theme.colors.primary.DEFAULT,
    fontSize: theme.typography.sizes.m,
  }
});
```

### 常量配置 (`src/config/constants.ts`)
应用级常量（如 API 地址、联系方式）统一在 `APP_CONFIG` 中管理。

```typescript
import { APP_CONFIG } from '../config/constants';

console.log(APP_CONFIG.API.TIMEOUT);
```

## 3. 错误处理与反馈

### 统一错误处理 (`src/services/ErrorService.ts`)
所有错误应通过 `ErrorService` 处理，而不是直接 `console.error`。

```typescript
try {
  // ...
} catch (error) {
  errorService.handleError(error, { context: 'ComponentName.method' });
}
```

### 用户反馈 (`src/services/FeedbackService.ts`)
使用 `FeedbackService` 提供统一的视觉（Toast）和触觉（震动）反馈。

```typescript
// 成功
feedbackService.success('操作成功');

// 错误
feedbackService.error('操作失败');

// 警告
feedbackService.warning('请注意');
```

## 4. 表单验证

使用 `useFormValidation` Hook 处理表单验证。

```typescript
const { values, errors, handleChange, handleBlur, validateAll } = useFormValidation(
  { name: '' },
  {
    name: [{ required: true, message: '请输入姓名' }]
  }
);
```

## 5. 安全性

### 敏感数据存储
使用 `src/services/SecureStorage.ts` 存储敏感信息（如 Token）。
普通配置可继续使用 `AsyncStorage`。

### API Key
Google Maps API Key 配置在 `app.json` 中。确保不要将私有 Key 提交到公共仓库。

## 6. 开发规范

*   **组件拆分**：如果一个页面超过 500 行，请考虑拆分组件。
*   **性能优化**：使用 `React.memo`, `useMemo`, `useCallback` 避免不必要的重渲染。
*   **类型安全**：避免使用 `any`，尽量定义清晰的 Interface。

## 7. 常用命令

*   启动开发服务器：`npm run start:normal`
*   构建 Android AAB：`./build-aab-local.sh`

