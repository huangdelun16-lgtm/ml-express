# 🔗 Deep Link 配置文档

## 📱 MARKET LINK EXPRESS - Deep Link 完整配置信息

---

## 🎯 客户端 App (ml-express-client)

### 1. Deep Link Scheme
```json
"scheme": "ml-express-client"
```

### 2. Android 包名
```
com.mlexpress.client
```

### 3. iOS Bundle Identifier
```
com.mlexpress.client
```

### 4. "立即下单"页面路由

#### React Navigation Screen Name
```
PlaceOrder
```

#### Deep Link URL 路径
```
ml-express-client://place-order
```

或者使用 HTTPS：
```
https://mlexpress.com/place-order
https://www.mlexpress.com/place-order
```

### 5. 完整路由配置

| 页面 | Screen Name | Deep Link 路径 | 完整 URL |
|------|------------|----------------|---------|
| 首页 | Main | `/` | `ml-express-client://` |
| 登录 | Login | `/login` | `ml-express-client://login` |
| 注册 | Register | `/register` | `ml-express-client://register` |
| **立即下单** | **PlaceOrder** | **`/place-order`** | **`ml-express-client://place-order`** |
| 我的订单 | MyOrders | `/my-orders` | `ml-express-client://my-orders` |
| 追踪订单 | TrackOrder | `/track-order` | `ml-express-client://track-order` |
| 个人中心 | Profile | `/profile` | `ml-express-client://profile` |
| 订单详情 | OrderDetail | `/order/:orderId` | `ml-express-client://order/PKG001` |
| 通知设置 | NotificationSettings | `/settings/notifications` | `ml-express-client://settings/notifications` |

### 6. 使用示例

#### 从 Web 页面跳转到"立即下单"
```html
<a href="ml-express-client://place-order">打开App立即下单</a>
```

#### 从其他应用跳转
```javascript
// Android Intent
intent://place-order#Intent;scheme=ml-express-client;package=com.mlexpress.client;end

// iOS URL Scheme
ml-express-client://place-order
```

#### 在 React Native 中处理 Deep Link
```typescript
import * as Linking from 'expo-linking';

// 打开立即下单页面
Linking.openURL('ml-express-client://place-order');
```

---

## 🚚 骑手 App (ml-express-mobile-app)

### 1. Deep Link Scheme
```json
"scheme": "ml-express-staff"
```

### 2. Android 包名
```
com.marketlinkexpress.staff
```

### 3. iOS Bundle Identifier
```
com.marketlinkexpress.staff
```

### 4. 主要页面路由

| 页面 | Screen Name | Deep Link 路径 |
|------|------------|----------------|
| 登录 | Login | `/login` |
| 主页 | Main | `/` |
| 地图 | Map | `/map` |
| 扫码 | Scan | `/scan` |
| 我的任务 | MyTasks | `/my-tasks` |
| 个人中心 | Profile | `/profile` |

### 5. Deep Link URL 示例
```
ml-express-staff://map
ml-express-staff://scan
ml-express-staff://my-tasks
```

---

## 🌐 Web 应用

Web 应用不需要 Deep Link 配置（本身就是 URL 访问）

### Web 应用 URL
```
生产环境: https://market-link-express.com
备用环境: https://market-link-express.netlify.app
```

### 下单页面路径
```
https://market-link-express.com/ (首页下单)
```

---

## 📋 配置总结

### 客户端 App
- ✅ **Scheme**: `ml-express-client`
- ✅ **Android 包名**: `com.mlexpress.client`
- ✅ **iOS Bundle ID**: `com.mlexpress.client`
- ✅ **立即下单路由**: `PlaceOrder` → `ml-express-client://place-order`
- ✅ **Deep Link 已配置**: 支持自定义 scheme 和 HTTPS

### 骑手 App
- ✅ **Scheme**: `ml-express-staff`
- ✅ **Android 包名**: `com.marketlinkexpress.staff`
- ✅ **iOS Bundle ID**: `com.marketlinkexpress.staff`
- ✅ **Deep Link 已配置**: 基础 scheme 配置完成

### Web 应用
- ✅ **URL 访问**: 标准 HTTPS URL
- ✅ **无需 Deep Link**: Web 应用本身就是通过 URL 访问

---

## 🔧 技术实现

### 客户端 App Deep Link 配置位置

**文件**: `ml-express-client/App.tsx`

```typescript
const linking = {
  prefixes: [
    'ml-express-client://',
    'https://mlexpress.com',
    'https://www.mlexpress.com'
  ],
  config: {
    screens: {
      PlaceOrder: 'place-order',
      MyOrders: 'my-orders',
      TrackOrder: 'track-order',
      // ... 其他路由
    },
  },
};

<NavigationContainer linking={linking}>
  {/* ... */}
</NavigationContainer>
```

### 配置文件位置

- **客户端 App**: `ml-express-client/app.json`
- **骑手 App**: `ml-express-mobile-app/app.json`
- **路由配置**: `ml-express-client/App.tsx`

---

## 🧪 测试 Deep Link

### Android 测试
```bash
# 通过 ADB 测试
adb shell am start -W -a android.intent.action.VIEW -d "ml-express-client://place-order" com.mlexpress.client
```

### iOS 测试
```bash
# 在 Safari 中输入
ml-express-client://place-order
```

### 浏览器测试
```javascript
// 在浏览器控制台中
window.location.href = 'ml-express-client://place-order';
```

---

## ⚠️ 注意事项

1. **Deep Link 不会影响现有功能**
   - 所有配置都是新增的，不影响现有导航
   - 原有 `navigation.navigate()` 调用仍然有效

2. **需要重新构建应用**
   - 修改 `app.json` 后需要重新构建应用
   - 开发环境使用 `expo start` 即可测试

3. **HTTPS Deep Link 需要域名配置**
   - 需要在服务器上配置 `.well-known/apple-app-site-association` (iOS)
   - 需要配置 `assetlinks.json` (Android)
   - 目前优先使用自定义 scheme

---

## 📝 更新日期

**最后更新**: 2025年1月29日

**配置状态**: ✅ 已完成配置，可以开始使用

