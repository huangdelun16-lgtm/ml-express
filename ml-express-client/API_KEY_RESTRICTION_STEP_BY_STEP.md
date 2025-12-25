# 🔐 API Key 限制配置 - 详细步骤指南

## 📋 当前状态

你已经在 Google Cloud Console 的 API Key 编辑页面了。现在需要配置应用程序限制。

---

## 🎯 步骤 1：选择应用程序限制类型

### 1.1 找到 "Application restrictions"（应用程序限制）部分

在页面中间，你会看到：
```
Application restrictions
○ None
○ Websites          ← 当前选中的是这个（需要改）
○ IP addresses
○ Android apps      ← 需要选择这个
○ iOS apps          ← 或者这个
```

### 1.2 选择 "Android apps"

1. **点击 "Android apps" 的单选按钮**（圆形按钮）
2. 选择后，下面会出现 "Android restrictions"（Android 限制）部分

### 1.3 添加 Android 应用

在 "Android restrictions" 部分：

1. **点击 "+ Add an item"** 或 **"添加项"** 按钮
2. 会弹出两个输入框：
   - **Package name**（包名）：输入 `com.mlexpress.client`
   - **SHA-1 certificate fingerprint**（SHA-1 证书指纹）：需要获取（见下方）

### 1.4 获取 SHA-1 证书指纹（开发环境）

**在终端中运行以下命令**：

```bash
# macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Windows
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**命令输出示例**：
```
Certificate fingerprints:
     SHA1: A1:B2:C3:D4:E5:F6:...（复制这一行）
     SHA256: ...
```

**复制 SHA1 那一行的值**（去掉空格和冒号，或者保留都可以）

**示例**：
- 如果显示：`SHA1: A1:B2:C3:D4:E5:F6:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE`
- 复制：`A1:B2:C3:D4:E5:F6:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE`

### 1.5 填写 Android 应用信息

在 Google Cloud Console 中：

1. **Package name**（包名）输入框：输入 `com.mlexpress.client`
2. **SHA-1 certificate fingerprint**（SHA-1 证书指纹）输入框：粘贴刚才复制的 SHA1 值
3. 点击 **"Save"**（保存）或 **"保存"**

---

## 🍎 步骤 2：添加 iOS 应用限制

### 2.1 添加新的应用程序限制

**重要**：一个 API Key 可以同时有多个应用程序限制！

1. 在 "Application restrictions" 部分，**再次点击 "iOS apps"** 的单选按钮
2. 或者点击 **"+ Add restriction"**（添加限制）按钮（如果有的话）

**注意**：如果只能选择一个，你需要：
- 要么创建两个 API Key（一个用于 Android，一个用于 iOS）
- 要么先配置 Android，稍后再配置 iOS

### 2.2 填写 iOS 应用信息

在 "iOS restrictions"（iOS 限制）部分：

1. **点击 "+ Add an item"** 或 **"添加项"** 按钮
2. 会弹出输入框：
   - **Bundle ID**（Bundle 标识符）：输入 `com.mlexpress.client`
3. 点击 **"Save"**（保存）

---

## 🌐 步骤 3：添加 HTTP 引荐来源网址（用于开发服务器）

### 3.1 添加网站限制（用于 Expo 开发服务器）

由于 Expo 开发服务器使用 HTTP，也需要添加网站限制：

1. **在 "Application restrictions" 部分，点击 "Websites"** 单选按钮
2. 在 "Website restrictions"（网站限制）部分：
   - 点击 **"+ Add an item"** 或输入框
   - 添加以下 URL（每行一个）：
     ```
     http://localhost:8081/*
     http://localhost:8082/*
     http://192.168.*.*:8081/*
     http://192.168.*.*:8082/*
     exp://localhost:8081
     exp://192.168.*.*:8081
     ```

**注意**：如果你只能选择一个应用程序限制类型，建议：
- **开发环境**：选择 "Websites"，添加上述 URL
- **生产环境**：选择 "Android apps" 或 "iOS apps"

---

## 🔒 步骤 4：设置 API 限制

### 4.1 找到 "API restrictions"（API 限制）部分

在页面下方，找到 "API restrictions" 部分。

### 4.2 选择 "Restrict key"（限制密钥）

1. **选择 "Restrict key"** 单选按钮（不要选择 "Don't restrict key"）
2. 下面会出现 API 列表

### 4.3 选择需要的 API

**勾选以下 API**（点击复选框）：

- ✅ **Places API**（地点搜索和自动完成）⭐ **必需**
- ✅ **Maps SDK for Android**（Android 地图显示）
- ✅ **Maps SDK for iOS**（iOS 地图显示）
- ✅ **Geocoding API**（地址解析）
- ✅ **Maps JavaScript API**（Web 地图，如果需要）

**如何选择**：
1. 在搜索框中输入 API 名称（如 "Places"）
2. 找到对应的 API
3. 点击复选框勾选
4. 重复以上步骤选择所有需要的 API

### 4.4 保存更改

1. 滚动到页面底部
2. 点击 **"Save"**（保存）或 **"保存"** 按钮
3. 等待保存完成（通常几秒钟）

---

## ✅ 步骤 5：验证配置

### 5.1 检查配置

保存后，页面会显示：
- ✅ Application restrictions: Android apps / iOS apps / Websites
- ✅ API restrictions: 已选择的 API 列表

### 5.2 测试 API Key

在浏览器中测试（可选）：

```
https://maps.googleapis.com/maps/api/place/autocomplete/json?input=test&key=AIzaSyDRhfmAILQk1L3pIUzLjcYG_Pf4HeY0XJI
```

如果返回 JSON 数据（不是错误），说明配置成功。

---

## 📝 配置总结

### 应用程序限制（Application restrictions）

**选项 1：只配置开发环境（推荐先做这个）**
- 选择：**Websites**
- 添加 URL：
  - `http://localhost:8081/*`
  - `http://localhost:8082/*`
  - `http://192.168.*.*:8081/*`
  - `exp://localhost:8081`

