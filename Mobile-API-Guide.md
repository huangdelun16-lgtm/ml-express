# 🚀 手机APP API 接入指南

## 快速开始

### 基础配置
```javascript
const API_BASE = 'https://market-link-express.com/.netlify/functions/';
const headers = {
  'Content-Type': 'application/json',
  'x-ml-actor': '用户名', // 必需
  'x-ml-role': '用户角色'  // 可选
};
```

## 🎯 核心API (手机APP必需)

### 1. 📦 包裹管理 - `packages-manage`

#### 客户下单
```javascript
// POST 创建新订单
fetch(`${API_BASE}packages-manage`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    trackingNumber: 'C240101001', // 同城自动生成，跨境手动输入
    sender: '张三',
    receiver: '李四', 
    destination: '仰光',
    packageType: '同城·文件',
    weightKg: 1.5,
    fee: 2000, // 同城2000，跨境0
    status: '待预付', // 同城待预付，跨境待入库
    biz: 'city', // city同城 / cross跨境
    orderDate: '2024-01-01'
  })
});
```

#### 查询包裹
```javascript
// GET 查询包裹列表/单个包裹
fetch(`${API_BASE}packages-manage?search=C240101001&biz=city`)
```

#### 更新包裹状态
```javascript
// PATCH 更新包裹 (管理员)
fetch(`${API_BASE}packages-manage`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    id: '包裹ID',
    status: '已签收',
    signedDate: '2024-01-01'
  })
});
```

### 2. 💰 财务查询 - `finances-manage`

#### 查看费用/收入
```javascript
// GET 财务记录
fetch(`${API_BASE}finances-manage?biz=city&type=收入&page=1`)
```

### 3. 🚚 运输管理 - `transport-manage` (管理员)

#### 创建运单
```javascript
// POST 创建运单
fetch(`${API_BASE}transport-manage`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    freightNo: 'F240101001',
    vehicleNo: '1A-2345',
    departDate: '2024-01-01',
    arrivalDate: '2024-01-02',
    packages: ['C240101001', 'C240101002']
  })
});
```

### 4. 📱 扫码更新 - `package-scan-update`

#### 扫码更新状态
```javascript
// POST 扫码更新 (员工/管理员)
fetch(`${API_BASE}package-scan-update`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    tracking_no: 'C240101001',
    status: '运输中',
    location: '仰光转运中心'
  })
});
```

### 5. 🔐 用户登录 - `auth-login`

#### 用户认证
```javascript
// POST 登录
const response = await fetch(`${API_BASE}auth-login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: '用户名',
    password: '密码'
  })
});

const { success, user, token } = await response.json();
// 保存token用于后续请求
```

## 📊 数据格式

### 包裹状态
- `待预付` - 同城包裹等待付款
- `待入库` - 跨境包裹等待入库
- `已入库` - 包裹已入库
- `运输中` - 包裹运输中
- `已签收` - 包裹已签收
- `已取消` - 包裹已取消

### 业务类型
- `city` - 同城快递
- `cross` - 跨境快递

### 用户角色
- `customer` - 客户 (可下单)
- `staff` - 员工 (基础操作)
- `manager` - 经理 (高级操作)
- `master` - 超级管理员

## 🎯 手机APP功能建议

### 📱 客户端APP
1. **下单功能** - 使用 `packages-manage` POST
2. **订单查询** - 使用 `packages-manage` GET  
3. **费用查询** - 使用 `finances-manage` GET
4. **物流跟踪** - 使用 `packages-manage` GET + 状态显示

### 📱 管理员APP
1. **包裹管理** - `packages-manage` 完整CRUD
2. **财务管理** - `finances-manage` 收支管理
3. **运输调度** - `transport-manage` 运单管理
4. **扫码功能** - `package-scan-update` 快速更新
5. **数据统计** - `metrics` 业务报表

## ⚡ 性能优化建议

1. **缓存数据** - API返回有缓存头，合理利用
2. **分页加载** - 使用 `page` 和 `pageSize` 参数
3. **精确搜索** - 使用 `search` 参数减少数据传输
4. **状态过滤** - 使用 `status` 和 `biz` 参数

## 🔒 安全注意事项

1. **用户认证** - 敏感操作需要正确的 `x-ml-actor` 头
2. **权限控制** - 不同角色有不同操作权限
3. **数据验证** - 客户端也要做基础数据验证
4. **错误处理** - 处理网络错误和API错误响应

---

**总结**: 手机APP主要使用 `packages-manage`、`finances-manage`、`transport-manage` 这三个核心API，配合 `auth-login` 做用户认证，就可以实现完整的快递管理功能！🎉
