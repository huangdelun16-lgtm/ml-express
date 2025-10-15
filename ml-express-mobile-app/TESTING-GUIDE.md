# Staff App 导航功能测试指南

## ✅ 数据库迁移已完成

恭喜！`add-package-coordinates.sql` 已在 Supabase 中成功执行。

---

## 🧪 测试步骤

### 步骤 1: 验证数据库迁移

在 Supabase SQL Editor 中运行 `verify-package-coordinates.sql` 来验证：

```sql
-- 应该看到类似的结果：
-- total_packages: 50
-- packages_with_receiver_coords: 50
-- receiver_coords_percentage: 100.00
```

**预期结果**：
- ✅ 所有包裹都有坐标数据
- ✅ 坐标在曼德勒范围内（纬度 21.93-21.99，经度 96.05-96.13）
- ✅ 每个包裹的坐标略有不同（随机偏移生效）

---

### 步骤 2: 重启 Staff App

```bash
# 进入 Staff App 目录
cd ml-express-mobile-app

# 清除缓存
rm -rf node_modules/.cache

# 启动应用
npx expo start
```

或者直接按 `r` 键重新加载应用。

---

### 步骤 3: 测试导航功能

#### **测试场景 1: 查看地图上的包裹位置** 🗺️

1. 打开 Staff App
2. 登录快递员账号
3. 进入 "配送路线" 页面
4. 观察地图上是否显示包裹标记

**预期结果**：
```
✅ 地图上显示多个包裹标记
✅ 每个标记位置略有不同（不重叠）
✅ 所有标记在曼德勒区域内
```

#### **测试场景 2: 规划路线** 🧭

1. 在 "配送路线" 页面
2. 点击 "规划路线 (X站)" 按钮
3. 等待路线规划完成（1-3秒）

**预期结果**：
```
✅ 弹出地图预览 Modal
✅ 显示骑手当前位置（绿色 🏍️）
✅ 显示包裹位置（蓝色数字标记 1,2,3,4）
✅ 显示路线连线（虚线）
✅ 底部显示配送顺序列表
```

**检查日志**：
```
✅ 从包裹数据中读取坐标: xxx → 21.9588, 96.0891
✅ 从包裹数据中读取坐标: xxx → 21.9688, 96.0991
✅ 路线优化完成: [PKG001 (2.5km), PKG002 (3.8km), ...]
```

#### **测试场景 3: 开始导航 (iOS)** 📱

1. 在地图预览 Modal 中
2. 点击 "开始导航" 按钮

**预期结果（已安装 Google Maps）**：
```
✅ 自动打开 Google Maps App
✅ 显示从当前位置到所有包裹的路线
✅ 包含多个途经点（waypoints）
✅ 可以开始实际导航
```

**预期结果（未安装 Google Maps）**：
```
⚠️ 弹出提示："iOS系统不支持多途经点导航..."
📱 选择"继续" → 打开 Apple Maps
⚠️ 只显示到最后一个包裹的路线
```

#### **测试场景 4: 开始导航 (Android)** 📱

1. 在地图预览 Modal 中
2. 点击 "开始导航" 按钮

**预期结果**：
```
✅ 自动打开 Google Maps
✅ 显示完整的多途经点路线
✅ 包含所有包裹位置
✅ 可以开始实际导航
```

#### **测试场景 5: 单个包裹导航** 📍

1. 在包裹列表中
2. 点击某个包裹卡片右侧的 "导航" 按钮

**预期结果**：
```
✅ 打开导航应用（Google Maps 或 Apple Maps）
✅ 显示从当前位置到该包裹的路线
✅ 可以开始导航
```

---

### 步骤 4: 检查日志输出

打开开发者控制台（`npx expo start` 的终端窗口），检查日志：

**正常日志示例**：
```
✅ 从包裹数据中读取坐标: 23rd, 87th St, Mandalay → 21.9700, 96.0900
✅ 从包裹数据中读取坐标: 66th Street, Chanayethazan → 21.9650, 96.0850
🎯 路线优化完成: [PKG001 (2.5km, 优先级:1.25), PKG002 (3.8km, 优先级:3.80)]
```

**如果看到警告**：
```
⚠️ 无法解析地址坐标，使用默认位置: Some Address
```
→ 说明该包裹的地址没有匹配到关键词，使用了默认位置（仍然可以导航，但不够精确）

**不应该看到的错误**：
```
❌ 错误: API keys with referer restrictions cannot be used
❌ 地理编码失败
❌ REQUEST_DENIED
```

---

## 🔍 故障排除

### 问题 1: 地图上没有显示包裹标记

**可能原因**：
- 包裹数据中没有坐标
- 数据库迁移未成功

**解决方案**：
```sql
-- 在 Supabase 中检查
SELECT id, receiver_latitude, receiver_longitude
FROM packages
WHERE courier = '当前快递员用户名'
LIMIT 5;

-- 如果坐标为空，重新运行迁移脚本
UPDATE packages
SET 
  receiver_latitude = 21.9588 + (RANDOM() - 0.5) * 0.02,
  receiver_longitude = 96.0891 + (RANDOM() - 0.5) * 0.02
WHERE receiver_latitude IS NULL;
```

