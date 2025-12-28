# 🔧 Mapping.txt 文件解决方案

## 📋 问题说明

**问题**：访问 EAS Build 页面时没有找到 `mapping.txt` 文件

**原因**：
- 之前的构建（版本 5）可能没有启用代码混淆
- 只有在启用 ProGuard/R8 代码混淆时才会生成 `mapping.txt` 文件

---

## ✅ 解决方案

### 方案 1：重新构建应用（推荐）

我们已经更新了配置，启用了代码混淆。重新构建后会生成 `mapping.txt`。

#### 步骤 1：使用 EAS CLI 查看构建列表

```bash
cd ml-express-mobile-app
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"
eas build:list --platform android --limit 5
```

这会显示最近的 5 个 Android 构建，包括构建 ID 和状态。

#### 步骤 2：重新构建应用

```bash
cd ml-express-mobile-app
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"
eas build --platform android --profile production
```

**构建过程**：
- 构建时间：约 10-20 分钟
- 构建完成后会显示下载链接
- 新构建会包含 `mapping.txt` 文件

#### 步骤 3：下载 mapping.txt

构建完成后，使用以下方法下载：

**方法 A：使用 EAS CLI**

```bash
# 查看构建列表，找到最新的构建 ID
eas build:list --platform android --limit 1

# 下载构建文件（包括 mapping.txt）
eas build:download [BUILD_ID] --type app-bundle
```

**方法 B：从构建日志中查找**

构建完成后，在终端中会显示构建详情链接，访问该链接可以下载所有构建产物，包括 `mapping.txt`。

---

### 方案 2：忽略警告（如果不想重新构建）

**重要提示**：
- ⚠️ 这个警告**不会阻止应用发布**
- ✅ 应用可以正常使用
- ⚠️ 只是无法更好地调试崩溃和 ANR

**如果选择忽略**：
- 可以继续使用当前版本（版本 5）
- 下次更新时再处理
- 不影响应用功能

---

## 🔍 检查当前构建状态

### 使用 EAS CLI 查看构建

```bash
cd ml-express-mobile-app
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"

# 查看最近的构建
eas build:list --platform android --limit 10

# 查看特定构建的详情
eas build:view [BUILD_ID]
```

### 检查构建是否包含 mapping.txt

```bash
# 下载构建文件
eas build:download [BUILD_ID]

# 检查下载的文件
# mapping.txt 应该在构建产物中
```

---

## 📝 配置确认

我们已经更新了以下配置：

### ✅ app.json
```json
{
  "android": {
    "enableProguardInReleaseBuilds": true
  }
}
```

### ✅ app.config.js
```javascript
android: {
  enableProguardInReleaseBuilds: true
}
```

**这些配置确保下次构建时会生成 `mapping.txt` 文件。**

---

## 🎯 推荐操作步骤

### 如果应用已经发布且工作正常：

1. **暂时忽略警告**
   - 应用可以正常使用
   - 警告不影响功能

2. **下次更新时处理**
   - 下次发布新版本时
   - 重新构建会自动生成 `mapping.txt`
   - 然后上传到 Google Play Console

### 如果想立即解决：

1. **重新构建应用**
   ```bash
   cd ml-express-mobile-app
   export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"
   eas build --platform android --profile production
   ```

2. **等待构建完成**（10-20 分钟）

3. **下载 mapping.txt**
   - 使用 `eas build:download` 命令
   - 或从构建详情页面下载

4. **上传到 Google Play Console**
   - 进入应用的"发布" → "应用完整性"
   - 找到对应的版本
   - 上传 `mapping.txt` 文件

---

## ⚠️ 重要提示

### 1. EAS Build 页面访问问题

如果 EAS Build 网页无法访问：
- ✅ 使用 EAS CLI 命令查看构建
- ✅ 使用 `eas build:list` 查看构建列表
- ✅ 使用 `eas build:download` 下载文件

### 2. mapping.txt 文件位置

`mapping.txt` 文件：
- ✅ 只在启用代码混淆时生成
- ✅ 包含在构建产物中
- ✅ 可以通过 EAS CLI 下载
- ✅ 或从构建详情页面下载

### 3. 版本管理

- ✅ 当前版本 5 已经发布，可以正常使用
- ✅ 重新构建会创建新版本（版本 6）
- ✅ 可以选择更新到新版本，或保持当前版本

---

## 🚀 快速操作命令

### 查看构建列表
```bash
cd ml-express-mobile-app
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"
eas build:list --platform android --limit 5
```

### 重新构建（生成 mapping.txt）
```bash
eas build --platform android --profile production
```

### 下载构建文件
```bash
eas build:download [BUILD_ID]
```

---

**文档创建时间**: 2025-01-16  
**状态**: ✅ 解决方案已准备