**选项 2：配置生产环境**
- 选择：**Android apps**
  - Package name: `com.mlexpress.client`
  - SHA-1: （从 keytool 命令获取）
- 选择：**iOS apps**
  - Bundle ID: `com.mlexpress.client`

### API 限制（API restrictions）

- ✅ Restrict key
- ✅ Places API（必需）
- ✅ Maps SDK for Android
- ✅ Maps SDK for iOS
- ✅ Geocoding API

---

## 🆘 常见问题

### Q1: 如果只能选择一个应用程序限制类型怎么办？

**A:** 建议：
1. **开发时**：使用 "Websites" 限制，添加 localhost URL
2. **发布时**：创建新的 API Key，使用 "Android apps" 或 "iOS apps" 限制

### Q2: SHA-1 证书指纹获取失败？

**A:** 确保：
- Java keytool 已安装（通常随 Android Studio 安装）
- 路径正确（`~/.android/debug.keystore`）
- 密码正确（`android`）

### Q3: 保存后仍然无法使用？

**A:** 检查：
1. 是否启用了 Places API（API 和服务 → 库 → Places API → 启用）
2. 是否等待了几分钟让配置生效
3. 是否重启了 Expo 开发服务器

---

## 🎯 快速操作清单

- [ ] 选择 "Android apps" 或 "Websites"（开发环境建议选 Websites）
- [ ] 如果选 Android apps：添加包名和 SHA-1
- [ ] 如果选 Websites：添加 localhost URL
- [ ] 选择 "Restrict key"
- [ ] 勾选 Places API（必需）
- [ ] 勾选其他需要的 API
- [ ] 点击 "Save" 保存
- [ ] 等待配置生效（1-2分钟）
- [ ] 重启 Expo 开发服务器
- [ ] 测试自动完成功能

---

**需要帮助？** 如果在某个步骤遇到问题，告诉我具体在哪一步，我会详细解释！