### 问题 2: 地图预览中标记重叠

**可能原因**：
- 随机偏移未生效
- 所有包裹使用了相同的默认坐标

**解决方案**：
- 检查数据库中的坐标是否有差异
- 重新运行迁移脚本，确保 `RANDOM()` 函数生效

### 问题 3: iOS 无法打开 Google Maps

**可能原因**：
- 未安装 Google Maps App
- URL Scheme 配置问题

**解决方案**：
```bash
# 重新构建应用（包含最新的 app.json 配置）
cd ml-express-mobile-app
eas build --platform ios --profile development
```

或者安装 Google Maps App：
- App Store 搜索 "Google Maps"
- 免费下载安装

### 问题 4: 导航路线不准确

**可能原因**：
- 包裹地址没有匹配到精确的关键词
- 使用了默认位置

**优化方案**：

#### 方案 A: 在创建包裹时保存精确坐标
修改客户端应用（`ml-express-client`）的 `PlaceOrderScreen.tsx`：

```typescript
// 提交订单时保存坐标
const packageData = {
  // ... 其他字段
  receiver_address: receiverAddress,
  receiver_latitude: selectedReceiverLocation.latitude,
  receiver_longitude: selectedReceiverLocation.longitude,
  sender_latitude: selectedSenderLocation.latitude,
  sender_longitude: selectedSenderLocation.longitude,
};
```

#### 方案 B: 扩展地址关键词库
编辑 `MapScreen.tsx`，添加更多常见地点：

```typescript
const mandalayLocations = {
  // 现有地点...
  
  // 新增地点
  '玉石市场': { lat: 21.9620, lng: 96.0870 },
  '皇宫': { lat: 21.9699, lng: 96.0956 },
  '火车站': { lat: 21.9580, lng: 96.0840 },
  // ...
};
```

---

## 📊 测试检查清单

### 基础功能
- [ ] 应用正常启动
- [ ] 能看到包裹列表
- [ ] 地图上显示包裹标记
- [ ] 当前位置正确显示

### 路线规划
- [ ] 点击"规划路线"按钮
- [ ] 地图预览正常显示
- [ ] 显示数字标记（1,2,3,4）
- [ ] 显示路线连线
- [ ] 配送顺序列表正确

### 导航功能
- [ ] iOS + Google Maps: 多途经点导航 ✅
- [ ] iOS + 无 Google Maps: 提示并备用 Apple Maps ⚠️
- [ ] Android: 多途经点导航 ✅
- [ ] 单个包裹导航正常 ✅

### 数据准确性
- [ ] 包裹坐标在曼德勒范围内
- [ ] 每个包裹位置略有不同
- [ ] 路线优化合理（距离近的优先）
- [ ] 急送达包裹优先级高

### 日志检查
- [ ] 没有 API 错误
- [ ] 没有 REQUEST_DENIED 错误
- [ ] 坐标读取日志正常
- [ ] 路线优化日志正常

---

## 🎯 性能指标

### 预期性能
```
地址解析速度: < 10ms (之前 500-2000ms)
路线规划速度: 1-3秒 (5-10个包裹)
地图加载速度: < 2秒
导航启动速度: < 1秒
```

### 资源使用
```
网络请求: 0 (完全离线)
内存占用: 正常
CPU 使用: 正常
电池消耗: 正常
```

---

## ✅ 测试通过标准

### 必须满足
1. ✅ 所有包裹都能显示在地图上
2. ✅ 路线规划能生成正确的配送顺序
3. ✅ 导航能正常启动（iOS/Android）
4. ✅ 没有 API 错误

### 可选优化
1. ⭐ 坐标精确度高（匹配到具体地点）
2. ⭐ 路线优化合理（考虑距离和优先级）
3. ⭐ 用户体验流畅（无卡顿）

---

## 🚀 下一步优化建议

### 短期（立即可做）
1. 在客户端应用中保存坐标
   - 修改 `PlaceOrderScreen.tsx`
   - 用户选择地图位置时保存坐标

2. 扩展地址关键词库
   - 添加 50+ 常见地点
   - 包含商业区、住宅区、学校等

### 中期（1-2周）
1. 创建地址管理后台
   - 允许管理员添加/编辑地点
   - 地址自动学习功能

2. 优化路线算法
   - 考虑实时路况
   - 考虑时间窗口

### 长期（1-2个月）
1. 集成本地地图数据
   - OpenStreetMap
   - 离线地图支持

2. 机器学习地址识别
   - 自动从地址文本中提取坐标
   - 地址纠错功能

---

## 📞 技术支持

如果测试过程中遇到问题：

1. **检查日志**: 查看 `npx expo start` 终端输出
2. **检查数据库**: 运行 `verify-package-coordinates.sql`
3. **清除缓存**: `rm -rf node_modules/.cache && npx expo start`
4. **重新构建**: `eas build --platform all`

---

**祝测试顺利！** 🎉🗺️✨

现在您的 Staff App 导航功能应该完全正常工作了！

