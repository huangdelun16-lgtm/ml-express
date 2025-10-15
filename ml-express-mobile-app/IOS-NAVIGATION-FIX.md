# iOS 导航功能修复说明

## 问题描述
在 iOS 设备上使用"规划路线"功能后，点击"开始导航"按钮时，无法像 Android 那样显示所有包裹的完整路线。

## 问题原因

### 1. URL Scheme 差异
- **Android**: Google Maps 应用和 Web URL 都能正常工作
- **iOS**: 需要特定的 URL Scheme (`comgooglemaps://`) 来打开 Google Maps 应用
- 如果用户未安装 Google Maps，需要备用方案（Apple Maps）

### 2. 权限配置
iOS 需要在 `Info.plist` 中声明可查询的 URL Schemes（`LSApplicationQueriesSchemes`）

### 3. 多途经点支持
- Google Maps 支持最多 9 个途经点
- Apple Maps **不支持**多途经点导航

## 修复方案

### 修复 1: 智能 URL 处理
在 `MapScreen.tsx` 的 `openGoogleMapsNavigation` 函数中：

```typescript
// 1. 优先尝试 Google Maps App (iOS/Android)
comgooglemaps://?saddr=${origin}&daddr=${destination}&waypoints=${waypoints}&directionsmode=driving

// 2. 备用方案：Web 版 Google Maps
https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving

// 3. iOS 最后备选：Apple Maps (仅单个目的地)
http://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d
```

### 修复 2: 使用坐标而不是地址
```typescript
// ❌ 之前：使用地址字符串
const destination = encodeURIComponent(pkg.receiver_address);

// ✅ 现在：使用精确坐标
const destination = pkg.coords 
  ? `${pkg.coords.lat},${pkg.coords.lng}`
  : encodeURIComponent(pkg.receiver_address);
```

**优点**:
- 更精确的导航
- 避免地址解析错误
- iOS 和 Android 兼容性更好

### 修复 3: 添加 URL Scheme 检测
```typescript
const canOpen = await Linking.canOpenURL(url);
if (canOpen) {
  await Linking.openURL(url);
  opened = true;
  break;
}
```

### 修复 4: iOS 配置更新
在 `app.json` 中添加：

```json
{
  "ios": {
    "infoPlist": {
      "LSApplicationQueriesSchemes": [
        "comgooglemaps",  // Google Maps
        "maps"            // Apple Maps
      ],
      "NSLocationWhenInUseUsageDescription": "需要获取您的位置来显示配送路线和导航",
      "NSLocationAlwaysAndWhenInUseUsageDescription": "需要获取您的位置来提供实时配送服务",
      "UIBackgroundModes": ["location"]
    },
    "config": {
      "googleMapsApiKey": "AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY"
    }
  }
}
```

## 用户体验优化

### 场景 1: 用户已安装 Google Maps (推荐)
✅ 打开 Google Maps 应用
✅ 显示完整的多途经点路线
✅ 显示优化后的配送顺序（1 → 2 → 3 → 4）

### 场景 2: 用户未安装 Google Maps，iOS 系统
⚠️ 弹出提示："iOS 系统不支持多途经点导航，将只导航到最后一个地址。建议安装 Google Maps 应用以获得完整路线。"
- **取消**: 关闭提示
- **继续**: 打开 Apple Maps，导航到最后一个包裹地址

### 场景 3: Android 系统
✅ 自动打开 Google Maps 或浏览器版本
✅ 显示完整路线

## 功能对比

| 功能 | Android | iOS (Google Maps) | iOS (Apple Maps) |
|------|---------|-------------------|------------------|
| 多途经点导航 | ✅ 支持 | ✅ 支持 | ❌ 不支持 |
| 最大途经点数 | 9个 | 9个 | 0个 |
| 路线优化 | ✅ | ✅ | ❌ |
| 使用坐标导航 | ✅ | ✅ | ✅ |
| 地图预览 | ✅ | ✅ | ✅ |

## 使用建议

### 对于 iOS 用户：
1. **推荐安装 Google Maps 应用**
   - App Store 搜索 "Google Maps"
   - 免费下载安装
   - 重启 Staff App

2. **如果不安装 Google Maps**:
   - 使用地图预览查看所有包裹位置
   - 使用单个包裹的"导航"按钮逐个导航
   - 记住包裹顺序：1 → 2 → 3 → 4

### 对于 Android 用户：
- 无需额外配置
- 自动使用 Google Maps
- 完整多途经点支持

## 技术细节

### URL Scheme 格式

#### Google Maps App (iOS/Android)
```
comgooglemaps://?saddr=起点纬度,起点经度&daddr=终点纬度,终点经度&waypoints=途经点1纬度,途经点1经度|途经点2纬度,途经点2经度&directionsmode=driving
```

#### Google Maps Web
```
https://www.google.com/maps/dir/?api=1&origin=起点&destination=终点&waypoints=途经点1|途经点2&travelmode=driving
```

#### Apple Maps
```
http://maps.apple.com/?saddr=起点纬度,起点经度&daddr=终点纬度,终点经度&dirflg=d
```

### 路线优化算法
1. 获取所有包裹的坐标（地理编码）
2. 计算从当前位置到每个包裹的距离
3. 考虑配送优先级（急送达、定时达）
4. 使用贪心算法优化路线（最近邻算法）
5. 生成优化后的包裹顺序

## 重新构建应用

修改 `app.json` 后，需要重新构建应用：

### iOS
```bash
cd ml-express-mobile-app
eas build --platform ios --profile production
```

### Android
```bash
cd ml-express-mobile-app
eas build --platform android --profile production
```

### 本地测试
```bash
cd ml-express-mobile-app
npx expo start
# 扫描二维码在实际设备上测试
```

## 常见问题

### Q1: 为什么 iOS 不能显示多途经点？
**A**: Apple Maps 本身不支持多途经点导航。用户需要安装 Google Maps 应用。

### Q2: 如何检查 Google Maps 是否已安装？
**A**: 应用会自动检测（`Linking.canOpenURL`）并选择合适的导航方式。

### Q3: 地址无法解析怎么办？
**A**: 
- 确保包裹地址准确
- 检查网络连接（地理编码需要网络）
- 地址中直接包含坐标最可靠

### Q4: 导航时闪退怎么办？
**A**:
- 确保已重新构建应用（包含新的 `LSApplicationQueriesSchemes`）
- 检查定位权限是否已授予
- 尝试重启应用

## 测试清单

- [ ] iOS 设备 + Google Maps 已安装 → 多途经点导航
- [ ] iOS 设备 + 未安装 Google Maps → 提示安装，备用 Apple Maps
- [ ] Android 设备 → 多途经点导航
- [ ] 单个包裹导航 → iOS/Android 都正常
- [ ] 地图预览显示所有标记（1,2,3,4）
- [ ] 路线优化算法正常工作
- [ ] 定位权限正常获取

## 更新日志

### v1.1.0 (2025-10-15)
- ✅ 修复 iOS 多途经点导航
- ✅ 添加 Google Maps App URL Scheme 支持
- ✅ 添加 Apple Maps 备用方案
- ✅ 优化地址解析（使用坐标）
- ✅ 添加用户友好提示
- ✅ 更新 iOS 配置（LSApplicationQueriesSchemes）

---

**现在 iOS 用户可以正常使用多途经点导航功能了！** 🎉📱🗺️

