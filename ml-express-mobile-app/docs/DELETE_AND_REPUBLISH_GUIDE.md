# 🔄 删除并重新发布应用完整指南

## 📋 当前状态

**包名**: `com.mlexpress.courier`  
**EAS Project ID**: `9831d961-9124-46ed-8581-bf406616439f`  
**Expo 账号**: amt349

---

## ⚠️ 重要提示

### 删除应用的影响

1. **如果应用已发布到生产环境**：
   - ❌ 所有用户将无法再下载应用
   - ❌ 应用评分和评论会丢失
   - ❌ 需要重新提交审核
   - ❌ 应用历史记录会丢失

2. **如果应用只在测试阶段**：
   - ✅ 可以安全删除
   - ✅ 不会影响正式用户
   - ✅ 可以重新开始

### 建议

- ✅ **如果应用还在内部测试/封闭测试阶段**：可以删除
- ⚠️ **如果应用已发布到生产环境**：建议先确认是否有用户在使用

---

## ✅ 完整操作步骤

### 步骤 1：删除 Google Play Console 中的应用

1. **登录 Google Play Console**
   - 访问：https://play.google.com/console
   - 使用您的开发者账号登录

2. **选择要删除的应用**
   - 在应用列表中，找到您的应用（包名：`com.mlexpress.courier`）
   - 点击应用名称进入应用详情

3. **删除应用**
   - 进入 **"设置"** → **"应用完整性"** 或 **"应用信息"**
   - 滚动到底部，找到 **"删除应用"** 或 **"Remove app"** 选项
   - 点击删除
   - 确认删除操作（可能需要输入应用名称确认）

4. **等待删除完成**
   - 删除操作可能需要几分钟到几小时
   - Google 会发送邮件确认删除完成

---

### 步骤 2：清理 EAS 凭据（可选）

如果您想完全重新开始，可以清理 EAS 凭据：

```bash
cd ml-express-mobile-app
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"
eas credentials --platform android
```

**操作**：
1. 选择 `production`
2. 选择 `Remove credentials`
3. 确认删除

**注意**：删除凭据后，下次构建时会自动生成新的密钥。

---

### 步骤 3：确认应用配置

检查当前配置是否正确：

```bash
cd ml-express-mobile-app

# 检查包名
grep -n "package\|bundleIdentifier" app.config.js app.json
```

**应该显示**：
- `package: "com.mlexpress.courier"`
- `bundleIdentifier: "com.mlexpress.courier"`

---

### 步骤 4：重新构建应用

```bash
cd ml-express-mobile-app
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"

# 清理之前的构建缓存（可选）
rm -rf .expo
rm -rf android
rm -rf ios

# 重新构建 Android App Bundle
eas build --platform android --profile production
```

**构建过程**：
- EAS 会自动生成新的签名密钥（如果之前删除了凭据）
- 构建完成后，会显示下载链接
- 下载 `.aab` 文件

---

### 步骤 5：在 Google Play Console 创建新应用

1. **登录 Google Play Console**
   - 访问：https://play.google.com/console

2. **创建新应用**
   - 点击 **"创建应用"** 或 **"Create app"**
   - 填写应用信息：
     - **应用名称**: ML Express Staff（或您想要的名称）
     - **默认语言**: 中文（简体）或其他
     - **应用或游戏**: 应用
     - **免费或付费**: 免费
   - 点击 **"创建"**

3. **填写应用详情**
   - 应用名称、简短描述、完整描述
   - 应用图标、功能图形
   - 隐私政策链接：`https://market-link-express.com/privacy-policy`
   - 其他必需信息

---

### 步骤 6：上传新的 App Bundle

1. **进入发布流程**
   - 在应用详情页面，进入 **"发布"** → **"内部测试"**
   - 点击 **"创建新版本"** 或 **"Create new release"**

2. **上传 App Bundle**
   - 点击 **"上传新的 App Bundle"**
   - 选择刚才构建的 `.aab` 文件
   - 等待上传完成

