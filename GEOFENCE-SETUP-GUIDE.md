# 🚀 地理围栏安全系统 - 快速设置指南

## 📋 设置步骤

### **步骤 1: 创建数据库表**

在 Supabase 的 SQL Editor 中运行以下脚本：

```bash
📁 打开文件: supabase-delivery-alerts-setup.sql
🔽 复制所有内容
📊 在 Supabase Dashboard > SQL Editor 中粘贴并运行
```

**验证：**
```sql
SELECT COUNT(*) FROM delivery_alerts;
-- 应该返回 0（表为空，但表已创建）
```

---

### **步骤 2: 安装 Staff App 依赖**

```bash
cd ml-express-mobile-app
npm install expo-location --legacy-peer-deps
```

**验证：**
```bash
grep "expo-location" package.json
# 应该显示: "expo-location": "~XX.X.X"
```

---

### **步骤 3: 重启 Staff App**

```bash
cd ml-express-mobile-app
npx expo start

# 或者
npm start
```

按 `r` 重新加载应用

---

### **步骤 4: 测试骑手端**

1. **登录骑手账号**
2. **进入任意包裹详情页**
3. **点击"✓ 已送达"按钮**
4. **查看地理围栏验证提示**

**预期结果：**
- ✅ 如果在100米内：显示"位置验证通过"
- ❌ 如果超出100米：显示"您距离收件地址还有 XXX 米"并拒绝操作

---

### **步骤 5: 部署 Web 管理后台**

```bash
cd ml-express
npm run build
git add -A
git commit -m "Add delivery alerts page"
git push

# Netlify 会自动部署
```

---

### **步骤 6: 测试管理员端**

1. **登录管理员账号**
2. **在主仪表盘点击"🚨 配送警报"卡片**
3. **或直接访问**: `https://your-domain.com/admin/delivery-alerts`

**预期结果：**
- ✅ 看到警报管理页面
- ✅ 筛选器正常工作
- ✅ 可以点击警报查看详情

---

## 🧪 完整测试流程

### **测试 1: 正常送达（100米内）**

1. 骑手移动到收件地址附近（100米内）
2. 点击"✓ 已送达"
3. **预期**：
   - ✅ 显示"位置验证通过（距离收件地址 XX 米）"
   - ✅ 弹出确认对话框
   - ✅ 点击确认后成功标记已送达
   - ✅ 不创建警报

---

### **测试 2: 距离违规（100-500米）**

1. 骑手在收件地址200米外
2. 点击"✓ 已送达"
3. **预期**：
   - ❌ 显示"您距离收件地址还有 200 米"
   - ❌ 显示"必须在 100 米范围内才能标记已送达"
   - ⚠️ 显示"此异常操作已记录并通知管理员"
   - ⚠️ 拒绝操作
   - 📝 自动创建警报（severity: medium）

4. 管理员端查看：
   - ✅ 警报列表出现新警报
   - ✅ 严重程度显示为"⚡ 中"
   - ✅ 距离显示为"200 米"

---

### **测试 3: 可疑位置（>500米）**

1. 骑手在收件地址1000米外
2. 点击"✓ 已送达"
3. **预期**：
   - 🚨 显示"您距离收件地址还有 1000 米"
   - 🚨 显示"警报级别: 紧急"
   - ❌ 拒绝操作
   - 📝 自动创建警报（severity: critical）

4. 管理员端查看：
   - ✅ 警报以红色高亮显示
   - ✅ 严重程度显示为"🚨 紧急"
   - ✅ 统计面板"紧急警报"数量 +1

---

### **测试 4: GPS未启用**

1. 骑手关闭GPS或拒绝位置权限
2. 点击"✓ 已送达"
3. **预期**：
   - ❌ 显示"无法获取您的位置"
   - ❌ 显示"请检查GPS设置并授予位置权限"
   - ❌ 拒绝操作
   - 📝 创建警报（alert_type: location_unavailable）

---

### **测试 5: 管理员处理警报**

