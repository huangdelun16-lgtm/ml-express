# 👤 用户认证集成说明

## 📖 概述

客户端App现已与Web后台的"用户管理"系统完全集成，使用统一的`users`数据表进行用户管理。

## 🔗 数据库集成

### 数据表：`users`

客户端App和Web后台共享同一个`users`表，实现数据同步。

#### 表结构

```typescript
interface User {
  id: string;                    // 用户ID
  name: string;                  // 用户姓名
  phone: string;                 // 手机号码
  email: string;                 // 电子邮箱
  address: string;               // 地址
  password: string;              // 密码
  user_type: 'customer' | 'courier' | 'admin';  // 用户类型
  status: 'active' | 'inactive' | 'suspended';  // 账号状态
  registration_date: string;     // 注册日期
  last_login: string;            // 最后登录时间
  total_orders: number;          // 总订单数
  total_spent: number;           // 总消费金额
  rating: number;                // 用户评分
  notes: string;                 // 备注
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
}
```

## ✨ 功能特性

### 1. 用户注册

#### 功能说明
- ✅ 完整的表单验证
- ✅ 邮箱格式验证
- ✅ 手机号格式验证
- ✅ 密码强度检查（最少6位）
- ✅ 密码确认验证
- ✅ 重复注册检测（邮箱和手机号）
- ✅ 多语言支持（中文/英文/缅甸语）
- ✅ 优美的UI设计

#### 注册流程
1. 用户填写注册信息：
   - 姓名（必填）
   - 邮箱（必填，格式验证）
   - 手机号（必填，格式验证）
   - 密码（必填，最少6位）
   - 确认密码（必填，需匹配）
   - 地址（可选）

2. 提交验证：
   - 检查所有必填字段
   - 验证邮箱格式
   - 验证手机号格式
   - 检查密码长度
   - 验证密码一致性

3. 数据库操作：
   - 检查邮箱是否已注册
   - 检查手机号是否已注册
   - 生成唯一用户ID
   - 创建用户记录（user_type: 'customer'）
   - 初始化用户统计数据

4. 成功处理：
   - 显示成功提示
   - 自动跳转到登录页面

#### 默认值设置
```typescript
{
  user_type: 'customer',         // 默认为客户
  status: 'active',              // 默认激活
  registration_date: '当前日期',
  last_login: '从未登录',
  total_orders: 0,
  total_spent: 0,
  rating: 0,
  notes: '通过客户端APP注册'
}
```

### 2. 用户登录

#### 功能说明
- ✅ 支持邮箱登录
- ✅ 支持手机号登录
- ✅ 账号状态检查
- ✅ 密码验证
- ✅ 访客模式
- ✅ 自动更新登录时间
- ✅ 多语言支持

#### 登录流程
1. 输入凭证：
   - 邮箱或手机号
   - 密码

2. 验证过程：
   - 查找用户（支持邮箱/手机号）
   - 检查用户类型（仅允许customer登录）
   - 检查账号状态（active/inactive/suspended）
   - 验证密码

3. 登录成功：
   - 更新最后登录时间
   - 保存用户信息到本地：
     - userId
     - userEmail
     - userName
     - userPhone
   - 跳转到主页

4. 错误处理：
   - "用户不存在"
   - "密码错误"
   - "账号已被停用，请联系客服"

#### 访客模式
- 无需注册即可浏览App
- 保存访客标识到本地
- 部分功能受限（如下单）

### 3. Web后台集成

#### 在Web后台查看客户
Web后台 → 用户管理 → 筛选"客户"类型

可以看到：
- 通过App注册的所有客户
- 客户的详细信息
- 登录记录
- 订单统计
- 消费记录

#### 在Web后台管理客户
管理员可以：
- ✅ 查看客户详细信息
- ✅ 编辑客户资料
- ✅ 修改客户状态（激活/停用/冻结）
- ✅ 重置客户密码
- ✅ 查看客户订单历史
- ✅ 添加备注信息

#### 状态控制
- `active`: 正常使用
- `inactive`: 账号停用，无法登录
- `suspended`: 账号冻结，无法登录

当管理员在Web后台将客户状态改为`inactive`或`suspended`时，该客户将无法登录App。

## 🔐 安全说明

### 当前实现
- ✅ 用户类型限制（仅customer可登录客户端App）
- ✅ 账号状态验证
- ✅ 重复注册防护
- ✅ 输入格式验证
- ⚠️ 密码明文存储

### 安全建议（生产环境）
1. **密码加密**：
   - 使用bcrypt或类似算法加密密码
   - 存储哈希值而非明文

2. **Token认证**：
   - 实现JWT token认证
   - 设置token过期时间

3. **HTTPS**：
   - 所有API请求使用HTTPS
   - 防止中间人攻击

4. **验证码**：
   - 登录添加图形验证码
   - 注册添加手机验证码

5. **日志记录**：
   - 记录登录尝试
   - 记录异常操作

## 📱 使用示例

### 注册新用户

