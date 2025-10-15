# 🔐 配送地理围栏安全系统

## 📋 功能概述

实现了一个完整的地理围栏（Geofencing）安全系统，确保骑手只能在收件地址附近（100米内）才能标记包裹为"已送达"。系统会自动检测异常操作并通知管理员。

---

## 🎯 核心功能

### 1. **地理围栏检测**
- ✅ 100米送达限制
- ✅ 实时GPS位置验证
- ✅ 高精度距离计算（哈弗辛公式）
- ✅ 位置精度监控

### 2. **异常警报系统**
- ✅ 自动创建警报记录
- ✅ 多级严重程度分类
- ✅ 实时通知管理员
- ✅ 详细的异常信息记录

### 3. **后台管理面板**
- ✅ 警报实时监控
- ✅ 警报处理工作流
- ✅ 地图位置查看
- ✅ 统计数据展示

---

## 🚀 工作流程

### **骑手端（Staff App）**

#### **步骤 1: 点击"已送达"按钮**
```
PackageDetailScreen.tsx
↓
骑手点击"✓ 已送达"按钮
↓
触发 updateStatus('已送达')
```

#### **步骤 2: 地理围栏验证**
```typescript
// 1. 获取骑手当前位置 (GPS)
const currentLocation = await geofenceService.getCurrentLocation();

// 2. 计算与收件地址的距离
const distance = calculateDistance(
  courierLat, courierLon,
  destinationLat, destinationLon
);

// 3. 判断是否在100米范围内
if (distance <= 100) {
  // ✅ 允许送达
} else {
  // ❌ 拒绝并创建警报
}
```

#### **步骤 3: 用户反馈**

**场景 A: 位置验证通过（距离 ≤ 100米）**
```
✅ 位置验证通过
距离收件地址 45 米

是否确认标记已送达？

[取消] [确认送达]
```

**场景 B: 超出范围（100米 < 距离 ≤ 500米）**
```
❌ 您距离收件地址还有 235 米
必须在 100 米范围内才能标记已送达

⚠️ 此异常操作已记录并通知管理员

[我知道了]
```

**场景 C: 可疑位置（距离 > 500米）**
```
🚨 您距离收件地址还有 1234 米
必须在 100 米范围内才能标记已送达

⚠️ 此异常操作已记录并通知管理员
⚠️ 警报级别: 紧急

[我知道了]
```

**场景 D: 无法获取位置（GPS未启用）**
```
❌ 无法获取您的位置
请检查GPS设置并授予位置权限

[我知道了]
```

---

### **管理员端（Web Admin Panel）**

#### **步骤 1: 实时接收警报**
```
骑手异常操作
↓
自动创建警报记录 (delivery_alerts 表)
↓
实时推送到管理后台 (Supabase Realtime)
↓
管理员收到通知
```

#### **步骤 2: 查看警报详情**

**警报卡片显示：**
```
🚨 [紧急] 距离违规警报                   2024-10-15 14:30:25
📍 距离违规     ⏳ 待处理

骑手 张三 在距离收件地址 1234 米处尝试标记包裹 
PKG001 为已送达（超出允许范围 100 米）

骑手: 张三                距离: 1234 米
包裹: PKG001
```

#### **步骤 3: 处理警报**

点击警报卡片 → 查看详细信息：

```
警报详情
-----------------
🚨 紧急    📍 距离违规    ⏳ 待处理

包裹编号: PKG001
骑手: 张三
尝试操作: 标记已送达
创建时间: 2024-10-15 14:30:25
距离目标: 1234 米

位置信息:
├─ 骑手位置: 21.958800, 96.089100  📍 在地图中查看
└─ 收件地址: 21.968800, 96.099100  📍 在地图中查看

处理备注: [输入框]

[关闭] [👀 确认] [✅ 解决] [❌ 忽略]
```

**处理选项：**
- **👀 确认**: 已查看，待后续处理
- **✅ 解决**: 问题已解决（需填写备注）
- **❌ 忽略**: 非问题，忽略此警报

---

## 📊 警报分类

### **按类型分类**
| 类型 | 代码 | 描述 | 触发条件 |
|------|------|------|----------|
| 📍 距离违规 | `distance_violation` | 超出100米但未超过500米 | 100m < 距离 ≤ 500m |
| 🔍 可疑位置 | `suspicious_location` | 距离过远，高度可疑 | 距离 > 500m |
| 📵 位置不可用 | `location_unavailable` | 无法获取GPS位置 | GPS未启用或权限被拒 |
| ⏰ 时间异常 | `time_violation` | 送达时间异常 | （预留，未实现） |
| 📸 缺少照片 | `no_photo` | 送达时未上传照片 | （预留，未实现） |

