# 数据库结构修复指南

## 问题描述
移动端骑手扫码店铺二维码时出现错误：
```
ERROR 更新包裹状态失败: {"code": "PGRST204", "details": null, "hint": null, "message": "Could not find the 'delivery_store_id' column of 'packages' in the schema cache"}
```

## 问题原因
数据库的`packages`表缺少以下字段：
- `delivery_store_id` - 送达店铺ID
- `delivery_store_name` - 送达店铺名称  
- `store_receive_code` - 店铺收件码

## 解决方案

### 方法1：使用Supabase Dashboard（推荐）

1. **登录Supabase Dashboard**
   - 访问 [supabase.com](https://supabase.com)
   - 登录您的账户
   - 选择您的项目

2. **打开SQL编辑器**
   - 点击左侧菜单的"SQL Editor"
   - 点击"New query"

3. **执行修复脚本**
   ```sql
   -- 添加店铺相关字段到packages表
   ALTER TABLE packages 
   ADD COLUMN IF NOT EXISTS delivery_store_id TEXT,
   ADD COLUMN IF NOT EXISTS delivery_store_name TEXT,
   ADD COLUMN IF NOT EXISTS store_receive_code TEXT;
   
   -- 添加注释说明字段用途
   COMMENT ON COLUMN packages.delivery_store_id IS '送达店铺ID，用于关联delivery_stores表';
   COMMENT ON COLUMN packages.delivery_store_name IS '送达店铺名称，冗余存储便于查询';
   COMMENT ON COLUMN packages.store_receive_code IS '店铺收件码，格式：STORE_店铺ID_时间戳';
   
   -- 创建索引以提高查询性能
   CREATE INDEX IF NOT EXISTS idx_packages_delivery_store_id ON packages(delivery_store_id);
   CREATE INDEX IF NOT EXISTS idx_packages_store_receive_code ON packages(store_receive_code);
   ```

4. **点击"Run"执行脚本**

5. **验证修复结果**
   ```sql
   -- 验证字段是否添加成功
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'packages' 
   AND column_name IN ('delivery_store_id', 'delivery_store_name', 'store_receive_code')
   ORDER BY column_name;
   ```

### 方法2：使用Table Editor

1. **打开Table Editor**
   - 点击左侧菜单的"Table Editor"
   - 选择"packages"表

2. **添加新列**
   - 点击"Add Column"按钮
   - 添加以下三个列：
     - `delivery_store_id` (Text)
     - `delivery_store_name` (Text)  
     - `store_receive_code` (Text)

3. **保存更改**

## 验证修复

### 1. 检查字段是否存在
在SQL编辑器中执行：
```sql
SELECT * FROM packages LIMIT 1;
```
应该能看到新添加的字段。

### 2. 测试移动端扫码功能
1. 打开移动端APP
2. 登录骑手账号
3. 选择一个包裹
4. 点击"扫码"功能
5. 扫描店铺二维码
6. 应该不再出现错误，并且能成功更新包裹状态

### 3. 检查Web端入库功能
1. 登录Web管理后台
2. 进入"快递店管理"
3. 点击任意店铺的"入库"按钮
4. 应该只显示送达该店铺的包裹

## 预期结果

修复后，当骑手扫码店铺二维码时：
- ✅ 不再出现数据库字段错误
- ✅ 包裹状态成功更新为"已送达"
- ✅ 店铺信息正确记录到数据库
- ✅ Web端入库功能正确显示店铺专属包裹

## 注意事项

1. **备份数据**：执行SQL脚本前建议备份数据库
2. **权限检查**：确保有足够的数据库权限执行ALTER TABLE操作
3. **测试验证**：修复后务必测试移动端和Web端功能
4. **监控日志**：观察是否还有其他相关错误

## 如果仍有问题

如果执行修复脚本后仍有问题，请检查：
1. Supabase项目是否正确
2. 数据库连接是否正常
3. 是否有其他表结构问题
4. 移动端代码是否正确部署

## 联系支持

如果按照以上步骤仍无法解决问题，请提供：
1. 具体的错误信息
2. 执行的SQL脚本
3. 数据库表结构截图
4. 移动端错误日志
