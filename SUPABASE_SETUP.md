# Supabase云数据库配置指南

## 🎯 为什么要升级到Supabase？

### 当前问题：
- ❌ 数据存储在浏览器localStorage中，容易丢失
- ❌ 无法多设备同步
- ❌ 无法团队协作
- ❌ 数据没有备份保障

### 升级后优势：
- ✅ 专业级PostgreSQL数据库
- ✅ 多设备实时同步
- ✅ 数据永不丢失，自动备份
- ✅ 支持团队协作
- ✅ 高性能，支持大量数据

## 🚀 快速配置步骤

### 1. 创建Supabase项目
1. 访问 [supabase.com](https://supabase.com)
2. 点击"Start your project"
3. 使用GitHub账号登录
4. 点击"New Project"
5. 选择组织，输入项目名称：`ml-express-db`
6. 设置数据库密码（请记住）
7. 选择地区：`Southeast Asia (Singapore)`
8. 点击"Create new project"

### 2. 获取项目配置
项目创建完成后：
1. 进入项目Dashboard
2. 点击左侧"Settings" → "API"
3. 复制以下信息：
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. 配置环境变量

#### 方法1：在Netlify中配置（推荐）
1. 登录 [Netlify](https://app.netlify.com)
2. 进入您的网站项目
3. 点击"Site settings" → "Environment variables"
4. 添加以下变量：
   ```
   REACT_APP_SUPABASE_URL = https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
5. 重新部署网站

#### 方法2：在网站中临时配置
1. 访问 `/admin/cloud-upgrade`
2. 点击配置按钮
3. 输入Supabase URL和Key
4. 保存配置

### 4. 创建数据库表
1. 在Supabase项目中，点击"SQL Editor"
2. 运行以下SQL脚本：

```sql
-- 创建员工表
CREATE TABLE employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_id VARCHAR(20) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'accountant', 'manager', 'admin')),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  address TEXT,
  id_number VARCHAR(50) UNIQUE,
  join_date DATE NOT NULL,
  salary INTEGER DEFAULT 450000,
  avatar_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建订单表
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  sender_address TEXT NOT NULL,
  receiver_name VARCHAR(100) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  receiver_address TEXT NOT NULL,
  package_type VARCHAR(50) NOT NULL,
  weight DECIMAL(10,2) NOT NULL,
  distance DECIMAL(10,2) NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  courier_id UUID REFERENCES employees(id),
  courier_name VARCHAR(100),
  courier_phone VARCHAR(20),
  service_type VARCHAR(50) NOT NULL,
  description TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  actual_delivery TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. 迁移现有数据
1. 访问 `/admin/cloud-upgrade`
2. 确认Supabase连接状态
3. 点击"迁移到云端"
4. 等待迁移完成
5. 点击"启用云同步"

## 🛡️ 安全配置

### 行级安全性 (RLS)
在SQL Editor中运行：
```sql
-- 启用行级安全性
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
CREATE POLICY "Allow all operations" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON orders FOR ALL USING (true);
```

## 📞 技术支持

如果配置过程中遇到问题：
1. 检查Supabase项目是否正确创建
2. 确认API密钥是否正确复制
3. 检查网络连接
4. 查看浏览器控制台错误信息

配置完成后，您将享受到：
- 🌍 多设备同步
- 🔒 数据安全保障  
- 👥 团队协作支持
- ⚡ 高性能查询
- 📈 无限扩容能力
