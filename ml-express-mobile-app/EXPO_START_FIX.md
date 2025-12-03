# 🔧 Expo 启动问题修复指南

## 问题描述

Expo 启动时出现 `TypeError: fetch failed` 错误，这是在 Expo CLI 尝试获取原生模块版本信息时发生的网络连接问题。

## ✅ 解决方案

### 方法 1: 使用离线模式启动（推荐）

如果网络连接有问题，可以使用离线模式启动：

```bash
cd ml-express-mobile-app
npx expo start --offline --clear
```

**注意**: 离线模式会跳过版本检查，但 app 功能不受影响。

### 方法 2: 检查网络连接

1. **检查网络连接**
   ```bash
   ping expo.dev
   ```

2. **检查防火墙设置**
   - 确保防火墙没有阻止 Expo CLI 的网络请求
   - 如果使用公司网络，可能需要配置代理

3. **使用代理（如果需要）**
   ```bash
   export HTTP_PROXY=http://your-proxy:port
   export HTTPS_PROXY=http://your-proxy:port
   npx expo start --clear
   ```

### 方法 3: 清除缓存并重新启动

```bash
cd ml-express-mobile-app

# 清除所有缓存
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .expo-shared

# 重新启动
npx expo start --clear
```

### 方法 4: 更新 Expo CLI

```bash
npm install -g expo-cli@latest
# 或者
npm install -g @expo/cli@latest
```

## 🚀 快速修复步骤

1. **停止当前的 Expo 服务器**（如果正在运行）
   - 按 `Ctrl+C`

2. **使用离线模式启动**
   ```bash
   cd ml-express-mobile-app
   npx expo start --offline --clear
   ```

3. **等待启动完成**
   - 应该会显示二维码和连接信息
   - 即使有网络错误警告，app 仍然可以正常运行

4. **在手机上打开 Expo Go**
   - 扫描二维码
   - 或输入显示的 URL

## ⚠️ 重要提示

- **网络错误不影响 app 功能**: 这个错误只是 Expo CLI 在检查版本信息时失败，不会影响 app 的实际运行
- **可以忽略警告**: 如果 app 可以正常打开和使用，可以忽略这个网络错误
- **使用离线模式**: 如果网络问题持续，建议使用 `--offline` 标志启动

## 🆘 如果仍然无法打开

### 问题 1: App 无法连接到开发服务器

**解决方案**:
1. 确保手机和电脑在同一网络
2. 检查防火墙设置
3. 尝试使用 `--tunnel` 模式：
   ```bash
   npx expo start --tunnel --clear
   ```

### 问题 2: 环境变量未加载

**解决方案**:
1. 确认 `.env` 文件存在
2. 确认文件内容正确
3. 完全重启 Expo 服务器

### 问题 3: 缓存问题

**解决方案**:
```bash
cd ml-express-mobile-app
rm -rf .expo node_modules/.cache .expo-shared
npm install
npx expo start --clear
```

---

修复完成后，app 应该可以正常打开了。如果还有问题，请告诉我！

