# 🔍 时间计算调试指南

## ❌ 当前问题

订单号时间与实际时间不匹配：
- **实际时间**：13:38（缅甸时间）
- **订单号时间**：0708（07:08）
- **年份错误**：2025（应该是2024）

## 🔍 问题分析

### 问题1：时间计算错误

当前代码可能存在的问题：
```javascript
const localOffset = now.getTimezoneOffset() * 60 * 1000;
const utcTime = now.getTime() + localOffset;
```

**问题**：
- `getTimezoneOffset()` 返回的是本地时区相对于UTC的偏移（分钟）
- 如果本地时间是缅甸时间（UTC+6:30），`getTimezoneOffset()` 返回 `-390`（分钟）
- 但是 `now.getTime()` 返回的是UTC时间戳，不需要再加本地偏移

### 问题2：年份错误

年份显示为2025而不是2024，可能是：
- 系统时间设置错误
- 或者时间计算逻辑导致年份错误

---

## ✅ 正确的实现方法

### 方法1：直接使用UTC时间 + 缅甸时区偏移（推荐）

```javascript
const generateMyanmarPackageId = (senderAddress?: string) => {
  // 获取当前UTC时间戳（毫秒）
  const now = new Date();
  const utcTime = now.getTime();
  
  // 缅甸时区偏移：UTC+6:30 = +6.5小时 = +23400000毫秒
  const myanmarOffset = 6.5 * 60 * 60 * 1000;
  
  // 计算缅甸时间
  const myanmarTime = new Date(utcTime + myanmarOffset);
  
  // 使用UTC方法获取日期时间组件
  const year = myanmarTime.getUTCFullYear();
  const month = String(myanmarTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(myanmarTime.getUTCDate()).padStart(2, '0');
  const hour = String(myanmarTime.getUTCHours()).padStart(2, '0');
  const minute = String(myanmarTime.getUTCMinutes()).padStart(2, '0');
  
  // ... 其余代码
}
```

### 方法2：使用Intl API（更准确）

```javascript
const generateMyanmarPackageId = (senderAddress?: string) => {
  // 使用Intl API获取缅甸时间
  const myanmarTimeString = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Yangon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // 解析时间字符串
  // 格式：MM/DD/YYYY, HH:MM:SS
  const [datePart, timePart] = myanmarTimeString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute] = timePart.split(':');
  
  // ... 其余代码
}
```

---

## 🔧 修复步骤

### 步骤1：修复时间计算逻辑

使用正确的方法计算缅甸时间：
- 直接使用UTC时间戳
- 加上缅甸时区偏移（+6.5小时）
- 使用UTC方法获取日期时间组件

### 步骤2：验证年份

确保系统时间正确，或者使用Intl API自动获取正确的年份。

---

## 🧪 测试方法

### 测试步骤

1. **获取当前缅甸时间**
   - 访问：https://time.is/Yangon
   - 记录当前缅甸时间（例如：13:38）

2. **创建订单**
   - 在客户端Web创建订单
   - 记录生成的订单ID

3. **验证订单ID时间**
   - 订单ID格式：`MDY202411171338XX`
   - 检查日期部分（`20241117`）是否正确
   - 检查时间部分（`1338`）是否与下单时间（13:38）一致

---

## 📋 检查清单

- [ ] ✅ 时间计算逻辑正确
- [ ] ✅ 年份正确（2024而不是2025）
- [ ] ✅ 时间与缅甸时间一致
- [ ] ✅ 日期格式正确

---

**文档创建时间**: 2025-01-16

