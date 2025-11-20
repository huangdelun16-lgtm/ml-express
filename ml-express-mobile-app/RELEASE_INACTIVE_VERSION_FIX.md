# 🔧 解决版本显示 "Inactive" 问题

## 📋 问题分析

您上传的新版本（Version Code 6）显示为 **"Inactive"**，这是因为：

1. ✅ 文件已成功上传
2. ❌ 但还没有发布到任何轨道（track）
3. ❌ 生产环境被锁定，需要申请访问权限

---

## 🎯 解决方案

### 方案 A：发布到内部测试（推荐，最快）

由于生产环境被锁定，我们可以先发布到**内部测试**轨道。

#### 步骤 1：进入内部测试页面

1. 在 Google Play Console 左侧菜单
2. 点击 **"Test and release"** → **"Testing"**
3. 展开 **"Testing"** 下拉菜单
4. 点击 **"Internal testing"**（内部测试）

#### 步骤 2：选择已上传的版本

在 **"App bundles"**（应用包）部分，您会看到：

1. **拖放上传区域**（带虚线边框）
2. **两个蓝色链接按钮**：
   - **"Upload"**（上传）- 用于上传新文件
   - **"Add from library"**（从库中添加）✅ **点击这个！**

**操作步骤**：
1. 点击 **"Add from library"**（从库中添加）按钮
2. 会弹出一个对话框，显示所有已上传的版本
3. 找到并选择 **Version Code 6**（版本名称：1.0.0，上传日期：Nov 20, 2025）
4. 点击 **"Add"**（添加）或 **"Select"**（选择）

**注意**：如果看不到 "Add from library" 选项，也可以：
- 直接点击上传区域内的 **"Add from library"** 链接
- 或者先点击 **"Upload"**，然后在弹出的对话框中选择 **"Select existing"** 标签页

#### 步骤 3：填写版本信息

**版本名称**：
```
1.1.0
```

**版本说明**（中文）：
```
版本 1.1.0 - 功能优化和修复

✨ 新功能：
- 优化底部导航栏图标显示
- 扫码页面多语言支持（缅文版显示英文）
- 缅文字体自动缩小2号，提升可读性

🔧 优化：
- 修复扫码页面header翻译问题
- 优化图标显示，确保完整可见
- 改进网络错误处理
- 增强相机权限提示

🐛 修复：
- 修复底部导航栏图标被裁剪问题
- 修复扫码页面样式错误
- 修复缅文字体显示问题
```

**版本说明**（英文）：
```
Version 1.1.0 - Feature Optimization and Fixes

✨ New Features:
- Optimized bottom navigation bar icon display
- Multi-language support for scan page (Myanmar version shows English)
- Automatic font size reduction for Myanmar text (2px smaller)

🔧 Improvements:
- Fixed scan page header translation issue
- Optimized icon display for full visibility
- Improved network error handling
- Enhanced camera permission prompts

🐛 Bug Fixes:
- Fixed bottom navigation bar icon clipping issue
- Fixed scan page style errors
- Fixed Myanmar font display issues
```

#### 步骤 4：添加测试人员（如果需要）

1. 在 **"Testers"**（测试人员）部分
2. 可以选择：
   - **Email addresses**：添加测试人员的邮箱
   - **Google Groups**：添加 Google 群组
   - **或者留空**：如果您想自己测试

#### 步骤 5：保存并发布

1. 滚动到页面底部
2. 点击 **"Save"**（保存）
3. 点击 **"Review release"**（审核版本）
4. 确认信息无误后，点击 **"Start rollout to Internal testing"**（开始发布到内部测试）

#### 步骤 6：等待审核

- 内部测试通常审核很快（几分钟到几小时）
- 审核通过后，版本状态会变为 **"Active"**

---

### 方案 B：申请生产环境访问权限

如果您想直接发布到生产环境，需要先申请访问权限。

#### 步骤 1：进入 Dashboard

1. 在左侧菜单点击 **"Dashboard"**
2. 查看是否有 **"Apply for production access"**（申请生产环境访问权限）按钮

#### 步骤 2：完成必需任务

通常需要完成：
- [ ] 应用完整性检查
- [ ] 隐私政策链接
- [ ] Data Safety 表单
- [ ] 应用内容评级
- [ ] 至少一个测试版本已发布

#### 步骤 3：申请访问权限

1. 完成所有必需任务后
2. 点击 **"Apply for production access"**
3. 填写申请表单
4. 提交申请

**注意**：申请可能需要几天时间审核

---

## 🔍 检查版本状态

### 查看版本详情

1. 在 **"Latest releases and bundles"** 页面
2. 点击 **Version Code 6** 的版本号
3. 查看详细信息：
   - 文件状态
   - 发布轨道
   - 错误或警告

### 常见状态说明

- **Inactive**：已上传但未发布到任何轨道
- **Active**：已发布到某个轨道（测试或生产）
- **Draft**：草稿状态，未完成配置
- **Rolled out**：已发布并正在推广

---

## ✅ 快速操作步骤（推荐）

### 最快发布方式：

1. **进入内部测试**
   - 左侧菜单 → **"Test and release"** → **"Testing"** → **"Internal testing"**

2. **创建新版本**
   - 点击 **"Create new release"**

3. **选择现有版本**
   - 在 **"App bundles"** 部分
   - 点击 **"Add from library"**（从库中添加）✅
   - 在弹出的对话框中选择 **Version Code 6**
   - 点击 **"Add"** 或 **"Select"**

4. **填写版本信息**
   - 版本名称：`1.1.0`
   - 版本说明：使用上面提供的文本

5. **保存并发布**
   - 点击 **"Save"**
   - 点击 **"Review release"**
   - 点击 **"Start rollout to Internal testing"**

6. **等待审核**
   - 通常几分钟到几小时
   - 审核通过后状态变为 **"Active"**

---

## 🚀 发布到生产环境（获得权限后）

当您获得生产环境访问权限后：

1. 进入 **"Test and release"** → **"Production"**
2. 点击 **"Create new release"**
3. 选择 **Version Code 6**
4. 填写版本信息
5. 点击 **"Start rollout to Production"**

---

## 📝 注意事项

1. **版本号必须递增**：已更新为 1.1.0，versionCode 为 2（但您上传的是 6，说明之前有版本）
2. **Inactive 是正常的**：上传后默认是 Inactive，需要发布到轨道才会变为 Active
3. **测试轨道是安全的**：可以先在内部测试验证，再发布到生产环境
4. **审核时间**：内部测试通常很快，生产环境可能需要更长时间

---

## 🆘 如果遇到问题

### 问题 1：找不到 "Select existing" 选项

**解决方法**：
- ✅ 点击 **"Add from library"**（从库中添加）- 这就是选择现有版本的选项！
- 如果还是看不到，尝试：
  - 点击 **"Upload"** 按钮，在弹出的对话框中可能有 **"Select existing"** 标签页
  - 确保版本已成功上传（在 "All app bundles" 中可以看到）
  - 刷新页面后重试

### 问题 2：版本选择后显示错误

**解决方法**：
- 检查版本号是否正确
- 确保 versionCode 已递增
- 检查是否有签名密钥问题

### 问题 3：无法保存或发布

**解决方法**：
- 检查是否填写了所有必填项
- 检查版本说明是否过长
- 查看页面底部的错误提示

---

**完成这些步骤后，您的版本应该会从 "Inactive" 变为 "Active"！** ✅