### **按严重程度分类**
| 严重程度 | 颜色 | 图标 | 距离范围 |
|----------|------|------|----------|
| 🚨 紧急 (critical) | 红色 | 🚨 | > 1000m |
| ⚠️ 高 (high) | 橙色 | ⚠️ | 500m - 1000m |
| ⚡ 中 (medium) | 黄色 | ⚡ | 100m - 500m |
| ℹ️ 低 (low) | 蓝色 | ℹ️ | 其他异常 |

### **按状态分类**
| 状态 | 代码 | 描述 |
|------|------|------|
| ⏳ 待处理 | `pending` | 新创建的警报 |
| 👀 已确认 | `acknowledged` | 管理员已查看 |
| ✅ 已解决 | `resolved` | 问题已处理 |
| ❌ 已忽略 | `dismissed` | 非问题，已忽略 |

---

## 🗄️ 数据库设计

### **delivery_alerts 表结构**

```sql
CREATE TABLE delivery_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 包裹和骑手信息
  package_id VARCHAR(255) NOT NULL,
  courier_id VARCHAR(255) NOT NULL,
  courier_name VARCHAR(255) NOT NULL,
  
  -- 警报分类
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  
  -- 位置信息
  courier_latitude DECIMAL(10, 7) NOT NULL,
  courier_longitude DECIMAL(10, 7) NOT NULL,
  destination_latitude DECIMAL(10, 7),
  destination_longitude DECIMAL(10, 7),
  distance_from_destination DECIMAL(10, 2),
  
  -- 详细信息
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  action_attempted VARCHAR(100),
  
  -- 状态管理
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),
  resolution_notes TEXT,
  
  -- 附加数据
  metadata JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**索引：**
- `idx_delivery_alerts_package_id` - 按包裹ID查询
- `idx_delivery_alerts_courier_id` - 按骑手ID查询
- `idx_delivery_alerts_status` - 按状态筛选
- `idx_delivery_alerts_alert_type` - 按警报类型筛选
- `idx_delivery_alerts_severity` - 按严重程度筛选
- `idx_delivery_alerts_created_at` - 按时间排序
- `idx_delivery_alerts_pending` - 快速查询待处理警报

---

## 🛠️ 技术实现

### **1. 地理围栏服务 (geofenceService.ts)**

```typescript
class GeofenceService {
  private readonly DELIVERY_RADIUS_METERS = 100; // 100米限制
  
  // 哈弗辛公式计算距离
  private calculateDistance(lat1, lon1, lat2, lon2): number
  
  // 获取当前GPS位置
  async getCurrentLocation(): Promise<Location>
  
  // 检查地理围栏
  async checkGeofence(destLat, destLon): Promise<GeofenceResult>
  
  // 创建警报
  async createDeliveryAlert(alert: DeliveryAlert): Promise<boolean>
  
  // 验证送达（主方法）
  async validateDelivery(
    packageId, courierId, courierName,
    destLat, destLon
  ): Promise<ValidationResult>
}
```

### **2. PackageDetailScreen 集成**

```typescript
// 修改 updateStatus 函数
const updateStatus = async (newStatus: string) => {
  if (newStatus === '已送达') {
    // 1. 执行地理围栏验证
    const validation = await geofenceService.validateDelivery(
      currentPackage.id,
      currentUser,
      currentUserName,
      currentPackage.receiver_latitude,
      currentPackage.receiver_longitude
    );
    
    // 2. 处理验证结果
    if (!validation.allowed) {
      // 拒绝并显示错误
      Alert.alert('⚠️ 无法标记已送达', validation.message);
      return;
    }
    
    // 3. 允许则继续更新状态
    proceedWithStatusUpdate(newStatus, validation.message);
  }
};
```

### **3. 管理员页面 (DeliveryAlerts.tsx)**

**功能特性：**
- ✅ 实时数据订阅（Supabase Realtime）
- ✅ 多条件筛选（状态、严重程度）
- ✅ 详细信息模态框
- ✅ 地图位置链接
- ✅ 警报处理工作流
- ✅ 统计数据展示

**实时订阅：**
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('delivery_alerts_channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'delivery_alerts'
    }, (payload) => {
      loadAlerts(); // 实时更新
    })
    .subscribe();
  
  return () => subscription.unsubscribe();
}, []);
```

---

## 📱 权限要求

### **iOS (app.json)**
```json
{
  "infoPlist": {
    "NSLocationWhenInUseUsageDescription": "需要获取您的位置来验证送达地点",
    "NSLocationAlwaysAndWhenInUseUsageDescription": "需要获取您的位置来验证送达地点"
  }
}
```

### **Android (app.json)**
```json
{
  "permissions": [
    "ACCESS_FINE_LOCATION",
    "ACCESS_COARSE_LOCATION"
  ]
}
```

---

## 🎨 用户体验设计

### **骑手端提示信息**
- ✅ 清晰的距离显示
- ✅ 友好的错误提示
- ✅ 明确的操作指引
- ✅ 状态图标和颜色

