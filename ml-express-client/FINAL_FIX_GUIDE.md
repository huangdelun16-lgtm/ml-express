# 🔧 最终修复指南

## ⚠️ 当前问题

1. **网络连接不稳定** - npm 安装超时
2. **依赖版本不匹配** - SDK 51 需要重新安装所有依赖

## ✅ 解决方案

### 方案1：分步安装（推荐）

如果网络不稳定，可以分步安装核心依赖：

```bash
cd ml-express-client

# 1. 先安装 Expo SDK 51
npm install expo@~51.0.0 --save --legacy-peer-deps

# 2. 安装核心 Expo 模块
npm install expo-constants@~16.0.2 --save --legacy-peer-deps
npm install expo-location@~17.0.1 --save --legacy-peer-deps
npm install expo-sqlite@~14.0.6 --save --legacy-peer-deps
npm install expo-linear-gradient@~13.0.2 --save --legacy-peer-deps
npm install expo-linking@~6.3.1 --save --legacy-peer-deps
npm install expo-status-bar@~1.12.1 --save --legacy-peer-deps
npm install expo-clipboard@~6.0.3 --save --legacy-peer-deps
npm install expo-notifications@~0.28.19 --save --legacy-peer-deps
npm install expo-updates@~0.25.28 --save --legacy-peer-deps

# 3. 安装 React Native 核心
npm install react@18.2.0 react-native@0.74.5 --save --legacy-peer-deps

# 4. 安装其他依赖
npm install --legacy-peer-deps
```

### 方案2：使用国内镜像（如果在中国）

```bash
# 设置 npm 镜像
npm config set registry https://registry.npmmirror.com

# 然后重新安装
cd ml-express-client
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### 方案3：等待网络稳定后重试

```bash
cd ml-express-client
npm install --legacy-peer-deps
```

### 方案4：使用 yarn（如果 npm 持续失败）

```bash
# 安装 yarn（如果还没有）
npm install -g yarn

# 使用 yarn 安装
cd ml-express-client
rm -rf node_modules yarn.lock
yarn install
```

## 🚀 安装完成后启动

```bash
# 清理缓存
rm -rf .expo node_modules/.cache

# 启动项目
npm start
```

## 📱 在 Expo Go 中打开

1. 确保手机和电脑在同一 WiFi
2. 打开 Expo Go 应用
3. 扫描终端中的二维码
4. 应用应该可以打开了！

## ⚠️ 如果仍然失败

1. **检查网络**：确保网络连接稳定
2. **使用 VPN**：如果网络受限
3. **等待重试**：网络问题可能是临时的
4. **使用开发构建**：如果 Expo Go 持续有问题，使用开发构建

---

## 🎯 快速命令总结

```bash
# 清理并重新安装
cd ml-express-client
rm -rf node_modules package-lock.json .expo
npm install --legacy-peer-deps

# 启动
npm start
```

