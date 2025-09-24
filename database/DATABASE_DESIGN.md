# 缅甸同城快递系统数据库设计文档

## 📊 数据库概览

### 基本信息
- **数据库名称**: `myanmar_express`
- **字符集**: `utf8mb4`
- **排序规则**: `utf8mb4_unicode_ci`
- **存储引擎**: `InnoDB`
- **设计版本**: `v1.0`

### 设计原则
1. **本地化优先**: 充分考虑缅甸的语言、地址、货币等本地化需求
2. **可扩展性**: 支持业务快速发展和功能扩展
3. **数据完整性**: 完善的外键约束和数据验证
4. **性能优化**: 合理的索引设计和查询优化
5. **安全性**: 敏感数据加密和访问控制

---

## 🗂️ 核心表结构

### 1. 用户表 (users)

**设计目标**: 统一管理所有系统用户（客户、快递员、管理员等）

#### 🌟 缅甸本地化特性
- **多语言姓名**: 支持缅甸文、英文、中文姓名存储
- **NRC身份证**: 支持缅甸国民登记卡号码
- **地址结构**: 按缅甸行政区划设计（省/邦 → 城市 → 镇区 → 区 → 街道）
- **手机格式**: 适配缅甸手机号码格式（09-xxxxxxxxx）
- **语言偏好**: 支持缅甸文、英文、中文界面

#### 📊 关键字段
```sql
-- 多语言姓名
full_name_mm VARCHAR(100)    -- 缅甸文姓名
full_name_en VARCHAR(100)    -- 英文姓名  
full_name_zh VARCHAR(100)    -- 中文姓名

-- 缅甸地址结构
address_state VARCHAR(50)     -- 省/邦 (State/Region)
address_city VARCHAR(50)      -- 城市
address_township VARCHAR(50)  -- 镇区 (Township)
address_ward VARCHAR(50)      -- 区 (Ward)

-- 本地化设置
preferred_language ENUM('mm', 'en', 'zh')
currency ENUM('MMK', 'USD')
timezone VARCHAR(50) DEFAULT 'Asia/Yangon'
```

#### 🔍 索引策略
- 用户名、邮箱、手机号唯一索引
- 用户类型、状态复合索引
- 地理位置空间索引
- 全文搜索索引（姓名）

---

### 2. 订单表 (orders)

**设计目标**: 完整记录订单生命周期，支持复杂的快递业务场景

#### 🌟 缅甸本地化特性
- **双地址系统**: 寄件地址和收件地址完整分离
- **缅甸货币**: 主要使用MMK（缅甸元），支持USD
- **本地时区**: 所有时间字段使用Asia/Yangon时区
- **地理坐标**: 支持GPS定位的精确配送

#### 📊 核心业务字段
```sql
-- 订单编号（缅甸本地化格式）
order_number VARCHAR(50)  -- 格式：MDYYYYMMDDHHmmss##

-- 费用结构（MMK）
base_fee DECIMAL(10,2)      -- 基础费用
weight_fee DECIMAL(10,2)    -- 重量费用
distance_fee DECIMAL(10,2)  -- 距离费用
service_fee DECIMAL(10,2)   -- 服务费用
total_amount DECIMAL(12,2)  -- 总金额

-- 服务类型
service_type ENUM('standard', 'express', 'overnight', 'same_day')
delivery_type ENUM('door_to_door', 'pickup_point', 'express_center')

-- 包裹信息
package_weight DECIMAL(8,3)  -- 重量（公斤）
declared_value DECIMAL(15,2) -- 声明价值（MMK）
```

#### 🔄 状态流转
```sql
status ENUM(
    'draft',           -- 草稿
    'pending',         -- 待确认
    'confirmed',       -- 已确认
    'assigned',        -- 已分配快递员
    'picked_up',       -- 已取件
    'in_transit',      -- 运输中
    'out_for_delivery', -- 派送中
    'delivered',       -- 已送达
    'failed_delivery', -- 配送失败
    'returned',        -- 已退回
    'cancelled',       -- 已取消
    'refunded'         -- 已退款
)
```

---

### 3. 快递员表 (couriers)

**设计目标**: 管理快递员的详细信息、工作状态和绩效数据

#### 🌟 缅甸本地化特性
- **服务区域**: 按缅甸行政区划定义服务范围
- **交通工具**: 适配缅甸常见的配送工具（摩托车、汽车等）
- **工作时间**: 支持灵活的工作时间安排
- **多语言能力**: 记录快递员的语言技能