### **管理员端界面**
- ✅ 统计数据一目了然
- ✅ 颜色编码（红色=紧急，橙色=高，黄色=中）
- ✅ 实时更新通知
- ✅ 地图链接快速查看位置
- ✅ 处理备注和历史记录

---

## 🔄 降级处理策略

### **场景 1: 收件地址没有坐标**
```
策略: 允许操作但创建警报
警报类型: location_unavailable
严重程度: medium
通知: "⚠️ 无法验证送达位置（缺少目标坐标），但已记录到系统"
```

### **场景 2: 无法获取骑手位置**
```
策略: 拒绝操作并创建警报
警报类型: location_unavailable
严重程度: high
通知: "❌ 无法获取您的位置，请检查GPS设置并授予位置权限"
```

### **场景 3: GPS精度过低**
```
策略: 记录GPS精度信息到警报的metadata
允许操作但标记为可疑
```

---

## 📈 数据统计

### **警报统计视图**
```sql
CREATE VIEW delivery_alerts_stats AS
SELECT 
  status,
  severity,
  COUNT(*) as alert_count,
  MIN(created_at) as oldest_alert,
  MAX(created_at) as newest_alert
FROM delivery_alerts
GROUP BY status, severity;
```

### **骑手警报统计**
```sql
SELECT 
  courier_id,
  courier_name,
  COUNT(*) as total_alerts,
  COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
  AVG(distance_from_destination) as avg_distance
FROM delivery_alerts
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY courier_id, courier_name
ORDER BY total_alerts DESC;
```

---

## 🚀 部署步骤

### **1. 创建数据库表**
```bash
# 在 Supabase SQL Editor 中运行
psql -f supabase-delivery-alerts-setup.sql
```

### **2. 安装依赖**
```bash
cd ml-express-mobile-app
npm install expo-location --legacy-peer-deps
```

### **3. 更新 Staff App**
```bash
cd ml-express-mobile-app
npx expo start
# 或者
npm start
```

### **4. 部署 Web 管理后台**
```bash
cd ml-express
npm run build
# 推送到 Netlify/Vercel
```

---

## ✅ 测试清单

### **骑手端测试**
- [ ] 在收件地址100米内点击"已送达" → 应该成功
- [ ] 在收件地址100米外点击"已送达" → 应该被拒绝
- [ ] GPS关闭时点击"已送达" → 应该提示启用GPS
- [ ] 查看错误提示是否清晰
- [ ] 检查距离显示是否准确

### **管理员端测试**
- [ ] 查看警报列表 → 应该显示所有警报
- [ ] 筛选待处理警报 → 应该只显示待处理的
- [ ] 点击警报查看详情 → 应该显示完整信息
- [ ] 点击地图链接 → 应该打开Google Maps
- [ ] 处理警报（确认/解决/忽略） → 应该更新状态
- [ ] 实时订阅 → 新警报应该自动出现

### **数据库测试**
- [ ] 验证表结构
- [ ] 检查索引是否创建
- [ ] 测试查询性能
- [ ] 验证RLS策略

---

## 🔧 故障排除

### **问题 1: GPS精度过低**
```
原因: 室内、高楼密集区、GPS信号弱
解决方案:
1. 提醒骑手到室外
2. 等待GPS精度提高
3. 记录GPS精度到metadata
```

### **问题 2: 警报未显示**
```
原因: Supabase Realtime未连接
解决方案:
1. 检查网络连接
2. 验证Supabase项目配置
3. 检查RLS策略
4. 手动刷新页面
```

### **问题 3: 距离计算不准确**
```
原因: 哈弗辛公式误差、GPS漂移
解决方案:
1. 使用高精度GPS模式
2. 记录GPS精度信息
3. 考虑增加GPS精度阈值
```

---

## 📝 未来优化

### **短期优化**
- [ ] 添加骑手警报历史查看
- [ ] 实现推送通知（FCM/APNs）
- [ ] 添加警报统计图表
- [ ] 导出警报报告（PDF/Excel）

### **中期优化**
- [ ] 机器学习检测异常模式
- [ ] 骑手行为分析和评分
- [ ] 自动化警报处理建议
- [ ] 集成地图路径回放

### **长期优化**
- [ ] 区域化地理围栏（不同区域不同半径）
- [ ] 动态地理围栏（根据地区调整）
- [ ] 预测性警报（提前警告潜在违规）
- [ ] 集成客户反馈系统

---

## 📞 联系支持

如有问题或建议，请联系开发团队。

---

## 📄 相关文档
- `supabase-delivery-alerts-setup.sql` - 数据库设置脚本
- `ml-express-mobile-app/services/geofenceService.ts` - 地理围栏服务
- `ml-express-mobile-app/screens/PackageDetailScreen.tsx` - 骑手端集成
- `src/pages/DeliveryAlerts.tsx` - 管理员后台页面

---

**版本**: 1.0.0  
**创建日期**: 2024-10-15  
**最后更新**: 2024-10-15

