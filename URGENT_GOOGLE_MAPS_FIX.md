# 🚨 Google Maps InvalidKeyMapError 紧急修复指南

## 问题诊断
从您的截图可以看到：
- **错误**: `Google Maps JavaScript API error: InvalidKeyMapError`
- **URL**: `market-link-express.netlify.app/admin/tracking`
- **原因**: API Key 的域名限制设置不正确

## 🔧 立即修复步骤

### 步骤 1: 检查 Google Cloud Console 域名限制

1. **访问 Google Cloud Console**
   - 打开 [Google Cloud Console](https://console.cloud.google.com/)
   - 选择您的项目

2. **编辑 API Key**
   - 进入 **APIs & Services** → **Credentials**
   - 找到您的 API Key: `AIzaSyAlWquo-iUvh_2tQPolCGntA9pN74H9Xgw`
   - 点击编辑（铅笔图标）

3. **配置域名限制**
   - 在 **Application restrictions** 部分
   - 选择 **HTTP referrers (websites)**
   - **删除所有现有域名**
   - **添加以下域名**（一行一个）：
     ```
     https://market-link-express.netlify.app/*
     https://*.market-link-express.netlify.app/*
     https://market-link-express.com/*
     https://www.market-link-express.com/*
     https://localhost/*
     https://127.0.0.1/*
     ```

4. **保存设置**
   - 点击 **SAVE**
   - 等待 1-2 分钟让更改生效

### 步骤 2: 验证 API 启用状态

确保以下 API 已启用：
- ✅ **Maps JavaScript API**
- ✅ **Places API**
- ✅ **Geocoding API**

### 步骤 3: 检查计费账号

确保：
- ✅ 项目已关联计费账号
- ✅ 计费账号状态为 "Active"
- ✅ 有有效的付款方式

## 🧪 快速测试方法

### 方法 1: 临时移除域名限制（仅用于测试）

1. 在 Google Cloud Console 中编辑 API Key
2. 将 **Application restrictions** 改为 **None**
3. 保存并等待 1-2 分钟
4. 刷新您的网站测试地图

⚠️ **注意**: 测试成功后，请重新添加域名限制以确保安全。

### 方法 2: 使用测试工具

访问：`https://market-link-express.netlify.app/new-api-key-test.html`
- 点击"开始测试新 API Key"
- 查看具体错误信息

## 🎯 预期结果

修复后您应该看到：
- ✅ Google Maps 正常加载
- ✅ 地图显示正常
- ✅ 快递员位置标记显示
- ✅ 控制台无 InvalidKeyMapError 错误

## 📞 如果问题仍然存在

请提供以下信息：
1. Google Cloud Console 中 API Key 的域名限制设置截图
2. 测试工具的具体输出结果
3. 浏览器控制台的完整错误信息

## ⚡ 紧急解决方案

如果上述方法都不起作用，我们可以：
1. 创建新的 API Key
2. 重新配置所有设置
3. 更新代码使用新 Key

**请先尝试步骤 1 的域名限制配置，这是最可能的问题原因！**