#### 📊 关键功能字段
```sql
-- 服务区域（JSON存储）
service_states JSON      -- 服务省/邦列表
service_cities JSON      -- 服务城市列表
service_townships JSON   -- 服务镇区列表

-- 交通工具
vehicle_type ENUM('motorbike', 'car', 'van', 'truck', 'bicycle', 'walking')
vehicle_plate_number VARCHAR(20)  -- 车牌号码
driving_license_number VARCHAR(50) -- 驾驶证号码

-- 工作能力
max_weight_capacity DECIMAL(8,2)   -- 最大承重
max_orders_per_day INT             -- 每日最大订单数
working_hours_start TIME           -- 工作开始时间
working_hours_end TIME             -- 工作结束时间

-- 绩效统计
average_rating DECIMAL(3,2)        -- 平均评分
on_time_delivery_rate DECIMAL(5,2) -- 准时送达率
```

#### 📍 实时状态追踪
```sql
current_status ENUM('available', 'busy', 'offline', 'on_delivery', 'break')
current_latitude DECIMAL(10,8)     -- 当前纬度
current_longitude DECIMAL(11,8)    -- 当前经度
last_location_update TIMESTAMP     -- 最后位置更新时间
```

---

### 4. 支付记录表 (payments)

**设计目标**: 支持缅甸主流支付方式，确保交易安全和可追溯

#### 🌟 缅甸本地化特性
- **本地支付方式**: 支持KBZ Pay、Wave Money、AYA Pay、CB Pay等
- **现金交易**: 完整的货到付款(COD)支持
- **多货币**: 主要使用MMK，支持USD汇率转换
- **银行集成**: 支持缅甸主要银行的转账

#### 💳 支付方式
```sql
payment_method ENUM(
    'cash',           -- 现金
    'bank_transfer',  -- 银行转账
    'mobile_payment', -- 移动支付
    'credit_card',    -- 信用卡
    'debit_card',     -- 借记卡
    'digital_wallet', -- 数字钱包
    'cod',            -- 货到付款
    'kbz_pay',        -- KBZ Pay
    'wave_money',     -- Wave Money
    'aya_pay',        -- AYA Pay
    'cb_pay'          -- CB Pay
)
```

#### 💰 费用结构
```sql
amount DECIMAL(12,2)          -- 支付金额
currency ENUM('MMK', 'USD')   -- 货币
exchange_rate DECIMAL(10,6)   -- 汇率
payment_fee DECIMAL(10,2)     -- 支付手续费
gateway_fee DECIMAL(10,2)     -- 网关费用
net_amount DECIMAL(12,2)      -- 净金额
```

---

### 5. 系统配置表 (settings)

**设计目标**: 灵活的系统配置管理，支持多语言和动态配置

#### 🌐 多语言支持
```sql
display_name_mm VARCHAR(200)  -- 缅甸文显示名称
display_name_en VARCHAR(200)  -- 英文显示名称
display_name_zh VARCHAR(200)  -- 中文显示名称
description_mm TEXT           -- 缅甸文描述
description_en TEXT           -- 英文描述
description_zh TEXT           -- 中文描述
```

#### ⚙️ 配置类型
- **system**: 系统基础配置
- **business**: 业务规则配置
- **payment**: 支付相关配置
- **notification**: 通知设置
- **localization**: 本地化配置

#### 📋 预设配置示例
```sql
-- 基础配置
('system', 'default_language', 'mm')
('system', 'default_currency', 'MMK')
('system', 'timezone', 'Asia/Yangon')

-- 业务配置
('business', 'base_delivery_fee', '2000')      -- 基础配送费2000 MMK
('business', 'weight_fee_per_kg', '1000')      -- 每公斤1000 MMK
('business', 'delivery_radius_km', '50')       -- 配送半径50公里

-- 支付配置
('payment', 'accepted_methods', '["cash", "kbz_pay", "wave_money"]')
('payment', 'payment_timeout_minutes', '30')
```

---

### 6. 位置轨迹表 (locations)

**设计目标**: 实时追踪快递员和订单位置，提供精确的配送服务

