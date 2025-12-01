# 📱 Chromebook Screenshots 指南

## 什么是 Chromebook Screenshots？

**Chromebook Screenshots** 是 Google Play Console 要求的一种特殊截图格式，用于展示应用在 **Chrome OS（Chromebook）** 设备上的显示效果。

---

## 📋 是否需要提供 Chromebook Screenshots？

### ✅ 需要提供的情况：
- 应用明确支持 **Android 平板电脑**
- 应用支持 **大屏幕设备**（7英寸以上）
- Google Play Console 提示需要提供

### ❌ 不需要提供的情况：
- 应用仅支持手机（小屏幕）
- 应用明确声明不支持平板
- Google Play Console 没有要求

---

## 🔍 您的应用当前状态

根据 `app.json` 配置：

```json
{
  "ios": {
    "supportsTablet": true  // ✅ iOS 支持平板
  },
  "android": {
    // ⚠️ Android 未明确声明支持平板
  },
  "orientation": "portrait"  // 仅竖屏模式
}
```

**结论**：
- ✅ iOS 支持平板
- ⚠️ Android 未明确声明支持平板
- ⚠️ 应用是竖屏模式，可能不太适合 Chromebook（通常横屏）

**建议**：
- 如果 Google Play Console **没有要求**，可以**不提供** Chromebook screenshots
- 如果 Google Play Console **要求提供**，可以使用 Android 平板截图代替

---

## 📐 Chromebook Screenshots 规格要求

### 分辨率要求：
- **最小分辨率**: 1280 x 800 像素
- **推荐分辨率**: 1920 x 1200 像素
- **最大分辨率**: 3840 x 2400 像素

### 格式要求：
- **格式**: JPG 或 PNG
- **文件大小**: 每个文件不超过 5MB
- **颜色空间**: RGB

### 数量要求：
- **最少**: 2 张
- **最多**: 8 张

---

## 🛠️ 如何获取 Chromebook Screenshots

### 方法 1：使用 Android 平板模拟器（推荐）

#### 步骤 1：创建 Android 平板模拟器

1. **打开 Android Studio**
2. **Tools** → **Device Manager**
3. **Create Device**
4. **选择平板设备**：
   - Pixel Tablet (2560 x 1600)
   - Nexus 10 (2560 x 1600)
   - 或其他大屏幕设备

#### 步骤 2：运行应用并截图

```bash
# 1. 启动 Android 模拟器
# 2. 安装应用
cd ml-express-client
npm run android

# 3. 在模拟器中打开应用
# 4. 使用模拟器的截图功能
#    - 点击模拟器工具栏的相机图标
#    - 或使用快捷键 Cmd+S (Mac) / Ctrl+S (Windows)
```

#### 步骤 3：调整分辨率

如果截图分辨率不符合要求，可以使用图片编辑工具调整：
- **推荐工具**: Photoshop, GIMP, 或在线工具
- **目标分辨率**: 1920 x 1200 像素

---

### 方法 2：使用真实 Android 平板设备

1. **在 Android 平板上安装应用**
2. **打开应用并导航到需要截图的页面**
3. **使用设备的截图功能**：
   - 同时按住 **电源键 + 音量下键**
   - 或使用设备的截图快捷方式

---

### 方法 3：使用 Chrome OS 设备（如果有）

如果您有 Chromebook 设备：

1. **在 Chromebook 上安装 Android 应用**
2. **打开应用**
3. **使用 Chromebook 截图功能**：
   - 按 **Ctrl + Show Windows** 键
   - 或使用 **Ctrl + F5**

---

## 📸 推荐的截图内容

### 1. 首页（Home Screen）
- 展示应用的主要功能
- 显示广告轮播
- 突出多语言支持

### 2. 下单页面（Place Order）
- 展示下单流程
- 显示地图和地址选择
- 展示价格计算

### 3. 订单列表（My Orders）
- 展示订单管理功能
- 显示订单状态筛选

### 4. 订单追踪（Track Order）
- 展示实时追踪功能
- 显示地图和位置信息

### 5. 个人中心（Profile）
- 展示用户管理功能
- 显示设置选项

---

## ⚠️ 注意事项

### 1. 应用适配问题
- 您的应用目前是**竖屏模式**（portrait）
- Chromebook 通常是**横屏模式**（landscape）
- 应用在 Chromebook 上可能显示为**手机模式**（居中显示，两侧有黑边）

### 2. 布局优化建议
如果希望应用更好地适配 Chromebook，可以考虑：
- 添加横屏布局支持
- 优化大屏幕显示
- 使用响应式设计

### 3. Google Play Console 设置
- 如果应用**不支持** Chromebook，可以在 Google Play Console 中**声明不支持**
- 这样就不需要提供 Chromebook screenshots

---

## 🎯 快速解决方案

### 如果 Google Play Console 要求提供：

**最简单的方法**：
1. 使用 Android Studio 创建**平板模拟器**（10英寸）
2. 运行应用并截图
3. 调整截图分辨率为 **1920 x 1200**
4. 上传到 Google Play Console

**或者**：
1. 在 Google Play Console 中**声明应用不支持 Chromebook**
2. 跳过 Chromebook screenshots 要求

---

## 📝 检查清单

- [ ] 确认 Google Play Console 是否要求 Chromebook screenshots
- [ ] 如果要求，准备 Android 平板模拟器
- [ ] 运行应用并截图（至少 2 张）
- [ ] 调整截图分辨率为 1920 x 1200
- [ ] 上传到 Google Play Console
- [ ] 或者声明应用不支持 Chromebook

---

## 🔗 相关资源

- [Google Play Console - Chromebook Screenshots](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Android Studio - 创建模拟器](https://developer.android.com/studio/run/managing-avds)
- [Chrome OS - Android 应用支持](https://support.google.com/chromebook/answer/7021273)

---

**总结**：如果 Google Play Console 没有明确要求，您可以**不提供** Chromebook screenshots。如果需要提供，使用 Android 平板模拟器截图即可。