1. 管理员登录后台
2. 进入"配送警报"页面
3. 点击任意待处理警报
4. 查看详细信息（位置、距离、骑手、包裹）
5. 点击地图链接验证位置
6. 填写处理备注
7. 点击"✅ 解决"
8. **预期**：
   - ✅ 警报状态变为"已解决"
   - ✅ 警报从"待处理"列表移除
   - ✅ 备注已保存

---

## 🎯 关键指标

### **骑手端**
- ✅ GPS定位时间: < 5秒
- ✅ 距离计算精度: ±10米
- ✅ 用户反馈延迟: < 2秒

### **管理员端**
- ✅ 警报实时更新: < 3秒
- ✅ 页面加载时间: < 2秒
- ✅ 筛选响应时间: < 1秒

---

## 🔧 常见问题

### **Q1: 为什么没有创建警报？**
**A:** 检查以下：
1. Supabase 数据库表是否创建成功
2. RLS 策略是否正确
3. 网络连接是否正常
4. 查看浏览器/应用控制台的错误信息

```sql
-- 验证表是否存在
SELECT * FROM delivery_alerts LIMIT 1;

-- 检查RLS策略
SELECT * FROM pg_policies WHERE tablename = 'delivery_alerts';
```

---

### **Q2: GPS定位不准确怎么办？**
**A:** 
1. 确保骑手在室外开阔区域
2. 等待GPS精度提高（accuracy < 50米）
3. 检查设备GPS设置
4. 重启应用重新获取位置

---

### **Q3: 管理员看不到新警报？**
**A:**
1. 手动刷新页面
2. 检查 Supabase Realtime 连接状态
3. 验证用户权限（需要 admin 或 manager 角色）
4. 查看浏览器控制台错误

```typescript
// 在浏览器控制台测试 Realtime
const { data, error } = await supabase
  .from('delivery_alerts')
  .select('*')
  .limit(1);
console.log('Query result:', data, error);
```

---

### **Q4: 如何调整地理围栏半径？**
**A:**
修改 `ml-express-mobile-app/services/geofenceService.ts`:

```typescript
// 将100米改为其他值（例如200米）
private readonly DELIVERY_RADIUS_METERS = 200;
```

然后重新编译应用。

---

## 📊 监控和维护

### **每日检查**
```sql
-- 查看今天的警报统计
SELECT 
  alert_type,
  severity,
  COUNT(*) as count
FROM delivery_alerts
WHERE created_at >= CURRENT_DATE
GROUP BY alert_type, severity;
```

### **每周检查**
```sql
-- 查看本周待处理警报
SELECT COUNT(*) 
FROM delivery_alerts
WHERE status = 'pending'
AND created_at >= CURRENT_DATE - INTERVAL '7 days';
```

### **问题骑手识别**
```sql
-- 查找高频违规骑手
SELECT 
  courier_name,
  COUNT(*) as violation_count,
  AVG(distance_from_destination) as avg_distance
FROM delivery_alerts
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND alert_type IN ('distance_violation', 'suspicious_location')
GROUP BY courier_name
HAVING COUNT(*) > 3
ORDER BY violation_count DESC;
```

---

## ✅ 设置完成检查清单

- [ ] ✅ 数据库表已创建（delivery_alerts）
- [ ] ✅ 索引已创建（6个索引）
- [ ] ✅ RLS 策略已启用
- [ ] ✅ expo-location 已安装
- [ ] ✅ Staff App 可以正常启动
- [ ] ✅ 骑手可以看到地理围栏提示
- [ ] ✅ 警报可以成功创建
- [ ] ✅ Web 管理后台已部署
- [ ] ✅ 管理员可以查看警报列表
- [ ] ✅ 管理员可以处理警报
- [ ] ✅ 实时订阅正常工作
- [ ] ✅ 地图链接可以正常打开

---

## 🎉 完成！

系统已成功设置！现在您可以：
- ✅ 限制骑手在100米内才能标记已送达
- ✅ 自动检测和记录异常操作
- ✅ 实时通知管理员
- ✅ 查看详细的警报信息
- ✅ 追踪和管理配送安全

---

## 📞 需要帮助？

查看完整文档：`GEOFENCE-DELIVERY-SECURITY.md`

---

**版本**: 1.0.0  
**创建日期**: 2024-10-15

