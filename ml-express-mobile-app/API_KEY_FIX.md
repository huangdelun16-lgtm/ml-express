# 🔧 Google Maps API Key 配置修复

## ⚠️ 错误原因

**错误信息**:
```
Attribute meta-data#com.google.android.geo.API_KEY@value at AndroidManifest.xml:23:62-112 
requires a placeholder substitution but no value for <EXPO_PUBLIC_GOOGLE_MAPS_API_KEY> is provided.
```

**原因**:
- 手动创建的 `AndroidManifest.xml` 使用了 `${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}` 占位符
- Expo 构建系统在生成 AndroidManifest.xml 时，不会自动替换这个占位符
- 环境变量在构建时可能不可用

---

## ✅ 解决方案

### 已修复

1. ✅ **删除了手动创建的 AndroidManifest.xml**
   - Expo 会自动生成 AndroidManifest.xml
   - Expo 会自动将 Google Maps API key 注入到生成的 manifest 中

2. ✅ **app.config.js 配置正确**
   - `android.config.googleMaps.apiKey` 已正确配置
   - 使用了环境变量，并有默认值作为后备

---

## 📋 现在重新构建

```bash
cd /Users/aungmyatthu/Desktop/ml-express/ml-express-mobile-app

# 重新构建
eas build --platform android --profile production --clear-cache
```

---

## 🔍 工作原理

### Expo 自动生成 AndroidManifest.xml

1. **构建时**：
   - Expo 读取 `app.config.js` 中的配置
   - 自动生成 `AndroidManifest.xml`
   - 将 Google Maps API key 直接写入 manifest（不是占位符）

2. **API Key 来源**：
   - 优先使用环境变量 `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
   - 如果环境变量不存在，使用默认值 `AIzaSyDziYSarzsBiZHuyza-YDY9ZkaZILEq0SE`

3. **EAS Build**：
   - EAS Secrets 中的环境变量会在构建时注入
   - 确保 API key 正确传递到构建过程

---

## ✅ 验证

构建成功后，可以验证：

1. **下载 .aab 文件**
2. **解压并检查 AndroidManifest.xml**（如果需要）
3. **确认 Google Maps API key 已正确注入**

---

**现在重新构建应该可以成功了！** 🚀

