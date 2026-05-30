# 配送照片功能数据库设置指南

## 📋 概述
本指南将帮助您设置配送照片功能，使"包裹送达图片"模态框能够显示骑手实际拍摄的照片。

## 🗄️ 数据库设置

### 1. 创建配送照片表
在Supabase SQL编辑器中执行以下SQL脚本：

```sql
-- 创建配送照片表
CREATE TABLE IF NOT EXISTS delivery_photos (
  id SERIAL PRIMARY KEY,
  package_id TEXT NOT NULL,
  photo_url TEXT,
  photo_base64 TEXT, -- 存储base64编码的照片数据
  courier_name TEXT NOT NULL,
  courier_id TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name TEXT,
  upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_delivery_photos_package_id ON delivery_photos(package_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_courier_name ON delivery_photos(courier_name);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_upload_time ON delivery_photos(upload_time);

-- 添加注释
COMMENT ON TABLE delivery_photos IS '配送照片表，存储骑手上传的送达证明照片';
COMMENT ON COLUMN delivery_photos.package_id IS '包裹ID';
COMMENT ON COLUMN delivery_photos.photo_url IS '照片URL（如果存储在外部服务）';
COMMENT ON COLUMN delivery_photos.photo_base64 IS '照片base64编码（如果存储在数据库中）';
COMMENT ON COLUMN delivery_photos.courier_name IS '上传照片的骑手姓名';
COMMENT ON COLUMN delivery_photos.courier_id IS '上传照片的骑手ID';
COMMENT ON COLUMN delivery_photos.latitude IS '拍摄位置纬度';
COMMENT ON COLUMN delivery_photos.longitude IS '拍摄位置经度';
COMMENT ON COLUMN delivery_photos.location_name IS '拍摄位置名称';
COMMENT ON COLUMN delivery_photos.upload_time IS '照片上传时间';
```

### 2. 设置表权限
确保应用有权限访问新表：

```sql
-- 允许所有用户读取配送照片
GRANT SELECT ON delivery_photos TO anon;
GRANT SELECT ON delivery_photos TO authenticated;

-- 允许认证用户插入配送照片
GRANT INSERT ON delivery_photos TO authenticated;

-- 允许认证用户更新配送照片
GRANT UPDATE ON delivery_photos TO authenticated;

-- 允许认证用户删除配送照片
GRANT DELETE ON delivery_photos TO authenticated;
```

## 🔧 功能说明

### 📱 移动端功能
1. **拍照上传**：骑手在包裹详情页面点击"📸 上传照片"
2. **照片转换**：照片自动转换为base64格式存储
3. **位置记录**：自动记录拍摄时的GPS位置
4. **状态更新**：上传照片后包裹状态自动更新为"已送达"

### 🌐 Web端功能
1. **照片查看**：在包裹详情中点击"🖼️ 图片"按钮
2. **真实照片**：显示骑手实际拍摄的照片，不再是占位符
3. **详细信息**：显示上传时间、骑手姓名、拍摄位置等信息

## 🎯 工作流程

### 骑手上传照片流程：
1. 骑手打开包裹详情页面
2. 点击"📸 上传照片"按钮
3. 拍照并确认
4. 系统自动：
   - 将照片转换为base64格式
   - 获取GPS位置信息
   - 保存照片到数据库
   - 更新包裹状态为"已送达"

### 管理员查看照片流程：
1. 管理员打开"同城包裹管理"页面
2. 点击包裹的"查看详情"按钮
3. 在包裹详情中点击"🖼️ 图片"按钮
4. 查看骑手上传的真实照片和详细信息

## 📊 数据存储

### 照片存储方式：
- **Base64编码**：照片以base64格式存储在数据库中
- **优点**：简单、无需外部存储服务
- **缺点**：数据库体积较大
- **适用**：中小型应用，照片数量不多的情况

### 未来优化建议：
1. **外部存储**：集成AWS S3、Google Cloud Storage等
2. **图片压缩**：上传前压缩图片减少存储空间
3. **CDN加速**：使用CDN加速图片加载
4. **定期清理**：设置照片过期时间，定期清理旧照片

## 🚀 测试步骤

### 1. 数据库设置测试
```sql
-- 检查表是否创建成功
SELECT * FROM delivery_photos LIMIT 1;

-- 检查索引是否创建成功
SELECT indexname FROM pg_indexes WHERE tablename = 'delivery_photos';
```

### 2. 移动端测试
1. 打开骑手APP
2. 选择一个包裹
3. 点击"📸 上传照片"
4. 拍照并上传
5. 检查控制台日志确认照片保存成功

### 3. Web端测试
1. 打开管理后台
2. 进入"同城包裹管理"
3. 找到刚才上传照片的包裹
4. 点击"查看详情" → "🖼️ 图片"
5. 确认显示真实照片

## ⚠️ 注意事项

1. **数据库大小**：base64照片会显著增加数据库大小
2. **性能影响**：大量照片可能影响查询性能
3. **网络传输**：base64照片会增加网络传输量
4. **存储限制**：注意数据库存储限制

## 🔍 故障排除

### 常见问题：
1. **照片不显示**：检查数据库表是否正确创建
2. **上传失败**：检查网络连接和权限设置
3. **照片模糊**：检查照片压缩设置
4. **位置错误**：检查GPS权限和精度设置

### 调试方法：
1. 查看浏览器控制台日志
2. 检查Supabase数据库日志
3. 验证表权限设置
4. 测试网络连接

## 📞 技术支持

如果遇到问题，请提供：
1. 错误信息截图
2. 控制台日志
3. 数据库设置截图
4. 具体操作步骤

现在您的配送照片功能应该完全正常工作了！🎉
