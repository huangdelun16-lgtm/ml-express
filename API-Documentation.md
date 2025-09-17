# ML Express API 接口文档

## 基础信息
- **基础URL**: `https://market-link-express.com/.netlify/functions/`
- **认证方式**: 通过请求头传递用户信息
  - `x-ml-actor`: 用户名
  - `x-ml-role`: 用户角色 (可选)

## 主要API接口

### 1. 包裹管理 API
**端点**: `packages-manage`

#### GET - 获取包裹列表
```
GET /.netlify/functions/packages-manage?page=1&pageSize=10&search=单号&biz=city
```
**参数**:
- `page`: 页码 (默认1)
- `pageSize`: 每页数量 (默认10)
- `search`: 搜索关键词 (单号/收件人/目的地)
- `biz`: 业务类型 (`city`同城 / `cross`跨境)
- `status`: 包裹状态过滤

**响应**:
```json
{
  "items": [
    {
      "id": "包裹ID",
      "tracking_no": "运单号",
      "sender": "寄件人",
      "receiver": "收件人", 
      "destination": "目的地",
      "status": "包裹状态",
      "fee": 2000,
      "weightKg": 1.5,
      "createdAt": "2024-01-01",
      "orderDate": "2024-01-01",
      "biz": "city"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 10
}
```

#### POST - 创建新包裹
```
POST /.netlify/functions/packages-manage
Content-Type: application/json

{
  "trackingNumber": "运单号",
  "sender": "寄件人",
  "receiver": "收件人",
  "destination": "目的地", 
  "packageType": "包裹类型",
  "weightKg": 1.5,
  "fee": 2000,
  "status": "待预付",
  "biz": "city",
  "orderDate": "2024-01-01"
}
```

#### PATCH - 更新包裹
```
PATCH /.netlify/functions/packages-manage
Content-Type: application/json

{
  "id": "包裹ID",
  "status": "已签收",
  "signedDate": "2024-01-01"
}
```

#### DELETE - 删除包裹
```
DELETE /.netlify/functions/packages-manage
Content-Type: application/json

{
  "id": "包裹ID"
}
```

### 2. 财务管理 API
**端点**: `finances-manage`

#### GET - 获取财务记录
```
GET /.netlify/functions/finances-manage?page=1&type=收入&biz=city
```
**参数**:
- `page`: 页码
- `type`: 类型 (`收入`/`支出`)
- `biz`: 业务类型 (`city`/`cross`)
- `start`: 开始日期 (YYYY-MM-DD)
- `end`: 结束日期 (YYYY-MM-DD)
- `search`: 搜索关键词

**响应**:
```json
{
  "items": [
    {
      "id": "记录ID",
      "type": "收入",
      "category": "运费",
      "amount": 2000,
      "tracking_no": "运单号",
      "receiver": "收件人",
      "destination": "目的地",
      "date": "2024-01-01",
      "status": "已入账"
    }
  ],
  "summary": {
    "income": 50000,
    "expense": 10000,
    "net": 40000
  }
}
```

#### POST - 创建财务记录
```
POST /.netlify/functions/finances-manage
Content-Type: application/json

{
  "type": "收入",
  "category": "运费", 
  "amount": 2000,
  "note": "运费收入",
  "date": "2024-01-01",
  "tracking_no": "运单号"
}
```

### 3. 运输管理 API
**端点**: `transport-manage`

#### GET - 获取运单列表
```
GET /.netlify/functions/transport-manage?page=1
```

#### POST - 创建/更新运单
```
POST /.netlify/functions/transport-manage
Content-Type: application/json

{
  "freightNo": "货运号",
  "vehicleNo": "车牌号", 
  "departDate": "2024-01-01",
  "arrivalDate": "2024-01-02",
  "packages": ["运单号1", "运单号2"]
}
```

### 4. 用户认证 API
**端点**: `auth-login`

#### POST - 用户登录
```
POST /.netlify/functions/auth-login
Content-Type: application/json

{
  "username": "用户名",
  "password": "密码"
}
```

**响应**:
```json
{
  "success": true,
  "user": {
    "username": "用户名",
    "role": "staff"
  },
  "token": "JWT_TOKEN"
}
```

### 5. 包裹扫码更新 API
**端点**: `package-scan-update`

#### POST - 扫码更新包裹状态
```
POST /.netlify/functions/package-scan-update
Content-Type: application/json

{
  "tracking_no": "运单号",
  "status": "运输中",
  "location": "当前位置"
}
```

### 6. 数据统计 API
**端点**: `metrics`

#### GET - 获取业务统计
```
GET /.netlify/functions/metrics
```

**响应**:
```json
{
  "packages": {
    "total": 1000,
    "city": 600,
    "cross": 400,
    "pending": 50,
    "inTransit": 200,
    "delivered": 750
  },
  "finance": {
    "totalIncome": 2000000,
    "totalExpense": 300000,
    "netProfit": 1700000
  }
}
```

## 手机APP推荐使用的核心API

### 📱 客户端APP (下单/查询)
1. **包裹管理**: `packages-manage`
   - 创建订单 (POST)
   - 查询包裹状态 (GET)

2. **财务查询**: `finances-manage`
   - 查看费用明细 (GET)

### 📱 管理员APP (运营管理)
1. **包裹管理**: `packages-manage`
   - 完整的CRUD操作

2. **财务管理**: `finances-manage` 
   - 收入支出管理

3. **运输管理**: `transport-manage`
   - 运单管理
   - 包裹调度

4. **扫码功能**: `package-scan-update`
   - 快速更新包裹状态

## 错误处理
所有API都返回标准HTTP状态码：
- `200`: 成功
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 权限不足
- `500`: 服务器错误

错误响应格式：
```json
{
  "message": "错误描述"
}
```

## 认证说明
大部分读取操作无需认证，写入操作需要相应权限：
- `customer`: 客户 (可创建订单)
- `staff`: 员工 (基础操作)
- `manager`: 经理 (高级操作)
- `master`: 超级管理员 (所有权限)