#### 📍 位置数据
```sql
latitude DECIMAL(10,8)        -- 纬度（8位小数，精度约1米）
longitude DECIMAL(11,8)       -- 经度（8位小数，精度约1米）
altitude DECIMAL(8,2)         -- 海拔
accuracy DECIMAL(8,2)         -- GPS精度
heading DECIMAL(6,2)          -- 方向角
speed DECIMAL(8,2)            -- 速度（km/h）
```

#### 🗺️ 地址反解析
```sql
address_state VARCHAR(50)     -- 省/邦
address_city VARCHAR(50)      -- 城市
address_township VARCHAR(50)  -- 镇区
address_ward VARCHAR(50)      -- 区
address_street VARCHAR(200)   -- 街道
address_full TEXT            -- 完整地址
```

#### 📱 设备信息
```sql
device_type ENUM('mobile_app', 'gps_tracker', 'vehicle_tracker', 'manual')
network_type ENUM('wifi', '4g', '3g', '2g', 'offline')
battery_level TINYINT         -- 电池电量
app_version VARCHAR(50)       -- 应用版本
```

---

## 🔗 表关系图

```
users (1) ←→ (N) orders
  ↓
couriers (1) ←→ (N) orders
  ↓
locations (N) → (1) couriers
  ↓
order_status_history (N) → (1) orders
  ↓
payments (N) → (1) orders
```

---

## 📈 性能优化策略

### 索引设计
1. **主键索引**: 所有表使用BIGINT UNSIGNED自增主键
2. **唯一索引**: 关键业务字段（订单号、用户名、手机号等）
3. **复合索引**: 常用查询组合（状态+时间、用户+状态等）
4. **空间索引**: 地理位置字段（纬度+经度）
5. **全文索引**: 搜索字段（姓名、地址、描述等）

### 分区策略
```sql
-- 按时间分区（建议）
ALTER TABLE orders PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- 位置表按月分区
ALTER TABLE locations PARTITION BY RANGE (YEAR(recorded_at) * 100 + MONTH(recorded_at));
```

### 查询优化
1. **避免SELECT \***: 只查询需要的字段
2. **合理使用LIMIT**: 分页查询避免全表扫描
3. **索引覆盖**: 尽量使用覆盖索引
4. **JOIN优化**: 合理使用LEFT JOIN和INNER JOIN

---

## 🛡️ 安全考虑

### 数据加密
```sql
-- 敏感字段加密存储
password_hash VARCHAR(255)     -- 密码哈希（bcrypt）
nrc_number VARCHAR(50)         -- 身份证号（可考虑加密）
bank_account_number VARCHAR(50) -- 银行账号（建议加密）
```

### 访问控制
1. **角色权限**: 基于用户类型的权限控制
2. **数据隔离**: 用户只能访问自己的数据
3. **操作日志**: 记录所有重要操作
4. **API限流**: 防止恶意请求

### 数据备份
1. **定时备份**: 每日全量备份
2. **增量备份**: 每小时增量备份
3. **异地备份**: 多地备份存储
4. **恢复测试**: 定期恢复测试

---

## 🚀 扩展建议

### 水平扩展
1. **读写分离**: 主从数据库架构
2. **分库分表**: 按地区或时间分库
3. **缓存层**: Redis缓存热点数据
4. **CDN加速**: 静态资源CDN分发

### 功能扩展
1. **多租户**: 支持多个快递公司
2. **API网关**: 统一API管理
3. **消息队列**: 异步处理业务逻辑
4. **数据分析**: 大数据分析平台

---

## 📝 使用示例

### 创建数据库
```bash
mysql -u root -p < database/myanmar_express_database.sql
```

### 基础查询示例
```sql
-- 查询活跃订单
SELECT * FROM active_orders WHERE delivery_urgency = 'today';

-- 计算配送费用
CALL CalculateDeliveryFee(15.5, 2.3, 'express', 50000, @base, @weight, @service, @insurance, @total);
SELECT @total as total_fee;

-- 查询快递员实时位置
SELECT c.employee_id, u.full_name_mm, l.latitude, l.longitude, l.recorded_at
FROM couriers c
JOIN users u ON c.user_id = u.id
JOIN locations l ON c.id = l.courier_id
WHERE c.current_status = 'on_delivery'
  AND l.recorded_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE);
```

---

## 📞 技术支持

如需技术支持或有任何疑问，请联系开发团队。

**设计完成时间**: 2024年12月
**文档版本**: v1.0
**最后更新**: 2024-12-19
