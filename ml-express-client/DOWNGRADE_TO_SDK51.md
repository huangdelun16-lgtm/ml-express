# 🔄 降级到 Expo SDK 51（兼容 Expo Go）

## ⚠️ 为什么需要降级？

- 项目当前使用 **Expo SDK 54.0.12**
- Expo Go 应用可能还没有更新到支持 SDK 54
- 降级到 **SDK 51** 可以立即在 Expo Go 中使用

## ✅ 降级步骤

### 步骤1：备份当前配置

```bash
cd ml-express-client
git add .
git commit -m "备份：降级前状态"
```

### 步骤2：安装 Expo SDK 51

```bash
# 安装 Expo SDK 51
npx expo install expo@~51.0.0

# 更新所有依赖到兼容版本
npx expo install --fix
```

### 步骤3：更新 app.json

将 `sdkVersion` 改为 `"51.0.0"`：

```json
{
  "expo": {
    "sdkVersion": "51.0.0",
    ...
  }
}
```

### 步骤4：重新安装依赖

```bash
# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 步骤5：启动项目

```bash
npm start
```

然后使用 Expo Go 扫描二维码。

---

## ⚠️ 注意事项

1. **功能可能受限**：某些 SDK 54 的新功能可能不可用
2. **依赖版本**：某些依赖可能需要降级
3. **测试**：降级后需要全面测试功能

---

## 🔄 如果想恢复 SDK 54

```bash
# 安装 Expo SDK 54
npx expo install expo@~54.0.0

# 更新所有依赖
npx expo install --fix

# 更新 app.json 中的 sdkVersion
```

---

## 🎯 推荐方案

**对于生产环境**，建议使用**开发构建**而不是降级：
- 不受 Expo Go 版本限制
- 支持所有原生模块
- 更接近生产环境

