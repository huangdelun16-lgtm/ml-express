# 🔧 网络连接问题解决方案

## ⚠️ 问题说明

构建时遇到 SSL 错误：
```
write EPROTO 80E08C0902000000:error:0A000119:SSL routines:tls_get_more_records:decryption failed or bad record mac
```

这通常是网络连接、代理或防火墙问题。

## ✅ 解决方案

### 方案1：检查网络和代理设置

```bash
# 1. 检查是否有代理设置
echo $HTTP_PROXY
echo $HTTPS_PROXY

# 2. 如果有代理，临时禁用
unset HTTP_PROXY
unset HTTPS_PROXY

# 3. 检查网络连接
ping api.expo.dev
```

### 方案2：使用离线模式构建（如果可能）

```bash
# 使用本地缓存，避免网络请求
EXPO_OFFLINE=1 eas build --profile development --platform android --local
```

### 方案3：配置 npm 使用国内镜像（如果在中国）

```bash
# 设置 npm 镜像
npm config set registry https://registry.npmmirror.com

# 设置 Expo 镜像（如果可用）
export EXPO_USE_MIRROR=true
```

### 方案4：使用 VPN 或更换网络

如果网络不稳定：
1. 尝试使用 VPN
2. 更换网络（WiFi/移动数据）
3. 等待网络稳定后重试

### 方案5：手动安装依赖后构建

```bash
# 1. 手动安装所有依赖（已安装 expo-dev-client）
cd ml-express-client
npm install

# 2. 尝试构建（使用本地缓存）
eas build --profile development --platform android --non-interactive
```

## 🎯 推荐步骤

1. **检查网络连接**
   ```bash
   curl -I https://api.expo.dev
   ```

2. **清除代理设置**
   ```bash
   unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
   ```

3. **重试构建**
   ```bash
   cd ml-express-client
   eas build --profile development --platform android
   ```

4. **如果仍然失败，使用本地构建**（需要 Android SDK）
   ```bash
   eas build --profile development --platform android --local
   ```

## 📝 当前状态

✅ `expo-dev-client` 已安装
✅ `app.json` 已更新（添加了 expo-dev-client plugin）
⏳ 等待网络问题解决后重新构建

