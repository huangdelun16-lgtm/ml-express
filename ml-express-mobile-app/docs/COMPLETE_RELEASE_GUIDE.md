# 🚀 完整骑手App发布指南 - Google Play Console

## 📋 发布前准备清单

### ✅ 1. 更新版本号

当前版本：`1.0.0` (versionCode: 1)

**需要更新为**：
- **版本名称**: `1.1.0` 或 `1.0.1`
- **versionCode**: `2` (必须递增)

### ✅ 2. 检查配置

- [x] app.json 配置正确
- [x] EAS 配置正确
- [x] Google Maps API Key 已配置
- [x] 包名：`com.mlexpress.courier`
- [x] 应用名称：`ML Express Staff`

---

## 🔧 第一步：更新版本号

### 1.1 更新 app.json

需要修改两个地方：

```json
{
  "expo": {
    "version": "1.1.0",  // 从 1.0.0 改为 1.1.0
    "android": {
      "versionCode": 2  // 从 1 改为 2
    }
  }
}
```

### 1.2 更新 package.json（可选）

```json
{
  "version": "1.1.0"  // 从 1.0.0 改为 1.1.0
}
```

---

## 📦 第二步：构建 Android App Bundle

### 2.1 进入项目目录

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-mobile-app
```

### 2.2 检查 EAS CLI

```bash
eas --version
```

如果没有安装，运行：
```bash
npm install -g eas-cli
```

### 2.3 登录 EAS

```bash
eas login
```

使用您的 Expo 账号登录（amt349）

### 2.4 开始构建

```bash
eas build --platform android --profile production
```

**构建选项**：
- `--platform android`: 构建 Android 版本
- `--profile production`: 使用生产环境配置
- 会自动生成 `.aab` 文件（Android App Bundle）

**预计时间**: 15-25 分钟

**构建过程**：
1. 上传代码到 EAS 服务器
2. 在云端构建应用
3. 自动签名（使用之前的签名密钥）
4. 生成 `.aab` 文件

### 2.5 查看构建状态

构建过程中，您可以：
- 在终端查看进度
- 或访问：https://expo.dev/accounts/amt349/projects/MarketLinkStaffApp/builds

### 2.6 下载构建文件

构建完成后，您会看到：

```
✅ Build finished
📦 Build artifact: https://expo.dev/artifacts/...
```

**下载方式**：

**方法 1：直接下载**
- 复制链接到浏览器
- 自动下载 `.aab` 文件

**方法 2：使用命令**
```bash
eas build:list  # 查看所有构建
eas build:download [BUILD_ID]  # 下载指定构建
```

**文件位置**：通常在 `Downloads` 文件夹
**文件名**：类似 `build-xxxxx.aab`

---

## 📤 第三步：上传到 Google Play Console

### 3.1 登录 Google Play Console

1. 打开浏览器
2. 访问：https://play.google.com/console
3. 使用您的 Google 账号登录
4. 选择应用：**ML Express Staff**

### 3.2 进入发布页面

**选项 A：发布到生产环境（推荐）**
1. 左侧菜单 → **"发布"** → **"生产环境"**
2. 点击 **"创建新版本"** 或 **"创建版本"**

**选项 B：先发布到内部测试**
1. 左侧菜单 → **"发布"** → **"内部测试"**
2. 点击 **"创建新版本"**

### 3.3 上传 Android App Bundle

1. 在 **"应用包"** 部分，点击 **"上传"** 或 **"选择文件"**
2. 选择刚才下载的 `.aab` 文件
3. 等待上传完成（显示进度条，可能需要几分钟）

**重要提示**：
- ✅ 确保上传的是 `.aab` 文件，不是 `.apk`
- ✅ 文件大小通常为 30-60 MB
- ✅ 上传完成后会显示版本信息

---

## 📝 第四步：填写版本信息

### 4.1 版本名称

在 **"版本名称"** 字段填写：
```
1.1.0
```

### 4.2 版本说明（此版本的更新内容）

**中文版本**：
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

**英文版本**：
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

**缅文版本**（如果需要）：
```
Version 1.1.0 - Feature Optimization and Fixes

✨ New Features:
- Optimized bottom navigation bar icon display
- Multi-language support for scan page
- Automatic font size reduction for Myanmar text

