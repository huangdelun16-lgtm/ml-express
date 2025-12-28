# 🚀 快速修复：让 Expo Go 可以打开应用

## ✅ 已完成的修改

1. ✅ 降级 Expo SDK：`54.0.12` → `51.0.0`
2. ✅ 移除 `expo-dev-client`（Expo Go 不需要）
3. ✅ 更新 `app.json` 配置

## 📋 下一步操作

### 步骤1：重新安装依赖

```bash
cd ml-express-client

# 删除旧的依赖
rm -rf node_modules package-lock.json

# 重新安装（使用离线模式避免网络问题）
EXPO_OFFLINE=1 npm install --legacy-peer-deps
```

### 步骤2：修复依赖版本

```bash
# 使用离线模式修复依赖
EXPO_OFFLINE=1 npx expo install --fix --offline
```

如果网络问题持续，可以手动安装：

```bash
# 手动安装核心依赖（SDK 51 兼容版本）
npm install expo@51.0.0 --save --legacy-peer-deps
npm install expo-constants@~16.0.0 --save --legacy-peer-deps
npm install expo-location@~18.0.0 --save --legacy-peer-deps
npm install expo-linear-gradient@~14.0.0 --save --legacy-peer-deps
npm install expo-linking@~7.0.0 --save --legacy-peer-deps
npm install expo-status-bar@~2.0.0 --save --legacy-peer-deps
npm install expo-sqlite@~15.0.0 --save --legacy-peer-deps
npm install expo-clipboard@~7.0.0 --save --legacy-peer-deps
npm install expo-notifications@~0.28.0 --save --legacy-peer-deps
npm install expo-updates@~0.27.0 --save --legacy-peer-deps
```

### 步骤3：启动项目

```bash
# 启动开发服务器
npm start

# 或使用离线模式
EXPO_OFFLINE=1 npm start
```

### 步骤4：在 Expo Go 中打开

1. 确保手机和电脑在同一 WiFi 网络
2. 打开 Expo Go 应用
3. 扫描终端中显示的二维码
4. 应用应该可以正常打开了！

---

## ⚠️ 注意事项

1. **SDK 51 的限制**：
   - 某些 SDK 54 的新功能可能不可用
   - 需要测试所有功能确保正常

2. **如果仍有问题**：
   - 确保 Expo Go 应用是最新版本
   - 清除 Expo Go 缓存：设置 → 清除缓存
   - 重启开发服务器

3. **恢复 SDK 54**（如果需要）：
   ```bash
   # 恢复 package.json 和 app.json
   git checkout HEAD -- package.json app.json
   ```

---

## 🎯 快速命令

```bash
cd ml-express-client
rm -rf node_modules package-lock.json
EXPO_OFFLINE=1 npm install --legacy-peer-deps
npm start
```

然后扫描二维码即可！