3. **填写版本信息**
   - 版本名称：`1.0.0`（或您想要的版本号）
   - 版本说明：填写更新内容

4. **提交审核**
   - 点击 **"保存"** 或 **"Save"**
   - 点击 **"开始发布到内部测试"** 或 **"Start rollout to Internal testing"**

---

### 步骤 7：更新 Google Cloud Console API Key（如果需要）

如果包名没有变化（仍然是 `com.mlexpress.courier`），则不需要更新。

如果包名改变了，需要：

1. **访问 Google Cloud Console**
   - 打开：https://console.cloud.google.com
   - 选择您的项目

2. **更新 API Key 限制**
   - 进入 **"API 和服务"** → **"凭据"**
   - 找到您的 Google Maps API 密钥
   - 点击编辑
   - 在 **"应用限制"** 部分，更新 Android 应用限制：
     - 删除旧的包名（如果有）
     - 添加新的包名：`com.mlexpress.courier`
     - 添加新的 SHA-1 证书指纹（从 EAS 凭据中获取）

3. **获取新的 SHA-1 指纹**
   ```bash
   cd ml-express-mobile-app
   export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"
   eas credentials --platform android
   ```
   - 选择 `production`
   - 查看 SHA-1 指纹
   - 复制到 Google Cloud Console

---

## 🚀 快速操作命令

### 完整流程（一键执行）

```bash
# 1. 进入项目目录
cd ml-express-mobile-app

# 2. 设置 Expo Token
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"

# 3. 清理构建缓存（可选）
rm -rf .expo android ios

# 4. 重新构建
eas build --platform android --profile production

# 5. 等待构建完成，下载 .aab 文件
# 6. 在 Google Play Console 创建新应用并上传
```

---

## 📋 操作检查清单

### Google Play Console
- [ ] ✅ 已删除旧应用（如果存在）
- [ ] ✅ 已创建新应用
- [ ] ✅ 已填写应用详情
- [ ] ✅ 已上传新的 App Bundle
- [ ] ✅ 已提交审核

### EAS 构建
- [ ] ✅ 已清理构建缓存（可选）
- [ ] ✅ 已重新构建 App Bundle
- [ ] ✅ 已下载 `.aab` 文件
- [ ] ✅ 已记录新的 SHA-1 指纹（如果需要）

### Google Cloud Console
- [ ] ✅ 已更新 API Key 限制（如果包名改变）
- [ ] ✅ 已添加新的 SHA-1 指纹（如果需要）

---

## 🆘 常见问题

### 问题 1：删除应用后，包名仍然被占用

**原因**：Google Play 可能需要一些时间释放包名。

**解决方案**：
- 等待 24-48 小时后再创建新应用
- 或者使用新的包名（需要修改 `app.config.js` 和 `app.json`）

### 问题 2：构建时提示签名密钥错误

**原因**：如果删除了 EAS 凭据，需要重新生成。

**解决方案**：
- 运行 `eas credentials --platform android`
- 选择 `Set up a new Android Keystore`
- EAS 会自动生成新密钥

### 问题 3：Google Maps 不工作

**原因**：API Key 限制没有更新。

**解决方案**：
- 在 Google Cloud Console 中更新 API Key 限制
- 添加新的包名和 SHA-1 指纹

---

## 📝 注意事项

1. **包名是永久的**
   - 一旦在 Google Play 发布后，包名无法更改
   - 如果删除应用，包名可能需要时间释放

2. **版本号重置**
   - 新应用从版本号 1 开始
   - `versionCode` 会从 1 开始递增

3. **应用签名**
   - 如果使用 Google Play App Signing，Google 会自动处理
   - EAS Build 会自动管理签名密钥

4. **用户数据**
   - 删除应用后，用户需要重新安装
   - 如果应用有用户数据，需要提前通知用户

---

**文档创建时间**: 2025-01-16  
**状态**: ✅ 操作指南已准备