🔧 Improvements:
- Fixed scan page header translation
- Optimized icon display
- Improved network error handling
- Enhanced camera permission prompts

🐛 Bug Fixes:
- Fixed bottom navigation bar icon clipping
- Fixed scan page style errors
- Fixed Myanmar font display issues
```

---

## ✅ 第五步：检查并解决错误

### 5.1 常见错误及解决方法

#### ❌ 错误 1：版本号必须递增
**错误信息**：`versionCode must be higher than previous version`

**解决方法**：
- 确保 `versionCode` 已从 1 改为 2
- 如果之前发布过更高版本，需要继续递增

#### ❌ 错误 2：需要上传 APK 或 Android App Bundle
**解决方法**：
- 确保已上传 `.aab` 文件
- 等待上传完成（可能需要几分钟）
- 刷新页面查看状态

#### ❌ 错误 3：签名密钥不匹配
**解决方法**：
- EAS 会自动使用之前的签名密钥
- 如果遇到问题，检查 EAS 签名密钥配置

#### ❌ 错误 4：应用完整性检查失败
**解决方法**：
- 检查是否有未完成的必填项
- 确保隐私政策链接有效
- 确保 Data Safety 表单已填写

### 5.2 检查清单

上传后，检查以下项目：

- [ ] ✅ 应用包已成功上传
- [ ] ✅ 版本名称正确（1.1.0）
- [ ] ✅ versionCode 已递增（2）
- [ ] ✅ 版本说明已填写
- [ ] ✅ 没有错误提示
- [ ] ✅ 所有警告已处理

---

## 🚀 第六步：提交审核

### 6.1 检查所有信息

在提交前，确保：

- [ ] ✅ 应用包已上传
- [ ] ✅ 版本信息已填写
- [ ] ✅ 没有错误或警告
- [ ] ✅ 所有必填项已完成

### 6.2 提交审核

1. 滚动到页面底部
2. 点击 **"开始发布到生产环境"** 或 **"审核"**
3. 确认提交

**注意**：
- 首次发布可能需要 1-3 天审核
- 更新版本通常 1-7 小时审核
- 审核期间应用状态会显示为"审核中"

### 6.3 发布后

审核通过后：
- 应用会自动发布到 Google Play
- 用户可以在 Google Play 商店搜索并下载
- 您可以在 Google Play Console 查看下载统计

---

## 📊 第七步：监控发布状态

### 7.1 查看发布状态

1. 进入 **"发布"** → **"生产环境"**
2. 查看最新版本的发布状态：
   - **审核中**: 正在审核
   - **已发布**: 已上线
   - **已暂停**: 已暂停发布

### 7.2 查看用户反馈

1. 进入 **"评分和评价"**
2. 查看用户评论和评分
3. 及时回复用户反馈

### 7.3 查看统计数据

1. 进入 **"统计信息"**
2. 查看：
   - 安装次数
   - 活跃用户数
   - 崩溃报告
   - ANR（应用无响应）报告

---

## 🔄 后续更新流程

当需要发布新版本时：

1. **更新版本号**
   - `version`: `1.1.0` → `1.2.0`
   - `versionCode`: `2` → `3`

2. **构建新版本**
   ```bash
   eas build --platform android --profile production
   ```

3. **上传到 Google Play Console**
   - 创建新版本
   - 上传新的 `.aab` 文件
   - 填写版本说明

4. **提交审核**

---

## 📞 需要帮助？

如果遇到问题：

1. **构建失败**
   - 检查 `eas.json` 配置
   - 检查环境变量
   - 查看构建日志

2. **上传失败**
   - 检查文件格式（必须是 `.aab`）
   - 检查文件大小
   - 检查网络连接

3. **审核被拒**
   - 查看拒绝原因
   - 修复问题
   - 重新提交

---

## ✅ 快速命令参考

```bash
# 1. 进入项目目录
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-mobile-app

# 2. 登录 EAS
eas login

# 3. 构建生产版本
eas build --platform android --profile production

# 4. 查看构建列表
eas build:list

# 5. 下载构建文件
eas build:download [BUILD_ID]
```

---

**祝您发布顺利！** 🎉


