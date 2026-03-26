# 🔧 Expo Go 兼容性问题解决方案

## ⚠️ 问题说明

您的项目使用 **Expo SDK 54.0.12**，这是一个非常新的版本。Expo Go 应用可能还没有更新到支持 SDK 54 的版本，导致出现以下错误：

```
Project is incompatible with this version of Expo Go
This project requires a newer version of Expo Go
```

## ✅ 解决方案

### 方案1：使用开发构建（推荐）⭐

由于您的项目已经配置了 EAS Build，**最佳解决方案是使用开发构建而不是 Expo Go**。

#### 为什么使用开发构建？

1. ✅ **支持所有 Expo SDK 版本** - 不受 Expo Go 版本限制
2. ✅ **支持自定义原生代码** - 如 `react-native-maps`
3. ✅ **更接近生产环境** - 与最终发布的 app 一致
4. ✅ **项目已配置完成** - `eas.json` 中已有 development 配置

#### 步骤1：构建开发版本

```bash
cd ml-express-client

# 构建 Android 开发版本
eas build --profile development --platform android

# 或构建 iOS 开发版本（需要 macOS）
eas build --profile development --platform ios
```

#### 步骤2：安装开发构建

构建完成后：
1. **Android**: 下载 APK 并安装到设备
2. **iOS**: 通过 TestFlight 或直接安装

#### 步骤3：启动开发服务器

```bash
# 启动开发服务器
npm start

# 或使用离线模式
npm start
```

#### 步骤4：在开发构建中打开

安装开发构建后，打开应用，它会自动连接到开发服务器。

---

### 方案2：更新 Expo Go（如果可用）

如果 Expo Go 已经更新支持 SDK 54：

1. **Android**: 从 Google Play Store 更新 Expo Go
2. **iOS**: 从 App Store 更新 Expo Go

然后重新扫描二维码。

---

### 方案3：降级到 SDK 51（临时方案）

如果必须使用 Expo Go，可以临时降级到 SDK 51：

```bash
cd ml-express-client

# 安装 Expo SDK 51
npx expo install expo@~51.0.0

# 更新所有依赖
npx expo install --fix

# 更新 app.json
# 将 sdkVersion 改为 "51.0.0"
```

**注意**: 降级可能导致某些功能不可用，不推荐用于生产环境。

---

## 🎯 推荐方案

**对于即将上线的应用，强烈推荐使用方案1（开发构建）**：

1. ✅ 不受 Expo Go 版本限制
2. ✅ 支持所有原生模块（如 Google Maps）
3. ✅ 与生产环境一致
4. ✅ 项目已配置完成

---

## 📱 快速开始（开发构建）

```bash
# 1. 确保已登录 EAS
eas login

# 2. 构建开发版本
cd ml-express-client
eas build --profile development --platform android

# 3. 等待构建完成（约 10-15 分钟）

# 4. 下载并安装 APK

# 5. 启动开发服务器
npm start

# 6. 在开发构建应用中打开项目
```

---

## ❓ 常见问题

### Q: 开发构建和 Expo Go 有什么区别？

**Expo Go**:
- 预装的通用应用
- 只能运行使用标准 Expo API 的项目
- 版本更新滞后于 SDK 发布

**开发构建**:
- 为您的项目定制的应用
- 支持所有原生模块和自定义代码
- 不受版本限制

### Q: 开发构建需要付费吗？

- ✅ **免费**: EAS Build 提供免费的构建配额
- ✅ **足够使用**: 对于开发测试完全够用

### Q: 可以继续使用 Expo Go 吗？

如果 Expo Go 更新到支持 SDK 54，可以继续使用。但建议使用开发构建，因为：
- 您的项目使用了 `react-native-maps`（需要原生代码）
- 开发构建更接近生产环境

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. 错误信息截图
2. `eas build` 的输出日志
3. 设备信息（Android/iOS 版本）

