# 🔍 查找 mapping.txt 文件指南

## 📋 当前构建信息

**最新构建**：
- **构建 ID**: `53b2884d-23eb-46cc-a9b5-c8d11de86db2`
- **版本**: 1.0.0
- **Version Code**: 6
- **状态**: ✅ finished
- **构建日志**: https://expo.dev/accounts/amt349/projects/MarketLinkStaffApp/builds/53b2884d-23eb-46cc-a9b5-c8d11de86db2

---

## 🔍 方法 1：从 EAS Build 网站下载（推荐）

### 步骤 1：访问构建详情页面

1. 打开浏览器
2. 访问构建日志链接：
   ```
   https://expo.dev/accounts/amt349/projects/MarketLinkStaffApp/builds/53b2884d-23eb-46cc-a9b5-c8d11de86db2
   ```

### 步骤 2：查找 Artifacts（构建产物）部分

1. 在构建详情页面，向下滚动
2. 查找 **"Artifacts"** 或 **"Build Artifacts"** 部分
3. 应该能看到以下文件：
   - `app-release.aab` - 应用包文件
   - `mapping.txt` - 反混淆映射文件 ✅

### 步骤 3：下载 mapping.txt

1. 点击 `mapping.txt` 文件旁边的下载按钮
2. 文件会下载到您的电脑

---

## 🔍 方法 2：从构建日志中查找

### 步骤 1：查看构建日志

1. 访问构建日志链接（同上）
2. 点击 **"View logs"** 或 **"Logs"** 标签
3. 在日志中搜索 `mapping.txt` 或 `mapping`

### 步骤 2：查找文件路径

在日志中查找类似这样的信息：
```
Writing mapping file to: /path/to/mapping.txt
或
mapping.txt saved to: /path/to/mapping.txt
```

---

## 🔍 方法 3：使用 EAS CLI 下载（如果支持）

### 尝试下载构建产物

```bash
cd ml-express-mobile-app
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"

# 下载构建文件（包括所有产物）
eas build:download 53b2884d-23eb-46cc-a9b5-c8d11de86db2
```

**注意**：如果这个命令只下载了 `.aab` 文件，mapping.txt 可能不在其中。

---

## ⚠️ 如果找不到 mapping.txt

### 可能的原因：

1. **代码混淆未启用**（但我们已经启用了 `enableProguardInReleaseBuilds: true`）
2. **构建时未生成**（可能是 Expo SDK 版本问题）
3. **文件在构建日志中但未作为产物提供**

### 解决方案：

#### 选项 A：检查构建日志确认是否生成

1. 访问构建日志
2. 搜索 `mapping` 或 `proguard` 或 `R8`
3. 查看是否有生成 mapping.txt 的日志

#### 选项 B：重新构建（确保生成 mapping.txt）

如果当前构建没有 mapping.txt，可以重新构建：

```bash
cd ml-express-mobile-app
export EXPO_TOKEN="-6itq7vgSZlgB9h3J9SpA2YTmqKZYpfvu64BtvGf"
eas build --platform android --profile production
```

**注意**：这会创建新的版本（Version Code 7），需要重新上传到 Google Play Console。

---

## 📤 上传 mapping.txt 到 Google Play Console

找到 mapping.txt 后：

### 步骤 1：进入应用完整性页面

1. 登录 Google Play Console
2. 选择应用：**ML Express Staff**
3. 左侧菜单 → **"Test and release"** → **"App integrity"**（应用完整性）

### 步骤 2：上传 mapping.txt

1. 找到 **Version Code 6** 的条目
2. 点击 **"Upload deobfuscation file"** 或 **"上传反混淆文件"**
3. 选择下载的 `mapping.txt` 文件
4. 点击 **"Upload"**（上传）

### 步骤 3：确认上传成功

上传后，警告应该会消失或减少。

---

## 🎯 快速操作步骤

### 最简单的方法：

1. **访问构建详情页面**：
   ```
   https://expo.dev/accounts/amt349/projects/MarketLinkStaffApp/builds/53b2884d-23eb-46cc-a9b5-c8d11de86db2
   ```

2. **查找 Artifacts 部分**

3. **下载 mapping.txt**

4. **上传到 Google Play Console**：
   - Test and release → App integrity
   - 找到 Version Code 6
   - 上传 mapping.txt

---

## 📝 注意事项

1. **mapping.txt 文件通常很大**（几 MB 到几十 MB）
2. **每个版本都有对应的 mapping.txt**，必须匹配版本号
3. **如果重新构建**，需要上传新版本的 mapping.txt
4. **上传 mapping.txt 是可选的**，但推荐用于崩溃分析

---

## 🆘 如果仍然找不到

如果以上方法都找不到 mapping.txt：

1. **检查构建日志**，确认是否真的生成了
2. **联系 EAS 支持**，询问如何获取 mapping.txt
3. **或者暂时忽略警告**，应用仍然可以正常使用

---

**文档创建时间**: 2025-01-17  
**构建 ID**: 53b2884d-23eb-46cc-a9b5-c8d11de86db2  
**版本**: 1.0.0 (Version Code 6)