```typescript
import { customerService } from '../services/supabase';

const registerUser = async () => {
  const result = await customerService.register({
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '09123456789',
    password: '123456',
    address: '仰光市中心区'
  });

  if (result.success) {
    console.log('注册成功:', result.data);
  } else {
    console.error('注册失败:', result.error.message);
  }
};
```

### 用户登录

```typescript
import { customerService } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const loginUser = async () => {
  // 支持邮箱或手机号登录
  const result = await customerService.login(
    'zhangsan@example.com',  // 或 '09123456789'
    '123456'
  );

  if (result.success) {
    // 保存用户信息
    await AsyncStorage.setItem('userId', result.data.id);
    await AsyncStorage.setItem('userName', result.data.name);
    
    console.log('登录成功');
  } else {
    console.error('登录失败:', result.error.message);
  }
};
```

### 获取用户信息

```typescript
const getUserInfo = async () => {
  const userId = await AsyncStorage.getItem('userId');
  const user = await customerService.getCustomer(userId);
  
  if (user) {
    console.log('用户信息:', user);
  }
};
```

### 修改密码

```typescript
const changePassword = async () => {
  const userId = await AsyncStorage.getItem('userId');
  const result = await customerService.changePassword(
    userId,
    '旧密码',
    '新密码'
  );

  if (result.success) {
    console.log('密码修改成功');
  } else {
    console.error('修改失败:', result.error.message);
  }
};
```

## 🎨 UI/UX特点

### 登录页面
- 🎨 渐变背景（与Web一致）
- 🏢 公司Logo展示
- 📝 清晰的表单布局
- 👤 访客模式选项
- 🔗 快速注册链接
- ⌨️ 键盘自适应

### 注册页面
- 🎨 现代化设计
- ✅ 实时表单验证
- 💬 清晰的错误提示
- 🌍 三语言支持
- 📱 响应式布局

### 加载动画
- 🚚 品牌卡车动画
- 💬 自定义加载消息
- ⏱️ 视觉反馈

## 🔄 数据同步

### App → Web
当用户通过App注册时：
1. 数据立即写入`users`表
2. Web后台可实时查看新用户
3. 管理员可立即管理该用户

### Web → App
当管理员在Web后台操作时：
1. 修改用户状态 → App下次登录时生效
2. 修改用户信息 → App重新获取信息时更新
3. 重置密码 → 用户需使用新密码登录

## 📊 统计信息自动更新

### 订单统计
当用户下单时，自动更新：
- `total_orders`: 总订单数 +1
- `total_spent`: 总消费金额 +订单金额

### 登录记录
每次登录时自动更新：
- `last_login`: 更新为当前时间

## 🛠️ 调试提示

### 测试账号
可以在Web后台手动创建测试账号：
1. 进入"用户管理"
2. 点击"添加用户"
3. 设置user_type为"customer"
4. 设置密码
5. 保存

### 查看日志
```typescript
// 在customerService中查看详细日志
console.log('注册结果:', result);
console.log('登录结果:', result);
```

### 常见问题

**Q: 注册后无法登录？**
A: 检查user_type是否为'customer'，status是否为'active'

**Q: Web后台看不到App注册的用户？**
A: 检查数据库连接，确认使用的是同一个Supabase项目

**Q: 修改密码后旧密码仍可使用？**
A: 清除App缓存，重新登录

**Q: 访客模式有什么限制？**
A: 访客无法下单、查看订单、修改个人信息等

## 📝 后续优化建议

1. **密码安全**
   - [ ] 实现密码加密
   - [ ] 添加密码找回功能
   - [ ] 密码强度提示

2. **手机验证**
   - [ ] 注册时发送验证码
   - [ ] 登录时可选验证码
   - [ ] 手机号绑定

3. **社交登录**
   - [ ] Facebook登录
   - [ ] Google登录
   - [ ] 微信登录

4. **安全增强**
   - [ ] 实现JWT token
   - [ ] 添加刷新token机制
   - [ ] 设备绑定

5. **用户体验**
   - [ ] 记住登录状态
   - [ ] 生物识别登录（指纹/面部）
   - [ ] 一键登录

## ✅ 测试清单

- [x] 注册功能测试
  - [x] 正常注册
  - [x] 重复邮箱
  - [x] 重复手机号
  - [x] 密码不匹配
  - [x] 格式验证

- [x] 登录功能测试
  - [x] 邮箱登录
  - [x] 手机号登录
  - [x] 错误密码
  - [x] 不存在的用户
  - [x] 停用账号

- [x] Web后台集成
  - [x] 查看App注册用户
  - [x] 编辑用户信息
  - [x] 修改用户状态
  - [x] 查看登录记录

- [x] UI/UX测试
  - [x] 三语言切换
  - [x] 加载动画
  - [x] 错误提示
  - [x] 访客模式

## 🎉 完成状态

✅ 客户端App已完全集成Web后台用户管理系统
✅ 数据库统一使用`users`表
✅ 支持实时数据同步
✅ 完整的用户认证流程
✅ 优美的UI设计
✅ 多语言支持

现在客户可以：
- 通过App注册账号
- 使用邮箱或手机号登录
- 管理员可在Web后台查看和管理所有客户
- 实现完整的用户生命周期管理

