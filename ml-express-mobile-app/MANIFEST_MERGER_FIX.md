# 🔧 Manifest Merger 错误修复

## ⚠️ 错误原因

**错误信息**: `Manifest merger failed with multiple errors`

**原因**: 
- Expo 插件（expo-camera、expo-location、expo-media-library）会自动添加权限到 AndroidManifest.xml
- 如果同时在 `permissions` 数组中手动声明相同权限，会导致 Manifest merger 冲突

---

## ✅ 解决方案

### 已修复的配置

1. **移除了手动声明的权限**（插件会自动添加）：
   - ❌ 移除了 `ACCESS_FINE_LOCATION`（expo-location 会自动添加）
   - ❌ 移除了 `ACCESS_COARSE_LOCATION`（expo-location 会自动添加）
   - ❌ 移除了 `READ_EXTERNAL_STORAGE`（expo-media-library 会自动添加）
   - ❌ 移除了 `WRITE_EXTERNAL_STORAGE`（expo-media-library 会自动添加）
   - ✅ 保留了 `CAMERA`（expo-camera 需要）

### 为什么保留 CAMERA？

虽然 expo-camera 插件也会自动添加 CAMERA 权限，但为了确保兼容性，我们保留它。

---

## 📋 重新构建步骤

### 步骤 1：清理并重新构建

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-mobile-app

# 清理本地缓存
rm -rf node_modules .expo
npm cache clean --force

# 重新安装依赖
npm install

# 修复依赖版本
npx expo install --fix

# 重新构建（清理 EAS 缓存）
eas build --platform android --profile production --clear-cache
```

---

## 🔍 如果还有问题

### 方案 1：完全移除 permissions 数组

如果还有冲突，可以完全移除 `permissions` 数组，让所有插件自动管理权限：

```javascript
android: {
  // ... 其他配置
  // 不声明 permissions，完全由插件管理
}
```

### 方案 2：检查插件版本

确保插件版本兼容：

```bash
npx expo install expo-camera expo-location expo-media-library
```

### 方案 3：查看详细错误

如果构建仍然失败，查看构建日志中的详细错误：

1. 打开构建日志链接
2. 找到 "Manifest merger" 相关的错误
3. 查看具体是哪个权限冲突

---

## 📝 权限说明

### 插件自动添加的权限

| 插件 | 自动添加的权限 |
|------|---------------|
| expo-camera | CAMERA |
| expo-location | ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION |
| expo-media-library | READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE (Android < 13), READ_MEDIA_IMAGES (Android 13+) |

### Android 13+ 存储权限变化

- **Android 13+**: 不再需要 `READ_EXTERNAL_STORAGE` 和 `WRITE_EXTERNAL_STORAGE`
- **新权限**: `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` 等
- **expo-media-library** 会自动处理这些变化

---

## ✅ 验证

构建成功后，可以验证权限是否正确：

1. 安装应用
2. 检查应用权限设置
3. 确认所有需要的权限都已添加

---

**按照上述步骤重新构建，Manifest merger 错误应该会解决！** 🔧

